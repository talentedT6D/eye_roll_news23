"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  count: number;
  label?: string;
  hideBelow?: number;
}

export default function EyeRollCounter({
  count,
  label = "eye rolls",
  hideBelow = 0,
}: Props) {
  const [bump, setBump] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (count !== prev.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 450);
      prev.current = count;
      return () => clearTimeout(t);
    }
  }, [count]);

  if (count < hideBelow) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="label-eyebrow">New story</span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`font-serif tabular text-[22px] leading-none text-ink ${
          bump ? "counter-bump" : ""
        }`}
      >
        {count.toLocaleString()}
      </span>
      <span className="label-eyebrow">{label}</span>
    </div>
  );
}
