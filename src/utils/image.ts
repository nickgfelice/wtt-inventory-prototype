type ResizeImageOptions = {
  maxDimension?: number;
  quality?: number;
};

const DEFAULT_MAX_DIMENSION = 900;
const DEFAULT_QUALITY = 0.8;

function canvasSourceToResizedJpegDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: ResizeImageOptions = {}
): string {
  if (!sourceWidth || !sourceHeight) {
    throw new Error("The selected image appears to be invalid.");
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image processing is not available in this browser.");
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the selected image."));
    img.src = dataUrl;
  });
}

export async function fileToResizedJpegDataUrl(
  file: File,
  options: ResizeImageOptions = {}
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceDataUrl);

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  return canvasSourceToResizedJpegDataUrl(img, width, height, { maxDimension, quality });
}

export function videoFrameToResizedJpegDataUrl(
  video: HTMLVideoElement,
  options: ResizeImageOptions = {}
): string {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Camera frame is not ready yet.");
  }
  return canvasSourceToResizedJpegDataUrl(video, width, height, options);
}
