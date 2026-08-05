# translation_logic.py
import gc
import os
from pathlib import Path
from transformers import MarianTokenizer
from optimum.onnxruntime import ORTModelForSeq2SeqLM
from optimum.onnxruntime.configuration import AutoOptimizationConfig
from onnxruntime import SessionOptions

BASE_DIR = Path(__file__).resolve().parent
CACHE = {}

def load_model(src_lang, tgt_lang):
    key = f"{src_lang}-{tgt_lang}"
    model_dir = BASE_DIR / "models" / key

    if not model_dir.exists():
        raise FileNotFoundError(f"Model directory not found: {model_dir}")

    if key not in CACHE:
        # Limiter threads et forcer CPU
        session_options = SessionOptions()
        session_options.intra_op_num_threads = 1

        # Charger modèle et tokenizer
        tokenizer = MarianTokenizer.from_pretrained(str(model_dir))
        model = ORTModelForSeq2SeqLM.from_pretrained(
            str(model_dir),
            use_auth_token=False,
            provider="CPUExecutionProvider",  # forcer CPU
            session_options=session_options,
            optimization_config=AutoOptimizationConfig.O1(),  # (facultatif, pour optim)
        )
        CACHE[key] = (tokenizer, model)

    return CACHE[key]

def translate(texts, src_lang, tgt_lang):
    if src_lang == tgt_lang:
        return texts

    # Traduction pivot via anglais
    if src_lang != "en" and tgt_lang != "en":
        texts = translate(texts, src_lang, "en")
        src_lang = "en"

    tokenizer, model = load_model(src_lang, tgt_lang)
    inputs = tokenizer(texts, return_tensors="pt", padding=True, truncation=True)
    outputs = model.generate(**inputs)
    return tokenizer.batch_decode(outputs, skip_special_tokens=True)

def clear_cache():
    global CACHE
    CACHE = {}
    gc.collect()