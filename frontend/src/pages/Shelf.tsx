import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import type { ShelfBook } from "../types";

const FIT_LABEL = { ready: "正好", review: "再读读", challenge: "挑战", locked: "未解锁" } as const;

export function Shelf() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!auth.child || !auth.childToken) return;
    api<{ books: ShelfBook[]; child: typeof auth.child }>(`/api/shelf?child_id=${auth.child.id}`, { token: auth.childToken })
      .then((payload) => {
        setBooks(payload.books);
        auth.updateChild(payload.child);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "书架没有打开"));
  }, [auth.child?.id, auth.childToken]);

  const open = books.filter((book) => book.fit !== "locked");
  const locked = books.filter((book) => book.fit === "locked");

  return (
    <main className="night-room min-h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <img src={auth.child?.avatar_url} alt="" className="h-14 w-14 rounded-full bg-white/10" />
          <div>
            <p className="font-display text-3xl leading-none">{auth.child?.nickname} 的书架</p>
            <p className="text-white/70">Level {auth.child?.current_level} · {auth.child?.star_balance ?? 0} 颗星光</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link className="tap grid place-items-center rounded-full bg-white/10 px-4" to="/album">小电台</Link>
          <Link className="tap grid place-items-center rounded-full bg-white/10 px-4" to="/parent">家长</Link>
          <button className="tap rounded-full bg-marigold px-4 font-extrabold text-ink" type="button" onClick={() => { auth.lockChild(); navigate("/"); }}>
            换一个人
          </button>
        </nav>
      </header>
      {error ? <p className="px-6 text-marigold">{error}</p> : null}
      {note ? <p className="px-6 text-lg">{note}</p> : null}
      <section className="mt-4">
        <h2 className="px-6 font-display text-2xl">今晚可以读</h2>
        <div className="shelf-scroller mt-4">
          {open.map((book) => (
            <BookFace key={book.id} book={book} onOpen={() => navigate(`/read/${book.id}`)} />
          ))}
        </div>
        <div className="rail" />
      </section>
      {locked.length ? (
        <section>
          <h2 className="px-6 font-display text-2xl">还要再长大一点点</h2>
          <div className="shelf-scroller">
            {locked.map((book) => (
              <BookFace key={book.id} book={book} onOpen={() => setNote(`《${book.title}》要到 Level ${book.level} 才打开。`)} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function BookFace({ book, onOpen }: { book: ShelfBook; onOpen: () => void }) {
  return (
    <button type="button" className="book-card text-left" onClick={onOpen} style={{ background: book.accent }}>
      <span className="spine" />
      <img src={book.cover_image_url} alt="" />
      <span className="band">
        <span className="block text-xs font-extrabold uppercase tracking-wider">
          {book.level} · {FIT_LABEL[book.fit]}
          {book.progress?.completed ? " · 读完" : book.progress ? ` · 第 ${book.progress.current_page} 页` : ""}
        </span>
        <span className="mt-1 block font-display text-xl leading-tight">{book.title}</span>
        <span className="block text-sm">{book.subtitle}</span>
      </span>
    </button>
  );
}
