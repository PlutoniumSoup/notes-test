import re
from typing import List


WORD_RE = re.compile(r"[\w\-]{3,}", re.UNICODE)


def extract_keywords(text: str, max_keywords: int = 12) -> List[str]:
    words = [w.lower() for w in WORD_RE.findall(text)]
    stop = {
        "and",
        "the",
        "for",
        "with",
        "this",
        "that",
        "from",
        "have",
        "your",
        "что",
        "это",
        "для",
        "как",
        "или",
        "при",
        "когда",
    }
    freq = {}
    for w in words:
        if w in stop:
            continue
        freq[w] = freq.get(w, 0) + 1
    keywords = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))
    return [k for k, _ in keywords[:max_keywords]]
