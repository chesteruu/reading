import { useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { speak } from "../lib/speech";
import type { Activities as ActivitySet, BookDetail, Frame } from "../types";

type Result = { correct: boolean; stars_awarded: number; star_balance: number };

export function Activities() {
  const { bookId = "" } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [earned, setEarned] = useState(0);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (!auth.childToken) return;
    api<BookDetail>(`/api/books/${bookId}`, { token: auth.childToken })
      .then(setBook)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "游戏没有打开"));
  }, [bookId, auth.childToken]);

  const steps = useMemo(() => {
    const activities = book?.activities ?? {};
    return (["sequencer", "detective", "word_match"] as const).filter((kind) => activities[kind]);
  }, [book]);

  async function submit(kind: string, answer: Record<string, unknown>): Promise<Result> {
    const result = await api<Result>("/api/activities/submit", {
      method: "POST",
      token: auth.childToken,
      body: JSON.stringify({ child_id: auth.child?.id, book_id: bookId, kind, answer }),
    });
    if (auth.child) auth.updateChild({ ...auth.child, star_balance: result.star_balance });
    if (result.correct) {
      setEarned((value) => value + result.stars_awarded);
      setBanner(result.stars_awarded ? `+${result.stars_awarded} 星光` : "这次已经拿过星光啦");
    }
    return result;
  }

  function next() {
    setBanner("");
    if (step + 1 >= steps.length) {
      navigate(`/studio/${bookId}`, { state: { activityStars: earned, title: book?.title ?? "" } });
      return;
    }
    setStep((value) => value + 1);
  }

  if (error) {
    return (
      <main className="night-room grid min-h-dvh place-items-center">
        <button className="tap rounded-full bg-marigold px-5 font-extrabold text-ink" type="button" onClick={() => navigate("/shelf")}>{error} · 回书架</button>
      </main>
    );
  }
  if (!book) return <main className="night-room grid min-h-dvh place-items-center font-display text-4xl">准备小游戏…</main>;
  const kind = steps[step];
  if (!kind) {
    return (
      <main className="night-room grid min-h-dvh place-items-center">
        <button className="tap rounded-full bg-marigold px-5 font-extrabold text-ink" type="button" onClick={() => navigate(`/studio/${book.id}`)}>去录音</button>
      </main>
    );
  }

  return (
    <main className="night-room min-h-dvh px-4 py-6">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <button className="tap rounded-full bg-white/10 px-4" type="button" onClick={() => navigate(`/read/${book.id}`)}>回故事</button>
        <p className="font-display text-3xl">第 {step + 1} / {steps.length} 关</p>
        <p className="text-marigold">{earned} 星</p>
      </header>
      {banner ? <p className="mt-4 text-center font-display text-3xl text-marigold">{banner}</p> : null}
      <section className="mx-auto mt-4 max-w-5xl">
        {kind === "sequencer" && book.activities.sequencer ? (
          <Sequencer spec={book.activities.sequencer} onSubmit={(answer) => submit("sequencer", answer)} onDone={next} />
        ) : null}
        {kind === "detective" && book.activities.detective ? (
          <Detective spec={book.activities.detective} onSubmit={(answer) => submit("detective", answer)} onDone={next} />
        ) : null}
        {kind === "word_match" && book.activities.word_match ? (
          <WordMatch spec={book.activities.word_match} onSubmit={(answer) => submit("word_match", answer)} onDone={next} />
        ) : null}
      </section>
    </main>
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function Sequencer({
  spec,
  onSubmit,
  onDone,
}: {
  spec: NonNullable<ActivitySet["sequencer"]>;
  onSubmit: (answer: Record<string, unknown>) => Promise<Result>;
  onDone: () => void;
}) {
  const frames = useMemo(() => {
    const mixed = shuffle(spec.frames);
    if (mixed.every((frame, index) => frame.id === spec.order[index])) return shuffle(spec.frames);
    return mixed;
  }, [spec]);
  const [slots, setSlots] = useState<(string | null)[]>(() => spec.frames.map(() => null));
  const [picked, setPicked] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState("把图画拖进 1、2、3、4");
  const [done, setDone] = useState(false);
  const moved = useRef(false);

  function place(cardId: string, slotIndex: number) {
    setSlots((current) => {
      const next = [...current];
      const from = next.indexOf(cardId);
      const occupant = next[slotIndex];
      if (from >= 0) next[from] = occupant;
      next[slotIndex] = cardId;
      return next;
    });
    setPicked(null);
  }

  async function check() {
    if (slots.some((slot) => !slot)) return;
    const result = await onSubmit({ order: slots });
    if (result.correct) {
      setDone(true);
      setMessage("故事接上啦");
    } else {
      setShake(true);
      setMessage("还没按故事发生的顺序，再试试");
      window.setTimeout(() => setShake(false), 450);
    }
  }

  const tray = frames.filter((frame) => !slots.includes(frame.id));

  return (
    <div className={shake ? "shake" : ""}>
      <h2 className="text-center font-display text-4xl">{spec.prompt}</h2>
      <p className="mt-2 text-center text-lg text-white/75">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {slots.map((cardId, slotIndex) => {
          const frame = frames.find((item) => item.id === cardId);
          return (
            <button
              key={slotIndex}
              type="button"
              data-slot={slotIndex}
              className="slot grid w-40 place-items-center overflow-hidden p-2"
              onClick={() => picked && place(picked, slotIndex)}
            >
              <span className="text-sm font-extrabold">{slotIndex + 1}</span>
              {frame ? <img src={frame.image_url} alt={frame.caption} /> : <span className="py-8 text-black/40">放到这里</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {tray.map((frame) => (
          <StoryCard key={frame.id} frame={frame} picked={picked === frame.id} onPick={() => setPicked(frame.id)} onDrop={(slot) => place(frame.id, slot)} onDrag={setDrag} moved={moved} />
        ))}
      </div>
      <div className="mt-6 text-center">
        {done ? (
          <button className="tap rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={onDone}>下一关</button>
        ) : (
          <button className="tap rounded-full bg-persimmon px-6 font-extrabold text-white disabled:opacity-40" type="button" disabled={slots.some((slot) => !slot)} onClick={() => void check()}>
            排好了
          </button>
        )}
      </div>
      {drag ? (
        <div className="pointer-events-none fixed z-50 w-24 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white/80 p-1" style={{ left: drag.x, top: drag.y }}>
          <img src={frames.find((frame) => frame.id === drag.id)?.image_url} alt="" />
        </div>
      ) : null}
    </div>
  );
}

function StoryCard({
  frame,
  picked,
  onPick,
  onDrop,
  onDrag,
  moved,
}: {
  frame: Frame;
  picked: boolean;
  onPick: () => void;
  onDrop: (slot: number) => void;
  onDrag: (drag: { id: string; x: number; y: number } | null) => void;
  moved: MutableRefObject<boolean>;
}) {
  const start = useRef({ x: 0, y: 0 });
  return (
    <button
      type="button"
      className={`story-card text-left ${picked ? "outline outline-4 outline-marigold" : ""}`}
      onPointerDown={(event) => {
        start.current = { x: event.clientX, y: event.clientY };
        moved.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) {
          moved.current = true;
          onDrag({ id: frame.id, x: event.clientX, y: event.clientY });
        }
      }}
      onPointerUp={(event) => {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const slot = target?.closest("[data-slot]");
        onDrag(null);
        if (slot) onDrop(Number(slot.getAttribute("data-slot")));
      }}
      onClick={() => {
        if (moved.current) {
          moved.current = false;
          return;
        }
        onPick();
      }}
    >
      <img src={frame.image_url} alt="" draggable={false} />
      <span className="block px-2 py-2 text-sm leading-snug">{frame.caption}</span>
    </button>
  );
}

function Detective({
  spec,
  onSubmit,
  onDone,
}: {
  spec: NonNullable<ActivitySet["detective"]>;
  onSubmit: (answer: Record<string, unknown>) => Promise<Result>;
  onDone: () => void;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; hit: boolean }[]>([]);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    speak(spec.speak, 0.95);
  }, [spec.speak]);

  async function tap(event: PointerEvent<HTMLDivElement>) {
    if (done) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const dx = x - spec.target.x;
    const dy = y - spec.target.y;
    const hit = dx * dx + dy * dy <= spec.target.r * spec.target.r;
    setRipples((current) => [...current, { id: Date.now(), x, y, hit }]);
    if (!hit) {
      setMisses((count) => count + 1);
      return;
    }
    const result = await onSubmit({ x, y });
    if (result.correct) {
      setDone(true);
      speak("You found it!");
    }
  }

  return (
    <div>
      <h2 className="text-center font-display text-4xl">{spec.prompt}</h2>
      <p className="mt-2 text-center text-lg">在画里点一点</p>
      <div className="detective-scene mt-4" onPointerDown={(event) => void tap(event)}>
        <img src={spec.image_url} alt="" draggable={false} />
        {ripples.map((ripple) => (
          <span key={ripple.id} className={`ripple ${ripple.hit ? "hit" : ""}`} style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }} />
        ))}
      </div>
      {misses >= 2 && !done ? <p className="mt-4 text-center text-lg text-marigold">{spec.hint}</p> : null}
      {done ? (
        <div className="mt-4 text-center">
          <button className="tap rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={onDone}>下一关</button>
        </div>
      ) : null}
    </div>
  );
}

function WordMatch({
  spec,
  onSubmit,
  onDone,
}: {
  spec: NonNullable<ActivitySet["word_match"]>;
  onSubmit: (answer: Record<string, unknown>) => Promise<Result>;
  onDone: () => void;
}) {
  const sounds = useMemo(() => shuffle(spec.pairs), [spec.pairs]);
  const cards = useMemo(() => shuffle(spec.pairs), [spec.pairs]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState(spec.prompt);
  const colors = ["#e36a3a", "#2a6f86", "#c47b4a", "#2f6f4e"];
  const boardRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string }[]>([]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    setLines(
      Object.entries(links).flatMap(([left, right]) => {
        const a = nodes.current.get(`l-${left}`)?.getBoundingClientRect();
        const b = nodes.current.get(`r-${right}`)?.getBoundingClientRect();
        if (!a || !b) return [];
        const color = colors[sounds.findIndex((pair) => pair.id === left) % colors.length];
        return [{
          x1: a.right - rect.left,
          y1: a.top + a.height / 2 - rect.top,
          x2: b.left - rect.left,
          y2: b.top + b.height / 2 - rect.top,
          color,
        }];
      }),
    );
  }, [links]);

  function connect(left: string, right: string) {
    setLinks((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(next)) {
        if (value === right) delete next[key];
      }
      next[left] = right;
      return next;
    });
    setPicked(null);
  }

  async function check() {
    const pairs = Object.entries(links).map(([left, right]) => ({ left, right }));
    const result = await onSubmit({ pairs });
    if (result.correct) {
      setDone(true);
      setMessage("声音和词连上了");
      return;
    }
    setLinks((current) => {
      const next: Record<string, string> = {};
      for (const [left, right] of Object.entries(current)) {
        if (left === right) next[left] = right;
      }
      return next;
    });
    setMessage("没对上的线松开了，再听一次");
  }

  return (
    <div>
      <h2 className="text-center font-display text-4xl">{message}</h2>
      <div ref={boardRef} className="relative mt-6 grid gap-6 md:grid-cols-2">
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {lines.map((line, index) => (
            <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color} strokeWidth="5" />
          ))}
        </svg>
        <div className="flex flex-col gap-3">
          {sounds.map((pair) => (
            <button
              key={pair.id}
              type="button"
              data-sound-id={pair.id}
              ref={(node) => { if (node) nodes.current.set(`l-${pair.id}`, node); }}
              className={`sound-bubble tap px-4 text-left text-xl font-extrabold ${picked === pair.id ? "outline outline-4 outline-marigold" : ""}`}
              style={{ boxShadow: `inset 8px 0 0 ${colors[sounds.indexOf(pair) % colors.length]}` }}
              onPointerDown={(event) => {
                speak(pair.word, 0.95);
                setPicked(pair.id);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) setDrag({ id: pair.id, x: event.clientX, y: event.clientY });
              }}
              onPointerUp={(event) => {
                const target = document.elementFromPoint(event.clientX, event.clientY);
                const card = target?.closest("[data-word-id]");
                setDrag(null);
                if (card) connect(pair.id, card.getAttribute("data-word-id") || "");
              }}
            >
              🔊 {pair.emoji}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {cards.map((pair) => (
            <button
              key={pair.id}
              type="button"
              data-word-id={pair.id}
              ref={(node) => { if (node) nodes.current.set(`r-${pair.id}`, node); }}
              className="match-card tap px-4 text-left font-read text-3xl"
              onClick={() => picked && connect(picked, pair.id)}
            >
              {pair.word}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 text-center">
        {done ? (
          <button className="tap rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={onDone}>继续</button>
        ) : (
          <>
            <button className="tap rounded-full bg-persimmon px-6 font-extrabold text-white disabled:opacity-40" type="button" disabled={Object.keys(links).length !== spec.pairs.length} onClick={() => void check()}>
              连好了
            </button>
            <button className="tap ml-3 rounded-full px-4 text-white/80 underline" type="button" onClick={onDone}>跳过这关</button>
          </>
        )}
      </div>
      {drag ? <div className="pointer-events-none fixed z-50 h-4 w-4 rounded-full bg-marigold" style={{ left: drag.x, top: drag.y }} /> : null}
    </div>
  );
}
