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
