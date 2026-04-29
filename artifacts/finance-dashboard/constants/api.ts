// Base URL for the API server.
// In the Replit environment, set EXPO_PUBLIC_API_BASE_URL to the URL shown
// in the "API Server" artifact preview (e.g. https://abc.repl.co/api-server).
// Leave empty to use relative paths (only works when frontend and API are served from the same origin).
const API_BASE = (process.env["EXPO_PUBLIC_API_BASE_URL"] ?? "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
