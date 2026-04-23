"use client";
import Image from "next/image";
import { Article } from "@/lib/types";
import EyeRollCounter from "./EyeRollCounter";

interface Props {
  article: Article;
  rollCount: number;
  hideCounterBelow?: number;
  onSwipe?: () => void;
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MIN AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} HR AGO`;
  const days = Math.floor(hrs / 24);
  return `${days} D AGO`;
}

export default function ArticleCard({
  article,
  rollCount,
  hideCounterBelow = 0,
  onSwipe,
}: Props) {
  return (
    <article
      key={article.id}
      className="relative flex flex-col w-full h-[100dvh] bg-cream fade-in"
      onTouchStart={
        onSwipe
          ? (e) => {
              const startY = e.touches[0].clientY;
              const move = (ev: TouchEvent) => {
                const dy = startY - ev.touches[0].clientY;
                if (dy > 60) {
                  onSwipe();
                  document.removeEventListener("touchmove", move);
                }
              };
              document.addEventListener("touchmove", move, { passive: true });
              const end = () => {
                document.removeEventListener("touchmove", move);
                document.removeEventListener("touchend", end);
              };
              document.addEventListener("touchend", end);
            }
          : undefined
      }
    >
      <div className="relative w-full aspect-[4/3] bg-[#ece9e0] overflow-hidden">
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex-1 flex flex-col px-5 py-5 gap-4">
        <div className="flex items-center gap-2">
          <span className="label-eyebrow">{article.category}</span>
          <span className="text-ink-soft">·</span>
          <span className="label-eyebrow">{article.source}</span>
          <span className="text-ink-soft">·</span>
          <span className="label-eyebrow">
            {formatTime(article.published_at)}
          </span>
        </div>

        <h1 className="font-serif text-[26px] leading-[1.2] text-ink tracking-[-0.01em]">
          {article.headline}
        </h1>

        <p className="text-[15px] leading-[1.55] text-ink-muted">
          {article.summary}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-rule">
          <EyeRollCounter
            count={rollCount}
            hideBelow={hideCounterBelow}
          />
          <span className="label-eyebrow">Roll your eyes to skip</span>
        </div>
      </div>
    </article>
  );
}
