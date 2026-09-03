import gc
import re
from pathlib import Path
from transformers import MarianTokenizer
from optimum.onnxruntime import ORTModelForSeq2SeqLM
from onnxruntime import SessionOptions

BASE_DIR = Path(__file__).resolve().parent
CACHE = {}
MAX_SOURCE_TOKENS = 240


def _split_text(text, tokenizer):
    """Keep every request within Marian's context window at sentence breaks."""
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?؟])\s+|\n+", text)
        if sentence.strip()
    ]
    if not sentences:
        return []

    chunks, current = [], []
    for sentence in sentences:
        candidate = " ".join([*current, sentence])
        if current and len(tokenizer(candidate, add_special_tokens=True).input_ids) > MAX_SOURCE_TOKENS:
            chunks.append(" ".join(current))
            current = []
        # A single unusually long sentence is still safely truncated by the
        # tokenizer below rather than causing an oversized model request.
        current.append(sentence)
    if current:
        chunks.append(" ".join(current))
    return chunks

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
    translations = []
    for text in texts:
        translated_chunks = []
        for chunk in _split_text(text, tokenizer):
            inputs = tokenizer(
                chunk,
                return_tensors="pt",
                truncation=True,
                max_length=MAX_SOURCE_TOKENS,
            )
            outputs = model.generate(
                **inputs,
                num_beams=4,
                max_new_tokens=256,
                no_repeat_ngram_size=3,
                repetition_penalty=1.15,
                early_stopping=True,
            )
            translated_chunks.append(tokenizer.decode(outputs[0], skip_special_tokens=True))
        translations.append(" ".join(translated_chunks))
    return translations

def clear_cache():
    global CACHE
    CACHE = {}
    gc.collect()
