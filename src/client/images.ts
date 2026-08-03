/**
 * Client-side image compression using Canvas API.
 * Progressively reduces quality until the result fits the size limit.
 */

const MAX_DATA_URL_LENGTH = 1_400_000; // stay just under the 1.5MB server limit

/**
 * Avatars are only ever shown round, and the profile cover blows them up
 * to a full-height disc — so crop to a centered square FIRST, then size.
 * Sizing by the long edge (plain compressImage) leaves wide images with
 * almost no height, which is what the circle actually crops from.
 */
export function compressAvatar(
  file: File,
  size: number = 1024,
  quality: number = 0.82,
  maxDataUrlLength: number = 390_000 // the users PATCH caps data URLs at 400k chars
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const out = Math.min(size, side); // never upscale — it only softens

        const canvas = document.createElement("canvas");
        canvas.width = out;
        canvas.height = out;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length > maxDataUrlLength && q > 0.3) {
          q -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        if (dataUrl.length > maxDataUrlLength) {
          reject(new Error("Image too large even after compression"));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * True if any pixel is less than fully opaque. Only worth asking for source
 * formats that can carry alpha — an opaque PNG photo is far smaller as JPEG,
 * so we only keep PNG when there is real transparency to lose.
 */
function hasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch {
    // Can't inspect the pixels — assume alpha rather than flatten it away.
    return true;
  }
}

export function compressImage(
  file: File,
  maxDim: number = 600,
  quality: number = 0.7,
  maxDataUrlLength: number = MAX_DATA_URL_LENGTH
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Line art and character cut-outs arrive as PNG/WebP with a
        // transparent background. Re-encoding those as JPEG paints the
        // transparency black, so keep them lossless.
        const mayCarryAlpha = file.type === "image/png" || file.type === "image/webp";
        if (mayCarryAlpha && hasTransparency(ctx, width, height)) {
          let dataUrl = canvas.toDataURL("image/png");
          // PNG ignores the quality knob, so shrink the picture instead.
          let w = width;
          let h = height;
          while (dataUrl.length > maxDataUrlLength && Math.max(w, h) > 200) {
            w = Math.max(1, Math.round(w * 0.8));
            h = Math.max(1, Math.round(h * 0.8));
            canvas.width = w;
            canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            dataUrl = canvas.toDataURL("image/png");
          }
          if (dataUrl.length > maxDataUrlLength) {
            reject(new Error("Image too large even after compression"));
            return;
          }
          resolve(dataUrl);
          return;
        }

        // Try progressively lower quality until it fits
        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length > maxDataUrlLength && q > 0.3) {
          q -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }

        if (dataUrl.length > maxDataUrlLength) {
          reject(new Error("Image too large even after compression"));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
