from pydub import AudioSegment
from fastapi import UploadFile

import os
import requests
import yt_dlp
from io import BytesIO
import time


# Constantes pour les formats et plateformes supportées
SUPPORTED_PLATFORMS = ["youtube.com", "youtu.be", "tiktok.com", "facebook.com", "instagram.com", "twitter.com"]
SUPPORTED_FORMATS = ["http://", "https://"]
SUPPORTED_AUDIO_FORMATS = [".wav", ".aac", ".flac", ".ogg", ".m4a", ".mp4", ".mp3"]

def convertir_fichier_en_mp3(input_source):
    """Convertit un fichier audio en MP3 depuis une URL, un fichier local ou un UploadFile."""
    if isinstance(input_source, UploadFile):
        input_path = input_source.filename
    else:
        input_path = input_source

    if os.path.isfile(input_path) and is_supported_audio_format(input_path):
        output_path = f"{os.path.splitext(input_path)[0]}_converted.mp3"
        if os.path.exists(output_path):
            print(f"🎵 Le fichier MP3 {output_path} existe déjà.")
            return output_path
        else:
            return convertir_audio_local(input_path)
    else:
        print("❌ Erreur : Fichier non supporté.")
        return None



def is_supported_platform(url):
    """Vérifie si l'URL est une plateforme supportée par yt-dlp."""
    return any(plat in url for plat in SUPPORTED_PLATFORMS)

def is_direct_audio_url(url):
    """Vérifie si l'URL est un lien direct vers un fichier audio."""
    return url.startswith(tuple(SUPPORTED_FORMATS))

def is_supported_audio_format(file_path):
    """Vérifie si le fichier local est dans un format audio supporté."""
    return os.path.splitext(file_path)[1].lower() in SUPPORTED_AUDIO_FORMATS

def telecharger_audio_yt_dlp(url):
    """Télécharge et convertit une vidéo/audio depuis une plateforme prise en charge par yt-dlp."""
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': 'audio_temp.%(ext)s',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            audio_path = ydl.prepare_filename(info_dict).replace(info_dict['ext'], 'mp3')

        print(f"✅ Audio téléchargé et converti : {audio_path}")
        return audio_path

    except Exception as e:
        print(f"❌ Erreur lors du téléchargement : {e}")
        return None

def convertir_audio_url(url):
    """Convertit un fichier audio en MP3 depuis une URL directe."""
    try:
        response = requests.get(url, stream=True)
        if response.status_code != 200:
            print(f"❌ Erreur : Impossible d'accéder à {url}.")
            return None

        input_audio = BytesIO(response.content)
        input_format = os.path.splitext(url.split("?")[0])[1][1:].lower()  # Déduire le format sans les paramètres

        if input_format not in SUPPORTED_AUDIO_FORMATS:
            print(f"❌ Format {input_format} non supporté.")
            return None

        print(f"📥 Fichier distant chargé ({input_format}).")
        return convertir_audio(input_audio, input_format)

    except Exception as e:
        print(f"❌ Erreur lors du téléchargement du fichier audio : {e}")
        return None

def convertir_audio_local(file_path):
    """Convertit un fichier audio local en MP3 et l'enregistre sur le disque."""
    try:
        input_format = os.path.splitext(file_path)[1][1:].lower()  # Extraire l'extension sans le point
        print(f"🔍 Format détecté : {input_format}")  # Debugging

        if input_format not in SUPPORTED_AUDIO_FORMATS:
            print(f"❌ Format {input_format} non supporté.")
            return None
    
        # Convertir le fichier en MP3
        audio = AudioSegment.from_file(file_path, format=input_format)
        output_mp3_path = f"{os.path.splitext(file_path)[0]}_converted.mp3"
        audio.export(output_mp3_path, format="mp3")

        print(f"✅ Conversion terminée : {output_mp3_path}")
        return output_mp3_path

    except Exception as e:
        print(f"❌ Erreur lors de la conversion du fichier local : {e}")
        return None



def convertir_audio(input_audio, input_format):
    """Effectue la conversion en MP3 depuis un fichier local ou distant."""
    try:
        audio = AudioSegment.from_file(input_audio, format=input_format)
        output_mp3 = BytesIO()
        audio.export(output_mp3, format="mp3")
        output_mp3.seek(0)
        print("✅ Conversion en MP3 terminée.")
        return output_mp3  # Prêt à être utilisé par Whisper

    except Exception as e:
        print(f"❌ Erreur lors de la conversion : {e}")
        return None
