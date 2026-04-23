import { Article } from "./types";

// The Hindu and TOI RSS feeds don't send CORS headers, so we route through a
// public proxy. Swap the URL if a more reliable proxy is needed.
const PROXY = "https://api.allorigins.win/raw?url=";

const FEEDS: Array<{ source: string; url: string }> = [
  {
    source: "The Hindu",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
  },
  {
    source: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
  },
];

const POLITICS_RE =
  /\b(bjp|congress|modi|rahul|gandhi|parliament|lok ?sabha|rajya ?sabha|election|poll|minister|cabinet|govt|government|chief minister|opposition|aap|dmk|trinamool|tmc|shiv sena|ncp|coalition|alliance|nda|upa|india bloc|mla|political|politics|sarkar)\b/i;

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function stripHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickImage(item: Element): string | null {
  for (const child of Array.from(item.children)) {
    if (child.nodeName === "media:content" || child.nodeName === "media:thumbnail") {
      const u = child.getAttribute("url");
      if (u) return u;
    }
    if (child.nodeName === "enclosure") {
      const u = child.getAttribute("url");
      if (u) return u;
    }
  }
  const desc = item.getElementsByTagName("description")[0]?.textContent ?? "";
  const m = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function fetchFeed(source: string, url: string): Promise<Article[]> {
  try {
    const res = await fetch(`${PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const items = Array.from(doc.getElementsByTagName("item"));
    return items
      .map((it): Article | null => {
        const title = stripHtml(it.getElementsByTagName("title")[0]?.textContent ?? "");
        if (!title) return null;
        const link = it.getElementsByTagName("link")[0]?.textContent?.trim() ?? "";
        const descr = stripHtml(it.getElementsByTagName("description")[0]?.textContent ?? "");
        const pub = it.getElementsByTagName("pubDate")[0]?.textContent?.trim() ?? "";
        const img = pickImage(it);
        const seed = hash(title);
        return {
          id: `in-${hash(link || title)}`,
          source,
          category: "POLITICS",
          headline: title,
          summary: descr.slice(0, 300) || "Indian political coverage",
          image_url: img ?? `https://picsum.photos/seed/${seed}/1200/900`,
          published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        };
      })
      .filter((x): x is Article => Boolean(x))
      .filter((a) => POLITICS_RE.test(`${a.headline} ${a.summary}`));
  } catch {
    return [];
  }
}

export async function fetchTopStories(limit = 10): Promise<Article[]> {
  const results = await Promise.all(FEEDS.map((f) => fetchFeed(f.source, f.url)));
  const merged = results.flat();

  const seen = new Set<string>();
  const unique: Article[] = [];
  for (const a of merged) {
    const k = a.headline.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(a);
  }
  unique.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  return unique.slice(0, limit);
}
