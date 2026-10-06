import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { findNarration } from "../lib/narration";
import { phonicsBeats, segmentToken, type PhonicsBeat } from "../lib/phonics";
import { glossKey, playSounds, softTick, speakNaturally, stopSpeaking } from "../lib/speech";
import type { AlignmentWord, BookDetail, Gloss, Page } from "../types";

type Bubble = { word: string; gloss?: Gloss; x: number; y: number };

export function Reader() {
  const { bookId = "" } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"listen" | "read">("listen");
  const [rate, setRate] = useState<0.5 | 0.8 | 1>(1);
  const [playing, setPlaying] = useState(false);
  const [phonics, setPhonics] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [graph, setGraph] = useState<number | "all" | null>(null);
  const [cue, setCue] = useState<string | null>(null);
  const [spoken, setSpoken] = useState(-1);
  const [turn, setTurn] = useState<"next" | "prev" | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const arm = useRef(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const auto = useRef(true);
  auto.current = autoAdvance;
  const phonicsRef = useRef(false);
  phonicsRef.current = phonics;
  const modeRef = useRef(mode);
  const rateRef = useRef(rate);
  const pagesRef = useRef<Page[]>([]);
  const indexRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const pending = useRef({ read: 0, listen: 0 });
  const origin = useRef<{ x: number; y: number } | null>(null);
  modeRef.current = mode;
  rateRef.current = rate;
  indexRef.current = index;

  useEffect(() => {
    if (!auth.childToken) return;
    api<BookDetail>(`/api/books/${bookId}`, { token: auth.childToken })
      .then((payload) => {
        setBook(payload);
        pagesRef.current = payload.pages;
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "这本书打不开"));
    if (auth.child) {
      api<{ words: { word: string }[] }>(`/api/words/favorites?child_id=${auth.child.id}`, { token: auth.childToken })
        .then((payload) => setFavorites(new Set(payload.words.map((item) => item.word))))
        .catch(() => undefined);
    }
  }, [bookId, auth.childToken, auth.child?.id]);

  useEffect(() => {
    pagesRef.current.slice(index + 1, index + 3).forEach((page) => {
      const image = new Image();
      image.src = page.image_url;
      if (page.audio_url.startsWith("/") || page.audio_url.startsWith("http")) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = page.audio_url;
      }
    });
  }, [index, book]);

  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      if (document.visibilityState === "visible") {
        if (mode === "listen" && playing) pending.current.listen += delta;
        else pending.current.read += delta;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const timer = window.setInterval(() => void flush(false), 8000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      void flush(true);
    };
  }, [mode, playing, index, bookId]);

  function flush(force: boolean) {
    if (!auth.child || !auth.childToken || !book) return;
    const read = pending.current.read;
    const listen = pending.current.listen;
    if (!force && read + listen < 0.4) return;
    pending.current = { read: 0, listen: 0 };
    void api("/api/reading/progress", {
      method: "POST",
      token: auth.childToken,
      body: JSON.stringify({
        child_id: auth.child.id,
        book_id: book.id,
        current_page: indexRef.current + 1,
        add_read_seconds: read,
        add_listen_seconds: listen,
      }),
    }).catch(() => undefined);
  }

  function stopPlayback() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    stopSpeaking();
    setPlaying(false);
    setGraph(null);
    setCue(null);
  }

  function paint(words: AlignmentWord[], elapsed: number) {
    let current: number | null = null;
    let through = -1;
    words.forEach((word, wordIndex) => {
      if (elapsed >= word.start) through = wordIndex;
      if (elapsed >= word.start && elapsed <= word.end) current = wordIndex;
    });
    setSpoken(through);
    setActive(current);
    setGraph(current === null ? null : "all");
  }

  function finishPlayback() {
    setPlaying(false);
    setActive(null);
    if (modeRef.current !== "listen" || !auto.current) return;
    if (indexRef.current >= pagesRef.current.length - 1) return;
    advanceTimer.current = window.setTimeout(() => {
      arm.current = true;
      go(1);
    }, 650);
  }

  function startPlayback() {
    const page = pagesRef.current[indexRef.current];
    if (!page) return;
    stopPlayback();
    setPlaying(true);
    setSpoken(-1);
    setActive(null);
    const words = page.alignment_data;
    const speed = rateRef.current;
    const narration = !phonicsRef.current ? findNarration(words) : null;
    if (narration) {
      const audio = new Audio(narration.url);
      audio.preservesPitch = true;
      const safari = audio as HTMLAudioElement & { webkitPreservesPitch?: boolean };
      safari.webkitPreservesPitch = true;
      audio.playbackRate = speed;
      audioRef.current = audio;
      const loop = () => {
        paint(narration.words, audio.currentTime);
        if (!audio.paused && !audio.ended) rafRef.current = requestAnimationFrame(loop);
      };
      audio.onended = () => finishPlayback();
      void audio.play().then(() => {
        rafRef.current = requestAnimationFrame(loop);
      }).catch(() => speakSentence(words, speed));
      return;
    }
    if (!page.audio_url.startsWith("speech:") && page.audio_url) {
      const audio = new Audio(page.audio_url);
      audio.preservesPitch = true;
      const safari = audio as HTMLAudioElement & { webkitPreservesPitch?: boolean };
      safari.webkitPreservesPitch = true;
      audio.playbackRate = speed;
      audioRef.current = audio;
      const loop = () => {
        paint(words, audio.currentTime);
        if (!audio.paused && !audio.ended) rafRef.current = requestAnimationFrame(loop);
      };
      audio.onended = () => finishPlayback();
      void audio.play().then(() => {
        rafRef.current = requestAnimationFrame(loop);
      }).catch(() => speakSentence(words, speed));
      return;
    }
    speakSentence(words, speed);
  }

  function playBeats(beats: PhonicsBeat[], speed: number, onDone: () => void) {
    playSounds(
      beats.map((beat) => ({ audio: beat.audio, say: beat.say })),
      speed,
      (beatIndex) => {
        const beat = beats[beatIndex];
        setActive(beat.wordIndex);
        setGraph(beat.graphemeIndex);
        if (beat.graphemeIndex === "all") {
          setCue(beat.ipa ? `${beat.letters}  [${beat.ipa}]` : null);
          setSpoken(beat.wordIndex);
        } else {
          setCue(beat.ipa ? `${beat.letters}  [${beat.ipa}]` : beat.letters);
          setSpoken(beat.wordIndex - 1);
        }
      },
      () => {
        setGraph(null);
        setCue(null);
        onDone();
      },
    );
  }

  function speakSentence(words: AlignmentWord[], speed: number) {
    if (phonicsRef.current) {
      const beats = phonicsBeats(words, true);
      playBeats(beats, 1, () => {
        setSpoken(words.length - 1);
        setActive(null);
        finishPlayback();
      });
      return;
    }
    speakNaturally(
      words,
      speed,
      (wordIndex) => {
        setActive(wordIndex);
        setGraph("all");
        setCue(null);
        setSpoken(wordIndex - 1);
      },
      () => {
        setSpoken(words.length - 1);
        setActive(null);
        setGraph(null);
        finishPlayback();
      },
    );
  }

  useEffect(() => {
    if (arm.current) {
      arm.current = false;
      startPlayback();
      return () => stopPlayback();
    }
    stopPlayback();
    setSpoken(-1);
    setActive(null);
    return () => stopPlayback();
  }, [index, mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === " ") {
        event.preventDefault();
        if (playing) stopPlayback();
        else startPlayback();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function go(delta: number) {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    setIndex((current) => {
      const next = Math.min(pagesRef.current.length - 1, Math.max(0, current + delta));
      if (next !== current) {
        setTurn(delta > 0 ? "next" : "prev");
        softTick();
        window.setTimeout(() => setTurn(null), 420);
      }
      return next;
    });
    setBubble(null);
  }

  function remember(word: string, kind: "tap" | "favorite") {
    if (!auth.child || !auth.childToken || !book) return;
    void api("/api/words/events", {
      method: "POST",
      token: auth.childToken,
      body: JSON.stringify({ child_id: auth.child.id, book_id: book.id, word, kind }),
    }).catch(() => undefined);
  }

  if (error) {
    return (
      <main className="night-room grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-4xl">{error}</p>
          <button className="tap mt-6 rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={() => navigate("/shelf")}>
            回书架
          </button>
        </div>
      </main>
    );
  }
  if (!book) return <main className="reader grid place-items-center font-display text-4xl">翻开书页…</main>;

  const page = book.pages[index];
  const last = index === book.pages.length - 1;

  return (
    <main ref={rootRef} className="reader">
      <header className="flex items-center justify-between gap-3 px-4 pt-3 text-paper">
        <button className="tap rounded-full bg-white/10 px-4" type="button" onClick={() => navigate("/shelf")}>
          书架
        </button>
        <p className="truncate font-display text-2xl">{book.title}</p>
        <button className="tap rounded-full bg-white/10 px-4" type="button" onClick={() => {
          const node = rootRef.current;
          if (!node) return;
          if (!document.fullscreenElement) {
            void node.requestFullscreen?.();
            setFullscreen(true);
          } else {
            void document.exitFullscreen?.();
            setFullscreen(false);
          }
        }}>
          {fullscreen ? "退出全屏" : "全屏"}
        </button>
      </header>
      <div
        className="stage"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("[data-word]")) return;
          origin.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          if (!origin.current) return;
          const dx = event.clientX - origin.current.x;
          const dy = event.clientY - origin.current.y;
          origin.current = null;
          if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
        }}
      >
        <article className={`spread ${turn === "next" ? "turn-next" : ""} ${turn === "prev" ? "turn-prev" : ""}`}>
          <div className="picture">
            <img src={page.image_url} alt="" draggable={false} />
          </div>
          <div className="prose">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-black/45">
              {mode === "listen" ? "Listen 伴读" : "Read 自读"} · {index + 1} / {book.total_pages}
            </p>
            <div className="words mt-4">
              {page.alignment_data.map((word, wordIndex) => {
                const key = glossKey(word.word);
                const favored = favorites.has(key);
                const graphs = segmentToken(word.word);
                return (
                  <WordButton
                    key={`${page.id}-${wordIndex}`}
                    graphemes={graphs}
                    active={active === wordIndex && graph === "all"}
                    liveGraph={active === wordIndex && typeof graph === "number" ? graph : null}
                    spoken={spoken >= wordIndex && active !== wordIndex}
                    favorite={favored}
                    onTap={() => {
                      stopPlayback();
                      const beats = phonicsBeats([word], true).map((beat) => ({ ...beat, wordIndex }));
                      playBeats(beats, 1, () => {
                        setActive(null);
                        setSpoken(wordIndex);
                      });
                      remember(word.word, "tap");
                    }}
                    onFavorite={() => {
                      setFavorites((current) => new Set(current).add(key));
                      remember(word.word, "favorite");
                    }}
                    onLongPress={(x, y) => setBubble({ word: word.word, gloss: book.glossary[key], x, y })}
                  />
                );
              })}
            </div>
            {cue ? (
              <p className="phonics-cue">
                <span>{cue}</span>
              </p>
            ) : (
              <p className="phonics-cue is-idle">播放按整句来读。点一个词，才会把这个词拆开拼读。</p>
            )}
          </div>
        </article>
      </div>
      <footer className="controls">
        <button className="tap rounded-full bg-white/10 px-4 text-paper" type="button" onClick={() => go(-1)} disabled={index === 0}>上一页</button>
        <button className={`tap rounded-full px-5 font-extrabold ${mode === "listen" ? "bg-marigold text-ink" : "bg-white/10 text-paper"}`} type="button" onClick={() => setMode("listen")}>伴读</button>
        <button className={`tap rounded-full px-5 font-extrabold ${mode === "read" ? "bg-marigold text-ink" : "bg-white/10 text-paper"}`} type="button" onClick={() => setMode("read")}>自读</button>
        {mode === "listen" ? (
          <>
            <button className="tap rounded-full bg-persimmon px-5 font-extrabold text-white" type="button" onClick={() => (playing ? stopPlayback() : startPlayback())}>
              {playing ? "暂停" : "播放"}
            </button>
            <button
              className="tap rounded-full bg-white/10 px-4 text-paper disabled:opacity-80"
              type="button"
              disabled={phonics}
              onClick={() => {
                const steps = [1, 0.8, 0.5] as const;
                const next = steps[(steps.indexOf(rate) + 1) % steps.length];
                rateRef.current = next;
                setRate(next);
                if (playing && !phonicsRef.current) startPlayback();
              }}
            >
              {phonics ? "1.0x" : `${rate.toFixed(1)}x`}
            </button>
            <button
              className={`tap rounded-full px-4 font-extrabold ${phonics ? "bg-persimmon text-white" : "bg-white/10 text-paper"}`}
              type="button"
              onClick={() => {
                const next = !phonics;
                phonicsRef.current = next;
                setPhonics(next);
                if (playing) startPlayback();
              }}
            >
              {phonics ? "拼读" : "整词"}
            </button>
            <button className={`tap rounded-full px-4 ${autoAdvance ? "bg-sage text-ink" : "bg-white/10 text-paper"}`} type="button" onClick={() => setAutoAdvance((value) => !value)}>
              {autoAdvance ? "自动翻页" : "手动翻页"}
            </button>
          </>
        ) : null}
        <button className="tap rounded-full bg-white/10 px-4 text-paper" type="button" onClick={() => go(1)} disabled={last}>下一页</button>
        {last ? (
          <button className="tap rounded-full bg-marigold px-5 font-extrabold text-ink" type="button" onClick={() => navigate(`/activities/${book.id}`)}>
            去做小游戏
          </button>
        ) : null}
      </footer>
      {bubble ? (
        <div className="bubble" style={{ left: Math.min(bubble.x, window.innerWidth - 300), top: Math.max(16, bubble.y - 140) }}>
          <p className="text-3xl">{bubble.gloss?.emoji ?? "✨"}</p>
          <p className="mt-1 font-read text-2xl">{glossKey(bubble.word)}</p>
          <p>{bubble.gloss?.hint ?? "听一听这个词。"}</p>
          {bubble.gloss ? <p className="text-black/60">{bubble.gloss.zh}</p> : null}
          <button className="tap mt-2 rounded-full bg-ink px-4 text-paper" type="button" onClick={() => setBubble(null)}>知道了</button>
        </div>
      ) : null}
    </main>
  );
}

