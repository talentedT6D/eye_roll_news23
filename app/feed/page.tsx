"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FaceTracker, { TrackerStatus } from "@/components/FaceTracker";
import ArticleCard from "@/components/ArticleCard";
import { Article } from "@/lib/types";
import { fetchTopStories } from "@/lib/hn-client";
import { recordRoll, getRollCount } from "@/lib/roll-store";

const INACTIVITY_MS = 30_000;

export default function FeedPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [idx, setIdx] = useState(0);
  const [rollCounts, setRollCounts] = useState<Record<string, number>>({});
  const [sessionRolls, setSessionRolls] = useState(0);
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [useCamera, setUseCamera] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const inactivityRef = useRef<number | null>(null);

  useEffect(() => {
    const mode = sessionStorage.getItem("eye-roll-mode");
    setUseCamera(mode === "camera");
    fetchTopStories(12)
      .then((list) => {
        if (list.length === 0) {
          setError("Couldn't load stories. Check your connection.");
          setLoaded(true);
          return;
        }
        setArticles(list);
        const counts: Record<string, number> = {};
        list.forEach((a) => {
          counts[a.id] = getRollCount(a.id);
        });
        setRollCounts(counts);
        setLoaded(true);
      })
      .catch(() => {
        setError("Couldn't load stories. Check your connection.");
        setLoaded(true);
      });
  }, []);

  const finishSession = useCallback(() => {
    const mins = Math.max(
      1,
      Math.round((Date.now() - sessionStartRef.current) / 60000),
    );
    sessionStorage.setItem("eye-roll-session-count", String(sessionRolls));
    sessionStorage.setItem("eye-roll-session-mins", String(mins));
    router.push("/session-end");
  }, [router, sessionRolls]);

  const finishSessionRef = useRef(finishSession);
  useEffect(() => {
    finishSessionRef.current = finishSession;
  }, [finishSession]);

  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) window.clearTimeout(inactivityRef.current);
    inactivityRef.current = window.setTimeout(() => {
      finishSessionRef.current();
    }, INACTIVITY_MS);
  }, []);

  const handleRoll = useCallback(() => {
    setIdx((prevIdx) => {
      setArticles((prevArticles) => {
        const current = prevArticles[prevIdx];
        if (!current) return prevArticles;
        const next = recordRoll({
          id: current.id,
          headline: current.headline,
          category: current.category,
        });
        setRollCounts((rc) => ({ ...rc, [current.id]: next }));
        return prevArticles;
      });
      setSessionRolls((n) => n + 1);
      resetInactivity();
      return prevIdx + 1;
    });
  }, [resetInactivity]);

  useEffect(() => {
    if (loaded) resetInactivity();
    return () => {
      if (inactivityRef.current) window.clearTimeout(inactivityRef.current);
    };
  }, [loaded, resetInactivity]);

  useEffect(() => {
    if (loaded && articles.length > 0 && idx >= articles.length) {
      finishSession();
    }
  }, [idx, articles, loaded, finishSession]);

  if (!loaded) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-cream">
        <span className="label-eyebrow">Loading today&apos;s news…</span>
      </main>
    );
  }

  if (error || articles.length === 0) {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-cream px-6 gap-4 text-center">
        <span className="label-eyebrow">Nothing to roll at</span>
        <p className="font-serif text-[22px] text-ink">
          {error || "The feed is empty."}
        </p>
      </main>
    );
  }

  const current = articles[idx];
  if (!current) return null;

  return (
    <main className="relative bg-cream">
      <ArticleCard
        article={current}
        rollCount={rollCounts[current.id] ?? 0}
        hideCounterBelow={0}
        onSwipe={handleRoll}
      />

      {useCamera && (
        <div
          className={
            showPreview
              ? "fixed bottom-4 right-4 w-[96px] h-[72px] z-30"
              : "hidden"
          }
        >
          <FaceTracker
            onRoll={handleRoll}
            onStatus={setStatus}
            enabled={useCamera}
            preview="mini"
          />
          {showPreview && (
            <button
              onClick={() => setShowPreview(false)}
              aria-label="Hide camera preview"
              className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-ink text-cream text-[12px] leading-none flex items-center justify-center shadow"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="fixed top-3 right-3 flex items-center gap-2">
        <StatusPill useCamera={useCamera} status={status} />
        {useCamera && !showPreview && (
          <button
            onClick={() => setShowPreview(true)}
            className="label-eyebrow px-2 py-1 rounded-full bg-black/5"
          >
            Show camera
          </button>
        )}
      </div>

      <button
        onClick={finishSession}
        className="fixed top-3 left-3 label-eyebrow opacity-80"
      >
        End session
      </button>
    </main>
  );
}

function StatusPill({
  useCamera,
  status,
}: {
  useCamera: boolean;
  status: TrackerStatus;
}) {
  if (!useCamera) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/5">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-soft" />
        <span className="label-eyebrow">Swipe mode</span>
      </div>
    );
  }
  const label: Record<TrackerStatus, string> = {
    idle: "starting",
    loading: "warming up",
    "no-permission": "camera denied",
    "no-face": "no face",
    tracking: "tracking",
    error: "camera error",
  };
  const dot =
    status === "tracking"
      ? "bg-emerald-500"
      : status === "no-permission" || status === "error"
        ? "bg-amber-500"
        : "bg-ink-soft";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/5">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="label-eyebrow">{label[status]}</span>
    </div>
  );
}
