import { z } from "zod";
import { PROPERTY_TYPES, PURPOSES } from "./format";

export const SORTS = ["newest", "price_asc", "price_desc"] as const;
export type Sort = (typeof SORTS)[number];

const optionalInt = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Math.min(Number(v), max) : undefined));

export const searchSchema = z.object({
  q: z
    .string()
    .optional()
    // Keep letters, numbers, spaces and a few separators; strips PostgREST filter syntax.
    .transform((v) => (v ? v.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60) : undefined))
    .transform((v) => v || undefined),
  purpose: z.enum(PURPOSES).optional().catch(undefined),
  type: z.enum(PROPERTY_TYPES).optional().catch(undefined),
  min: optionalInt(1_000_000_000),
  max: optionalInt(1_000_000_000),
  beds: optionalInt(10),
  currency: z
    .string()
    .optional()
    .transform((v) => (v && /^[A-Z]{3}$/.test(v) ? v : undefined)),
  sort: z.enum(SORTS).optional().catch(undefined),
  cursor: z.string().optional(),
});

export type SearchFilters = z.infer<typeof searchSchema>;

export function parseSearch(params: Record<string, string | string[] | undefined>): SearchFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) flat[k] = Array.isArray(v) ? v[0] : v;
  const parsed = searchSchema.safeParse(flat);
  return parsed.success ? parsed.data : ({} as SearchFilters);
}

// Keyset cursor for stable pagination: "<sortValue>|<id>" base64url-encoded.
export function encodeCursor(value: string, id: string) {
  return Buffer.from(`${value}|${id}`).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): { value: string; id: string } | null {
  if (!cursor) return null;
  try {
    const [value, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (!value || !/^[0-9a-f-]{36}$/.test(id ?? "")) return null;
    if (!/^[0-9TZ:.+\- ]+$/.test(value)) return null;
    return { value, id };
  } catch {
    return null;
  }
}

export function activeFilterCount(f: SearchFilters) {
  return [f.purpose, f.type, f.min, f.max, f.beds].filter((v) => v !== undefined).length;
}

export function toQueryString(f: Partial<Record<keyof SearchFilters, string | number | undefined>>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
