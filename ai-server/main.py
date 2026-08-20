from fastapi import FastAPI, UploadFile, File, Form, HTTPException,Body
import whisper
import os
import requests
import shutil
from summarize import SummarizerT5
from pydantic import BaseModel, Field
from typing import Optional
#from summarize import SummarizerT5
from summarizer import summary,get_summary
  # Classe de résumé personnalisée
from transformers import T5Tokenizer, T5ForConditionalGeneration
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from file import convert_audio
from translate import translate_marian
from urllib.parse import unquote

app = FastAPI()

# 🔒 Configurer CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🚀 Charger les modèles
import torch
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Whisper utilise : {device}")
model = whisper.load_model("base", device=device)
#resume onnx longt5 et parametrable

class SummaryRequest(BaseModel):
    text: str = Field(..., description="Texte à résumer")
    summary_type: str = Field(default="basic", description="Type de résumé: 'basic' ou 'advanced'")
    max_input_len: Optional[int] = Field(default=2048, description="Longueur maximale du texte d'entrée")

# Modèle de réponse
class SummaryResponse(BaseModel):
    summary: str
    length: int
    summary_type: str
    processing_time: float

# Route principale pour obtenir un résumé
@app.post("/summarize/", response_model=SummaryResponse)
def summarize_text(request: SummaryRequest = Body(...)):
    try:
        # Vérifier que le texte n'est pas vide
        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Le texte est trop court ou vide")
        
        # Vérifier le type de résumé
        if request.summary_type not in ["basic", "advanced"]:
            raise HTTPException(status_code=400, detail="Type de résumé invalide. Utiliser 'small', 'medium' ou 'large'")
        
        # Générer le résumé
        result = get_summary(
            text=request.text,
            summary_type=request.summary_type,
            max_input_len=request.max_input_len
        )
        
        # Retourner le résultat
        return result
        
    except Exception as e:
        # Gérer les erreurs
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du résumé: {str(e)}")


# 📌 Transcription audio avec Whisper
@app.post("/transcribe/")
async def transcribe_audio(
    file: UploadFile = File(None),  # Accepte un fichier
    url: str = Form(None)  # Ou une URL
):
    try:
        if file:
            temp_file_path = f"temp_uploaded{os.path.splitext(file.filename)[1]}"
            with open(temp_file_path, "wb") as f:
                f.write(await file.read())

            converted_path = convert_audio(temp_file_path)
            if converted_path is None:
                return {"error": "Échec de la conversion en MP3."}

            audio_path = converted_path  # Utiliser le fichier converti

        elif url:
            url=unquote(url)  # Décoder l'URL
            if not url.startswith("http"):
                return {"error": "URL invalide."}
            temp_file_path = "temp_downloaded_audio"
            response = requests.get(url)
            if response.status_code == 200:
                with open(temp_file_path, "wb") as f:
                    f.write(response.content)

                converted_path = convert_audio(temp_file_path)
                if converted_path is None:
                    return {"error": "Échec de la conversion en MP3."}

                audio_path = converted_path
            else:
                return {"error": "Impossible de télécharger le fichier."}
        else:
            return {"error": "Aucun fichier ou URL fourni."}

        # 🔄 Transcription avec Whisper
        result = model.transcribe(audio_path)
        os.remove(audio_path)  # Nettoyage après traitement

        return {"text": result["text"]}

    except Exception as e:
        return {"error": f"Erreur: {str(e)}"}

from traduction.translation_logic import translate,clear_cache
from typing import List



SUPPORTED_LANGS = {"fr", "en", "ar", "it", "es", "de"}

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
        raise HTTPException(status_code=400, detail="Unsupported language")

    try:
        result = translate(req.text, src, tgt)
        return {"translations": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
    finally:
        # Libérer la mémoire, même si erreur
        clear_cache()


    #gestion dynamique de la mémoire (manuellement)//
    #on peut la supprimer puisque elle est integrer dans l api translation
@app.post("/clear-cache")
def clear_translation_cache():
    clear_cache()
    return {"message": "Cache libéré avec succès"}

# 📌 Lancer le serveur
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
