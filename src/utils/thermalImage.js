import QRCode from "qrcode";

// 80mm thermal printers are normally 203 dpi ≈ 8 dots per mm
const DOTS_PER_MM = 8;

// ---------- helpers ----------
const loadImage = async (src) => {
  let objectUrl = null;

  // fetch -> blob avoids canvas "tainted" errors for CDN images (needs CORS on the CDN)
  if (!src.startsWith("data:")) {
    try {
      const res = await fetch(src, {
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      objectUrl = URL.createObjectURL(await res.blob());
    } catch {
      objectUrl = null;
    }
  }

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = objectUrl || src;
  });

  return { img, cleanup: () => objectUrl && URL.revokeObjectURL(objectUrl) };
};

const otsuThreshold = (gray) => {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i] | 0]++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, max = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > max) {
      max = between;
      threshold = t;
    }
  }
  return threshold;
};

// Floyd–Steinberg dithering: gives smooth halftone logos on 1-bit printers
const floydSteinberg = (gray, w, h) => {
  const data = Float32Array.from(gray);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = data[i];
      const val = old < 128 ? 0 : 255;
      const err = old - val;
      data[i] = val;
      if (x + 1 < w) data[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) data[i + w - 1] += (err * 3) / 16;
        data[i + w] += (err * 5) / 16;
        if (x + 1 < w) data[i + w + 1] += err / 16;
      }
    }
  }
  return data;
};

// ---------- 1) Logo / uploaded QR -> thermal-safe 1-bit PNG ----------
/**
 * mode "logo": grayscale + contrast + dithering
 * mode "qr"  : Otsu threshold (NO dithering — dithering breaks QR scanning)
 */
export const prepareImageForThermal = async (
  src,
  { mode = "logo", widthMm = 20 } = {},
) => {
  if (!src) throw new Error("No image source");

  const { img, cleanup } = await loadImage(src);

  try {
    const w = Math.round(widthMm * DOTS_PER_MM);
    const ratio = (img.naturalHeight || img.height) / (img.naturalWidth || img.width);
    const h = Math.max(1, Math.round(w * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // IMPORTANT: flatten transparency onto WHITE (transparent -> black is the main bug)
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h); // throws if canvas is tainted
    const px = imgData.data;
    const gray = new Float32Array(w * h);

    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      gray[p] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    }

    let bw;
    if (mode === "qr") {
      const t = otsuThreshold(gray);
      bw = gray.map((v) => (v < t ? 0 : 255));
    } else {
      // light contrast stretch before dithering
      let min = 255, max = 0;
      for (const v of gray) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const range = Math.max(1, max - min);
      const stretched = gray.map((v) => ((v - min) / range) * 255);
      bw = floydSteinberg(stretched, w, h);
    }

    for (let p = 0, i = 0; p < bw.length; p++, i += 4) {
      const v = bw[p] < 128 ? 0 : 255;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    return {
      src: canvas.toDataURL("image/png"),
      widthMm: w / DOTS_PER_MM,
    };
  } finally {
    cleanup();
  }
};

// ---------- 2) Fresh QR (UPI) with integer dots-per-module ----------
export const generateThermalQr = (text, { targetMm = 30, ecl = "M" } = {}) => {
  const qr = QRCode.create(text, { errorCorrectionLevel: ecl });
  const modules = qr.modules.size;
  const quiet = 2; // quiet zone (modules)
  const total = modules + quiet * 2;

  const maxDots = Math.round(targetMm * DOTS_PER_MM);
  const scale = Math.max(3, Math.floor(maxDots / total)); // integer => crisp edges
  const size = total * scale;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000";

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (qr.modules.get(r, c)) {
        ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
      }
    }
  }

  return {
    src: canvas.toDataURL("image/png"),
    widthMm: size / DOTS_PER_MM,
  };
};