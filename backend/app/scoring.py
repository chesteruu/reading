"""Pure scoring helpers for the three touch activities."""

from __future__ import annotations


def score_sequence(submitted: list[str], expected: list[str]) -> bool:
    return list(submitted) == list(expected) and len(submitted) > 0


def score_detective(x: float, y: float, target: dict) -> bool:
    dx = float(x) - float(target["x"])
    dy = float(y) - float(target["y"])
    radius = float(target["r"])
    return dx * dx + dy * dy <= radius * radius


def score_match(pairs: list[dict], expected_ids: list[str]) -> bool:
    if len(pairs) != len(expected_ids):
        return False
    linked: dict[str, str] = {}
    for pair in pairs:
        left = str(pair.get("left", ""))
        right = str(pair.get("right", ""))
        if left in linked:
            return False
        linked[left] = right
    return all(linked.get(item) == item for item in expected_ids)


def level_index(level: str) -> int:
    order = ["aa", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    try:
        return order.index(level)
    except ValueError:
        return 0


def level_fit(book_level: str, child_level: str) -> str:
    delta = level_index(book_level) - level_index(child_level)
    if delta < 0:
        return "review"
    if delta == 0:
        return "ready"
    if delta == 1:
        return "challenge"
    return "locked"


def align_sentence(text: str) -> list[dict]:
    words = text.split()
    cursor = 0.18
    aligned = []
    for word in words:
        duration = max(0.32, 0.24 + 0.045 * len(word.strip(".,!?")))
        aligned.append({"word": word, "start": round(cursor, 2), "end": round(cursor + duration, 2)})
        cursor += duration + 0.08
    return aligned
