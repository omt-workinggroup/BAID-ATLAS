// Decorative scenes for empty states and category cards. Illustrations only — never presented as real properties.
type Scene = "villa" | "apartment" | "land" | "stay";

const skies: Record<Scene, [string, string]> = {
  villa: ["#1b1b1b", "#3a2c12"],
  apartment: ["#f6e2b3", "#e9c27a"],
  land: ["#dfe9d6", "#b9cfa4"],
  stay: ["#2a1f3d", "#d98b4a"],
};

export function SceneArt({ scene, className }: { scene: Scene; className?: string }) {
  const [a, b] = skies[scene];
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${scene}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <linearGradient id={`gold-${scene}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6D27A" />
          <stop offset="1" stopColor="#B8831F" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#sky-${scene})`} />
      {scene === "villa" && (
        <>
          <circle cx="212" cy="40" r="14" fill="#F6D27A" opacity="0.9" />
          <rect x="0" y="160" width="320" height="40" fill="#2f3a22" />
          <path d="M70 160V96l70-40 70 40v64z" fill="#f2ede2" />
          <path d="M60 100 140 52l80 48" fill="none" stroke="#121212" strokeWidth="8" strokeLinejoin="round" />
          <rect x="88" y="112" width="30" height="24" rx="2" fill={`url(#gold-${scene})`} />
          <rect x="162" y="112" width="30" height="24" rx="2" fill={`url(#gold-${scene})`} />
          <rect x="128" y="124" width="24" height="36" rx="2" fill="#121212" />
          <rect x="210" y="118" width="64" height="42" fill="#e4dccb" />
          <rect x="222" y="128" width="40" height="18" rx="2" fill={`url(#gold-${scene})`} />
          <ellipse cx="40" cy="150" rx="22" ry="18" fill="#3f5a2c" />
          <ellipse cx="290" cy="152" rx="20" ry="16" fill="#3f5a2c" />
        </>
      )}
      {scene === "apartment" && (
        <>
          <rect x="0" y="168" width="320" height="32" fill="#cdb98f" />
          <rect x="60" y="40" width="90" height="128" fill="#121212" />
          <rect x="160" y="72" width="100" height="96" fill="#2b2b2b" />
          {Array.from({ length: 5 }).map((_, r) =>
            [0, 1, 2].map((c) => (
              <rect key={`a${r}${c}`} x={72 + c * 26} y={52 + r * 22} width="16" height="12" rx="1.5" fill={(r + c) % 3 ? `url(#gold-${scene})` : "#3a3a3a"} />
            )),
          )}
          {Array.from({ length: 4 }).map((_, r) =>
            [0, 1, 2].map((c) => (
              <rect key={`b${r}${c}`} x={174 + c * 28} y={84 + r * 20} width="18" height="11" rx="1.5" fill={(r + c) % 2 ? `url(#gold-${scene})` : "#444"} />
            )),
          )}
        </>
      )}
      {scene === "land" && (
        <>
          <path d="M0 120c60-30 120-30 180-10s100 10 140-10v100H0z" fill="#8fae6f" />
          <path d="M0 150c80-20 160-20 320 0v50H0z" fill="#6e8f50" />
          <path d="M120 150v-34M200 156v-40" stroke="#121212" strokeWidth="3" />
          <path d="M120 116h22l-4 7 4 7h-22z" fill={`url(#gold-${scene})`} />
          <path d="M200 116h22l-4 7 4 7h-22z" fill={`url(#gold-${scene})`} />
          <path d="M120 150 200 156" stroke="#F6D27A" strokeWidth="2" strokeDasharray="6 5" />
        </>
      )}
      {scene === "stay" && (
        <>
          <circle cx="80" cy="60" r="22" fill="#F6D27A" />
          <path d="M0 150c80-14 160-14 320 0v50H0z" fill="#1c1626" />
          <rect x="140" y="96" width="120" height="58" rx="6" fill="#f2ede2" />
          <path d="M130 100 200 66l70 34" fill="none" stroke="#121212" strokeWidth="8" strokeLinejoin="round" />
          <rect x="156" y="112" width="28" height="22" rx="2" fill={`url(#gold-${scene})`} />
          <rect x="216" y="112" width="28" height="22" rx="2" fill={`url(#gold-${scene})`} />
          <path d="M40 154v-50M40 104c-18 4-26 14-28 22M40 104c18 4 26 14 28 22M40 104c-6-14-2-26 6-32" stroke="#121212" strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
