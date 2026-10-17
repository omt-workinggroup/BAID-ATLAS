// Local preview server for the static site, with the same routes as Vercel (vercel.json):
//   node scripts/serve.mjs            -> http://localhost:3000
//   PORT=4000 node scripts/serve.mjs
// No build step: edit a file in site/ and refresh the browser.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../site/", import.meta.url));
const config = JSON.parse(await readFile(new URL(process.env.VERCEL_CONFIG ?? "../vercel.json", import.meta.url), "utf8"));
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

// Turns "/properties/:slug" into a regular expression.
const toRegex = (source) => new RegExp(`^${source.replace(/:[a-zA-Z]+/g, "[^/]+")}/?$`);
const rewrites = (config.rewrites ?? []).map((r) => ({ re: toRegex(r.source), dest: r.destination }));

async function file(path) {
  try {
    const p = normalize(join(root, path));
    if (!p.startsWith(root)) return null;
    const s = await stat(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

async function resolve(pathname) {
  if (pathname.endsWith("/") && pathname !== "/") pathname = pathname.slice(0, -1);
  if (pathname === "/") return file("index.html");
  const direct = (await file(pathname)) ?? (await file(`${pathname}.html`));
  if (direct) return direct;
  const r = rewrites.find((x) => x.re.test(pathname));
  return r ? file(`${r.dest}.html`) : null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const found = await resolve(decodeURIComponent(url.pathname));
  const path = found ?? join(root, "404.html");
  const headers = { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" };
  for (const h of config.headers?.[0]?.headers ?? []) headers[h.key] = h.value;
  try {
    const body = await readFile(path);
    res.writeHead(found ? 200 : 404, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(Number(process.env.PORT ?? 3000), () => console.log(`BAID Atlas on http://localhost:${process.env.PORT ?? 3000}`));
