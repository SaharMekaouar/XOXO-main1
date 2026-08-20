from fastapi import FastAPI, HTTPException
from transformers import T5Tokenizer, T5ForConditionalGeneration

app = FastAPI()

# Charger le modèle T5 pour le résumé
class SummarizerT5:
    def __init__(self):
        self.tokenizer = T5Tokenizer.from_pretrained("t5-large")
        self.model = T5ForConditionalGeneration.from_pretrained("t5-large")

    def summarize(self, text: str, max_length: int) -> str:
        input_ids = self.tokenizer.encode(f"summarize: {text}", return_tensors="pt", max_length=512, truncation=True)
        output = self.model.generate(input_ids, max_length=max_length, num_beams=2, early_stopping=True)
        return self.tokenizer.decode(output[0], skip_special_tokens=True)

summarizer_t5 = SummarizerT5()

# Endpoint pour obtenir un résumé
@app.post("/summarize/")
async def summarize_text(request: dict):
    text = request.get('text', '')
    summary_type = request.get('type', 'medium').lower()

    # Tailles de résumé
    sizes = {"large": 100, "medium": 50, "small": 24}

    # Vérifier le type de résumé
    if summary_type not in sizes:
        raise HTTPException(status_code=400, detail="Type de résumé invalide. Choisir entre 'large', 'medium' ou 'small'.")

    summary = summarizer_t5.summarize(text, max_length=sizes[summary_type])
    return {"summary": summary}
