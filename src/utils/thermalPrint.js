const FRAME_ID = "thermal-print-frame";

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

const fitThermalPage = (doc) => {
  const root = doc.querySelector(".kot, .receipt");
  if (!root) return;

  const body = doc.body;
  if (body) {
    body.style.margin = "0";
    body.style.padding = "0";
    body.style.width = "72mm";
    body.style.display = "block";
  }

  root.style.boxSizing = "border-box";
  root.style.width = "72mm";
  root.style.maxWidth = "72mm";
  root.style.margin = "0";
  root.style.padding = "0 1mm 2mm";

  const heightPx = Math.max(root.scrollHeight, root.offsetHeight, 0);
  if (heightPx < 8) return;

  const heightMm = Math.min(500, Math.max(30, Math.ceil((heightPx * 25.4) / 96) + 2));
  const style = doc.createElement("style");
  style.textContent = [
    `@page { size: 80mm ${heightMm}mm; margin: 0; }`,
    "html, body { margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; background: #fff !important; }",
  ].join("");
  doc.head.appendChild(style);
};

const nextFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

export function printThermalHtml(html) {
  return new Promise((resolve, reject) => {
    document.getElementById(FRAME_ID)?.remove();

    const holder = document.createElement("div");
    holder.id = FRAME_ID;
    holder.setAttribute("aria-hidden", "true");
    holder.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      "width:80mm",
      "height:100vh",
      "overflow:hidden",
      "clip-path:inset(100%)",
      "pointer-events:none",
    ].join(";");

    const iframe = document.createElement("iframe");
    iframe.title = "Print";
    iframe.style.cssText = "width:80mm;height:100vh;border:0;background:#fff;";
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
        fitThermalPage(doc);
        await nextFrame();
        printedAt = Date.now();
        win.addEventListener("afterprint", cleanup, { once: true });
        window.addEventListener("afterprint", cleanup, { once: true });
        win.print();

        // Hand the job to the browser, then let the caller close its UI.
        // The hidden frame stays until afterprint so the slip is not cancelled.
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
