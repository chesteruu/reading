import { useEffect, useState, type FormEvent } from "react";
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
  const [title, setTitle] = useState("");
  const [bookLevel, setBookLevel] = useState("C");
  const [sentences, setSentences] = useState("The kitten is soft.\nIt naps in the sun.");
  const [notice, setNotice] = useState("");

  async function load() {
    const payload = await api<{ children: OverviewChild[]; book_count: number }>("/api/parent/overview", { token: auth.parentToken });
    setRows(payload.children);
    setBookCount(payload.book_count);
    auth.setChildren(payload.children);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "家长页没有打开"));
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

  async function addBook(event: FormEvent) {
    event.preventDefault();
    const pages = sentences.split("\n").map((line) => line.trim()).filter(Boolean).map((text) => ({ text }));
    try {
      await api("/api/parent/books", {
        method: "POST",
        token: auth.parentToken,
        body: JSON.stringify({ title, level: bookLevel, pages, blurb: "家长上传的故事" }),
      });
      setTitle("");
      setNotice("故事已经放上书架");
      await load();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "故事没有放上去");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f3efe7] px-4 py-6 text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-black/50">Parent</p>
          <h1 className="font-display text-4xl">家长书房</h1>
          <p className="text-black/60">{auth.email} · 书架上 {bookCount} 本</p>
        </div>
        <div className="flex gap-2">
          <Link className="tap grid place-items-center rounded-full bg-white px-4" to="/">回入口</Link>
          <button className="tap rounded-full px-4" type="button" onClick={auth.logout}>退出</button>
        </div>
      </header>
      {error ? <p className="mx-auto mt-4 max-w-5xl text-persimmon">{error}</p> : null}
      {notice ? <p className="mx-auto mt-4 max-w-5xl">{notice}</p> : null}
      <div className="mx-auto mt-6 grid max-w-5xl gap-4">
        {rows.map((child) => (
          <section key={child.id} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={child.avatar_url} alt="" className="h-14 w-14 rounded-full" />
                <div>
                  <h2 className="font-display text-3xl">{child.nickname}</h2>
                  <p>{child.star_balance} 星 · 读完 {child.books_completed} 本</p>
                </div>
              </div>
              <label className="text-sm font-bold">
                阅读级别
                <select className="ml-2 rounded-xl border px-3 py-2" value={child.current_level} onChange={(event) => void changeLevel(child.id, event.target.value)}>
                  {LEVELS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 text-black/70">伴读 {clock(child.listen_seconds)} · 自读 {clock(child.read_seconds)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {child.word_heatmap.length === 0 ? <span className="text-black/40">还没有点读记录</span> : null}
              {child.word_heatmap.map((item) => (
                <span key={item.word} className="rounded-full bg-[#f7f1e6] px-3 py-1" style={{ fontSize: 14 + Math.min(item.count, 8) * 2 }}>
                  {item.word} · {item.count}
                </span>
              ))}
            </div>
            {child.favorites.length ? <p className="mt-2 text-sm">收藏：{child.favorites.map((item) => item.word).join("、")}</p> : null}
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
          <h2 className="font-display text-2xl">放一本新故事</h2>
          <input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="英文书名" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <select className="mt-3 w-full rounded-2xl border px-4 py-3" value={bookLevel} onChange={(event) => setBookLevel(event.target.value)}>
            {LEVELS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <textarea className="mt-3 min-h-32 w-full rounded-2xl border px-4 py-3" value={sentences} onChange={(event) => setSentences(event.target.value)} />
          <p className="mt-1 text-sm text-black/50">一行一句。插画会用占位纸页，点读和配对游戏会自动生成。</p>
          <button className="tap mt-4 w-full rounded-full bg-persimmon font-extrabold text-white" type="submit">放到书架</button>
        </form>
      </div>
    </main>
  );
}
