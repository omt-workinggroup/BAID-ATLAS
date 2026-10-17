// Form rules shared by every page. Each returns { value } or { error }.

const E164 = /^\+[1-9][0-9]{6,14}$/;

// Ghanaian numbers may be typed locally ("024 123 4567") or with the country code ("233…", "+233…", "00233…").
export function normalisePhone(input) {
  let v = String(input ?? "").trim().replace(/[\s\-().]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  else if (/^0\d{9}$/.test(v)) v = `+233${v.slice(1)}`;
  else if (/^233\d{9}$/.test(v)) v = `+${v}`;
  return v;
}

export function phone(input) {
  if (!String(input ?? "").trim()) return { error: "Enter your phone number." };
  const v = normalisePhone(input);
  return E164.test(v) ? { value: v } : { error: "Enter a valid phone number, e.g. 024 123 4567." };
}

export function optionalPhone(input) {
  return String(input ?? "").trim() ? phone(input) : { value: null };
}

export function otp(input) {
  const v = String(input ?? "").replace(/\D/g, "");
  return v.length === 6 ? { value: v } : { error: "Enter the 6-digit code from the text message." };
}

export function text(input, { label = "This field", min = 1, max = 200, optional = false } = {}) {
  const v = String(input ?? "").trim();
  if (!v) return optional ? { value: null } : { error: `${label} is required.` };
  if (v.length < min) return { error: `Use at least ${min} characters.` };
  if (v.length > max) return { error: `Use ${max} characters or fewer.` };
  return { value: v };
}

export function email(input, { optional = true } = {}) {
  const v = String(input ?? "").trim().toLowerCase();
  if (!v) return optional ? { value: null } : { error: "Enter an email address." };
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254 ? { value: v } : { error: "Enter a valid email address." };
}

export function httpsUrl(input) {
  const v = String(input ?? "").trim();
  if (!v) return { value: null };
  return /^https:\/\/[^\s]+$/.test(v) ? { value: v } : { error: "Use a full https:// address." };
}

export function slug(input) {
  const v = String(input ?? "").trim().toLowerCase();
  if (v.length < 3) return { error: "Use at least 3 characters." };
  if (v.length > 60) return { error: "Use 60 characters or fewer." };
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? { value: v } : { error: "Use lowercase letters, numbers and single hyphens." };
}

export function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Money: digits with optional thousands separators and up to 2 decimals; sent to the database as a string.
export function money(input) {
  const v = String(input ?? "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v) || Number(v) <= 0) return { error: "Enter a price greater than zero." };
  if (Number(v) > 1e12) return { error: "That price is too large." };
  return { value: Number(v).toFixed(2) };
}

export function wholeNumber(input, { max = 100 } = {}) {
  const v = String(input ?? "").trim();
  if (!v) return { value: null };
  return /^\d+$/.test(v) && Number(v) <= max ? { value: v } : { error: `Enter a whole number up to ${max}.` };
}

export function decimal(input) {
  const v = String(input ?? "").replace(/[,\s]/g, "");
  if (!v) return { value: null };
  return /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 ? { value: v } : { error: "Enter a number greater than zero." };
}

// Runs a map of rules over FormData; returns { values, errors } where errors is empty when valid.
export function check(formData, rules) {
  const values = {};
  const errors = {};
  for (const [name, rule] of Object.entries(rules)) {
    const r = rule(formData.get(name));
    if (r.error) errors[name] = r.error;
    else values[name] = r.value;
  }
  return { values, errors };
}
