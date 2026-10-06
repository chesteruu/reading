"""Import human phoneme clips for phonics decoding.

- Monophthongs + consonants: cluesurf/wikipedia-ipa (Wikimedia IPA chart, CC-BY-SA)
- Diphthongs: continuous English word recordings from Wikimedia Commons (En-us-*.ogg)
  so /eɪ/ /aɪ/ etc. glide as one sound instead of “a then i”.
"""

from __future__ import annotations

import hashlib
import subprocess
import tempfile
import urllib.request
from pathlib import Path

from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "phonemes"
ATTRIBUTION = OUT / "ATTRIBUTION.md"
UA = "Mozilla/5.0 (compatible; reading-app/1.0; +https://github.com/chesteruu/reading)"

# Isolated IPA chart symbols (monophthongs / consonants).
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
    "le": ["ə", "l"],
}

# Continuous human diphthong / rime clips (Commons filenames).
# Do NOT concatenate monophthongs for these — that sounds like “a - i”.
DIPHTHONG_COMMONS: dict[str, dict] = {
    # Letter name “A” is continuous /eɪ/ (covers digraph ai/ay).
    "ay": {"file": "En-us-a.ogg", "ss": 0.0, "t": 0.55},
    # Pronoun “I” is continuous /aɪ/.
    "eye": {"file": "En-us-I.ogg", "ss": 0.0, "t": 0.45},
    "oh": {"file": "En-us-owe.ogg", "ss": 0.0, "t": 0.50},
    "ow": {"file": "En-us-ow.ogg", "ss": 0.0, "t": 0.45},
    # Skip initial /b/ of “boy” → continuous /ɔɪ/.
    "oy": {"file": "En-us-boy.ogg", "ss": 0.10, "t": 0.40},
    "yoo": {"file": "En-us-you.ogg", "ss": 0.0, "t": 0.40},
    "air": {"file": "En-us-air.ogg", "ss": 0.0, "t": 0.50},
    "all": {"file": "En-us-all.ogg", "ss": 0.0, "t": 0.40},
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


def download_commons(filename: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    md5 = hashlib.md5(filename.encode()).hexdigest()
    url = f"https://upload.wikimedia.org/wikipedia/commons/{md5[0]}/{md5[:2]}/{filename}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        data = urllib.request.urlopen(req, timeout=45).read()
    except Exception:
        fallback = f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename}"
        req = urllib.request.Request(fallback, headers={"User-Agent": UA})
        data = urllib.request.urlopen(req, timeout=45).read()
    dest.write_bytes(data)
    return dest


def encode_mp3(source: Path, target: Path, *, ss: float = 0.0, duration: float = 0.4) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    args = ["ffmpeg", "-y"]
    if ss > 0:
        args += ["-ss", f"{ss:.3f}"]
    args += [
        "-i",
        str(source),
        "-t",
        f"{duration:.3f}",
        "-af",
        "silenceremove=1:0:-45dB,areverse,silenceremove=1:0:-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
        "-c:a",
        "libmp3lame",
        "-q:a",
        "4",
        str(target),
    ]
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def concat_to_mp3(sources: list[Path], target: Path, *, part_t: float = 0.28, total_t: float = 0.55) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if len(sources) == 1:
        encode_mp3(sources[0], target, duration=min(0.4, total_t))
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
                    f"{part_t:.3f}",
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
        encode_mp3(merged, target, duration=total_t)


def main() -> None:
    root = dataset_root()
    OUT.mkdir(parents=True, exist_ok=True)
    cache = Path(tempfile.mkdtemp(prefix="commons-phonemes-"))

    missing: list[str] = []

    # 1) Continuous diphthongs from Commons English word recordings.
    for name, spec in DIPHTHONG_COMMONS.items():
        try:
            ogg = download_commons(spec["file"], cache / spec["file"])
            encode_mp3(ogg, OUT / f"{name}.mp3", ss=float(spec["ss"]), duration=float(spec["t"]))
            print("diphthong", name, "←", spec["file"])
        except Exception as err:
            missing.append(f"{name}: {err}")

    # 2) Isolated IPA monophthongs / consonants.
    for name, symbols in SPEAK_TO_SYMBOLS.items():
        try:
            wavs = [resolve_wav(root, sym) for sym in symbols]
            concat_to_mp3(wavs, OUT / f"{name}.mp3", part_t=0.22 if len(wavs) > 1 else 0.35, total_t=0.45)
            print("ipa", name)
        except Exception as err:
            missing.append(f"{name}: {err}")

    # 3) Consonant blends (sequential stops/fricatives — concat is correct).
    for blend in BLENDS:
        try:
            resolved: list[Path] = []
            for letter in blend:
                key = {"c": "k", "q": "k"}.get(letter, letter)
                for sym in SPEAK_TO_SYMBOLS[key]:
                    resolved.append(resolve_wav(root, sym))
            concat_to_mp3(resolved, OUT / f"{blend}.mp3", part_t=0.18, total_t=0.55)
            print("blend", blend)
        except Exception as err:
            missing.append(f"{blend}: {err}")

    legacy = OUT / "i.mp3"
    legacy.write_bytes((OUT / "ih.mp3").read_bytes())

    ATTRIBUTION.write_text(
        """# Phoneme audio attribution

## Isolated vowels & consonants
Derived from **Wikipedia IPA** ([cluesurf/wikipedia-ipa](https://huggingface.co/datasets/cluesurf/wikipedia-ipa)),
human recordings from the Wikimedia Commons IPA chart.
License: [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## Diphthongs (continuous glides)
English word recordings from Wikimedia Commons (`En-us-*.ogg`), trimmed to the vowel:
- `ay` ← En-us-a.ogg (letter A = /eɪ/)
- `eye` ← En-us-I.ogg (/aɪ/)
- `oh` ← En-us-owe.ogg
- `ow` ← En-us-ow.ogg
- `oy` ← En-us-boy.ogg (onset trimmed)
- `yoo` ← En-us-you.ogg
- `air` ← En-us-air.ogg
- `all` ← En-us-all.ogg

Regenerated by `scripts/import_wikipedia_phonemes.py`.
Sentence / whole-word narration still uses Microsoft Edge neural TTS (Jenny).
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
