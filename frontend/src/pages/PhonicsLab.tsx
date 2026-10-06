import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  findLesson,
  lessonsByGroup,
  PHONICS_GROUPS,
  PHONICS_LESSONS,
  type PhonicsLesson,
} from "../data/phonicsLessons";
import { phonemeUrl } from "../lib/phonics";
import { playSounds, stopSpeaking } from "../lib/speech";

export function PhonicsLab() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lesson = lessonId ? findLesson(lessonId) : undefined;

  if (lesson) {
    return <LessonDetail lesson={lesson} onBack={() => navigate("/phonics")} />;
  }

  return (
    <main className="night-room min-h-dvh px-4 py-6 text-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/45">Phonics Channel</p>
          <h1 className="font-display text-4xl">自然拼读小课堂</h1>
          <p className="mt-1 text-white/70">听标准读音，看舌头、嘴唇、喉咙怎么放。</p>
        </div>
        <Link className="tap rounded-full bg-white/10 px-4 py-2" to="/shelf">回书架</Link>
      </header>

      <section className="mx-auto mt-6 max-w-5xl rounded-[2rem] bg-[#fff7ea] p-5 text-ink shadow-lg">
        <h2 className="font-display text-2xl">今天怎么练？</h2>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-black/70">
          <li>1. 先看口型图：舌头、嘴唇、喉咙各管什么。</li>
          <li>2. 点「听一听」，跟读两遍。</li>
          <li>3. 再练例词，感觉嘴巴有没有放到位。</li>
        </ol>
      </section>

      <div className="mx-auto mt-6 grid max-w-5xl gap-5">
        {PHONICS_GROUPS.map((group) => {
          const lessons = lessonsByGroup(group.id);
          return (
            <section key={group.id}>
              <h2 className="font-display text-3xl">{group.title}</h2>
              <p className="mt-1 text-white/65">{group.blurb}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="tap rounded-3xl bg-[#fffaf2] p-4 text-left text-ink shadow-md"
                    onClick={() => navigate(`/phonics/${item.id}`)}
                  >
                    <p className="text-xs font-extrabold uppercase tracking-wide text-black/45">{item.ipa}</p>
                    <p className="font-display text-2xl leading-tight">{item.title}</p>
                    <p className="mt-1 text-sm text-black/55">{item.subtitle}</p>
                    <p className="mt-3 text-sm text-persimmon">舌头 · 嘴唇 · 喉咙 →</p>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mx-auto mt-8 max-w-5xl pb-10">
        <h2 className="font-display text-2xl">全部音素速听</h2>
        <p className="mt-1 text-white/65">点任何一个，马上听到自然女声示范。</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PHONICS_LESSONS.map((item) => (
            <button
              key={`quick-${item.id}`}
              type="button"
              className="tap rounded-full bg-white/10 px-4 py-2 text-sm"
              onClick={() => playSounds([{ audio: phonemeUrl(item.speak), say: null }], 1, () => undefined, () => undefined)}
            >
              {item.grapheme} [{item.ipa}]
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function LessonDetail({ lesson, onBack }: { lesson: PhonicsLesson; onBack: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const group = useMemo(() => PHONICS_GROUPS.find((item) => item.id === lesson.group), [lesson.group]);

  function playPhoneme() {
    stopSpeaking();
    setPlaying(true);
    playSounds([{ audio: phonemeUrl(lesson.speak), say: null }], 1, () => undefined, () => setPlaying(false));
  }

  function playExample(word: string) {
    stopSpeaking();
    setActiveExample(word);
    playSounds(
      [{ audio: `/voice/words/${word}.mp3?v=2`, say: word }],
      1,
      () => undefined,
      () => setActiveExample(null),
    );
  }

  return (
    <main className="night-room min-h-dvh px-4 py-6 text-paper">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <button className="tap rounded-full bg-white/10 px-4 py-2" type="button" onClick={onBack}>全部课程</button>
        <p className="text-sm text-white/55">{group?.title}</p>
      </header>

      <article className="mx-auto mt-5 max-w-3xl rounded-[2rem] bg-[#fff7ea] p-5 text-ink shadow-xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-black/40">[{lesson.ipa}]</p>
        <h1 className="font-display text-4xl">{lesson.title}</h1>
        <p className="mt-1 text-black/60">{lesson.subtitle}</p>

        <MouthDiagram kind={lesson.group === "digraph" && lesson.id.includes("th") ? "th" : lesson.group === "long" ? "long" : lesson.group === "consonant" ? "cons" : "short"} />

        <button
          className={`tap mt-4 w-full rounded-full px-5 py-3 text-lg font-extrabold ${playing ? "bg-ink text-paper" : "bg-persimmon text-white"}`}
          type="button"
          onClick={playPhoneme}
        >
          {playing ? "播放中…" : "听标准读音"}
        </button>

        <div className="mt-5 grid gap-3">
          <GuideCard title="舌头" body={lesson.articulation.tongue} />
          <GuideCard title="嘴唇" body={lesson.articulation.lips} />
          <GuideCard title="喉咙 / 气息" body={lesson.articulation.throat} />
          <GuideCard title="小提示" body={lesson.articulation.tip} accent />
        </div>

        <p className="mt-5 rounded-2xl bg-[#f3e7d4] px-4 py-3 text-sm leading-relaxed">{lesson.coach}</p>

        <h2 className="mt-6 font-display text-2xl">练这些词</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {lesson.examples.map((word) => (
            <button
              key={word}
              type="button"
              className={`tap rounded-full px-4 py-2 font-read text-xl ${activeExample === word ? "bg-marigold text-ink" : "bg-white"}`}
              onClick={() => playExample(word)}
            >
              {word}
            </button>
          ))}
        </div>
      </article>
    </main>
  );
}

function GuideCard({ title, body, accent = false }: { title: string; body: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${accent ? "bg-[#ffe8d2]" : "bg-white"}`}>
      <p className="text-sm font-extrabold text-persimmon">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-black/75">{body}</p>
    </div>
  );
}

function MouthDiagram({ kind }: { kind: "short" | "long" | "th" | "cons" }) {
  const caption =
    kind === "th" ? "舌尖轻轻伸出门牙之间" :
    kind === "long" ? "口型会滑动：从开到收" :
    kind === "cons" ? "找到接触点：唇、齿龈或软腭" :
    "看舌头高低和嘴唇开合";

  return (
    <div className="mt-4 overflow-hidden rounded-[1.5rem] bg-[#1c2a28] p-4 text-paper">
      <svg viewBox="0 0 360 200" className="mx-auto h-auto w-full max-w-md" role="img" aria-label={caption}>
        <rect width="360" height="200" fill="#1c2a28" />
        <ellipse cx="180" cy="110" rx="120" ry="70" fill="#f0c9a0" />
        <path d="M90 105 Q180 155 270 105" fill="#c4552a" opacity="0.9" />
        <path d="M110 100 Q180 70 250 100" fill="none" stroke="#8a5a38" strokeWidth="6" strokeLinecap="round" />
        {kind === "th" ? (
          <path d="M180 118 L180 148" stroke="#f7f1e6" strokeWidth="10" strokeLinecap="round" />
        ) : kind === "long" ? (
          <>
            <path d="M150 120 Q180 135 210 118" fill="none" stroke="#f0c14e" strokeWidth="5" />
            <path d="M205 116 L220 110 L208 128" fill="#f0c14e" />
          </>
        ) : kind === "cons" ? (
          <circle cx="180" cy="92" r="10" fill="#f0c14e" />
        ) : (
          <ellipse cx="180" cy="118" rx="34" ry="14" fill="#8a5a38" opacity="0.55" />
        )}
        <circle cx="145" cy="78" r="5" fill="#2b2118" />
        <circle cx="215" cy="78" r="5" fill="#2b2118" />
      </svg>
      <p className="mt-2 text-center text-sm text-white/75">{caption}</p>
    </div>
  );
}
