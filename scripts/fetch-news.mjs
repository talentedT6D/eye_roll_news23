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

const results = await Promise.all(FEEDS.map(fetchFeed));
const merged = results.flat();
const filtered = merged.filter((a) =>
  POLITICS_RE.test(`${a.headline} ${a.summary}`),
);

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
