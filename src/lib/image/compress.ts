const MAX_DIMENSION = 1024;
const TARGET_SIZE_KB = 500;

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  // Calculate scaled dimensions
  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Draw to canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Try WebP first, fallback to JPEG
  let quality = 0.85;
  let blob = await canvas.convertToBlob({ type: "image/webp", quality });

  // If too large, reduce quality iteratively
  while (blob.size > TARGET_SIZE_KB * 1024 && quality > 0.3) {
    quality -= 0.1;
    blob = await canvas.convertToBlob({ type: "image/webp", quality });
  }

  return blob;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URL prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
