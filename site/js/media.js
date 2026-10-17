// Photo preparation in the browser: resized to at most 2000px and re-encoded to WebP.
// Re-encoding through a canvas drops all EXIF metadata, including GPS location.
export const MAX_EDGE = 2000;
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function scaledSize(width, height, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function prepareImage(file) {
  if (!ACCEPTED.includes(file.type)) throw new Error("Use a JPEG, PNG, WebP or HEIC photo.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is larger than 25 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = scaledSize(bitmap.width, bitmap.height);
  if (Math.min(width, height) < 400) throw new Error("That photo is too small — use at least 400 pixels on the short side.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("Your browser couldn't process this photo.");
  return { blob, width, height };
}

export function randomName() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}.webp`;
}
