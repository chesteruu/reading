export type GraphemeKind = "vowel" | "consonant" | "silent";

export type Grapheme = {
  text: string;
  speak: string;
  kind: GraphemeKind;
  /** Highlight this silent letter together with another grapheme (magic e). */
  linkedTo?: number;
};

const SHORT: Record<string, string> = { a: "ah", e: "eh", i: "ih", o: "aw", u: "uh" };
const LONG: Record<string, string> = { a: "ay", e: "ee", i: "eye", o: "oh", u: "yoo" };
const CONSONANT: Record<string, string> = {
  b: "buh",
  c: "kuh",
  d: "duh",
  f: "fff",
  g: "guh",
  h: "hhh",
  j: "juh",
  k: "kuh",
  l: "lll",
  m: "mmm",
  n: "nnn",
  p: "puh",
  q: "kuh",
  r: "rrr",
  s: "sss",
  t: "tuh",
  v: "vvv",
  w: "wuh",
  x: "ks",
  y: "yuh",
  z: "zzz",
};

const CHUNK_SPEAK: Record<string, { speak: string; kind: GraphemeKind }> = {
  igh: { speak: "eye", kind: "vowel" },
  air: { speak: "air", kind: "vowel" },
  ear: { speak: "eer", kind: "vowel" },
  eer: { speak: "eer", kind: "vowel" },
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
  ue: { speak: "oo", kind: "vowel" },
  ew: { speak: "oo", kind: "vowel" },
  aw: { speak: "aw", kind: "vowel" },
  au: { speak: "aw", kind: "vowel" },
  ar: { speak: "ar", kind: "vowel" },
  or: { speak: "or", kind: "vowel" },
  er: { speak: "er", kind: "vowel" },
  ir: { speak: "er", kind: "vowel" },
  ur: { speak: "er", kind: "vowel" },
  sh: { speak: "shh", kind: "consonant" },
  ch: { speak: "ch", kind: "consonant" },
  th: { speak: "th", kind: "consonant" },
  wh: { speak: "wuh", kind: "consonant" },
  ph: { speak: "fff", kind: "consonant" },
  ck: { speak: "kuh", kind: "consonant" },
  ng: { speak: "ng", kind: "consonant" },
  qu: { speak: "kwuh", kind: "consonant" },
  kn: { speak: "nnn", kind: "consonant" },
  wr: { speak: "rrr", kind: "consonant" },
};

const BLENDS = ["str", "spr", "scr", "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc", "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw"];
const DOUBLES = ["bb", "dd", "ff", "gg", "ll", "mm", "nn", "pp", "rr", "ss", "tt", "zz"];

const CHUNKS = [...Object.keys(CHUNK_SPEAK), ...BLENDS, ...DOUBLES].sort((a, b) => b.length - a.length);

const SHORT_OO = new Set(["look", "good", "book", "foot", "wood"]);
const WORD_SAY: Record<string, string> = {
  a: "uh",
  the: "thuh",
  to: "too",
  of: "uv",
  is: "iz",
  by: "by",
};

const OVERRIDES: Record<string, Grapheme[]> = {
  a: [{ text: "a", speak: "uh", kind: "vowel" }],
  the: [
    { text: "th", speak: "th", kind: "consonant" },
    { text: "e", speak: "uh", kind: "vowel" },
  ],
  to: [
    { text: "t", speak: "tuh", kind: "consonant" },
    { text: "o", speak: "ooh", kind: "vowel" },
  ],
  of: [
    { text: "o", speak: "uh", kind: "vowel" },
    { text: "f", speak: "fff", kind: "consonant" },
  ],
  mia: [
    { text: "m", speak: "mmm", kind: "consonant" },
    { text: "i", speak: "ee", kind: "vowel" },
    { text: "a", speak: "uh", kind: "vowel" },
  ],
  gold: [
    { text: "g", speak: "guh", kind: "consonant" },
    { text: "o", speak: "oh", kind: "vowel" },
    { text: "l", speak: "lll", kind: "consonant" },
    { text: "d", speak: "duh", kind: "consonant" },
  ],
  mango: [
    { text: "m", speak: "mmm", kind: "consonant" },
    { text: "a", speak: "ah", kind: "vowel" },
    { text: "ng", speak: "ng", kind: "consonant" },
    { text: "o", speak: "oh", kind: "vowel" },
  ],
  paper: [
    { text: "p", speak: "puh", kind: "consonant" },
    { text: "a", speak: "ay", kind: "vowel" },
    { text: "p", speak: "puh", kind: "consonant" },
    { text: "er", speak: "er", kind: "vowel" },
  ],
  walk: [
    { text: "w", speak: "wuh", kind: "consonant" },
    { text: "al", speak: "all", kind: "vowel" },
    { text: "k", speak: "kuh", kind: "consonant" },
  ],
  warm: [
    { text: "w", speak: "wuh", kind: "consonant" },
    { text: "ar", speak: "or", kind: "vowel" },
    { text: "m", speak: "mmm", kind: "consonant" },
  ],
  share: [
    { text: "sh", speak: "shh", kind: "consonant" },
    { text: "are", speak: "air", kind: "vowel" },
  ],
  full: [
    { text: "f", speak: "fff", kind: "consonant" },
    { text: "u", speak: "uuh", kind: "vowel" },
    { text: "ll", speak: "lll", kind: "consonant" },
  ],
  opens: [
    { text: "o", speak: "oh", kind: "vowel" },
    { text: "p", speak: "puh", kind: "consonant" },
    { text: "e", speak: "eh", kind: "vowel" },
    { text: "n", speak: "nnn", kind: "consonant" },
    { text: "s", speak: "sss", kind: "consonant" },
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
  if (text === "oo" && SHORT_OO.has(word)) return { text, speak: "uuh", kind: "vowel" };
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
      out.push({ text: "le", speak: "ul", kind: "vowel" });
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
    suffix = { text: "s", speak: "sss", kind: "consonant" };
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

export function blendOf(token: string): string {
  const core = lettersOf(token);
  return WORD_SAY[core] ?? core;
}

export type PhonicsBeat = {
  speak: string;
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
          speak: graph.speak,
          wordIndex,
          graphemeIndex,
          letters: graph.text,
        });
      });
    }
    beats.push({
      speak: blendOf(token.word),
      wordIndex,
      graphemeIndex: "all",
      letters: lettersOf(token.word),
    });
  });
  return beats;
}
