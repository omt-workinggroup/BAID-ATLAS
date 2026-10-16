import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CARD_COLUMNS, type ListingCardData, type MediaItem } from "./types";
import { decodeCursor, encodeCursor, type SearchFilters } from "./search";

export const PAGE_SIZE = 12;
const BUCKET = "listing-media";
const SIGNED_URL_TTL = 60 * 60;

// Signed URLs are created with the caller's session, so storage RLS decides what can be signed.
export async function signPaths(paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  const map = new Map<string, string>();
  for (const row of data ?? []) if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  return map;
}

export async function withCoverUrls(rows: ListingCardData[]) {
  const urls = await signPaths(rows.map((r) => r.cover_path));
  return rows.map((r) => ({ ...r, cover_url: r.cover_path ? (urls.get(r.cover_path) ?? null) : null }));
}

export async function searchListings(f: SearchFilters) {
  const supabase = await createClient();
  const sort = f.sort ?? "newest";
  let q = supabase.from("listing_cards").select(CARD_COLUMNS).eq("status", "published");

  if (f.purpose) q = q.eq("purpose", f.purpose);
  if (f.type) q = q.eq("property_type", f.type);
  if (f.beds) q = q.gte("bedrooms", f.beds);
  if (f.currency) q = q.eq("currency", f.currency);
  if (f.min !== undefined) q = q.gte("asking_price", f.min);
  if (f.max !== undefined) q = q.lte("asking_price", f.max);
  if (f.q) {
    const term = `%${f.q}%`;
    q = q.or(`title.ilike.${term},city.ilike.${term},locality.ilike.${term},region.ilike.${term}`);
  }

  const cursor = decodeCursor(f.cursor);
  if (sort === "newest") {
    if (cursor) q = q.or(`published_at.lt."${cursor.value}",and(published_at.eq."${cursor.value}",id.lt.${cursor.id})`);
    q = q.order("published_at", { ascending: false }).order("id", { ascending: false });
  } else {
    const asc = sort === "price_asc";
    if (cursor) {
      const op = asc ? "gt" : "lt";
      q = q.or(`asking_price.${op}.${cursor.value},and(asking_price.eq.${cursor.value},id.${op}.${cursor.id})`);
    }
    q = q.order("asking_price", { ascending: asc }).order("id", { ascending: asc });
  }

  const { data, error } = await q.limit(PAGE_SIZE + 1);
  if (error) return { rows: [] as ListingCardData[], nextCursor: null, error: true };
  const rows = (data ?? []) as unknown as ListingCardData[];
  const page = rows.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  const nextCursor =
    rows.length > PAGE_SIZE && last
      ? encodeCursor(sort === "newest" ? String(last.published_at) : String(last.asking_price), last.id)
      : null;
  return { rows: await withCoverUrls(page), nextCursor, error: false };
}

export async function latestListings(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_cards")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return withCoverUrls((data ?? []) as unknown as ListingCardData[]);
}

export const getPublicListing = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: card } = await supabase
    .from("listing_cards")
    .select(`${CARD_COLUMNS}, organization_id, expires_at`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!card) return null;

  const [{ data: listing }, { data: media }] = await Promise.all([
    supabase.from("property_listings").select("description").eq("id", card.id).single(),
    supabase
      .from("property_media")
      .select("id, storage_path, alt_text, is_render, is_virtually_staged, width, height")
      .eq("listing_id", card.id)
      .is("hidden_at", null)
      .eq("media_type", "image")
      .order("sort_order")
      .order("created_at"),
  ]);
  const urls = await signPaths((media ?? []).map((m) => m.storage_path));
  const items: MediaItem[] = (media ?? []).map((m) => ({
    id: m.id,
    url: m.storage_path ? (urls.get(m.storage_path) ?? null) : null,
    alt_text: m.alt_text,
    is_render: m.is_render,
    is_virtually_staged: m.is_virtually_staged,
    width: m.width,
    height: m.height,
  }));
  return {
    card: card as unknown as ListingCardData & { organization_id: string; expires_at: string | null },
    description: (listing?.description as string | null) ?? null,
    media: items,
  };
});

export async function savedListingIds(userId: string | undefined, listingIds: string[]) {
  if (!userId || listingIds.length === 0) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_listings").select("listing_id").in("listing_id", listingIds);
  return new Set((data ?? []).map((r) => r.listing_id as string));
}
