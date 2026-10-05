import { NOOK_ITEMS } from "../lib/nook";

export function StudyNook({ stars }: { stars: number }) {
  const has = (id: string, cost: number) => stars >= cost || id === "rug";
  return (
    <div>
      <svg className="nook" viewBox="0 0 520 320" role="img" aria-label="书房">
        <rect width="520" height="320" rx="28" fill="#f7f1e6" />
        <rect x="0" y="230" width="520" height="90" fill="#e7d3b4" />
        {has("rug", 0) ? <ellipse cx="260" cy="268" rx="150" ry="22" fill="#e36a3a" opacity="0.85" /> : null}
        <rect x="40" y="70" width="120" height="150" rx="8" fill="#8d5a38" />
        <rect x="52" y="86" width="96" height="18" fill="#f0c14e" />
        <rect x="52" y="114" width="96" height="18" fill="#6ea892" />
        <rect x="52" y="142" width="96" height="18" fill="#2a6f86" />
        <rect x="300" y="48" width="160" height="110" rx="8" fill="#d7ecf5" />
        <circle cx="430" cy="78" r="16" fill="#f0c14e" />
        {has("plant", 8) ? (
          <g>
            <rect x="214" y="176" width="22" height="28" rx="4" fill="#c47b4a" />
            <ellipse cx="225" cy="160" rx="26" ry="18" fill="#2f6f4e" />
          </g>
        ) : null}
        {has("lamp", 16) ? (
          <g>
            <rect x="250" y="150" width="8" height="70" fill="#8a5a38" />
            <path d="M230 150 H278 L268 122 H240 Z" fill="#f0c14e" />
          </g>
        ) : null}
        {has("telescope", 28) ? <path d="M360 190 L450 150" stroke="#2b241c" strokeWidth="8" strokeLinecap="round" /> : null}
        {has("mobile", 40) ? (
          <g>
            <line x1="150" y1="36" x2="150" y2="70" stroke="#f0c14e" />
            <circle cx="150" cy="78" r="8" fill="#f0c14e" />
            <line x1="180" y1="36" x2="180" y2="84" stroke="#f0c14e" />
            <circle cx="180" cy="94" r="8" fill="#e36a3a" />
          </g>
        ) : null}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-2">
        {NOOK_ITEMS.map((item) => (
          <li key={item.id} className={`rounded-full px-3 py-1 text-sm ${stars >= item.cost ? "bg-marigold text-ink" : "bg-white/10"}`}>
            {stars >= item.cost ? item.name : `${item.name} · ${item.cost} 星`}
          </li>
        ))}
      </ul>
    </div>
  );
}
