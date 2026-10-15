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

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signUpSchema = z.object({ email, password: passwordSchema });
export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(72) });
export const resetRequestSchema = z.object({ email });
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export const displayNameSchema = z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer.");

const optionalPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^\+[1-9][0-9]{6,14}$/.test(v), "Use international format, e.g. +233201234567.")
  .transform((v) => (v === "" ? null : v));

export const profileSchema = z.object({
  display_name: displayNameSchema,
  phone: optionalPhone,
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
  email,
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
