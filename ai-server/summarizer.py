"""Faithful, multilingual summaries for Whisper transcriptions.

The app receives spoken content in several languages, including dialects.  A
news-trained generative model could invent details or omit the end of a long
transcription.  This extractive summarizer selects informative source sentences
instead: every word in a result comes from the supplied transcription.
"""

import re
import time
from collections import Counter
from typing import List, Sequence


SUMMARY_TYPES = {
    "basic": {"ratio": 0.18, "min_sentences": 1, "max_sentences": 5},
    "advanced": {"ratio": 0.42, "min_sentences": 2, "max_sentences": 14},
}

WORD_RE = re.compile(r"[^\W_]+", flags=re.UNICODE)
SENTENCE_BOUNDARY_RE = re.compile(r"(?<=[.!?؟])\s+|\n+")


def _words(text: str) -> List[str]:
    return [word.lower() for word in WORD_RE.findall(text)]


def _normalise_transcript(text: str) -> str:
    """Clean spacing and remove immediately repeated Whisper sentences."""
    text = re.sub(r"[ \t]+", " ", text or "")
    text = re.sub(r" *\n *", "\n", text).strip()
    unique: List[str] = []
    previous = ""
    for sentence in SENTENCE_BOUNDARY_RE.split(text):
        sentence = sentence.strip()
        key = "".join(_words(sentence))
        if sentence and key and key != previous:
            unique.append(sentence)
            previous = key
    return " ".join(unique)


def _sentences(text: str) -> List[str]:
    """Split sentences, including a safe fallback for unpunctuated recordings."""
    sentences = [part.strip() for part in SENTENCE_BOUNDARY_RE.split(text) if part.strip()]
    if len(sentences) != 1 or len(_words(text)) <= 90:
        return sentences
    clauses = [part.strip() for part in re.split(r"(?<=[,;:،؛])\s+", text) if part.strip()]
    if len(clauses) > 1:
        return clauses
    words = text.split()
    return [" ".join(words[index:index + 55]) for index in range(0, len(words), 55)]


def _sentence_score(tokens: Sequence[str], frequencies: Counter, index: int, total: int) -> float:
    if not tokens:
        return 0.0
    lexical_score = sum(frequencies[token] for token in set(tokens)) / (len(tokens) ** 0.5)
    position_bonus = 0.20 if index == 0 or index == total - 1 else 0.0
    return lexical_score + position_bonus


def _select_sentences(sentences: Sequence[str], summary_type: str) -> List[str]:
    config = SUMMARY_TYPES[summary_type]
    token_lists = [_words(sentence) for sentence in sentences]
    total_words = sum(len(tokens) for tokens in token_lists)
    target_words = min(total_words, max(1, round(total_words * config["ratio"])))
    frequencies = Counter(token for tokens in token_lists for token in tokens if len(token) > 1)
    scores = [
        _sentence_score(tokens, frequencies, index, len(sentences))
        for index, tokens in enumerate(token_lists)
    ]

    chosen: List[int] = []
    chosen_words = 0
    remaining = set(range(len(sentences)))
    while remaining and len(chosen) < config["max_sentences"]:
        def relevance(index: int) -> float:
            candidate = set(token_lists[index])
            overlap = max(
                (len(candidate & set(token_lists[selected])) /
                 max(1, len(candidate | set(token_lists[selected])))
                 for selected in chosen),
                default=0.0,
            )
            return scores[index] * (1 - 0.55 * overlap)

        best = max(remaining, key=relevance)
        if chosen and chosen_words >= target_words and len(chosen) >= config["min_sentences"]:
            break
        chosen.append(best)
        chosen_words += len(token_lists[best])
        remaining.remove(best)

    return [sentences[index] for index in sorted(chosen)]


def summary(text: str, summary_type: str = "basic", max_input_len: int = 2048) -> dict:
    """Summarise all supplied text without hallucinating or truncating it."""
    del max_input_len  # Kept only for backward-compatible API requests.
    summary_type = summary_type.lower()
    if summary_type not in SUMMARY_TYPES:
        raise ValueError("Type de résumé invalide. Choisir 'basic' ou 'advanced'.")

    cleaned = _normalise_transcript(text)
    if not cleaned:
        raise ValueError("Le texte à résumer est vide.")

    started_at = time.time()
    generated_summary = " ".join(_select_sentences(_sentences(cleaned), summary_type)).strip()
    return {"summary": generated_summary, "processing_time": time.time() - started_at}


def get_summary(text: str, summary_type: str = "basic", max_input_len: int = 2048) -> dict:
    result = summary(text, summary_type, max_input_len)
    return {
        "summary": result["summary"],
        "length": len(_words(result["summary"])),
        "summary_type": summary_type.lower(),
        "processing_time": result["processing_time"],
    }
