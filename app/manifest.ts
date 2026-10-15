import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BAID Atlas",
    short_name: "BAID Atlas",
    description: "Discover, list and market property in Ghana.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#0f5b4a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
