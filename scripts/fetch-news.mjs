#!/usr/bin/env node
// Pre-fetches Indian political news from public RSS feeds at build time and
// writes the parsed result to public/news.json. The client reads that file
// same-origin, so no runtime CORS proxy is needed.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const FEEDS = [
  {
    source: "The Hindu",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
  },
  {
    source: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
  },
];

// Hand-picked article URLs. These bypass the politics keyword filter on the
// assumption the curator already vetted them. Metadata is scraped from each
// page's Open Graph / meta tags.
const CURATED_URLS = [
  "https://swarajyamag.com/news-brief/amit-shah-promises-1-lakh-jobs-annually-and-infiltrator-free-bengal-if-bjp-wins",
  "https://www.newsgram.com/west-bengal-election-2026/2026/04/20/bjp-5000-monthly-allowance-journalists-bengal-polls",
  "https://telanganatoday.com/congress-failed-to-keep-promises-made-to-rtc-employees-harish-rao",
  "https://www.deccanherald.com/india/karnataka/bjp-govts-responsible-for-sorry-state-of-rtcs-in-karnataka-ramalinga-reddy-3977415",
  "https://www.tribuneindia.com/news/haryana/congress-mp-deepender-hooda-blames-bjp-for-rampant-corruption-in-municipal-corporations/",
  "https://www.newindianexpress.com/cities/bengaluru/2026/Apr/03/bengalurus-ejipura-flyover-now-likely-to-open-in-august",
  "https://assamtribune.com/assam/jorhat-flyover-underpass-turns-risky-locals-demand-immediate-repair-1610849",
  "https://indianexpress.com/article/business/pothole-related-road-fatalities-increase-by-53-per-cent-in-5-years-10529465/",
  "https://www.bbc.com/news/articles/cqj8ep9w1pno",
  "https://time.com/article/2026/04/07/trump-warns-whole-civilization-will-die-if-iran-misses-deadline/",
  "https://www.ndtv.com/video/pm-modi-s-welfare-push-free-foodgrains-to-5-lakh-health-cover-promised-1087228",
  "https://www.thequint.com/news/webqoof/rajnath-singh-ani-interview-pm-narendra-modi-never-promised-rs-15-lakh-fact-check",
];

const POLITICS_RE =
  /\b(bjp|congress|modi|rahul|gandhi|parliament|lok ?sabha|rajya ?sabha|election|poll|minister|cabinet|govt|government|chief minister|opposition|aap|dmk|trinamool|tmc|shiv sena|ncp|coalition|alliance|nda|upa|india bloc|mla|political|politics|sarkar)\b/i;

const UA =
  "Mozilla/5.0 (compatible; EyeRollNewsBot/1.0; build-time fetch)";

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(s) {
  return decodeEntities(
    (s || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " "),
  ).trim();
}

function extract(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function extractAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

async function fetchFeed({ source, url }) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      console.warn(`[${source}] HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
    const parsed = items
      .map((b) => {
        const title = stripHtml(extract(b, "title"));
        if (!title) return null;
        const link = stripHtml(extract(b, "link"));
        const descr = stripHtml(extract(b, "description"));
        const pub = stripHtml(extract(b, "pubDate"));
        const img =
          extractAttr(b, "media:content", "url") ||
          extractAttr(b, "media:thumbnail", "url") ||
          extractAttr(b, "enclosure", "url") ||
          null;
        return {
          id: `in-${hash(link || title)}`,
          source,
          category: "POLITICS",
          headline: title,
          summary: descr.slice(0, 300) || "Indian political coverage",
          image_url:
            img || `https://picsum.photos/seed/${hash(title)}/1200/900`,
          published_at: pub
            ? new Date(pub).toISOString()
            : new Date().toISOString(),
        };
      })
      .filter(Boolean);
    console.log(`[${source}] ${parsed.length} items`);
    return parsed;
  } catch (e) {
    console.warn(`[${source}] ${e.message}`);
    return [];
  }
}

function sourceFromHost(host) {
  const map = {
    "swarajyamag.com": "Swarajya",
    "www.newsgram.com": "NewsGram",
    "telanganatoday.com": "Telangana Today",
    "www.deccanherald.com": "Deccan Herald",
    "www.tribuneindia.com": "The Tribune",
    "www.newindianexpress.com": "The New Indian Express",
    "assamtribune.com": "The Assam Tribune",
    "indianexpress.com": "The Indian Express",
    "www.bbc.com": "BBC",
    "time.com": "TIME",
    "www.ndtv.com": "NDTV",
    "www.thequint.com": "The Quint",
  };
  return map[host] ?? host.replace(/^www\./, "");
}

function metaContent(html, ...keys) {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m) return decodeEntities(m[1]).trim();
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2) return decodeEntities(m2[1]).trim();
  }
  return "";
}

async function fetchWithRetry(url, init, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
  throw lastErr;
}

async function fetchCurated(url) {
  try {
    const res = await fetchWithRetry(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[curated] ${url} → HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const host = new URL(res.url || url).host;
    const source = sourceFromHost(host);
    const title =
      metaContent(html, "og:title", "twitter:title") ||
      stripHtml(extract(html, "title"));
    if (!title) {
      console.warn(`[curated] ${url} → no title`);
      return null;
    }
    const descr =
      metaContent(html, "og:description", "twitter:description", "description") ||
      "";
    const img =
      metaContent(html, "og:image", "twitter:image", "twitter:image:src") ||
      null;
    const pub =
      metaContent(
        html,
        "article:published_time",
        "og:article:published_time",
        "pubdate",
        "publishdate",
        "date",
      ) || "";
    const published_at = pub
      ? new Date(pub).toISOString()
      : new Date().toISOString();
    return {
      id: `curated-${hash(url)}`,
      source,
      category: "POLITICS",
      headline: title,
      summary:
        descr.slice(0, 300) || `Coverage from ${source}`,
      image_url:
        img || `https://picsum.photos/seed/${hash(title)}/1200/900`,
      published_at,
    };
  } catch (e) {
    console.warn(`[curated] ${url} → ${e.message}`);
    return null;
  }
}

// Fetch feeds in parallel, curated URLs sequentially with a small delay so we
// don't look like a bot to any single origin and avoid tripping rate limits.
const feedResults = await Promise.all(FEEDS.map(fetchFeed));
const feedItems = feedResults.flat();

const curatedItems = [];
for (const u of CURATED_URLS) {
  const item = await fetchCurated(u);
  if (item) curatedItems.push(item);
  await new Promise((r) => setTimeout(r, 300));
}
console.log(`[curated] ${curatedItems.length}/${CURATED_URLS.length} items`);

const filteredFeed = feedItems.filter((a) =>
  POLITICS_RE.test(`${a.headline} ${a.summary}`),
);
const merged = [...curatedItems, ...filteredFeed];
const filtered = merged;

const seen = new Set();
const unique = [];
for (const a of filtered) {
  const k = a.headline.toLowerCase();
  if (seen.has(k)) continue;
  seen.add(k);
  unique.push(a);
}
unique.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));

const outPath = join("public", "news.json");
mkdirSync("public", { recursive: true });

if (unique.length === 0 && existsSync(outPath)) {
  console.warn(
    `No items fetched. Keeping existing ${outPath} so the site still works.`,
  );
} else {
  writeFileSync(outPath, JSON.stringify(unique, null, 2));
  console.log(`Wrote ${unique.length} items to ${outPath}`);
}
