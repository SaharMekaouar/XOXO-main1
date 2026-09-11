import os
from pydub import AudioSegment
import imageio_ffmpeg

# 🔧 Chemin automatique vers FFmpeg installé dans le venv
FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

# Configurer Pydub pour utiliser FFmpeg
AudioSegment.converter = FFMPEG_PATH

print(f"✅ FFmpeg utilisé : {FFMPEG_PATH}")

# Formats audio supportés
SUPPORTED_AUDIO_FORMATS = [
    ".wav",
    ".aac",
    ".flac",
    ".ogg",
    ".webm",
    ".m4a",
    ".mp4",
    ".mp3"
]


def convert_audio(input_file_path: str, output_format: str = "wav") -> str:
    try:
        # Vérifier que le fichier existe
        if not os.path.exists(input_file_path):
            raise FileNotFoundError(
                f"Fichier introuvable : {input_file_path}"
            )

        # Vérifier l'extension
        _, ext = os.path.splitext(input_file_path)

        if ext.lower() not in SUPPORTED_AUDIO_FORMATS:
            raise ValueError(
                f"Format audio non supporté : {ext}"
            )

        # Charger le fichier audio
        audio = AudioSegment.from_file(
            input_file_path,
            format=ext.lower().replace(".", "")
        )

        # Nom du fichier converti
        base, _ = os.path.splitext(input_file_path)
        output_file_path = f"{base}_converted.{output_format}"

        # Whisper works best with a mono 16 kHz PCM track.  Keeping it as WAV
        # avoids a second lossy MP3 compression that can damage French liaison
        # and Arabic consonants before transcription.
        audio = audio.set_frame_rate(16000).set_channels(1)
        audio.export(
            output_file_path,
            format=output_format,
            parameters=["-ac", "1", "-ar", "16000"] if output_format == "wav" else None,
        )

        print(
            f"✅ Conversion réussie : "
            f"{input_file_path} -> {output_file_path}"
        )

        return output_file_path

    except Exception as e:
        print(
            f"🚨 Erreur lors de la conversion de l'audio : {e}"
        )

        raise Exception(
            f"Erreur lors de la conversion de l'audio : {e}"
        )
