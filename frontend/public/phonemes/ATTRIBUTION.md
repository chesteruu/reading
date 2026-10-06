# Phoneme audio pack

All clips are **human recordings**, converted to MP3 for the reader.

| Kind | Source | License |
|------|--------|---------|
| Vowels & most consonants | [cluesurf/wikipedia-ipa](https://huggingface.co/datasets/cluesurf/wikipedia-ipa) | CC-BY-SA 4.0 |
| Nasals `m n ng` | Same IPA chart, **murmur-only** slice (drops the open vowel so `m` ≠ 「ma」) | CC-BY-SA 4.0 |
| Stop consonants `p t k b d g` | Commons En-us word **onsets** (aspirated English /k/ etc., so Mandarin ears do not hear IPA [k] as 「ga」) | CC-BY-SA |
| Diphthongs | Commons `En-us-*.ogg` continuous glides | CC-BY-SA |

Regenerate: `python3 scripts/import_wikipedia_phonemes.py`

See `manifest.json` for the exact speak-id → source mapping.
