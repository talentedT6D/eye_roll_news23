// Canvas-rendered share card — 1200×1200 PNG produced entirely in the browser.
// No backend. Returns a Blob that can go straight into navigator.share({ files }).

export async function renderShareCard(
  count: number,
  mins: number,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#fafaf7";
  ctx.fillRect(0, 0, size, size);

  // Eyebrow
  ctx.fillStyle = "#999999";
  ctx.font =
    '600 26px Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EYE  ROLL  NEWS", size / 2, 220);

  // Big count
  ctx.fillStyle = "#111111";
  ctx.font =
    '700 360px "Source Serif 4", "Source Serif Pro", Georgia, serif';
  ctx.fillText(String(count), size / 2, size / 2 + 20);

  // Subtitle
  ctx.fillStyle = "#666666";
  ctx.font = '400 40px "Source Serif 4", Georgia, serif';
  ctx.fillText(
    `eye rolls in ${mins} ${mins === 1 ? "minute" : "minutes"}`,
    size / 2,
    size / 2 + 220,
  );

  // Footer
  ctx.fillStyle = "#999999";
  ctx.font =
    '500 22px Inter, ui-sans-serif, system-ui, sans-serif';
  ctx.fillText("EVERY  ROLL  COUNTS.  FOR  YOU.", size / 2, size - 120);

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
}
