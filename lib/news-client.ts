import { Article } from "./types";

// Articles are pre-fetched and filtered at build time by scripts/fetch-news.mjs
// and served from /news.json. Reading same-origin avoids CORS entirely, which
// is required because the static export has no server or API routes.
export async function fetchTopStories(limit = 10): Promise<Article[]> {
  try {
    const res = await fetch("/news.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as Article[];
    return data.slice(0, limit);
  } catch {
    return [];
  }
}
