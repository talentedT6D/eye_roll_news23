"use client";
import { useEffect, useRef, useState } from "react";
import type {
  FaceLandmarker as FaceLandmarkerType,
  FilesetResolver as FilesetResolverType,
} from "@mediapipe/tasks-vision";

interface Props {
  onRoll: () => void;
  threshold?: number;
  debounceMs?: number;
  showDebug?: boolean;
  preview?: "hidden" | "mini";
  enabled?: boolean;
  onStatus?: (status: TrackerStatus) => void;
}

export type TrackerStatus =
  | "idle"
  | "loading"
  | "no-permission"
  | "no-face"
  | "tracking"
  | "error";

type RollState = "idle" | "rolling";

export default function FaceTracker({
  onRoll,
  threshold = 0.5,
  debounceMs = 1500,
  showDebug = false,
  preview = "hidden",
  enabled = true,
  onStatus,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarkerType | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const rollStateRef = useRef<RollState>("idle");
  const rollStartRef = useRef(0);
  const debounceUntilRef = useRef(0);
  const lastFaceTsRef = useRef(0);
  const onRollRef = useRef(onRoll);
  const onStatusRef = useRef(onStatus);
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    onRollRef.current = onRoll;
  }, [onRoll]);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!enabled) return;
    let running = true;
    const setStatus = (s: TrackerStatus) => onStatusRef.current?.(s);

    async function init() {
      setStatus("loading");
      try {
        const { FaceLandmarker, FilesetResolver } = (await import(
          "@mediapipe/tasks-vision"
        )) as {
          FaceLandmarker: typeof FaceLandmarkerType;
          FilesetResolver: typeof FilesetResolverType;
        };

        const resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm",
        );
        landmarkerRef.current = await FaceLandmarker.createFromOptions(
          resolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          },
        );

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        streamRef.current = stream;
        if (!running) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("no-face");
        loop();
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          setStatus("no-permission");
        } else {
          console.error(err);
          setStatus("error");
        }
      }
    }

    function loop() {
      if (
        !running ||
        !videoRef.current ||
        !landmarkerRef.current ||
        videoRef.current.readyState < 2
      ) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const results = landmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now(),
      );

      if (results.faceBlendshapes && results.faceBlendshapes[0]) {
        const cats = results.faceBlendshapes[0].categories;
        const lookUpL =
          cats.find((c) => c.categoryName === "eyeLookUpLeft")?.score ?? 0;
        const lookUpR =
          cats.find((c) => c.categoryName === "eyeLookUpRight")?.score ?? 0;
        const s = (lookUpL + lookUpR) / 2;
        setSignal(s);
        processRoll(s, Date.now());
        if (Date.now() - lastFaceTsRef.current > 500) setStatus("tracking");
        lastFaceTsRef.current = Date.now();
      } else if (Date.now() - lastFaceTsRef.current > 800) {
        setStatus("no-face");
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    function processRoll(sig: number, now: number) {
      if (now < debounceUntilRef.current) return;

      if (rollStateRef.current === "idle" && sig > threshold) {
        rollStateRef.current = "rolling";
        rollStartRef.current = now;
      } else if (rollStateRef.current === "rolling") {
        const elapsed = now - rollStartRef.current;
        if (sig < threshold * 0.6) {
          if (elapsed >= 150 && elapsed <= 1000) {
            debounceUntilRef.current = now + debounceMs;
            onRollRef.current();
          }
          rollStateRef.current = "idle";
        } else if (elapsed > 1500) {
          rollStateRef.current = "idle";
        }
      }
    }

    init();
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
    };
  }, [enabled, threshold, debounceMs]);

  if (!showDebug && preview === "hidden") {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
        aria-hidden
      />
    );
  }

  if (!showDebug && preview === "mini") {
    const dotColor =
      signal > threshold
        ? "bg-emerald-400"
        : signal > threshold * 0.6
          ? "bg-amber-400"
          : "bg-white/60";
    return (
      <div className="relative w-full h-full overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-black/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="block w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <div className="flex-1 h-1 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-white/90 transition-[width] duration-100"
              style={{ width: `${Math.min(100, signal * 160)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="block w-full h-full object-cover rounded-xl"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-black/30 overflow-hidden">
          <div
            className="h-full bg-white/90 transition-[width] duration-100"
            style={{ width: `${Math.min(100, signal * 160)}%` }}
          />
        </div>
        <span className="text-white/90 text-xs tabular">
          {signal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