function WordButton({
  graphemes,
  active,
  liveGraph,
  spoken,
  favorite,
  onTap,
  onFavorite,
  onLongPress,
}: {
  graphemes: ReturnType<typeof segmentToken>;
  active: boolean;
  liveGraph: number | null;
  spoken: boolean;
  favorite: boolean;
  onTap: () => void;
  onFavorite: () => void;
  onLongPress: (x: number, y: number) => void;
}) {
  const timer = useRef<number | null>(null);
  const hold = useRef(false);
  const last = useRef(0);
  return (
    <button
      type="button"
      data-word="true"
      className={`word-token ${active ? "is-active" : ""} ${spoken ? "is-spoken" : ""} ${favorite ? "is-favorite" : ""}`}
      onPointerDown={(event) => {
        hold.current = false;
        const point = { x: event.clientX, y: event.clientY };
        timer.current = window.setTimeout(() => {
          hold.current = true;
          onLongPress(point.x, point.y);
        }, 520);
      }}
      onPointerUp={() => {
        if (timer.current) window.clearTimeout(timer.current);
      }}
      onPointerLeave={() => {
        if (timer.current) window.clearTimeout(timer.current);
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (hold.current) {
          hold.current = false;
          return;
        }
        const now = Date.now();
        if (now - last.current < 320) {
          onFavorite();
          last.current = 0;
          return;
        }
        last.current = now;
        onTap();
      }}
    >
      {graphemes.map((part, index) => {
        const linked = liveGraph !== null && part.linkedTo === liveGraph;
        const live = liveGraph === index || linked || (active && part.kind !== "silent");
        return (
          <span key={`${part.text}-${index}`} className={`graph graph-${part.kind} ${live ? "is-live" : ""}`}>
            {part.text}
          </span>
        );
      })}
    </button>
  );
}
