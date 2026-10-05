import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Particles } from "../components/Particles";
import { StudyNook } from "../components/StudyNook";
import { justUnlocked } from "../lib/nook";

type FlowState = { activityStars?: number; recordingStars?: number; title?: string };

export function Rewards() {
  const { bookId = "" } = useParams();
  const location = useLocation();
  const flow = (location.state ?? {}) as FlowState;
  const auth = useAuth();
  const navigate = useNavigate();
  const [awarded, setAwarded] = useState<number | null>(null);
  const [balance, setBalance] = useState(auth.child?.star_balance ?? 0);
  const before = (auth.child?.star_balance ?? 0) - (flow.activityStars ?? 0) - (flow.recordingStars ?? 0);

  useEffect(() => {
    if (!auth.child || !auth.childToken || !bookId) return;
    let cancel = false;
    api<{ stars_awarded: number; star_balance: number }>("/api/reading/complete", {
      method: "POST",
      token: auth.childToken,
      body: JSON.stringify({ child_id: auth.child.id, book_id: bookId }),
    })
      .then((result) => {
        if (cancel) return;
        setAwarded(result.stars_awarded);
        setBalance(result.star_balance);
        if (auth.child) auth.updateChild({ ...auth.child, star_balance: result.star_balance });
      })
      .catch(() => setAwarded(0));
    return () => {
      cancel = true;
    };
  }, [bookId, auth.childToken]);

  const fresh = justUnlocked(Math.max(0, before), balance);

  return (
    <main className="night-room relative min-h-dvh overflow-hidden px-4 py-8">
      <Particles run />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-marigold">Starlight</p>
        <h1 className="mt-2 font-display text-5xl sm:text-6xl">星光落进口袋</h1>
        <p className="mt-3 text-xl text-white/80">{flow.title ? `《${flow.title}》读完了。` : "这一本先放回书架。"}</p>
        <p className="mt-6 font-display text-7xl text-marigold">{balance}</p>
        <p>现在一共有这么多颗星</p>
        {awarded ? <p className="mt-2 text-lg">读完整本，又亮了 {awarded} 颗</p> : null}
        {(flow.activityStars || flow.recordingStars) ? (
          <p className="text-white/70">游戏 {flow.activityStars ?? 0} · 朗读 {flow.recordingStars ?? 0}</p>
        ) : null}
        {fresh.length ? <p className="mt-4 text-xl">书房新添了：{fresh.map((item) => item.name).join("、")}</p> : null}
        <div className="mt-6 w-full text-ink">
          <StudyNook stars={balance} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="tap rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={() => navigate("/shelf")}>回书架</button>
          <button className="tap rounded-full bg-white/10 px-6" type="button" onClick={() => navigate("/album")}>听小电台</button>
        </div>
      </div>
    </main>
  );
}
