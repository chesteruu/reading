export type GraphemeKind = "vowel" | "consonant" | "silent";

export type Grapheme = {
  text: string;
  speak: string;
  kind: GraphemeKind;
  /** Highlight this silent letter together with another grapheme (magic e). */
  linkedTo?: number;
};

const SHORT: Record<string, string> = { a: "a", e: "e", i: "i", o: "o", u: "u" };
const LONG: Record<string, string> = { a: "ay", e: "ee", i: "eye", o: "oh", u: "yoo" };
const CONSONANT: Record<string, string> = {
  b: "b",
  c: "k",
  d: "d",
  f: "f",
  g: "g",
  h: "h",
  j: "j",
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  p: "p",
  q: "k",
  r: "r",
  s: "s",
  t: "t",
  v: "v",
  w: "w",
  x: "x",
  y: "y",
  z: "z",
};

const CHUNK_SPEAK: Record<string, { speak: string; kind: GraphemeKind }> = {
  igh: { speak: "eye", kind: "vowel" },
  air: { speak: "air", kind: "vowel" },
  ear: { speak: "ee", kind: "vowel" },
  eer: { speak: "ee", kind: "vowel" },
  oor: { speak: "or", kind: "vowel" },
  all: { speak: "all", kind: "vowel" },
  oa: { speak: "oh", kind: "vowel" },
  ow: { speak: "oh", kind: "vowel" },
  ou: { speak: "ow", kind: "vowel" },
  oo: { speak: "ooh", kind: "vowel" },
  oi: { speak: "oy", kind: "vowel" },
  oy: { speak: "oy", kind: "vowel" },
  ai: { speak: "ay", kind: "vowel" },
  ay: { speak: "ay", kind: "vowel" },
  ee: { speak: "ee", kind: "vowel" },
  ea: { speak: "ee", kind: "vowel" },
  ie: { speak: "ee", kind: "vowel" },
  ey: { speak: "ay", kind: "vowel" },
  ue: { speak: "ooh", kind: "vowel" },
  ew: { speak: "ooh", kind: "vowel" },
  aw: { speak: "or", kind: "vowel" },
  au: { speak: "or", kind: "vowel" },
  ar: { speak: "ar", kind: "vowel" },
  or: { speak: "or", kind: "vowel" },
  er: { speak: "er", kind: "vowel" },
  ir: { speak: "er", kind: "vowel" },
  ur: { speak: "er", kind: "vowel" },
  sh: { speak: "sh", kind: "consonant" },
  ch: { speak: "ch", kind: "consonant" },
  th: { speak: "th", kind: "consonant" },
  wh: { speak: "w", kind: "consonant" },
  ph: { speak: "f", kind: "consonant" },
  ck: { speak: "k", kind: "consonant" },
  ng: { speak: "ng", kind: "consonant" },
  qu: { speak: "qu", kind: "consonant" },
  kn: { speak: "n", kind: "consonant" },
  wr: { speak: "r", kind: "consonant" },
};

const BLENDS = ["str", "spr", "scr", "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc", "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw"];
const DOUBLES = ["bb", "dd", "ff", "gg", "ll", "mm", "nn", "pp", "rr", "ss", "tt", "zz"];

const CHUNKS = [...Object.keys(CHUNK_SPEAK), ...BLENDS, ...DOUBLES].sort((a, b) => b.length - a.length);

const SHORT_OO = new Set(["look", "good", "book", "foot", "wood"]);
const OVERRIDES: Record<string, Grapheme[]> = {
  a: [{ text: "a", speak: "schwa", kind: "vowel" }],
  the: [
    { text: "th", speak: "dh", kind: "consonant" },
    { text: "e", speak: "schwa", kind: "vowel" },
  ],
  to: [
    { text: "t", speak: "t", kind: "consonant" },
    { text: "o", speak: "ooh", kind: "vowel" },
  ],
  of: [
    { text: "o", speak: "schwa", kind: "vowel" },
    { text: "f", speak: "f", kind: "consonant" },
  ],
  mia: [
    { text: "m", speak: "m", kind: "consonant" },
    { text: "i", speak: "ee", kind: "vowel" },
    { text: "a", speak: "schwa", kind: "vowel" },
  ],
  gold: [
    { text: "g", speak: "g", kind: "consonant" },
    { text: "o", speak: "oh", kind: "vowel" },
    { text: "l", speak: "l", kind: "consonant" },
    { text: "d", speak: "d", kind: "consonant" },
  ],
  mango: [
    { text: "m", speak: "m", kind: "consonant" },
    { text: "a", speak: "a", kind: "vowel" },
    { text: "ng", speak: "ng", kind: "consonant" },
    { text: "o", speak: "oh", kind: "vowel" },
  ],
  paper: [
    { text: "p", speak: "p", kind: "consonant" },
    { text: "a", speak: "ay", kind: "vowel" },
    { text: "p", speak: "p", kind: "consonant" },
    { text: "er", speak: "er", kind: "vowel" },
  ],
  walk: [
    { text: "w", speak: "w", kind: "consonant" },
    { text: "al", speak: "all", kind: "vowel" },
    { text: "k", speak: "k", kind: "consonant" },
  ],
  warm: [
    { text: "w", speak: "w", kind: "consonant" },
    { text: "ar", speak: "or", kind: "vowel" },
    { text: "m", speak: "m", kind: "consonant" },
  ],
  share: [
    { text: "sh", speak: "sh", kind: "consonant" },
    { text: "are", speak: "air", kind: "vowel" },
  ],
  full: [
    { text: "f", speak: "f", kind: "consonant" },
    { text: "u", speak: "uu", kind: "vowel" },
    { text: "ll", speak: "l", kind: "consonant" },
  ],
  opens: [
    { text: "o", speak: "oh", kind: "vowel" },
    { text: "p", speak: "p", kind: "consonant" },
    { text: "e", speak: "e", kind: "vowel" },
    { text: "n", speak: "n", kind: "consonant" },
    { text: "s", speak: "s", kind: "consonant" },
  ],
};

