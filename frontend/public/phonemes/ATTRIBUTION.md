# Phoneme audio pack

All clips are **human recordings**, converted to MP3 for the reader.

| Kind | Source | License |
|------|--------|---------|
| Vowels & consonants | [cluesurf/wikipedia-ipa](https://huggingface.co/datasets/cluesurf/wikipedia-ipa) (Wikimedia IPA chart) | CC-BY-SA 4.0 |
| Diphthongs | Wikimedia Commons `En-us-*.ogg` word recordings (trimmed to the glide) | CC-BY-SA |

Regenerate: `python3 scripts/import_wikipedia_phonemes.py`

See `manifest.json` for the exact speak-id → source mapping.
