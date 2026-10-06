"""Download a complete human vowel + consonant phoneme pack and write MP3s.

Sources (both CC-BY-SA via Wikimedia):
1. Isolated IPA chart symbols — cluesurf/wikipedia-ipa
2. Continuous English diphthongs — Commons En-us-*.ogg (one glide, not a+i)

Every app speak-id maps to exactly one playable file under
frontend/public/phonemes/{id}.mp3. No runtime concatenation.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import urllib.request
from pathlib import Path

from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "phonemes"
MANIFEST = OUT / "manifest.json"
ATTRIBUTION = OUT / "ATTRIBUTION.md"
UA = "Mozilla/5.0 (compatible; reading-app/1.0; +https://github.com/chesteruu/reading)"

# --- Isolated IPA chart symbols (one wav → one mp3) ---
# speak_id → Wikipedia IPA symbol filename (without .wav)
IPA_VOWELS: dict[str, str] = {
    "a": "æ",  # cat
    "e": "ɛ",  # bed
    "ih": "ɪ",  # sit
    "o": "ɒ",  # hot (RP chart; closest open back rounded)
    "u": "ʌ",  # cup
    "uu": "ʊ",  # put
    "schwa": "ə",
    "ee": "i",  # see (close front)
    "ooh": "u",  # food
    "ar": "ɑ",  # father
    "er": "ɜ",  # bird
    "or": "ɔ",  # thought
}

IPA_CONSONANTS: dict[str, str] = {
    "f": "f",
    "h": "h",
    "j": "d̠ʒ",
    "l": "l",
    "m": "m",
    "n": "n",
    "r": "ɹ",
    "s": "s",
    "v": "v",
    "w": "w",
    "y": "j",
    "z": "z",
    "sh": "ʃ",
    "ch": "t̠ʃ",
    "th": "θ",
    "dh": "ð",
    "ng": "ŋ",
}

# English word onsets for stops. IPA-chart /k/ is often unaspirated [k],
# which Mandarin ears hear as 「ga」(ㄍ). Use aspirated En-us word attacks instead.
STOP_ONSETS: dict[str, dict] = {
    # Prefer words whose vowel is NOT open /a/ — otherwise Chinese ears hear 「ga」.
    "p": {"file": "En-us-pen.ogg", "ss": 0.0, "t": 0.11},
    "t": {"file": "En-us-ten.ogg", "ss": 0.0, "t": 0.11},
    "k": {"file": "En-us-key.ogg", "ss": 0.0, "t": 0.11},  # aspirated /kʰ/, not IPA [k]→「ga」
    "b": {"file": "En-us-bee.ogg", "ss": 0.0, "t": 0.11},
    "d": {"file": "En-us-day.ogg", "ss": 0.0, "t": 0.10},
    "g": {"file": "En-us-go.ogg", "ss": 0.0, "t": 0.11},
}

# Clusters are assembled in main() from already-baked clips (x=k+s, qu=k+w, le=schwa+l).

# Continuous diphthong / rime clips — NEVER stitch monophthongs for these.
DIPHTHONGS: dict[str, dict] = {
    "ay": {"file": "En-us-a.ogg", "ss": 0.0, "t": 0.50},  # letter A = continuous /eɪ/
    "eye": {"file": "En-us-I.ogg", "ss": 0.0, "t": 0.45},
    "oh": {"file": "En-us-owe.ogg", "ss": 0.0, "t": 0.50},
    "ow": {"file": "En-us-ow.ogg", "ss": 0.0, "t": 0.45},
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
    return Path(snapshot_download(repo_id="cluesurf/wikipedia-ipa", repo_type="dataset", allow_patterns=["base/**"]))


def resolve_ipa(root: Path, symbol: str) -> Path:
    for kind in ("consonant", "vowel"):
        candidate = root / "base" / kind / "audio" / f"{symbol}.wav"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(symbol)


def download_commons(filename: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and dest.stat().st_size > 1000:
        return dest
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


def to_mp3(source: Path, target: Path, *, ss: float = 0.0, duration: float | None = None) -> None:
    """Light trim + loudness match. Strip leading/trailing silence before duration cap."""
    target.parent.mkdir(parents=True, exist_ok=True)
    # First pass: optional seek + silence strip to wav, then loudnorm/mp3 with duration.
    with tempfile.TemporaryDirectory() as tmp:
        cleaned = Path(tmp) / "cleaned.wav"
        args = ["ffmpeg", "-y"]
        if ss > 0:
            args += ["-ss", f"{ss:.3f}"]
        args += [
            "-i",
            str(source),
            "-af",
            "silenceremove=start_periods=1:start_silence=0.01:start_threshold=-40dB,"
            "areverse,silenceremove=start_periods=1:start_silence=0.01:start_threshold=-40dB,areverse",
            str(cleaned),
        ]
        subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        args2 = ["ffmpeg", "-y", "-i", str(cleaned)]
        if duration is not None:
            args2 += ["-t", f"{duration:.3f}"]
        args2 += [
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "4",
            str(target),
        ]
        subprocess.run(args2, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def concat_sources(sources: list[Path], target: Path, *, part_t: float = 0.2) -> None:
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
                    "silenceremove=start_periods=1:start_threshold=-40dB,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-40dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
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
        to_mp3(merged, target)


def main() -> None:
    root = dataset_root()
    OUT.mkdir(parents=True, exist_ok=True)
    cache = Path(tempfile.mkdtemp(prefix="commons-phonemes-"))
    manifest: dict[str, dict] = {}
    missing: list[str] = []

    print("=== vowels (IPA chart) ===")
    for speak, symbol in IPA_VOWELS.items():
        try:
            wav = resolve_ipa(root, symbol)
            to_mp3(wav, OUT / f"{speak}.mp3", duration=0.45)
            manifest[speak] = {"kind": "vowel", "source": "wikipedia-ipa", "symbol": symbol}
            print("  ", speak, "←", symbol)
        except Exception as err:
            missing.append(f"{speak}: {err}")

    print("=== consonants (IPA chart) ===")
    for speak, symbol in IPA_CONSONANTS.items():
        try:
            wav = resolve_ipa(root, symbol)
            to_mp3(wav, OUT / f"{speak}.mp3", duration=0.40)
            manifest[speak] = {"kind": "consonant", "source": "wikipedia-ipa", "symbol": symbol}
            print("  ", speak, "←", symbol)
        except Exception as err:
            missing.append(f"{speak}: {err}")

    print("=== stop onsets (aspirated En-us words) ===")
    for speak, spec in STOP_ONSETS.items():
        try:
            ogg = download_commons(spec["file"], cache / spec["file"])
            # Strip leading silence then keep only the attack (+ tiny vowel color).
            to_mp3(ogg, OUT / f"{speak}.mp3", ss=float(spec["ss"]), duration=float(spec["t"]))
            manifest[speak] = {"kind": "stop", "source": "commons-onset", "file": spec["file"]}
            print("  ", speak, "←", spec["file"])
        except Exception as err:
            missing.append(f"{speak}: {err}")

    print("=== diphthongs (continuous Commons) ===")
    for speak, spec in DIPHTHONGS.items():
        try:
            ogg = download_commons(spec["file"], cache / spec["file"])
            to_mp3(ogg, OUT / f"{speak}.mp3", ss=float(spec["ss"]), duration=float(spec["t"]))
            manifest[speak] = {"kind": "diphthong", "source": "commons", "file": spec["file"]}
            print("  ", speak, "←", spec["file"])
        except Exception as err:
            missing.append(f"{speak}: {err}")

    print("=== clusters ===")
    # x=/ks/, qu=/kw/ — stitch already-baked stop + consonant clips.
    cluster_ids = {
        "x": ["k", "s"],
        "qu": ["k", "w"],
        "le": ["schwa", "l"],
    }
    for speak, parts in cluster_ids.items():
        try:
            sources = [OUT / f"{p}.mp3" for p in parts]
            for src in sources:
                if not src.is_file():
                    raise FileNotFoundError(src)
            concat_sources(sources, OUT / f"{speak}.mp3", part_t=0.16)
            manifest[speak] = {"kind": "cluster", "parts": parts}
            print("  ", speak, "←", "+".join(parts))
        except Exception as err:
            missing.append(f"{speak}: {err}")

    print("=== blends ===")
    for blend in BLENDS:
        try:
            sources = []
            for letter in blend:
                key = {"c": "k", "q": "k"}.get(letter, letter)
                path = OUT / f"{key}.mp3"
                if not path.is_file():
                    raise FileNotFoundError(path)
                sources.append(path)
            concat_sources(sources, OUT / f"{blend}.mp3", part_t=0.14)
            manifest[blend] = {"kind": "blend", "letters": blend}
            print("  ", blend)
        except Exception as err:
            missing.append(f"{blend}: {err}")

    # Legacy alias: old clients asking for i.mp3 get short /ɪ/.
    (OUT / "i.mp3").write_bytes((OUT / "ih.mp3").read_bytes())
    manifest["i"] = {"kind": "alias", "aliasOf": "ih"}

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ATTRIBUTION.write_text(
        """# Phoneme audio pack

All clips are **human recordings**, converted to MP3 for the reader.

| Kind | Source | License |
|------|--------|---------|
| Vowels & most consonants | [cluesurf/wikipedia-ipa](https://huggingface.co/datasets/cluesurf/wikipedia-ipa) | CC-BY-SA 4.0 |
| Stop consonants `p t k b d g` | Commons En-us word **onsets** (aspirated English /k/ etc., so Mandarin ears do not hear IPA [k] as 「ga」) | CC-BY-SA |
| Diphthongs | Commons `En-us-*.ogg` continuous glides | CC-BY-SA |

Regenerate: `python3 scripts/import_wikipedia_phonemes.py`

See `manifest.json` for the exact speak-id → source mapping.
""",
        encoding="utf-8",
    )

    if missing:
        print("MISSING:")
        for line in missing:
            print(" ", line)
        raise SystemExit(1)

    print(f"\nOK — {len(list(OUT.glob('*.mp3')))} mp3 files, {len(manifest)} manifest entries")


if __name__ == "__main__":
    main()
