/**
 * Build a browser-usable URL for restaurant media paths.
 * Handles absolute http(s)/blob URLs and strips trailing /api or /api/v1 from the API base.
 */
export function resolveMediaUrl(src, apiBase = import.meta.env.VITE_APP_API_BASE) {
  if (!src) return "";
  const value = String(src);
  if (value.startsWith("http") || value.startsWith("blob:") || value.startsWith("data:")) {
    return value;
  }

  const base = String(apiBase || "")
    .trim()
    .replace(/\/api(?:\/v\d+)?\/?$/i, "")
    .replace(/\/+$/, "");

  const path = value.startsWith("/") ? value : `/${value}`;
  return `${base}${path}`;
}

export function requireApiBase() {
  const base = String(import.meta.env.VITE_APP_API_BASE || "").trim();
  if (!base) {
    throw new Error("VITE_APP_API_BASE is not configured");
  }
  return base.replace(/\/+$/, "");
}
