import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

function slotUnderPoint(x: number, y: number): number | null {
  const ghost = { left: x - 56, top: y - 56, right: x + 56, bottom: y + 56 };
  let bestIndex: number | null = null;
  let bestArea = 0;
  for (const slot of document.querySelectorAll<HTMLElement>("[data-slot]")) {
    const rect = slot.getBoundingClientRect();
    const left = Math.max(ghost.left, rect.left - 12);
    const top = Math.max(ghost.top, rect.top - 12);
    const right = Math.min(ghost.right, rect.right + 12);
    const bottom = Math.min(ghost.bottom, rect.bottom + 12);
    const area = Math.max(0, right - left) * Math.max(0, bottom - top);
    if (area > bestArea) {
      bestArea = area;
      bestIndex = Number(slot.dataset.slot);
    }
  }
  return bestArea > 800 ? bestIndex : null;
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
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; over: number | null } | null>(null);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState("按住图画，拖到 1、2、3、4 上松开");
  const [done, setDone] = useState(false);
  const ignoreClick = useRef(false);
  const stopDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => stopDrag.current?.(), []);

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

  function beginDrag(cardId: string, event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const originX = event.clientX;
    const originY = event.clientY;
    let moved = false;
    const move = (pointer: PointerEvent) => {
      pointer.preventDefault();
      if (Math.hypot(pointer.clientX - originX, pointer.clientY - originY) > 6) moved = true;
      setDrag({ id: cardId, x: pointer.clientX, y: pointer.clientY, over: slotUnderPoint(pointer.clientX, pointer.clientY) });
    };
    const finish = (pointer: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      stopDrag.current = null;
      const over = slotUnderPoint(pointer.clientX, pointer.clientY);
      setDrag(null);
      if (moved && over !== null) {
        ignoreClick.current = true;
        place(cardId, over);
        return;
      }
      if (!moved) setPicked(cardId);
    };
    stopDrag.current?.();
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    stopDrag.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
    setDrag({ id: cardId, x: originX, y: originY, over: slotUnderPoint(originX, originY) });
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
  const dragging = frames.find((frame) => frame.id === drag?.id);

  return (
    <div className={`sequencer ${shake ? "shake" : ""}`}>
      <h2 className="activity-title text-center font-display text-3xl sm:text-4xl">{spec.prompt}</h2>
      <p className="activity-sub mt-2 text-center text-base sm:text-lg">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {slots.map((cardId, slotIndex) => {
          const frame = frames.find((item) => item.id === cardId);
          return (
            <button
              key={slotIndex}
              type="button"
              data-slot={slotIndex}
              className={`slot grid place-items-center overflow-hidden p-2 ${drag?.over === slotIndex ? "is-over" : ""}`}
              onClick={() => picked && place(picked, slotIndex)}
              onPointerDown={(event) => frame && beginDrag(frame.id, event)}
            >
              <span className="text-sm font-extrabold text-[#241c16]">{slotIndex + 1}</span>
              {frame ? (
                <>
                  <img src={frame.image_url} alt={frame.caption} draggable={false} className={drag?.id === frame.id ? "opacity-30" : ""} />
                  <span className="slot-caption">{frame.caption}</span>
                </>
              ) : (
                <span className="py-8 text-black/45">放到这里</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {tray.map((frame) => (
          <button
            key={frame.id}
            type="button"
            className={`story-card text-left ${picked === frame.id ? "outline outline-4 outline-marigold" : ""} ${drag?.id === frame.id ? "is-dragging" : ""}`}
            onPointerDown={(event) => beginDrag(frame.id, event)}
            onClick={() => {
              if (ignoreClick.current) {
                ignoreClick.current = false;
                return;
              }
              setPicked(frame.id);
            }}
          >
            <img src={frame.image_url} alt="" draggable={false} />
            <span className="card-caption">{frame.caption}</span>
          </button>
        ))}
      </div>
      {!tray.length && !done ? (
        <p className="activity-sub mt-4 text-center text-sm">四格都填好了。检查一下文字顺序，再点「排好了」。</p>
      ) : null}
      <div className="mt-6 text-center">
        {done ? (
          <button className="tap rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={onDone}>下一关</button>
        ) : (
          <button className="tap rounded-full bg-persimmon px-6 font-extrabold text-white disabled:opacity-40" type="button" disabled={slots.some((slot) => !slot)} onClick={() => void check()}>
            排好了
          </button>
        )}
      </div>
      {drag && dragging ? (
        <div className="pointer-events-none fixed z-50 w-36 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[#fffaf2] shadow-2xl" style={{ left: drag.x, top: drag.y }}>
          <img src={dragging.image_url} alt="" draggable={false} className="h-24 w-full object-cover" />
          <span className="card-caption">{dragging.caption}</span>
        </div>
      ) : null}
    </div>
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

  async function tap(event: ReactPointerEvent<HTMLDivElement>) {
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
      <h2 className="activity-title text-center font-display text-3xl sm:text-4xl">{spec.prompt}</h2>
      <p className="activity-sub mt-2 text-center text-base sm:text-lg">在画里点一点</p>
      <div className="detective-scene mt-4" onPointerDown={(event) => void tap(event)}>
        <img src={spec.image_url} alt="" draggable={false} />
        {ripples.map((ripple) => (
          <span key={ripple.id} className={`ripple ${ripple.hit ? "hit" : ""}`} style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }} />
        ))}
      </div>
      {misses >= 2 && !done ? <p className="mt-4 text-center text-base text-marigold sm:text-lg">{spec.hint}</p> : null}
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
      <h2 className="activity-title text-center font-display text-3xl sm:text-4xl">{message}</h2>
      <div ref={boardRef} className="match-board relative mt-6 grid gap-6 md:grid-cols-2">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {lines.map((line, index) => (
            <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color} strokeWidth="5" />
          ))}
        </svg>
        <div className="relative z-[2] flex flex-col gap-3">
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
        <div className="relative z-[2] flex flex-col gap-3">
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
