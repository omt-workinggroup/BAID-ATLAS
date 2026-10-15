import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ServiceWorker } from "@/components/service-worker";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "BAID Atlas", template: "%s · BAID Atlas" },
  description: "Discover, list and market property in Ghana — with honest, scoped verification.",
  applicationName: "BAID Atlas",
  appleWebApp: { capable: true, title: "BAID Atlas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b18" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en-GH" className={inter.variable}>
      <body className="antialiased">
        <AppShell signedIn={Boolean(user)}>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
