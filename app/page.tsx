"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PermissionGate() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  async function handleContinue() {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      sessionStorage.setItem("eye-roll-mode", "camera");
      router.push("/feed");
    } catch {
      sessionStorage.setItem("eye-roll-mode", "swipe");
      router.push("/feed");
    }
  }

  function handleLater() {
    sessionStorage.setItem("eye-roll-mode", "swipe");
    router.push("/feed");
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-cream px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="label-eyebrow">Eye Roll News</div>
        <div className="label-eyebrow">v0.1</div>
      </header>

      <section className="flex-1 flex flex-col justify-center max-w-[420px]">
        <h1 className="font-serif text-[40px] leading-[1.05] tracking-[-0.02em] text-ink">
          A news app you skip by rolling your eyes.
        </h1>
        <p className="mt-6 text-[16px] leading-[1.55] text-ink-muted">
          We use your camera to detect eye rolls.
          <br />
          Nothing is recorded. Nothing leaves your phone.
        </p>
      </section>

      <footer className="flex flex-col gap-4 pt-6">
        <button
          onClick={handleContinue}
          disabled={requesting}
          className="w-full py-4 bg-ink text-cream font-medium tracking-[0.18em] text-[13px] uppercase disabled:opacity-60"
        >
          {requesting ? "Requesting camera…" : "Continue"}
        </button>
        <button
          onClick={handleLater}
          className="w-full py-3 text-ink-muted text-[13px] tracking-[0.08em]"
        >
          Maybe later
        </button>
      </footer>
    </main>
  );
}
