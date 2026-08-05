# export_models.py

from transformers import MarianTokenizer
from optimum.onnxruntime import ORTModelForSeq2SeqLM
import os
import shutil

LANG_PAIRS = [
    ("en", "fr"), ("fr", "en"),
    ("de", "en"), ("en", "de"),
    ("it", "en"), ("en", "it"),
    ("ar", "en"), ("en", "ar"),
    ("es", "en"), ("en", "es"),
]

def export_all_models():
    for src, tgt in LANG_PAIRS:
        model_id = f"Helsinki-NLP/opus-mt-{src}-{tgt}"
        export_dir = f"models/{src}-{tgt}"

        # Skip if already exported
        if os.path.exists(os.path.join(export_dir, "model.onnx")):
            print(f"✅ ONNX model already exists at {export_dir}. Skipping export.")
            continue

        os.makedirs(export_dir, exist_ok=True)
        print(f"⬇️ Exporting {model_id} to {export_dir}")

        try:
            # Export to ONNX
            model = ORTModelForSeq2SeqLM.from_pretrained(model_id, export=True)
            model.save_pretrained(export_dir)

            # Save tokenizer
            tokenizer = MarianTokenizer.from_pretrained(model_id)
            tokenizer.save_pretrained(export_dir)

            print(f"✅ Exported {src}-{tgt} successfully.\n")

        except Exception as e:
            print(f"❌ Failed to export {src}-{tgt}: {str(e)}")

if __name__ == "__main__":
    export_all_models()