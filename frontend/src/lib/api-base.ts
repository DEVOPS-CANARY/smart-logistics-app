// Where the browser reaches the backend.
//
// NEXT_PUBLIC_* values are inlined into the browser bundle at `next build`, so
// they cannot change per environment at runtime. Container images are therefore
// built with the relative base "/api": the browser calls its own origin and the
// Ingress routes /api/* to the backend. One image works in every environment.
// Local `next dev` keeps the absolute default below.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Socket.io options matching API_BASE_URL.
// Absolute base -> connect to that host on the default /socket.io path.
// Relative base -> connect to the current origin under <base>/socket.io.
export function socketTarget(): { url?: string; path: string } {
  if (/^https?:\/\//.test(API_BASE_URL)) {
    return { url: API_BASE_URL, path: "/socket.io" };
  }

  return { path: `${API_BASE_URL.replace(/\/$/, "")}/socket.io` };
}
