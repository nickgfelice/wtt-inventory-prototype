/**
 * Shared utility functions extracted from App.tsx.
 */

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

export function formatRelativeTime(timestamp: number): string {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - timestamp) / (1000 * 60)),
  );
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function formatDateLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        parsed,
      );
}

const SHEETS_CELL_LIMIT = 50_000;

/**
 * Compress an image data URL to fit within Google Sheets cell limits.
 * Iteratively reduces quality and resolution until the result fits
 * within the 50,000-character cell limit.
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 400,
  quality = 0.6,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to create canvas context."));
        return;
      }

      let currentMaxWidth = maxWidth;
      let currentQuality = quality;

      for (let attempt = 0; attempt < 6; attempt++) {
        let width = img.width;
        let height = img.height;

        if (width > currentMaxWidth) {
          height = Math.round((height * currentMaxWidth) / width);
          width = currentMaxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", currentQuality);
        if (compressed.length <= SHEETS_CELL_LIMIT) {
          resolve(compressed);
          return;
        }

        currentMaxWidth = Math.round(currentMaxWidth * 0.7);
        currentQuality = Math.max(0.3, currentQuality - 0.1);
      }

      // Final attempt at very low settings
      canvas.width = 150;
      canvas.height = Math.round((img.height * 150) / img.width);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.3));
    };
    img.onerror = () => reject(new Error("Unable to load image for compression."));
    img.src = dataUrl;
  });
}
