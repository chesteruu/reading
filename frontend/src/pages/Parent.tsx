import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import type { Child } from "../types";

const LEVELS = ["aa", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
const AVATARS = ["moon", "lion", "fox", "bear", "owl", "whale"];

type OverviewChild = Child & {
  listen_seconds: number;
  read_seconds: number;
  books_completed: number;
  recent_records: { title: string; completed_at: string }[];
  word_heatmap: { word: string; count: number }[];
  favorites: { word: string; count: number }[];
  recordings: { id: string; book_title: string; page_number: number; audio_file_url: string; duration_seconds: number }[];
};

type StoryPage = { text: string; image_url?: string };

type StoryPack = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  genre: string;
  blurb: string;
  accent: string;
  cover_image_url: string;
  pages: StoryPage[];
  source: string;
};

type CoverOption = { key: string; label: string; url: string; accent: string };
type GenreOption = { key: string; label: string };

function clock(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes <= 0) return `${rest} 秒`;
  return `${minutes} 分 ${rest} 秒`;
}

export function Parent() {
  const auth = useAuth();
  const [rows, setRows] = useState<OverviewChild[]>([]);
  const [bookCount, setBookCount] = useState(0);
  const [error, setError] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [avatar, setAvatar] = useState("fox");
  const [level, setLevel] = useState("C");

  const [packs, setPacks] = useState<StoryPack[]>([]);
  const [covers, setCovers] = useState<CoverOption[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [packLevel, setPackLevel] = useState("all");
  const [packGenre, setPackGenre] = useState("all");
  const [busyPack, setBusyPack] = useState("");

  const [mode, setMode] = useState<"pack" | "custom">("pack");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [bookLevel, setBookLevel] = useState("C");
  const [genre, setGenre] = useState("fiction");
  const [cover, setCover] = useState("/art/placeholder.svg");
  const [accent, setAccent] = useState("#8a5a3b");
  const [blurb, setBlurb] = useState("");
  const [sentences, setSentences] = useState("The kitten is soft.\nIt naps in the sun.");
  const [notice, setNotice] = useState("");

  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      if (packLevel !== "all" && pack.level !== packLevel) return false;
      if (packGenre !== "all" && pack.genre !== packGenre) return false;
      return true;
    });
  }, [packs, packLevel, packGenre]);

  async function load() {
    const payload = await api<{ children: OverviewChild[]; book_count: number }>("/api/parent/overview", { token: auth.parentToken });
    setRows(payload.children);
    setBookCount(payload.book_count);
    auth.setChildren(payload.children);
  }

  async function loadPacks() {
    const payload = await api<{ packs: StoryPack[]; covers: CoverOption[]; genres: GenreOption[] }>("/api/parent/packs", {
      token: auth.parentToken,
    });
    setPacks(payload.packs);
    setCovers(payload.covers);
    setGenres(payload.genres);
    if (payload.covers[0]) {
      setCover(payload.covers[0].url);
      setAccent(payload.covers[0].accent);
    }
  }

  useEffect(() => {
    Promise.all([load(), loadPacks()]).catch((err: unknown) => setError(err instanceof ApiError ? err.message : "家长页没有打开"));
  }, [auth.parentToken]);

  async function addChild(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    try {
      await api("/api/children", {
        method: "POST",
        token: auth.parentToken,
        body: JSON.stringify({ nickname, pin, avatar_key: avatar, current_level: level }),
      });
      setNickname("");
      setPin("");
      await load();
      setNotice("孩子已经可以在平板上选头像了");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "没有加上");
    }
  }

  async function changeLevel(childId: string, currentLevel: string) {
    await api(`/api/children/${childId}`, {
      method: "PATCH",
      token: auth.parentToken,
      body: JSON.stringify({ current_level: currentLevel }),
    });
    await load();
  }

  async function publishBook(payload: {
    title: string;
    subtitle?: string;
    level: string;
    genre?: string;
    cover_image_url?: string;
    accent?: string;
    blurb?: string;
    pages: { text: string; image_url?: string }[];
  }) {
    await api("/api/parent/books", {
      method: "POST",
      token: auth.parentToken,
      body: JSON.stringify(payload),
    });
    await load();
  }

  async function addPack(pack: StoryPack) {
    setBusyPack(pack.id);
    setNotice("");
    try {
      await publishBook({
        title: pack.title,
        subtitle: pack.subtitle,
        level: pack.level,
        genre: pack.genre,
        cover_image_url: pack.cover_image_url,
        accent: pack.accent,
        blurb: pack.blurb,
        pages: pack.pages.map((page) => ({
          text: page.text,
          image_url: page.image_url || pack.cover_image_url || "/art/placeholder.svg",
        })),
      });
      setNotice(`《${pack.title}》已经放到书架`);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "故事没有放上去");
    } finally {
      setBusyPack("");
    }
  }

  function usePackAsDraft(pack: StoryPack) {
    setMode("custom");
    setTitle(pack.title);
    setSubtitle(pack.subtitle);
    setBookLevel(pack.level);
    setGenre(pack.genre);
    setCover(pack.cover_image_url);
    setAccent(pack.accent);
    setBlurb(pack.blurb);
    setSentences(pack.pages.map((page) => page.text).join("\n"));
    setNotice(`已载入《${pack.title}》，可以改完再放上书架`);
  }

  async function addBook(event: FormEvent) {
    event.preventDefault();
    const pages = sentences
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, image_url: cover.includes("cover-") ? cover : cover }));
    try {
      await publishBook({
        title,
        subtitle,
        level: bookLevel,
        genre,
        cover_image_url: cover,
        accent,
        blurb: blurb || "家长上传的故事",
        pages,
      });
      setTitle("");
      setSubtitle("");
      setBlurb("");
      setNotice("故事已经放上书架");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "故事没有放上去");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f3efe7] px-4 py-6 text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-black/45">Parent Portal</p>
          <h1 className="font-display text-4xl">家长角落</h1>
          <p className="mt-1 text-black/60">书架上有 {bookCount} 本故事</p>
        </div>
        <Link className="rounded-full bg-ink px-4 py-2 font-bold text-paper" to="/">回书架</Link>
      </header>
      {error ? <p className="mx-auto mt-4 max-w-5xl text-persimmon">{error}</p> : null}
      {notice ? <p className="mx-auto mt-4 max-w-5xl rounded-2xl bg-leaf/15 px-4 py-3 text-sm">{notice}</p> : null}

      <section className="mx-auto mt-6 max-w-5xl rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">故事包</h2>
            <p className="mt-1 text-sm text-black/55">点一下就能放到书架，也可以先改再放。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="rounded-full border px-3 py-2 text-sm" value={packLevel} onChange={(event) => setPackLevel(event.target.value)}>
              <option value="all">全部级别</option>
              {LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="rounded-full border px-3 py-2 text-sm" value={packGenre} onChange={(event) => setPackGenre(event.target.value)}>
              <option value="all">全部主题</option>
              {genres.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPacks.map((pack) => (
            <article key={pack.id} className="overflow-hidden rounded-3xl border border-black/5 bg-[#faf7f1]">
              <div className="flex gap-3 p-3">
                <img src={pack.cover_image_url} alt="" className="h-24 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-black/45">Level {pack.level} · {pack.genre}</p>
                  <h3 className="font-display text-xl leading-tight">{pack.title}</h3>
                  <p className="truncate text-sm text-black/55">{pack.subtitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-black/45">{pack.blurb}</p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-black/5 px-3 py-2">
                <button
                  type="button"
                  className="tap flex-1 rounded-full bg-persimmon px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                  disabled={busyPack === pack.id}
                  onClick={() => addPack(pack)}
                >
                  {busyPack === pack.id ? "放入中…" : "放到书架"}
                </button>
                <button type="button" className="tap rounded-full bg-ink/90 px-3 py-2 text-sm font-bold text-paper" onClick={() => usePackAsDraft(pack)}>
                  改一改
                </button>
              </div>
            </article>
          ))}
        </div>
        {!filteredPacks.length ? <p className="mt-4 text-sm text-black/50">这个筛选下暂时没有故事包。</p> : null}
      </section>

      <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-2">
        {rows.map((child) => (
          <section key={child.id} className="rounded-3xl bg-white p-5">
            <div className="flex items-center gap-3">
              <img src={child.avatar_url} alt="" className="h-14 w-14" />
              <div>
                <h2 className="font-display text-2xl">{child.nickname}</h2>
                <p className="text-sm text-black/55">{child.star_balance} 颗星 · 完成 {child.books_completed} 本</p>
              </div>
            </div>
            <label className="mt-4 block text-sm text-black/55">阅读级别</label>
            <select className="mt-1 w-full rounded-2xl border px-4 py-3" value={child.current_level} onChange={(event) => changeLevel(child.id, event.target.value)}>
              {LEVELS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <p className="rounded-2xl bg-[#f6f1e8] px-3 py-2">听读 {clock(child.listen_seconds)}</p>
              <p className="rounded-2xl bg-[#f6f1e8] px-3 py-2">自读 {clock(child.read_seconds)}</p>
            </div>
            <h3 className="mt-4 font-bold">最近读完</h3>
            <ul className="mt-2 space-y-1 text-sm text-black/70">
              {child.recent_records.map((record) => (
                <li key={`${record.title}-${record.completed_at}`}>{record.title}</li>
              ))}
              {!child.recent_records.length ? <li>还没有读完的书</li> : null}
            </ul>
            <h3 className="mt-4 font-bold">点读热词</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {child.word_heatmap.map((item) => (
                <span key={item.word} className="rounded-full bg-[#efe6d8] px-3 py-1 text-sm">{item.word} · {item.count}</span>
              ))}
              {!child.word_heatmap.length ? <span className="text-sm text-black/45">还没有点读记录</span> : null}
            </div>
            <h3 className="mt-4 font-bold">录音</h3>
            <ul className="mt-3 space-y-2">
              {child.recordings.map((recording) => (
                <li key={recording.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{recording.book_title} · 第 {recording.page_number} 页</span>
                  <audio controls src={recording.audio_file_url} preload="none" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-2">
        <form className="rounded-3xl bg-white p-5" onSubmit={addChild}>
          <h2 className="font-display text-2xl">添加孩子</h2>
          <input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="昵称" value={nickname} onChange={(event) => setNickname(event.target.value)} required />
          <input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="4 位 PIN" value={pin} onChange={(event) => setPin(event.target.value)} pattern="\d{4}" required />
          <div className="mt-3 flex flex-wrap gap-2">
            {AVATARS.map((key) => (
              <button key={key} type="button" className={`rounded-full p-1 ${avatar === key ? "outline outline-4 outline-persimmon" : ""}`} onClick={() => setAvatar(key)}>
                <img src={`/avatars/${key}.svg`} alt={key} className="h-12 w-12" />
              </button>
            ))}
          </div>
          <select className="mt-3 w-full rounded-2xl border px-4 py-3" value={level} onChange={(event) => setLevel(event.target.value)}>
            {LEVELS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button className="tap mt-4 w-full rounded-full bg-ink font-extrabold text-paper" type="submit">保存</button>
        </form>

        <form className="rounded-3xl bg-white p-5" onSubmit={addBook}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl">自己写故事</h2>
            <button type="button" className="text-sm text-persimmon" onClick={() => setMode(mode === "custom" ? "pack" : "custom")}>
              {mode === "custom" ? "去看故事包" : "展开表单"}
            </button>
          </div>
          <input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="英文书名" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="中文书名（可选）" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select className="w-full rounded-2xl border px-4 py-3" value={bookLevel} onChange={(event) => setBookLevel(event.target.value)}>
              {LEVELS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="w-full rounded-2xl border px-4 py-3" value={genre} onChange={(event) => setGenre(event.target.value)}>
              {(genres.length ? genres : [{ key: "fiction", label: "故事" }]).map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <p className="mt-3 text-sm text-black/50">封面风格</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {covers.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`overflow-hidden rounded-xl border-2 ${cover === item.url ? "border-persimmon" : "border-transparent"}`}
                onClick={() => {
                  setCover(item.url);
                  setAccent(item.accent);
                }}
              >
                <img src={item.url} alt={item.label} className="h-14 w-10 object-cover" />
              </button>
            ))}
          </div>
          <input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="一句话简介" value={blurb} onChange={(event) => setBlurb(event.target.value)} />
          <textarea className="mt-3 min-h-32 w-full rounded-2xl border px-4 py-3" value={sentences} onChange={(event) => setSentences(event.target.value)} />
          <p className="mt-1 text-sm text-black/50">一行一句。点读、排序和配对游戏会自动生成。</p>
          <button className="tap mt-4 w-full rounded-full bg-persimmon font-extrabold text-white" type="submit">放到书架</button>
        </form>
      </div>
    </main>
  );
}
