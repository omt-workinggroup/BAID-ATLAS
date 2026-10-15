import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const ogAlt = "BAID Atlas — Find property in Ghana you can trust";
export const ogSize = { width: 1200, height: 630 };

const GOLD = "linear-gradient(100deg, #F6D27A 0%, #D9A12E 50%, #A8741A 100%)";

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6D27A" />
          <stop offset="0.5" stopColor="#D9A12E" />
          <stop offset="1" stopColor="#A8741A" />
        </linearGradient>
      </defs>
      <path d="M12 56 30 11.6c.4-1 1.4-1.6 2.4-1.6H39c7.6 0 12.2 3.9 12.2 9.8 0 5.2-3.4 9.3-8.2 11.2 6.8.9 11 5 11 11.4C54 50.6 48 56 38.6 56z" fill="#1f1f1f" stroke="url(#g)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20.5 56 33 23.5 45.5 56z" fill="#0b0b0b" />
      <path d="M24.6 56 33 34l8.4 22" fill="none" stroke="#1f1f1f" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="28.2" y="44" width="3.6" height="12" rx="0.7" fill="url(#g)" />
      <rect x="32.6" y="35.5" width="4" height="20.5" rx="0.7" fill="url(#g)" />
      <rect x="37.4" y="46" width="3.6" height="10" rx="0.7" fill="url(#g)" />
      <path d="M4.5 44.5C4 41 16 36 31 32.5c13-3 24.5-4 27.5-2.3" fill="none" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 4c.6 3.4 1.7 4.5 5 5-3.3.6-4.4 1.7-5 5-.6-3.3-1.7-4.4-5-5 3.3-.5 4.4-1.6 5-5z" fill="url(#g)" />
    </svg>
  );
}

// Social preview shown when the site is shared (WhatsApp, X, LinkedIn, Facebook, iMessage).
export async function renderSocialImage() {
  const font = (w: number) => readFile(path.join(process.cwd(), `assets/fonts/jakarta-${w}.ttf`));
  const [regular, bold] = await Promise.all([font(500), font(800)]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b0b0b", color: "#fff", fontFamily: "Jakarta", position: "relative" }}>
        <div style={{ position: "absolute", right: -160, top: -200, width: 720, height: 720, borderRadius: 9999, background: "radial-gradient(circle, rgba(217,161,46,0.38) 0%, rgba(217,161,46,0) 65%)" }} />
        <div style={{ position: "absolute", right: 30, bottom: -30, display: "flex", opacity: 0.95 }}>
          <Mark size={430} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", width: 800 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Mark size={64} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6 }}>BAID</div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 12, backgroundImage: GOLD, backgroundClip: "text", color: "transparent" }}>ATLAS</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", fontSize: 64, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2 }}>
              <span>Find property in Ghana you can&nbsp;</span>
              <span style={{ backgroundImage: GOLD, backgroundClip: "text", color: "transparent" }}>trust.</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 500, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 }}>
              Homes, land, rentals and commercial space — moderated listings and honest verification labels.
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {["Moderated listings", "Scoped verification", "Mobile first"].map((t) => (
              <div key={t} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, border: "1.5px solid rgba(217,161,46,0.6)", color: "#F6D27A", fontSize: 21, fontWeight: 500 }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Jakarta", data: regular, weight: 500, style: "normal" },
        { name: "Jakarta", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
}
