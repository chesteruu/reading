"""Build isolated phoneme clips so phonics playback is a sound, not a spelled hint."""

import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "phonemes"

PHONEMES = {
    "a": "a",
    "e": "E",
    "i": "I",
    "o": "0",
    "u": "V",
    "ay": "eI",
    "ee": "i:",
    "eye": "aI",
    "oh": "oU",
    "yoo": "ju:",
    "uu": "U",
    "ooh": "u:",
    "ar": "A:",
    "er": "3:",
    "or": "O:",
    "air": "e@",
    "ow": "aU",
    "oy": "OI",
    "schwa": "@",
    "le": "@l",
    "all": "O:l",
    "b": "b",
    "d": "d",
    "f": "f",
    "g": "g",
    "h": "h",
    "j": "dZ",
    "k": "k",
    "l": "l",
    "m": "m",
    "n": "n",
    "p": "p",
    "r": "r",
    "s": "s",
    "t": "t",
    "v": "v",
    "w": "w",
    "x": "ks",
    "y": "j",
    "z": "z",
    "sh": "S",
    "ch": "tS",
    "th": "T",
    "dh": "D",
    "ng": "N",
    "qu": "k w",
}

BLENDS = ["str", "spr", "scr", "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc", "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw"]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    items = dict(PHONEMES)
    for blend in BLENDS:
        items[blend] = " ".join(blend)
    for name, phoneme in items.items():
        target = OUT / f"{name}.wav"
        subprocess.run(["espeak-ng", "-v", "en-us", "-w", str(target), f"[[{phoneme}]]"], check=True)
    print(f"wrote {len(items)} phoneme clips to {OUT}")


if __name__ == "__main__":
    main()
