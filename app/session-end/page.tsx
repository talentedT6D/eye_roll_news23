"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPersonalLeaderboard,
  getTotalCount,
  PersonalTop,
} from "@/lib/roll-store";
import { renderShareCard } from "@/lib/share-card";

export default function SessionEndPage() {
  const [count, setCount] = useState(0);
  const [mins, setMins] = useState(0);
  const [total, setTotal] = useState(0);
  const [top, setTop] = useState<PersonalTop[]>([]);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const c = Number(sessionStorage.getItem("eye-roll-session-count") || "0");
    const m = Number(sessionStorage.getItem("eye-roll-session-mins") || "0");
    setCount(c);
    setMins(m);
    setTotal(getTotalCount());
    setTop(getPersonalLeaderboard(3));
  }, []);

  async function handleShare() {
    const blob = await renderShareCard(count, mins);
    if (!blob) return;

    const file = new File([blob], "eye-roll-news.png", { type: "image/png" });

    try {
      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          title: "Eye Roll News",
          text: `${count} eye rolls at today's false promises. Tasteful disdain, restored.`,
          files: [file],
        });
        setShared(true);
        return;
      }
    } catch {
      // fall through to download
    }

    // Fallback: download the PNG so the user can share manually.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eye-roll-news.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-cream px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="label-eyebrow">Eye Roll News</div>
        <Link href="/feed" className="label-eyebrow">
          Back
        </Link>
      </header>

      <section className="flex-1 flex flex-col justify-center items-center text-center pt-10">
        <span className="label-eyebrow">You rolled your eyes</span>
        <div className="font-serif text-[140px] leading-none tracking-[-0.03em] tabular text-ink mt-4">
          {count}
        </div>
        <span className="label-eyebrow mt-2">
          times in {mins} {mins === 1 ? "minute" : "minutes"}
        </span>
        {total > count && (
          <span className="label-eyebrow mt-6">
            · {total.toLocaleString()} rolls all-time on this device ·
          </span>
        )}

        <button
          onClick={handleShare}
          className="mt-10 w-full max-w-[360px] py-4 bg-ink text-cream font-medium tracking-[0.18em] text-[13px] uppercase"
        >
          {shared ? "Shared ✓" : "Share your count"}
        </button>
      </section>

      <section className="pt-10 border-t border-rule">
        <div className="label-eyebrow mb-4">Your most-rolled stories</div>
        {top.length === 0 ? (
          <p className="font-serif text-[15px] text-ink-muted">
            No rolls yet. Head back to the feed.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {top.map((entry, i) => (
              <li key={entry.id} className="flex items-center gap-3 py-2">
                <span className="font-serif tabular text-[22px] text-ink-soft w-6">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="label-eyebrow mb-0.5">{entry.category}</div>
                  <p className="font-serif text-[15px] leading-[1.3] text-ink line-clamp-2">
                    {entry.headline}
                  </p>
                </div>
                <span className="font-serif tabular text-[16px] text-ink">
                  {entry.rolls.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/feed"
          className="mt-6 w-full block text-center py-3 border border-ink text-ink text-[13px] tracking-[0.18em] uppercase"
        >
          Keep rolling
        </Link>
      </section>
    </main>
  );
}
