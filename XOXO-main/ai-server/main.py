from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from faster_whisper import WhisperModel
import os
import requests

from summarize import SummarizerT5
from pydantic import BaseModel, Field
from typing import Optional, List

from summarizer import summary, get_summary

from transformers import T5Tokenizer, T5ForConditionalGeneration
from fastapi.middleware.cors import CORSMiddleware

from file import convert_audio
from translate import translate_marian
from urllib.parse import unquote

from traduction.translation_logic import translate, clear_cache


app = FastAPI()


# ============================================================
# 🔒 CONFIGURATION CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 🚀 CHARGEMENT DU MODÈLE FASTER-WHISPER
# ============================================================

model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)


# ============================================================
# 📝 RÉSUMÉ
# ============================================================

class SummaryRequest(BaseModel):
    text: str = Field(..., description="Texte à résumer")
    summary_type: str = Field(
        default="basic",
        description="Type de résumé: 'basic' ou 'advanced'"
    )
    max_input_len: Optional[int] = Field(
        default=2048,
        description="Longueur maximale du texte d'entrée"
    )


class SummaryResponse(BaseModel):
    summary: str
    length: int
    summary_type: str
    processing_time: float


@app.post("/summarize/", response_model=SummaryResponse)
def summarize_text(request: SummaryRequest = Body(...)):

    try:

        # Vérifier que le texte n'est pas vide
        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Le texte est trop court ou vide"
            )

        # Vérifier le type de résumé
        if request.summary_type not in ["basic", "advanced"]:
            raise HTTPException(
                status_code=400,
                detail="Type de résumé invalide. Utiliser 'basic' ou 'advanced'"
            )

        # Générer le résumé
        result = get_summary(
            text=request.text,
            summary_type=request.summary_type,
            max_input_len=request.max_input_len
        )

        return result

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du résumé: {str(e)}"
        )


# ============================================================
# 🎤 TRANSCRIPTION AUDIO AVEC FASTER-WHISPER
# ============================================================

@app.post("/transcribe/")
async def transcribe_audio(
    file: UploadFile = File(None),
    url: str = Form(None)
):

    temp_file_path = None
    audio_path = None

    try:

        # ====================================================
        # 📁 CAS 1 : FICHIER UPLOADÉ
        # ====================================================

        if file:

            temp_file_path = (
                f"temp_uploaded"
                f"{os.path.splitext(file.filename)[1]}"
            )

            with open(temp_file_path, "wb") as f:
                f.write(await file.read())

            converted_path = convert_audio(temp_file_path)

            if converted_path is None:
                return {
                    "error": "Échec de la conversion en MP3."
                }

            audio_path = converted_path


        # ====================================================
        # 🌐 CAS 2 : URL
        # ====================================================

        elif url:

            url = unquote(url)

            if not url.startswith("http"):
                return {
                    "error": "URL invalide."
                }

            temp_file_path = "temp_downloaded_audio"

            response = requests.get(url)

            if response.status_code == 200:

                with open(temp_file_path, "wb") as f:
                    f.write(response.content)

                converted_path = convert_audio(temp_file_path)

                if converted_path is None:
                    return {
                        "error": "Échec de la conversion en MP3."
                    }

                audio_path = converted_path

            else:

                return {
                    "error": "Impossible de télécharger le fichier."
                }


        # ====================================================
        # ❌ AUCUN FICHIER / URL
        # ====================================================

        else:

            return {
                "error": "Aucun fichier ou URL fourni."
            }


        # ====================================================
        # 🔄 TRANSCRIPTION AVEC FASTER-WHISPER
        # ====================================================

        segments, info = model.transcribe(
            audio_path
        )


        # Récupérer le texte de tous les segments
        text = " ".join(
            segment.text.strip()
            for segment in segments
        )


        # ====================================================
        # 🧹 NETTOYAGE
        # ====================================================

        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)

        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


        # ====================================================
        # 📤 RÉPONSE
        # ====================================================

        return {
            "text": text,
            "language": info.language
        }


    except Exception as e:

        # Nettoyage même en cas d'erreur
        try:

            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)

            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)

        except Exception:
            pass


        return {
            "error": f"Erreur: {str(e)}"
        }


# ============================================================
# 🌍 TRADUCTION
# ============================================================

SUPPORTED_LANGS = {
    "fr",
    "en",
    "ar",
    "it",
    "es",
    "de"
}


class TranslationRequest(BaseModel):

    text: List[str]

    source_lang: str

    target_lang: str


@app.post("/translate")
def translate_text(req: TranslationRequest):

    src = req.source_lang.lower()

    tgt = req.target_lang.lower()


    # Validation
    if src not in SUPPORTED_LANGS or tgt not in SUPPORTED_LANGS:

        raise HTTPException(
            status_code=400,
            detail="Unsupported language"
        )


    try:

        result = translate(
            req.text,
            src,
            tgt
        )

        return {
            "translations": result
        }


    except FileNotFoundError as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {e}"
        )


    finally:

        # Libérer la mémoire
        clear_cache()


# ============================================================
# 🧹 CLEAR TRANSLATION CACHE
# ============================================================

@app.post("/clear-cache")
def clear_translation_cache():

    clear_cache()

    return {
        "message": "Cache libéré avec succès"
    }


# ============================================================
# 🚀 LANCEMENT DU SERVEUR
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001
    )