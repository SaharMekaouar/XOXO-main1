import os
from pydub import AudioSegment
import os
from pydub import AudioSegment
AudioSegment.converter = r"C:\Users\pc\AppData\Local\Programs\Python\Python311\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
AudioSegment.ffprobe = r"C:\Users\pc\AppData\Local\Programs\Python\Python311\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
# Liste des formats audio supportés
SUPPORTED_AUDIO_FORMATS = [".wav", ".aac", ".flac", ".ogg", ".m4a", ".mp4", ".mp3"]

def convert_audio(input_file_path: str, output_format: str = 'mp3') -> str:
   
    try:
        # Vérification de l'extension du fichier
        _, ext = os.path.splitext(input_file_path)
        if ext.lower() not in SUPPORTED_AUDIO_FORMATS:
            raise ValueError(f"Format audio non supporté : {ext}")

        # Charger le fichier audio à partir du chemin
        audio = AudioSegment.from_file(input_file_path)

        # Créer un nom de fichier unique pour le fichier converti
        base, _ = os.path.splitext(input_file_path)
        output_file_path = f"{base}_converted.{output_format}"

        # Exporter le fichier dans le format MP3
        audio.export(output_file_path, format=output_format)

        print(f"✅ Conversion réussie : {input_file_path} -> {output_file_path}")
        return output_file_path

    except Exception as e:
        print(f"🚨 Erreur lors de la conversion de l'audio : {e}")
        raise Exception(f"Erreur lors de la conversion de l'audio : {e}")