function consonantSpeak(text: string): string {
  if (text.length === 1) return CONSONANT[text] ?? text;
  if (DOUBLES.includes(text)) return CONSONANT[text[0]] ?? text;
  return text;
}

function chunkOf(text: string, word: string): Grapheme {
  if (BLENDS.includes(text) || DOUBLES.includes(text)) {
    return { text, speak: consonantSpeak(text), kind: "consonant" };
  }
  const known = CHUNK_SPEAK[text];
  if (!known) return { text, speak: text, kind: "consonant" };
  if (text === "oo" && SHORT_OO.has(word)) return { text, speak: "uu", kind: "vowel" };
  return { text, speak: known.speak, kind: known.kind };
}

function segmentStem(word: string): Grapheme[] {
  const out: Grapheme[] = [];
  let index = 0;
  while (index < word.length) {
    const rest = word.slice(index);
    if (/^[aeiou][^aeiou]e$/.test(rest)) {
      const vowelAt = out.length;
      out.push({ text: rest[0], speak: LONG[rest[0]] ?? rest[0], kind: "vowel" });
      out.push({ text: rest[1], speak: CONSONANT[rest[1]] ?? rest[1], kind: "consonant" });
      out.push({ text: "e", speak: "", kind: "silent", linkedTo: vowelAt });
      break;
    }
    if (rest === "le") {
      out.push({ text: "le", speak: "le", kind: "vowel" });
      break;
    }
    const chunk = CHUNKS.find((item) => rest.startsWith(item));
    if (chunk && !(chunk === "ar" && rest.startsWith("arr"))) {
      out.push(chunkOf(chunk, word));
      index += chunk.length;
      continue;
    }
    const letter = word[index];
    if (letter === "y" && index > 0) {
      const sound = word.length <= 3 ? "eye" : "ee";
      out.push({ text: "y", speak: sound, kind: "vowel" });
    } else if ("aeiou".includes(letter)) {
      out.push({ text: letter, speak: SHORT[letter] ?? letter, kind: "vowel" });
    } else {
      out.push({ text: letter, speak: CONSONANT[letter] ?? letter, kind: "consonant" });
    }
    index += 1;
  }
  if (out.length >= 3) {
    const vowel = out[out.length - 3];
    const cons = out[out.length - 2];
    const ending = out[out.length - 1];
    if (ending.text === "e" && ending.kind !== "silent" && cons.kind === "consonant" && cons.text.length === 1 && vowel.kind === "vowel") {
      ending.speak = "";
      ending.kind = "silent";
      ending.linkedTo = out.length - 3;
      if (vowel.text.length === 1 && LONG[vowel.text]) vowel.speak = LONG[vowel.text];
    }
  }
  return out;
}

export function lettersOf(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, "");
}

export function segmentToken(token: string): Grapheme[] {
  const core = lettersOf(token);
  if (!core) return [{ text: token, speak: "", kind: "silent" }];
  if (OVERRIDES[core]) {
    const graphs = OVERRIDES[core].map((graph) => ({ ...graph }));
    if (token[0] === token[0].toUpperCase()) graphs[0].text = graphs[0].text[0].toUpperCase() + graphs[0].text.slice(1);
    const tail = token.match(/[^a-zA-Z]+$/)?.[0];
    if (tail) graphs.push({ text: tail, speak: "", kind: "silent" });
    return graphs;
  }
  let stem = core;
  let suffix: Grapheme | null = null;
  if (stem.length > 3 && stem.endsWith("s") && !stem.endsWith("ss")) {
    suffix = { text: "s", speak: "s", kind: "consonant" };
    stem = stem.slice(0, -1);
  }
  const graphs = segmentStem(stem);
  if (suffix) graphs.push(suffix);
  if (token[0] && token[0] === token[0].toUpperCase()) {
    graphs[0].text = graphs[0].text[0].toUpperCase() + graphs[0].text.slice(1);
  }
  const tail = token.match(/[^a-zA-Z]+$/)?.[0];
  if (tail) graphs.push({ text: tail, speak: "", kind: "silent" });
  return graphs;
}

export function phonemeUrl(id: string): string {
  return `/phonemes/${id}.wav?v=4`;
}

export type PhonicsBeat = {
  audio: string | null;
  say: string | null;
  wordIndex: number;
  graphemeIndex: number | "all";
  letters: string;
};

export function phonicsBeats(tokens: { word: string }[], decode: boolean): PhonicsBeat[] {
  const beats: PhonicsBeat[] = [];
  tokens.forEach((token, wordIndex) => {
    const graphs = segmentToken(token.word);
    if (decode) {
      graphs.forEach((graph, graphemeIndex) => {
        if (!graph.speak) return;
        beats.push({
          audio: phonemeUrl(graph.speak),
          say: null,
          wordIndex,
          graphemeIndex,
          letters: graph.text,
        });
      });
    }
    const core = lettersOf(token.word);
    beats.push({
      audio: core === "a" ? phonemeUrl("schwa") : null,
      say: core === "a" ? null : core,
      wordIndex,
      graphemeIndex: "all",
      letters: core,
    });
  });
  return beats;
}
