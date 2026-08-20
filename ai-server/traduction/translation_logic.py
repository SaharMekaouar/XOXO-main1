import gc
from pathlib import Path
from transformers import MarianTokenizer
from optimum.onnxruntime import ORTModelForSeq2SeqLM
from onnxruntime import SessionOptions

BASE_DIR = Path(__file__).resolve().parent
CACHE = {}

def load_model(src_lang, tgt_lang):
    key = f"{src_lang}-{tgt_lang}"
    model_dir = f"Helsinki-NLP/opus-mt-{src_lang}-{tgt_lang}"

    if key not in CACHE:
        session_options = SessionOptions()

        tokenizer = MarianTokenizer.from_pretrained(str(model_dir))
        model = ORTModelForSeq2SeqLM.from_pretrained(
            str(model_dir),
            export=True,
            provider="CPUExecutionProvider",
            session_options=session_options,
        )
        CACHE[key] = (tokenizer, model)

    return CACHE[key]

def translate(texts, src_lang, tgt_lang):
    if src_lang == tgt_lang:
        return texts

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