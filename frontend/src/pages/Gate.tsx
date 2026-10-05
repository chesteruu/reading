import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { PinPad } from "../components/PinPad";
import type { Child } from "../types";

export function Gate() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@reading.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinFor, setPinFor] = useState<Child | null>(null);
  const [pinError, setPinError] = useState("");

  if (!auth.ready) {
    return (
      <div className="night-room grid place-items-center">
        <p className="font-display text-5xl">星光书架</p>
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await auth.login(email, password);
      else await auth.register(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "没有连上书架");
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(pin: string) {
    if (!pinFor) return;
    setBusy(true);
    setPinError("");
    try {
      await auth.unlock(pinFor.id, pin);
      navigate("/shelf");
    } catch (err) {
      setPinError(err instanceof ApiError ? err.message : "再试一次");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="night-room px-6 py-10">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="text-sm uppercase tracking-[0.28em] text-marigold">Starlit Shelf</p>
          <h1 className="mt-3 font-display text-6xl leading-none sm:text-7xl">星光书架</h1>
          <p className="mt-4 max-w-md text-xl leading-relaxed text-white/80">
            选一个头像，输入四位 PIN，故事就摊开在平板上。听一句，点一个词，再把自己的声音留下来。
          </p>
          {auth.child ? (
            <button className="tap mt-6 rounded-full bg-marigold px-6 font-extrabold text-ink" type="button" onClick={() => navigate("/shelf")}>
              继续 {auth.child.nickname} 的阅读
            </button>
          ) : null}
        </section>
        <section className="paper-card p-6 sm:p-8">
          {auth.parentToken ? (
            <div>
              <h2 className="font-display text-3xl">谁来读书？</h2>
              <div className="mt-6 flex flex-wrap gap-4">
                {auth.children.map((child) => (
                  <button key={child.id} type="button" className="tap w-28 rounded-3xl bg-[#efe4d2] p-3 text-center" onClick={() => { setPinFor(child); setPinError(""); }}>
                    <img src={child.avatar_url} alt="" className="mx-auto h-16 w-16 rounded-full" />
                    <span className="mt-2 block font-extrabold">{child.nickname}</span>
                    <span className="text-sm">Level {child.current_level}</span>
                  </button>
                ))}
                {auth.children.length === 0 ? <p>还没有孩子。到家长页添加一个头像和 PIN。</p> : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="tap rounded-full bg-ink px-5 text-paper" type="button" onClick={() => navigate("/parent")}>
                  家长页
                </button>
                <button className="tap rounded-full px-5" type="button" onClick={auth.logout}>
                  退出
                </button>
              </div>
              {auth.email === "demo@reading.app" ? (
                <p className="mt-4 text-sm text-black/60">演示 PIN：Luna 1234，Leo 2580</p>
              ) : null}
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="font-display text-3xl">{mode === "login" ? "家长进入" : "创建家长账号"}</h2>
              <label className="mt-5 block text-sm font-bold">
                邮箱
                <input className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 text-lg" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
              </label>
              <label className="mt-3 block text-sm font-bold">
                密码
                <input className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 text-lg" value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required />
              </label>
              {error ? <p className="mt-3 text-persimmon">{error}</p> : null}
              <button className="tap mt-5 w-full rounded-full bg-persimmon font-extrabold text-white" type="submit" disabled={busy}>
                {busy ? "请稍等…" : mode === "login" ? "进入" : "创建并进入"}
              </button>
              <button className="tap mt-3 w-full rounded-full bg-[#efe4d2] font-extrabold" type="button" onClick={() => auth.login("demo@reading.app", "demo1234").catch((err: unknown) => setError(err instanceof ApiError ? err.message : "演示家庭暂时进不去"))}>
                用演示家庭看看
              </button>
              <button className="mt-4 text-sm underline" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "创建一个家长账号" : "已有账号，直接进入"}
              </button>
            </form>
          )}
        </section>
      </div>
      {pinFor ? (
        <PinPad nickname={pinFor.nickname} error={pinError} busy={busy} onClose={() => setPinFor(null)} onSubmit={submitPin} />
      ) : null}
    </main>
  );
}
