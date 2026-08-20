from transformers import MarianMTModel, MarianTokenizer

def translate_marian(text, src_lang="en", tgt_lang="fr"):
    model_name = f"Helsinki-NLP/opus-mt-{src_lang}-{tgt_lang}"
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
   
    encoded_text = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
    translated_tokens = model.generate(**encoded_text)
    return tokenizer.decode(translated_tokens[0], skip_special_tokens=True)