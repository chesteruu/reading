export type AlignmentWord = { word: string; start: number; end: number };

export type Gloss = { emoji: string; hint: string; zh: string };

export type Frame = { id: string; image_url: string; caption: string };

export type Activities = {
  sequencer?: { prompt: string; frames: Frame[]; order: string[] };
  detective?: {
    prompt: string;
    speak: string;
    image_url: string;
    hint: string;
    target: { x: number; y: number; r: number };
  };
  word_match?: { prompt: string; pairs: { id: string; word: string; emoji: string }[] };
};

export type Page = {
  id: string;
  book_id: string;
  page_number: number;
  image_url: string;
  audio_url: string;
  alignment_data: AlignmentWord[];
};

export type BookDetail = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  genre: string;
  total_pages: number;
  cover_image_url: string;
  word_count: number;
  blurb: string;
  accent: string;
  glossary: Record<string, Gloss>;
  activities: Activities;
  pages: Page[];
};

export type Progress = {
  current_page: number;
  read_seconds: number;
  listen_seconds: number;
  completed: boolean;
};

export type ShelfBook = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  total_pages: number;
  cover_image_url: string;
  word_count: number;
  blurb: string;
  accent: string;
  fit: "review" | "ready" | "challenge" | "locked";
  progress: Progress | null;
};

export type Child = {
  id: string;
  nickname: string;
  avatar_url: string;
  current_level: string;
  star_balance: number;
};

export type Recording = {
  id: string;
  book_id: string;
  book_title: string;
  page_number: number;
  audio_file_url: string;
  duration_seconds: number;
  created_at?: string;
};
