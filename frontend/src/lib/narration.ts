import narrationData from "../data/narration.json";

export type NarrationWord = { word: string; start: number; end: number };
export type Narration = { url: string; words: NarrationWord[] };

const narration = narrationData as Record<string, Narration>;

export function findNarration(tokens: { word: string }[]): Narration | null {
  const key = tokens
    .map((token) => token.word)
    .join(" ")
    .replace(/[^a-zA-Z'\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return narration[key] ?? null;
}
