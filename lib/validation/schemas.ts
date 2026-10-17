import { z } from "zod";

export const ORGANIZATION_TYPES = [
  "agency",
  "developer",
  "landlord",
  "property_manager",
  "marketing_partner",
  "enterprise",
] as const;

export const ORG_ROLES = [
  "owner",
  "admin",
  "listing_manager",
  "marketing_manager",
  "lead_manager",
  "viewer",
] as const;

export const INVITABLE_ROLES = ORG_ROLES.filter((r) => r !== "owner");

export const SUPPORTED_CURRENCIES = ["GHS", "USD", "EUR", "GBP"] as const;
export const SUPPORTED_LOCALES = ["en-GH", "en-GB", "en-US"] as const;

// Phone numbers are stored in E.164. Ghanaian numbers may be typed locally ("024 123 4567") or with the
// country code in any common form ("233…", "+233…", "00233…").
export function normalisePhone(input: string): string {
  let v = input.trim().replace(/[\s\-().]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  else if (/^0\d{9}$/.test(v)) v = `+233${v.slice(1)}`;
  else if (/^233\d{9}$/.test(v)) v = `+${v}`;
  return v;
}

const E164 = /^\+[1-9][0-9]{6,14}$/;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number.")
  .transform(normalisePhone)
  .refine((v) => E164.test(v), "Enter a valid phone number, e.g. 024 123 4567.");

export const phoneSignInSchema = z.object({ phone: phoneSchema });
export const otpSchema = z.object({
  token: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => /^\d{6}$/.test(v), "Enter the 6-digit code from the text message."),
});

export const displayNameSchema = z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer.");

const optionalPhone = z
  .string()
  .trim()
  .transform((v) => (v === "" ? "" : normalisePhone(v)))
  .refine((v) => v === "" || E164.test(v), "Enter a valid phone number, e.g. 024 123 4567.")
  .transform((v) => (v === "" ? null : v));

// The phone on a profile is the verified sign-in number and can't be edited here.
export const profileSchema = z.object({
  display_name: displayNameSchema,
  preferred_currency: z.enum(SUPPORTED_CURRENCIES),
  preferred_locale: z.enum(SUPPORTED_LOCALES),
});

export const onboardingSchema = z.object({
  display_name: displayNameSchema,
  intent: z.enum(["discover", "provide"]),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(60, "Use 60 characters or fewer.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(120),
  slug: slugSchema,
  type: z.enum(ORGANIZATION_TYPES, { message: "Choose an organisation type." }),
  description: z.string().trim().max(2000).optional().default(""),
});

const optionalHttpsUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Use a full https:// address.")
  .transform((v) => (v === "" ? null : v));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address.")
  .transform((v) => (v === "" ? null : v));

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(120),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === "" ? null : v)),
  website: optionalHttpsUrl,
  public_email: optionalEmail,
  public_phone: optionalPhone,
});

export const inviteSchema = z.object({
  phone: phoneSchema,
  role: z.enum(INVITABLE_ROLES as unknown as [string, ...string[]], { message: "Choose a role." }),
});

export const roleSchema = z.enum(ORG_ROLES);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type FieldErrors = Record<string, string | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
