/**
 * Generic browser print helper (A4 or thermal-sized iframe).
 * Reuses the same hidden-iframe + window.print() pattern as thermalPrint.js.
 */

const FRAME_ID = "document-print-frame";

const waitForImages = (doc) =>
  new Promise((resolve) => {
    const images = Array.from(doc.images || []);
    if (!images.length) {
      resolve();
      return;
    }

    let pending = images.length;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    images.forEach((img) => {
      if (img.complete) {
        pending -= 1;
        return;
      }
      const done = () => {
        pending -= 1;
        if (pending <= 0) finish();
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });

    if (pending <= 0) {
      finish();
      return;
    }
    setTimeout(finish, 2500);
  });

const nextFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

/**
 * @param {string} html
 * @param {{ page?: 'A4' | 'thermal' }} [options]
 */
export function printDocumentHtml(html, options = {}) {
  const page = options.page === "thermal" ? "thermal" : "A4";
  const frameWidth = page === "thermal" ? "80mm" : "210mm";

  return new Promise((resolve, reject) => {
    document.getElementById(FRAME_ID)?.remove();

    const holder = document.createElement("div");
    holder.id = FRAME_ID;
    holder.setAttribute("aria-hidden", "true");
    holder.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      `width:${frameWidth}`,
      "height:100vh",
      "overflow:hidden",
      "clip-path:inset(100%)",
      "pointer-events:none",
    ].join(";");

    const iframe = document.createElement("iframe");
    iframe.title = "Print";
    iframe.style.cssText = `width:${frameWidth};height:100vh;border:0;background:#fff;`;
    holder.appendChild(iframe);
    document.body.appendChild(holder);

    const win = iframe.contentWindow;
    const doc = win?.document;

    if (!win || !doc) {
      holder.remove();
      reject(new Error("Print frame could not be opened."));
      return;
    }

    let printedAt = 0;
    let cleanupTimer = null;

    const cleanup = () => {
      win.removeEventListener("afterprint", cleanup);
      window.removeEventListener("afterprint", cleanup);
      if (cleanupTimer) return;
      const elapsed = printedAt ? Date.now() - printedAt : 0;
      const wait = Math.max(1500 - elapsed, 400);
      cleanupTimer = setTimeout(() => holder.remove(), wait);
    };

    let started = false;
    const start = async () => {
      if (started) return;
      started = true;
      try {
        await waitForImages(doc);
        await nextFrame();
        printedAt = Date.now();
        win.addEventListener("afterprint", cleanup, { once: true });
        window.addEventListener("afterprint", cleanup, { once: true });
        win.print();
        resolve();
        setTimeout(cleanup, 60000);
      } catch (error) {
        holder.remove();
        reject(error);
      }
    };

    doc.open();
    doc.write(html);
    doc.close();

    if (doc.readyState === "complete") {
      start();
    } else {
      win.addEventListener("load", start, { once: true });
    }
  });
}
