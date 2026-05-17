const cropBtn = document.getElementById("crop-btn");
const statusEl = document.getElementById("status");
const previewSection = document.getElementById("preview-section");
const previewImage = document.getElementById("preview-image");
const dimensionsEl = document.getElementById("dimensions");
const exportSection = document.getElementById("export-section");
const pngBtn = document.getElementById("png-btn");
const jpgBtn = document.getElementById("jpg-btn");
const pdfBtn = document.getElementById("pdf-btn");

let cropDataUrl = null;
let cropWidth = 0;
let cropHeight = 0;

cropBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  }).then(() => {
    chrome.tabs.sendMessage(tab.id, { type: "startCrop" });
    statusEl.textContent = "Crop mode active. Draw a selection on the page...";
    statusEl.className = "status active";
    previewSection.style.display = "none";
    exportSection.style.display = "none";
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "cropCancelled") {
    statusEl.textContent = "Cancelled. Click to try again.";
    statusEl.className = "status";
    sendResponse();
  }

  if (message.type === "cropComplete") {
    cropDataUrl = message.dataUrl;
    cropWidth = message.width;
    cropHeight = message.height;

    previewImage.src = cropDataUrl;
    dimensionsEl.textContent = `${Math.round(cropWidth)} × ${Math.round(cropHeight)} px`;

    previewSection.style.display = "block";
    exportSection.style.display = "block";
    statusEl.textContent = "Selection captured! Choose export format below.";
    statusEl.className = "status success";
    sendResponse();
  }
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl, mimeType) {
  const byteString = atob(dataUrl.split(",")[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([uint8Array], { type: mimeType });
}

pngBtn.addEventListener("click", () => {
  const blob = dataUrlToBlob(cropDataUrl, "image/png");
  downloadBlob(blob, `cropped-${Date.now()}.png`);
  statusEl.textContent = "PNG downloaded!";
});

jpgBtn.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      downloadBlob(blob, `cropped-${Date.now()}.jpg`);
      statusEl.textContent = "JPG downloaded!";
    }, "image/jpeg", 0.92);
  };
  img.src = cropDataUrl;
});

pdfBtn.addEventListener("click", () => {
  const img = new Image();
  img.onload = () => {
    const pdf = createPDF(img, cropWidth, cropHeight);
    downloadBlob(pdf, `cropped-${Date.now()}.pdf`);
    statusEl.textContent = "PDF downloaded!";
  };
  img.src = cropDataUrl;
});

function createPDF(img, width, height) {
  const dpi = 150;
  const ptWidth = (width / dpi) * 72;
  const ptHeight = (height / dpi) * 72;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  const data = dataUrl.split(",")[1];

  const objects = [];
  const offsets = [];
  let offset = 0;

  function addObject(content) {
    offsets.push(offset);
    const obj = `${objects.length + 1} 0 obj\n${content}\nendobj\n`;
    objects.push(obj);
    offset += obj.length;
  }

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth} ${ptHeight}] /Contents 4 0 R /Resources << /XObject << /Img0 5 0 R >> >> >>`
  );

  const stream = `q ${ptWidth} 0 0 ${ptHeight} 0 0 cm /Img0 Do Q`;
  addObject(
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  );

  const imgData = atob(data);
  const imgArray = new Uint8Array(imgData.length);
  for (let i = 0; i < imgData.length; i++) {
    imgArray[i] = imgData.charCodeAt(i);
  }

  addObject(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgArray.length} >>\nstream\n${data}\nendstream`
  );

  let pdfContent = "%PDF-1.4\n";
  objects.forEach((obj) => {
    pdfContent += obj;
  });

  const xrefOffset = offset;
  pdfContent += `xref\n0 ${objects.length + 1}\n`;
  pdfContent += `0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdfContent += `${off.toString().padStart(10, "0")} 00000 n \n`;
  });

  pdfContent += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdfContent += `startxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdfContent.length);
  for (let i = 0; i < pdfContent.length; i++) {
    bytes[i] = pdfContent.charCodeAt(i);
  }
  return new Blob([bytes], { type: "application/pdf" });
}
