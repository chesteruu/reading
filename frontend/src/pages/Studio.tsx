import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { PageRecorder } from "../lib/recorder";
import { pageText, speak } from "../lib/speech";
import type { BookDetail, Page } from "../types";

type FlowState = { activityStars?: number; title?: string };

export function Studio() {
  const { bookId = "" } = useParams();
  const location = useLocation();
  const flow = (location.state ?? {}) as FlowState;
  const auth = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [levels, setLevels] = useState<number[]>([]);
  const [take, setTake] = useState<{ url: string; blob: Blob; duration: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [stars, setStars] = useState(0);
  const [recorder] = useState(() => new PageRecorder());

  useEffect(() => {
    if (!auth.childToken) return;
    api<BookDetail>(`/api/books/${bookId}`, { token: auth.childToken })
      .then(setBook)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "录音间没有打开"));
  }, [bookId, auth.childToken]);

  useEffect(() => () => {
    if (take) URL.revokeObjectURL(take.url);
  }, [take]);

  const page: Page | undefined = book?.pages[pageIndex];

  async function toggle() {
    setError("");
    if (!recording) {
      try {
        recorder.onLevel = setLevels;
        await recorder.start();
        setRecording(true);
        setSaved(false);
      } catch {
        setError("麦克风没有打开。可以先跳过，去领星光。");
      }
      return;
    }
    const result = await recorder.stop();
    setRecording(false);
    if (result.duration < 0.4) {
      setError("再读长一点点。");
      return;
    }
    if (take) URL.revokeObjectURL(take.url);
    setTake({ url: URL.createObjectURL(result.blob), blob: result.blob, duration: result.duration });
    setLevels(result.levels);
  }

  async function save() {
    if (!take || !page || !auth.child || !auth.childToken) return;
    const body = new FormData();
    body.append("child_id", auth.child.id);
    body.append("book_id", bookId);
    body.append("page_number", String(page.page_number));
    body.append("duration_seconds", String(take.duration));
    body.append("file", take.blob, "page.wav");
    const result = await api<{ stars_awarded: number; star_balance: number }>("/api/recordings", {
      method: "POST",
      token: auth.childToken,
      body,
    });
    setStars(result.stars_awarded);
    setSaved(true);
    auth.updateChild({ ...auth.child, star_balance: result.star_balance });
  }

  function finish(recordingStars: number) {
    navigate(`/rewards/${bookId}`, {
      state: { activityStars: flow.activityStars ?? 0, recordingStars, title: flow.title || book?.title || "" },
    });
  }

  if (!book || !page) {
    return <main className="night-room grid min-h-dvh place-items-center font-display text-4xl">{error || "打开录音间…"}</main>;
  }

  return (
    <main className="night-room min-h-dvh px-4 py-6">
      <header className="mx-auto flex max-w-4xl items-center justify-between">
        <button className="tap rounded-full bg-white/10 px-4" type="button" onClick={() => navigate(`/activities/${book.id}`)}>返回</button>
        <h1 className="font-display text-4xl">录音小电台</h1>
        <span />
      </header>
      <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-white/75">挑最喜欢的一页，按住大麦克风，把自己的声音留下来。</p>
      <div className="mx-auto mt-4 flex max-w-4xl gap-3 overflow-x-auto pb-2">
        {book.pages.map((item, itemIndex) => (
          <button key={item.id} type="button" className={`w-28 shrink-0 overflow-hidden rounded-2xl ${itemIndex === pageIndex ? "outline outline-4 outline-marigold" : ""}`} onClick={() => { setPageIndex(itemIndex); setTake(null); }}>
            <img src={item.image_url} alt="" />
          </button>
        ))}
      </div>
      <p className="mx-auto mt-4 max-w-xl text-center font-read text-3xl">{pageText(page.alignment_data)}</p>
      <div className="mt-6 flex flex-col items-center gap-4">
        <Waveform levels={levels} />
        <button className={`mic ${recording ? "live" : ""}`} type="button" onClick={() => void toggle()} aria-label={recording ? "停止录音" : "开始录音"}>
          {recording ? "停" : "麦"}
        </button>
        <p className="text-white/70">{recording ? "正在听你读…" : take ? `${take.duration.toFixed(1)} 秒 · ${Math.round(take.blob.size / 1024)} KB` : "点麦克风开始"}</p>
        {error ? <p className="text-marigold">{error}</p> : null}
        {take ? (
          <div className="flex flex-wrap justify-center gap-3">
            <button className="tap rounded-full bg-white/10 px-5" type="button" onClick={() => new Audio(take.url).play()}>听我的</button>
            <button className="tap rounded-full bg-white/10 px-5" type="button" onClick={() => speak(pageText(page.alignment_data), 1)}>听原声</button>
            <button className="tap rounded-full bg-persimmon px-5 font-extrabold text-white" type="button" onClick={() => void save()} disabled={saved}>
              {saved ? "已放进小电台" : "存进小电台"}
            </button>
          </div>
        ) : null}
        <button className="tap rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={() => finish(stars)}>
          {saved ? "去领星光" : "先跳过，去领星光"}
        </button>
      </div>
    </main>
  );
}

function Waveform({ levels }: { levels: number[] }) {
  const width = 640;
  const height = 140;
  const bars = levels.length ? levels : [0.08, 0.12, 0.08];
  const step = width / bars.length;
  return (
    <svg className="wave" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="声波">
      {bars.map((level, index) => {
        const bar = Math.max(6, level * height);
        return <rect key={index} x={index * step} y={(height - bar) / 2} width={Math.max(2, step - 2)} height={bar} rx="3" fill="#f0c14e" />;
      })}
    </svg>
  );
}
