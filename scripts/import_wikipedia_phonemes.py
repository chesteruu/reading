"""Import human IPA reference clips from cluesurf/wikipedia-ipa (CC-BY-SA-4.0).

Source: https://huggingface.co/datasets/cluesurf/wikipedia-ipa
Recordings from Wikimedia Commons IPA chart — real speakers, not TTS.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "phonemes"
ATTRIBUTION = OUT / "ATTRIBUTION.md"

# App speak id -> one or more Wikipedia IPA symbol filenames (without .wav).
# Diphthongs and clusters are built by concatenating isolated symbols.
SPEAK_TO_SYMBOLS: dict[str, list[str]] = {
    "a": ["æ"],
    "e": ["ɛ"],
    "ih": ["ɪ"],
    "o": ["ɒ"],
    "u": ["ʌ"],
    "uu": ["ʊ"],
    "schwa": ["ə"],
    "ee": ["i"],
    "ooh": ["u"],
    "ar": ["ɑ"],
    "er": ["ɜ"],
    "or": ["ɔ"],
    "ay": ["e", "ɪ"],
    "eye": ["a", "ɪ"],
    "oh": ["o", "ʊ"],
    "ow": ["a", "ʊ"],
    "oy": ["ɔ", "ɪ"],
    "yoo": ["j", "u"],
    "air": ["ɛ", "ə"],
    "le": ["ə", "l"],
    "all": ["ɔ", "l"],
    "b": ["b"],
    "d": ["d"],
    "f": ["f"],
    "g": ["ɡ"],
    "h": ["h"],
    "j": ["d̠ʒ"],
    "k": ["k"],
    "l": ["l"],
    "m": ["m"],
    "n": ["n"],
    "p": ["p"],
    "r": ["ɹ"],
    "s": ["s"],
    "t": ["t"],
    "v": ["v"],
    "w": ["w"],
    "y": ["j"],
    "z": ["z"],
    "sh": ["ʃ"],
    "ch": ["t̠ʃ"],
    "th": ["θ"],
    "dh": ["ð"],
    "ng": ["ŋ"],
    "x": ["k", "s"],
    "qu": ["k", "w"],
}

BLENDS = [
    "str",
    "spr",
    "scr",
    "bl",
    "br",
    "cl",
    "cr",
    "dr",
    "fl",
    "fr",
    "gl",
    "gr",
    "pl",
    "pr",
    "sc",
    "sk",
    "sl",
    "sm",
    "sn",
    "sp",
    "st",
    "sw",
    "tr",
    "tw",
]


def dataset_root() -> Path:
    path = snapshot_download(repo_id="cluesurf/wikipedia-ipa", repo_type="dataset", allow_patterns=["base/**"])
    return Path(path)


def resolve_wav(root: Path, symbol: str) -> Path:
    for kind in ("consonant", "vowel"):
        candidate = root / "base" / kind / "audio" / f"{symbol}.wav"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"No Wikipedia IPA wav for symbol {symbol!r}")


def normalize_to_mp3(sources: list[Path], target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if len(sources) == 1:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(sources[0]),
                "-af",
                "silenceremove=1:0:-45dB,areverse,silenceremove=1:0:-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
                "-t",
                "0.35",
                "-c:a",
                "libmp3lame",
                "-q:a",
                "4",
                str(target),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        parts: list[Path] = []
        for index, source in enumerate(sources):
            part = tmp_path / f"p{index}.wav"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(source),
                    "-af",
                    "silenceremove=1:0:-45dB,areverse,silenceremove=1:0:-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-t",
                    "0.28",
                    str(part),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            parts.append(part)

        list_file = tmp_path / "list.txt"
        list_file.write_text("\n".join(f"file '{p}'" for p in parts) + "\n", encoding="utf-8")
        merged = tmp_path / "merged.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", str(merged)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(merged),
                "-af",
                "loudnorm=I=-16:TP=-1.5:LRA=11",
                "-t",
                "0.55",
                "-c:a",
                "libmp3lame",
                "-q:a",
                "4",
                str(target),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def main() -> None:
    root = dataset_root()
    OUT.mkdir(parents=True, exist_ok=True)

    items = dict(SPEAK_TO_SYMBOLS)
    for blend in BLENDS:
        items[blend] = []

    missing: list[str] = []
    for name, symbols in items.items():
        try:
            if name in BLENDS:
                resolved: list[Path] = []
                for letter in name:
                    key = {"c": "k", "q": "k"}.get(letter, letter)
                    if key not in SPEAK_TO_SYMBOLS:
                        raise KeyError(f"blend letter {letter} in {name}")
                    for sym in SPEAK_TO_SYMBOLS[key]:
                        resolved.append(resolve_wav(root, sym))
                wavs = resolved
            else:
                wavs = [resolve_wav(root, sym if sym != "g" else "ɡ") for sym in symbols]
        except (FileNotFoundError, KeyError) as err:
            missing.append(f"{name}: {err}")
            continue

        target = OUT / f"{name}.mp3"
        normalize_to_mp3(wavs, target)
        print("wrote", target.name)

    legacy = OUT / "i.mp3"
    legacy.write_bytes((OUT / "ih.mp3").read_bytes())

    ATTRIBUTION.write_text(
        """# Phoneme audio attribution

Isolated phoneme clips are derived from the **Wikipedia IPA** open dataset
([cluesurf/wikipedia-ipa](https://huggingface.co/datasets/cluesurf/wikipedia-ipa)),
which aggregates human recordings from the Wikimedia Commons IPA chart.

- License: [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Regenerated by `scripts/import_wikipedia_phonemes.py` (trim, loudness normalize, MP3)

Sentence and whole-word narration still uses Microsoft Edge neural TTS (Jenny) where noted in the app.
""",
        encoding="utf-8",
    )

    if missing:
        print("MISSING:")
        for line in missing:
            print(" ", line)
    print(f"done — {len(list(OUT.glob('*.mp3')))} mp3 files in {OUT}")


if __name__ == "__main__":
    main()
