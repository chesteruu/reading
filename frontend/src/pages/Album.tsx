import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { Recording } from "../types";

export function Album() {
  const auth = useAuth();
  const [rows, setRows] = useState<Recording[]>([]);

  useEffect(() => {
    if (!auth.child || !auth.childToken) return;
    api<{ recordings: Recording[] }>(`/api/recordings?child_id=${auth.child.id}`, { token: auth.childToken })
      .then((payload) => setRows(payload.recordings))
      .catch(() => setRows([]));
  }, [auth.child?.id, auth.childToken]);

  return (
    <main className="night-room min-h-dvh px-4 py-6">
      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <Link className="tap grid place-items-center rounded-full bg-white/10 px-4" to="/shelf">书架</Link>
        <h1 className="font-display text-4xl">个人朗读专辑</h1>
        <span />
      </header>
      <ul className="mx-auto mt-6 grid max-w-3xl gap-3">
        {rows.length === 0 ? <li className="paper-card p-6 text-lg">还没有录音。读完一本，挑一页留给小电台。</li> : null}
        {rows.map((row) => (
          <li key={row.id} className="paper-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-display text-2xl">{row.book_title}</p>
              <p className="text-black/60">第 {row.page_number} 页 · {row.duration_seconds.toFixed(1)} 秒</p>
            </div>
            <audio controls src={row.audio_file_url} preload="none" />
          </li>
        ))}
      </ul>
    </main>
  );
}
