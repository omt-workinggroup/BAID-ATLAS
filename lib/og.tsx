import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const ogAlt = "BAID Atlas — Discover more. Go further. Find property in Ghana you can trust.";
export const ogSize = { width: 1200, height: 630 };

const GOLD = "linear-gradient(100deg, #C9A06A 0%, #B38A56 50%, #86653B 100%)";

// Social preview shown when the site is shared (WhatsApp, X, LinkedIn, Facebook, iMessage).
export async function renderSocialImage() {
  const root = process.cwd();
  const [regular, bold, logo] = await Promise.all([
    readFile(path.join(root, "assets/fonts/jakarta-500.ttf")),
    readFile(path.join(root, "assets/fonts/jakarta-800.ttf")),
    readFile(path.join(root, "public/brand/logo-full.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FFFFFF", color: "#25272C", fontFamily: "Jakarta", position: "relative" }}>
        <div style={{ position: "absolute", left: -120, top: -160, width: 640, height: 640, borderRadius: 9999, background: "radial-gradient(circle, rgba(196,138,69,0.20) 0%, rgba(196,138,69,0) 65%)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 470, paddingLeft: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={400} height={383} alt="" />
        </div>
        <div style={{ display: "flex", width: 2, margin: "110px 0", background: "linear-gradient(180deg, rgba(196,138,69,0), rgba(196,138,69,0.7), rgba(196,138,69,0))" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 26, padding: "0 70px 0 56px", flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 60, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2 }}>
            <span>Find property in Ghana you can&nbsp;</span>
            <span style={{ backgroundImage: GOLD, backgroundClip: "text", color: "transparent" }}>trust.</span>
          </div>
          <div style={{ fontSize: 25, fontWeight: 500, color: "#5F5B52", lineHeight: 1.4 }}>
            Homes, land, rentals and commercial space — moderated listings and honest verification labels.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {["Moderated", "Scoped verification", "Mobile first"].map((t) => (
              <div key={t} style={{ display: "flex", padding: "9px 18px", borderRadius: 999, background: "#25272C", color: "#F7EFE2", fontSize: 19, fontWeight: 500 }}>
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
