import { Article } from "./types";

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  by?: string;
  time?: number;
  text?: string;
  type?: string;
  score?: number;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\b(ai|llm|gpt|claude|gemini|openai|anthropic)\b/.test(t)) return "AI";
  if (/\b(security|vuln|cve|exploit|hack|breach)\b/.test(t)) return "SECURITY";
  if (/\b(startup|yc|series|funding|ipo|acquired?)\b/.test(t))
    return "STARTUPS";
  if (/\bshow hn\b/.test(t)) return "SHOW HN";
  if (/\bask hn\b/.test(t)) return "ASK HN";
  return "TECH";
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTopStories(limit = 10): Promise<Article[]> {
  const ids = await getJson<number[]>(`${HN_BASE}/topstories.json`);
  if (!ids) return [];
  const top = ids.slice(0, limit);
  const items = await Promise.all(
    top.map((id) => getJson<HNItem>(`${HN_BASE}/item/${id}.json`)),
  );
  return items
    .filter((x): x is HNItem => Boolean(x && x.title))
    .map((a) => {
      const seed = hash(a.title!);
      return {
        id: `hn-${a.id}`,
        source: "Hacker News",
        category: inferCategory(a.title!),
        headline: a.title!,
        summary:
          stripHtml(a.text || "").slice(0, 300) ||
          `Discussion on Hacker News${a.score ? ` · ${a.score} points` : ""}`,
        image_url: `https://picsum.photos/seed/${seed}/1200/900`,
        published_at: a.time
          ? new Date(a.time * 1000).toISOString()
          : new Date().toISOString(),
      };
    });
}
