import { z } from "zod";
import { AREA_UNITS, GHANA_REGIONS, LISTING_CURRENCIES, PRICE_PERIODS, PROPERTY_TYPES, PURPOSES } from "@/lib/listings/format";

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const optionalNumber = (max: number, label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ message: `Enter a number for ${label}.` }).min(0).max(max).optional(),
  );

export const listingSchema = z
  .object({
    title: z.string().trim().min(5, "Use at least 5 characters.").max(120, "Use 120 characters or fewer."),
    description: z.string().trim().max(5000, "Use 5,000 characters or fewer.").optional().default(""),
    purpose: z.enum(PURPOSES, { message: "Choose what you're offering." }),
    property_type: z.enum(PROPERTY_TYPES, { message: "Choose a property type." }),
    region: z.enum(GHANA_REGIONS, { message: "Choose a region." }),
    city: z.string().trim().min(2, "Enter the town or city.").max(80),
    locality: z.string().trim().max(80).optional().default(""),
    address_private: z.string().trim().max(300).optional().default(""),
    bedrooms: optionalNumber(50, "bedrooms").pipe(z.number().int().optional()),
    bathrooms: optionalNumber(50, "bathrooms").pipe(z.number().int().optional()),
    floor_area: optionalNumber(10_000_000, "floor area"),
    floor_area_unit: z.preprocess(blankToUndefined, z.enum(AREA_UNITS).optional()),
    land_area: optionalNumber(10_000_000, "land area"),
    land_area_unit: z.preprocess(blankToUndefined, z.enum(AREA_UNITS).optional()),
    asking_price: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/[,\s]/g, "") : v),
      z.coerce.number({ message: "Enter a price." }).positive("Enter a price above zero.").max(1e13),
    ),
    currency: z.enum(LISTING_CURRENCIES),
    price_period: z.enum(PRICE_PERIODS),
  })
  .superRefine((v, ctx) => {
    if (v.purpose === "sale" && v.price_period !== "total") {
      ctx.addIssue({ code: "custom", path: ["price_period"], message: "Sale prices are a total amount." });
    }
    if (v.purpose !== "sale" && v.purpose !== "lease" && v.price_period === "total") {
      ctx.addIssue({ code: "custom", path: ["price_period"], message: "Choose how often rent is paid." });
    }
    if ((v.floor_area === undefined) !== (v.floor_area_unit === undefined)) {
      ctx.addIssue({ code: "custom", path: ["floor_area"], message: "Give both the floor area and its unit." });
    }
    if ((v.land_area === undefined) !== (v.land_area_unit === undefined)) {
      ctx.addIssue({ code: "custom", path: ["land_area"], message: "Give both the land area and its unit." });
    }
  });

export type ListingInput = z.infer<typeof listingSchema>;

// Serialises validated input into the JSON payload the database functions expect.
export function toPayload(v: ListingInput) {
  const s = (n: number | undefined) => (n === undefined ? "" : String(n));
  return {
    title: v.title,
    description: v.description,
    purpose: v.purpose,
    property_type: v.property_type,
    region: v.region,
    city: v.city,
    locality: v.locality,
    address_private: v.address_private,
    latitude: "",
    longitude: "",
    bedrooms: s(v.bedrooms),
    bathrooms: s(v.bathrooms),
    floor_area: s(v.floor_area),
    floor_area_unit: v.floor_area_unit ?? "",
    land_area: s(v.land_area),
    land_area_unit: v.land_area_unit ?? "",
    asking_price: v.asking_price.toFixed(2),
    currency: v.currency,
    price_period: v.price_period,
  };
}

export const REVIEW_REASONS = {
  photos: "Photos need work",
  description: "Description unclear or incomplete",
  price: "Price looks wrong",
  location: "Location details inconsistent",
  misleading: "Misleading or unlabelled renders",
  duplicate: "Duplicate listing",
  prohibited: "Not allowed on BAID Atlas",
} as const;
