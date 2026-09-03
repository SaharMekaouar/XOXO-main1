import sys

# Windows terminals can default to cp1252, which cannot print the status emoji
# emitted during startup.  Configure UTF-8 before importing modules that log.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    Body
)

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

import whisper
import os
import requests
import torch

from pydantic import BaseModel, Field
from typing import Optional, List

from fastapi.middleware.cors import CORSMiddleware

from file import convert_audio

from urllib.parse import unquote

from summarizer import get_summary

from traduction.translation_logic import (
    translate,
    clear_cache
)


# ============================================================
# 1. FASTAPI
# ============================================================

app = FastAPI()


# ============================================================
# 2. CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# 3. DEVICE
# ============================================================

device = (
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)
# `small` is recommended for better multilingual vocabulary once downloaded.
# Keep `base` as the reliable default so the service can always start offline.
# Deployment can override it (for example, WHISPER_MODEL=small or medium).
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

print(
    f"Whisper utilise : {device}"
)


# ============================================================
# 4. CHARGEMENT WHISPER
# ============================================================

print("======================================")
print("Chargement de Whisper...")
print("======================================")


model = whisper.load_model(
    WHISPER_MODEL,
    device=device
)


print("✅ Whisper chargé avec succès")


# ============================================================
# 5. SUMMARY REQUEST
# ============================================================

class SummaryRequest(BaseModel):

    text: str = Field(
        ...,
        description="Texte à résumer"
    )

    summary_type: str = Field(
        default="basic",
        description="Type de résumé: basic ou advanced"
    )

    max_input_len: Optional[int] = Field(
        default=2048,
        description="Longueur maximale du texte d'entrée"
    )


# ============================================================
# 6. SUMMARY RESPONSE
# ============================================================

class SummaryResponse(BaseModel):

    summary: str

    length: int

    summary_type: str

    processing_time: float


# ============================================================
# 7. SUMMARY ENDPOINT
# ============================================================

@app.post(
    "/summarize/",
    response_model=SummaryResponse
)
def summarize_text(
    request: SummaryRequest = Body(...)
):

    try:

        # ----------------------------------------------------
        # Vérifier texte
        # ----------------------------------------------------

        if (
            not request.text
            or len(request.text.strip()) < 10
        ):

            raise HTTPException(
                status_code=400,
                detail="Le texte est trop court ou vide"
            )


        # ----------------------------------------------------
        # Vérifier summary_type
        # ----------------------------------------------------

        if request.summary_type not in [
            "basic",
            "advanced"
        ]:

            raise HTTPException(
                status_code=400,

                detail=(
                    "Type de résumé invalide. "
                    "Utiliser 'basic' ou 'advanced'."
                )
            )


        # ----------------------------------------------------
        # Générer résumé
        # ----------------------------------------------------

        result = get_summary(

            text=request.text,

            summary_type=request.summary_type,

            max_input_len=request.max_input_len
        )


        # ----------------------------------------------------
        # Retourner résultat
        # ----------------------------------------------------

        return result


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=(
                "Erreur lors de la génération "
                f"du résumé: {str(e)}"
            )
        )


# ============================================================
# 8. TRANSCRIPTION WHISPER
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
        # CAS 1 : FICHIER UPLOAD
        # ====================================================

        if file:

            extension = os.path.splitext(
                file.filename
            )[1]

            temp_file_path = (
                f"temp_uploaded{extension}"
            )


            with open(
                temp_file_path,
                "wb"
            ) as f:

                f.write(
                    await file.read()
                )


            print(
                f"Fichier reçu : {temp_file_path}"
            )


            # Conversion audio

            converted_path = convert_audio(
                temp_file_path
            )


            if converted_path is None:

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Échec de la conversion audio."
                    )
                )


            audio_path = converted_path


        # ====================================================
        # CAS 2 : URL
        # ====================================================

        elif url:

            url = unquote(url)


            if not url.startswith("http"):

                raise HTTPException(
                    status_code=400,
                    detail="URL invalide."
                )


            temp_file_path = (
                "temp_downloaded_audio"
            )


            response = requests.get(
                url,
                timeout=60
            )


            if response.status_code != 200:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Impossible de télécharger "
                        "le fichier."
                    )
                )


            with open(
                temp_file_path,
                "wb"
            ) as f:

                f.write(
                    response.content
                )


            converted_path = convert_audio(
                temp_file_path
            )


            if converted_path is None:

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Échec de la conversion audio."
                    )
                )


            audio_path = converted_path


        # ====================================================
        # CAS 3 : RIEN
        # ====================================================

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Aucun fichier ou URL fourni."
                )
            )


        # ====================================================
        # WHISPER
        # ====================================================

        print(
            "🎤 Transcription avec Whisper..."
        )


        result = model.transcribe(
            audio_path,
            task="transcribe",
            # Let Whisper determine the spoken language rather than forcing
            # English; this is essential for French, Arabic, Italian, etc.
            language=None,
            fp16=device == "cuda",
            beam_size=5,
            patience=1.0,
            temperature=(0.0, 0.2, 0.4),
            # Prevent a bad segment from being used as a prompt for all later
            # segments, a common source of repeated/wrong vocabulary.
            condition_on_previous_text=False,
            compression_ratio_threshold=2.2,
            logprob_threshold=-1.0,
            no_speech_threshold=0.6,
            verbose=False,
        )


        text = result["text"]


        print(
            "✅ Transcription terminée"
        )


        return {
            "text": text
        }


    except HTTPException:

        raise


    except Exception as e:

        return {
            "error": f"Erreur: {str(e)}"
        }


    finally:

        # ====================================================
        # NETTOYAGE
        # ====================================================

        for path in [
            audio_path,
            temp_file_path
        ]:

            if path and os.path.exists(path):

                try:

                    os.remove(path)

                except Exception:

                    pass


# ============================================================
# 9. TRANSLATION
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
def translate_text(
    req: TranslationRequest
):

    src = req.source_lang.lower()

    tgt = req.target_lang.lower()


    # --------------------------------------------------------
    # Validation
    # --------------------------------------------------------

    if (
        src not in SUPPORTED_LANGS
        or tgt not in SUPPORTED_LANGS
    ):

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


    # Do not clear the translation cache after every request.  Loading and ONNX
    # exporting a language model can take several minutes; keeping it resident
    # makes changing target languages responsive.  The /clear-cache endpoint is
    # available for an explicit memory release when needed.


# ============================================================
# 10. CLEAR TRANSLATION CACHE
# ============================================================

@app.post("/clear-cache")
def clear_translation_cache():

    clear_cache()

    return {
        "message": "Cache libéré avec succès"
    }


# ============================================================
# 11. START SERVER
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001
    )
