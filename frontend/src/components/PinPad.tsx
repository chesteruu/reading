import { useEffect, useState } from "react";

type Props = {
  nickname: string;
  error: string;
  busy: boolean;
  onSubmit: (pin: string) => void;
  onClose: () => void;
};

export function PinPad({ nickname, error, busy, onSubmit, onClose }: Props) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (error) setPin("");
  }, [error]);

  function press(digit: string) {
    if (busy) return;
    navigator.vibrate?.(12);
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) onSubmit(next);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "清空", "0", "删"];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <div className="paper-card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-3xl">{nickname}</p>
            <p className="mt-1 text-lg">输入 4 位 PIN</p>
          </div>
          <button className="tap rounded-full px-4 text-lg" onClick={onClose} type="button">
            关闭
          </button>
        </div>
        <div className="mt-5 flex justify-center gap-3" aria-label="已输入的位数">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className={`h-4 w-4 rounded-full ${index < pin.length ? "bg-persimmon" : "bg-black/15"}`} />
          ))}
        </div>
        {error ? <p className="mt-4 text-center text-lg text-persimmon">{error}</p> : null}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              className="tap rounded-2xl bg-[#efe4d2] text-2xl font-extrabold"
              onClick={() => {
                if (key === "清空") setPin("");
                else if (key === "删") setPin((value) => value.slice(0, -1));
                else press(key);
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
