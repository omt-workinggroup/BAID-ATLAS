import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ServiceWorker } from "@/components/service-worker";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const description =
  "Find homes, land, rentals and commercial property in Ghana. Moderated listings, honest verification labels and tools for agencies, developers and landlords.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "BAID Atlas — Find property in Ghana you can trust", template: "%s · BAID Atlas" },
  description,
  applicationName: "BAID Atlas",
  keywords: ["Ghana property", "Accra real estate", "houses for sale Ghana", "rent in Accra", "land for sale Ghana", "property developers Ghana"],
  appleWebApp: { capable: true, title: "BAID Atlas", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "BAID Atlas",
    locale: "en_GH",
    title: "BAID Atlas — Find property in Ghana you can trust",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "BAID Atlas — Find property in Ghana you can trust",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en-GH" className={jakarta.variable}>
      <body className="antialiased">
        <AppShell signedIn={Boolean(user)}>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
