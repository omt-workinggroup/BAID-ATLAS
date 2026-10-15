import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BAID Atlas — Property in Ghana",
    short_name: "BAID Atlas",
    description:
      "Find homes, land, rentals and commercial property in Ghana, with moderated listings and honest verification labels.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    lang: "en-GH",
    categories: ["lifestyle", "business", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Provider portal", short_name: "Portal", url: "/portal", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My account", short_name: "Account", url: "/account", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
