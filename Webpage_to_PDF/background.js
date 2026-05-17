const PAPER_SIZES_PT = {
  letter: [612, 792],
  legal: [612, 1008],
  a4: [595.28, 841.89],
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function attach(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError)
        reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function detach(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}

function cmd(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError)
        reject(new Error(chrome.runtime.lastError.message));
      else resolve(result);
    });
  });
}

function download(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename, saveAs: true }, (id) => {
      if (chrome.runtime.lastError)
        reject(new Error(chrome.runtime.lastError.message));
      else resolve({ success: true, downloadId: id });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "convertToPdf") {
    convertToPdf(message.tabId, message.options || {})
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function convertToPdf(tabId, options) {
  if (options.mode === "screenshot") {
    return captureScreenshotPdf(tabId, options);
  }
  return capturePrintPdf(tabId, options);
}

async function capturePrintPdf(tabId, options) {
  const defaults = {
    printBackground: true,
    landscape: false,
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    scale: 1,
    displayHeaderFooter: false,
    preferCSSPageSize: false,
    pageRanges: "",
  };
  const config = { ...defaults, ...options };
  if (config.scale) config.scale = config.scale / 100;

  await attach(tabId);
  try {
    await cmd(tabId, "Emulation.setEmulatedMedia", { media: "print" });
    const pdfResult = await cmd(tabId, "Page.printToPDF", config);
    await detach(tabId);
    return download(
      `data:application/pdf;base64,${pdfResult.data}`,
      `page_${Date.now()}.pdf`
    );
  } catch (err) {
    await detach(tabId);
    throw err;
  }
}

async function captureScreenshotPdf(tabId, options) {
  const [pageW, pageH] = PAPER_SIZES_PT[options.paperSize || "letter"];
  const MAX_DIM = 16384;

  await attach(tabId);
  try {
    const metrics = await cmd(tabId, "Page.getLayoutMetrics");
    const cw = Math.min(Math.ceil(metrics.contentSize.width), MAX_DIM);
    const ch = Math.min(Math.ceil(metrics.contentSize.height), MAX_DIM);

    await cmd(tabId, "Emulation.setDeviceMetricsOverride", {
      width: cw,
      height: ch,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(400);

    const screenshot = await cmd(tabId, "Page.captureScreenshot", {
      format: "jpeg",
      quality: 92,
    });

    await cmd(tabId, "Emulation.clearDeviceMetricsOverride");
    await detach(tabId);

    const pdfBytes = jpegToPdf(screenshot.data, cw, ch, pageW, pageH);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    return download(url, `screenshot_${Date.now()}.pdf`).finally(() =>
      URL.revokeObjectURL(url)
    );
  } catch (err) {
    await detach(tabId);
    throw err;
  }
}

function jpegToPdf(base64Jpeg, imgWidth, imgHeight, pageW, pageH) {
  const margin = 36;
  const maxW = pageW - 2 * margin;
  const maxH = pageH - 2 * margin;
  const scale = Math.min(maxW / imgWidth, maxH / imgHeight);
  const dispW = Math.round(imgWidth * scale);
  const dispH = Math.round(imgHeight * scale);
  const offsetX = Math.round((pageW - dispW) / 2);
  const offsetY = Math.round((pageH - dispH) / 2);

  const bin = atob(base64Jpeg);
  const imgBytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) imgBytes[i] = bin.charCodeAt(i);

  const content = `q ${dispW} 0 0 ${dispH} ${offsetX} ${offsetY} cm /I0 Do Q\n`;
  const contentBytes = new TextEncoder().encode(content);
  const enc = new TextEncoder();

  const chunks = [];
  let pos = 0;
  const xrefOffsets = [0];

  function w(s) {
    const b = enc.encode(s);
    chunks.push(b);
    pos += b.length;
  }
  function wb(b) {
    chunks.push(b);
    pos += b.length;
  }

  w("%PDF-1.4\n");
  xrefOffsets.push(pos);
  w("1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n");
  xrefOffsets.push(pos);
  w("2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n");
  xrefOffsets.push(pos);
  w(`3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources <</XObject <</I0 5 0 R>>>>>>\nendobj\n`);
  xrefOffsets.push(pos);
  w(`4 0 obj\n<</Length ${contentBytes.length}>>stream\n`);
  wb(contentBytes);
  w("\nendstream\nendobj\n");
  xrefOffsets.push(pos);
  w(`5 0 obj\n<</Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length}>>stream\n`);
  wb(imgBytes);
  w("\nendstream\nendobj\n");

  const xrefOffset = pos;
  let xref = "xref\n";
  xref += `0 ${xrefOffsets.length}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < xrefOffsets.length; i++)
    xref += `${String(xrefOffsets[i]).padStart(10, "0")} 00000 n \n`;
  w(xref);
  w("trailer\n");
  w(`<</Size ${xrefOffsets.length} /Root 1 0 R>>\n`);
  w("startxref\n");
  w(`${xrefOffset}\n`);
  w("%%EOF\n");

  const result = new Uint8Array(pos);
  let off = 0;
  for (const chunk of chunks) {
    result.set(chunk, off);
    off += chunk.length;
  }
  return result;
}
