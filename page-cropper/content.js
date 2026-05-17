(function () {
  if (window.__pageCropperActive) return;
  window.__pageCropperActive = true;

  const OVERLAY_ID = "__page-cropper-overlay";
  const SELECTION_ID = "__page-cropper-selection";

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483646;
      cursor: crosshair;
      user-select: none;
    `;

    const selection = document.createElement("div");
    selection.id = SELECTION_ID;
    selection.style.cssText = `
      position: fixed;
      border: 2px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      display: none;
      z-index: 2147483647;
      pointer-events: none;
    `;

    const hint = document.createElement("div");
    hint.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #f1f5f9;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    hint.textContent = "Click and drag to select area. Press Escape to cancel.";

    overlay.appendChild(hint);
    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(selection);

    return { overlay, selection, hint };
  }

  function captureSelection(rect) {
    const scaleX = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = rect.width * scaleX;
    canvas.height = rect.height * scaleX;
    const ctx = canvas.getContext("2d");
    ctx.scale(scaleX, scaleX);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "captureVisibleTab" }, (dataUrl) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(
            img,
            rect.left,
            rect.top,
            rect.width,
            rect.height,
            0,
            0,
            rect.width,
            rect.height
          );
          resolve(canvas.toDataURL("image/png"));
        };
        img.src = dataUrl;
      });
    });
  }

  function cleanup(overlay, selection, hint) {
    overlay.remove();
    selection.remove();
    hint.remove();
    window.__pageCropperActive = false;
  }

  function initCropMode() {
    const { overlay, selection, hint } = createOverlay();
    let startX, startY, isDragging = false;

    overlay.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;
      selection.style.display = "block";
      selection.style.left = startX + "px";
      selection.style.top = startY + "px";
      selection.style.width = "0px";
      selection.style.height = "0px";
    });

    overlay.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const currentX = e.clientX;
      const currentY = e.clientY;

      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selection.style.left = left + "px";
      selection.style.top = top + "px";
      selection.style.width = width + "px";
      selection.style.height = height + "px";
    });

    overlay.addEventListener("mouseup", async (e) => {
      if (!isDragging) return;
      isDragging = false;

      const endX = e.clientX;
      const endY = e.clientY;

      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      if (width < 10 || height < 10) {
        cleanup(overlay, selection, hint);
        chrome.runtime.sendMessage({ type: "cropCancelled" });
        return;
      }

      cleanup(overlay, selection, hint);

      const dataUrl = await captureSelection({ left, top, width, height });
      chrome.runtime.sendMessage({
        type: "cropComplete",
        dataUrl,
        width,
        height,
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        cleanup(overlay, selection, hint);
        chrome.runtime.sendMessage({ type: "cropCancelled" });
      }
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "startCrop") {
      initCropMode();
      sendResponse();
    }
  });
})();
