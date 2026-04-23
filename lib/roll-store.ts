// Per-device roll storage. No backend, no account. Everything lives in
// localStorage, keyed by article id and day bucket.

const STORE_KEY = "eye-roll-store-v1";

interface Store {
  byArticle: Record<string, number>;
  byDay: Record<string, number>;
  history: { id: string; headline: string; category: string; ts: number }[];
}

function emptyStore(): Store {
  return { byArticle: {}, byDay: {}, history: [] };
}

function load(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      byArticle: parsed.byArticle || {},
      byDay: parsed.byDay || {},
      history: parsed.history || [],
    };
  } catch {
    return emptyStore();
  }
}

function save(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function recordRoll(article: {
  id: string;
  headline: string;
  category: string;
}): number {
  const store = load();
  store.byArticle[article.id] = (store.byArticle[article.id] || 0) + 1;
  const day = todayKey();
  store.byDay[day] = (store.byDay[day] || 0) + 1;
  store.history.unshift({
    id: article.id,
    headline: article.headline,
    category: article.category,
    ts: Date.now(),
  });
  // Keep history bounded.
  store.history = store.history.slice(0, 200);
  save(store);
  return store.byArticle[article.id];
}

export function getRollCount(articleId: string): number {
  return load().byArticle[articleId] || 0;
}

export function getTodayCount(): number {
  return load().byDay[todayKey()] || 0;
}

export function getTotalCount(): number {
  const store = load();
  return Object.values(store.byArticle).reduce((a, b) => a + b, 0);
}

export interface PersonalTop {
  id: string;
  headline: string;
  category: string;
  rolls: number;
}

export function getPersonalLeaderboard(
  limit = 3,
): PersonalTop[] {
  const store = load();
  const headlineById: Record<string, { headline: string; category: string }> =
    {};
  for (const h of store.history) {
    if (!headlineById[h.id]) {
      headlineById[h.id] = { headline: h.headline, category: h.category };
    }
  }
  return Object.entries(store.byArticle)
    .filter(([id]) => headlineById[id])
    .map(([id, rolls]) => ({
      id,
      rolls,
      headline: headlineById[id].headline,
      category: headlineById[id].category,
    }))
    .sort((a, b) => b.rolls - a.rolls)
    .slice(0, limit);
}
