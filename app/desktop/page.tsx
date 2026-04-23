"use client";
import { useCallback, useEffect, useState } from "react";
import FaceTracker, { TrackerStatus } from "@/components/FaceTracker";
import ArticleCard from "@/components/ArticleCard";
import { Article } from "@/lib/types";
import { fetchTopStories } from "@/lib/hn-client";
import { recordRoll, getRollCount } from "@/lib/roll-store";

export default function DesktopPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [idx, setIdx] = useState(0);
  const [rollCounts, setRollCounts] = useState<Record<string, number>>({});
  const [sessionRolls, setSessionRolls] = useState(0);
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [threshold, setThreshold] = useState(0.5);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    fetchTopStories(12).then((list) => {
      setArticles(list);
      const counts: Record<string, number> = {};
      list.forEach((a) => (counts[a.id] = getRollCount(a.id)));
      setRollCounts(counts);
    });
  }, []);

  const handleRoll = useCallback(() => {
    setIdx((prevIdx) => {
      setArticles((prev) => {
        const current = prev[prevIdx];
        if (!current) return prev;
        const next = recordRoll({
          id: current.id,
          headline: current.headline,
          category: current.category,
        });
        setRollCounts((rc) => ({ ...rc, [current.id]: next }));
        return prev;
      });
      setSessionRolls((n) => n + 1);
      return (prevIdx + 1) % Math.max(1, articles.length);
    });
  }, [articles.length]);

  const current = articles[idx];

  return (
    <main className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] bg-cream">
      <section className="relative flex flex-col items-center justify-center bg-black text-white p-6 lg:p-12 min-h-[60vh] lg:min-h-[100dvh]">
        <div className="absolute top-6 left-6 flex flex-col gap-1">
          <div className="text-[11px] tracking-[0.28em] uppercase text-white/70">
            Eye Roll News
          </div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-white/50">
            Desktop · Tuning mode
          </div>
        </div>

        <div className="w-full max-w-[640px] aspect-[4/3] relative">
          {started ? (
            <FaceTracker
              onRoll={handleRoll}
              onStatus={setStatus}
              showDebug
              threshold={threshold}
              enabled={started}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center border border-white/15 rounded-xl">
              <button
                onClick={() => setStarted(true)}
                className="px-6 py-4 bg-white text-black tracking-[0.18em] text-[13px] uppercase"
              >
                Start camera
              </button>
            </div>
          )}
        </div>

        <div className="w-full max-w-[640px] mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between text-[11px] tracking-[0.18em] uppercase text-white/60">
            <span>Status</span>
            <span>{status}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] tracking-[0.18em] uppercase text-white/60">
            <span>Session rolls</span>
            <span className="font-serif tabular text-white text-[18px]">
              {sessionRolls}
            </span>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] tracking-[0.18em] uppercase text-white/60 flex justify-between">
              <span>Threshold</span>
              <span className="tabular text-white/90">
                {threshold.toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={0.2}
              max={0.8}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-white"
            />
          </label>
          <button
            onClick={handleRoll}
            className="w-full py-3 border border-white/40 text-white text-[12px] tracking-[0.18em] uppercase hover:bg-white/10"
          >
            Force roll (test)
          </button>
        </div>
      </section>

      <section className="relative flex items-stretch overflow-hidden">
        {current ? (
          <ArticleCard
            article={current}
            rollCount={rollCounts[current.id] ?? 0}
            hideCounterBelow={0}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="label-eyebrow">Loading today&apos;s news…</span>
          </div>
        )}
      </section>
    </main>
  );
}
