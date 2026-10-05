"""Natural Jenny voice for sentences, words, and short phonics sounds."""

import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.catalog import CATALOG  # noqa: E402

VOICE = "en-US-JennyNeural"
PUBLIC = ROOT / "frontend" / "public"
PHONEME_DIR = PUBLIC / "phonemes"
WORD_DIR = PUBLIC / "voice" / "words"
SENTENCE_DIR = PUBLIC / "voice" / "sentences"
NARRATION_PATH = ROOT / "frontend" / "src" / "data" / "narration.json"

# Keys are /phonemes/{key}.mp3 ids. Short /ɪ/ is "ih" (not letter-name "i").
PHONEMES = {
    "a": "ah",
    "e": "eh",
    "ih": "ih",
    "o": "aw",
    "u": "uh",
    "ay": "ay",
    "ee": "ee",
    "eye": "eye",
    "oh": "oh",
    "yoo": "you",
    "uu": "uh",
    "ooh": "ooh",
    "ar": "are",
    "er": "er",
    "or": "or",
    "air": "air",
    "ow": "ow",
    "oy": "oy",
    "schwa": "uh",
    "le": "ul",
    "all": "all",
    "b": "buh",
    "d": "duh",
    "f": "fff",
    "g": "guh",
    "h": "huh",
    "j": "juh",
    "k": "kuh",
    "l": "lah",
    "m": "mmm",
    "n": "nnn",
    "p": "puh",
    "r": "ruh",
    "s": "sss",
    "t": "tuh",
    "v": "vvv",
    "w": "wuh",
    "x": "ks",
    "y": "yuh",
    "z": "zzz",
    "sh": "shh",
    "ch": "ch",
    "th": "th",
    "dh": "thuh",
    "ng": "ng",
    "qu": "kwa",
}

BLENDS = {
    "str": "struh",
    "spr": "spruh",
    "scr": "scruh",
    "bl": "bluh",
    "br": "bruh",
    "cl": "cluh",
    "cr": "cruh",
    "dr": "druh",
    "fl": "fluh",
    "fr": "fruh",
    "gl": "gluh",
    "gr": "gruh",
    "pl": "pluh",
    "pr": "pruh",
    "sc": "scuh",
    "sk": "skuh",
    "sl": "sluh",
    "sm": "smuh",
    "sn": "snuh",
    "sp": "spuh",
    "st": "stuh",
    "sw": "swuh",
    "tr": "truh",
    "tw": "twuh",
}


def letters(token: str) -> str:
    return re.sub(r"[^a-z']", "", token.lower())


def sentence_key(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z'\s]", "", text)
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def subprocess_trim(source: Path, target: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(source), "-t", "0.22", "-c:a", "libmp3lame", "-q:a", "5", str(target)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


async def synthesize(text: str, path: Path) -> list[dict]:
    path.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text, VOICE, boundary="WordBoundary")
    audio = bytearray()
    words = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / 10_000_000
            end = start + chunk["duration"] / 10_000_000
            words.append({"word": chunk["text"], "start": round(start, 3), "end": round(end, 3)})
    path.write_bytes(audio)
    return words


async def main() -> None:
    sentences: list[str] = []
    words: set[str] = set()
    for story in CATALOG:
        for page in story["pages"]:
            text = " ".join(item["word"] for item in page["alignment_data"])
            sentences.append(text)
            for item in page["alignment_data"]:
                core = letters(item["word"])
                if core:
                    words.add(core)

    narration: dict[str, dict] = {}
    for index, text in enumerate(sentences, start=1):
        filename = f"s{index:02d}.mp3"
        boundaries = await synthesize(text, SENTENCE_DIR / filename)
        narration[sentence_key(text)] = {"url": f"/voice/sentences/{filename}", "words": boundaries}
        print("sentence", text)

    for word in sorted(words):
        await synthesize(word, WORD_DIR / f"{word}.mp3")
    print("words", len(words))

    vowels = {"a", "e", "ih", "o", "u", "ay", "ee", "eye", "oh", "yoo", "uu", "ooh", "ar", "er", "or", "air", "ow", "oy", "schwa", "le", "all"}
    for name, prompt in {**PHONEMES, **BLENDS}.items():
        target = PHONEME_DIR / f"{name}.mp3"
        await synthesize(prompt, target)
        if name not in vowels:
            trimmed = target.with_suffix(".trim.mp3")
            subprocess_trim(target, trimmed)
            trimmed.replace(target)
    # Legacy alias so old clients asking for i.mp3 still get short /ɪ/.
    legacy = PHONEME_DIR / "i.mp3"
    legacy.write_bytes((PHONEME_DIR / "ih.mp3").read_bytes())
    for old in PHONEME_DIR.glob("*.wav"):
        old.unlink()
    print("phonemes", len(PHONEMES))

    NARRATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    NARRATION_PATH.write_text(json.dumps(narration, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", NARRATION_PATH)


if __name__ == "__main__":
    asyncio.run(main())
