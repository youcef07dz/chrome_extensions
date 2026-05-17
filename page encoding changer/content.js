(function () {
  let originalEncoding = null;
  let currentEncoding = null;

  if (!originalEncoding) {
    originalEncoding = document.characterSet || document.inputEncoding;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getEncoding") {
      sendResponse({ encoding: currentEncoding || document.characterSet });
    } else if (request.action === "setEncoding") {
      currentEncoding = request.encoding;
      applyEncoding(request.encoding);
      sendResponse({ success: true });
    } else if (request.action === "resetEncoding") {
      currentEncoding = null;
      sendResponse({ success: true });
    }
    return true;
  });

  function applyEncoding(encoding) {
    const metaTag = document.querySelector('meta[http-equiv="Content-Type"]');
    if (metaTag) {
      metaTag.setAttribute("content", `text/html; charset=${encoding}`);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.setAttribute("http-equiv", "Content-Type");
      newMeta.setAttribute("content", `text/html; charset=${encoding}`);
      if (document.head) {
        document.head.prepend(newMeta);
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          if (document.head) {
            document.head.prepend(newMeta);
          }
        });
      }
    }

    const htmlTag = document.documentElement;
    htmlTag.setAttribute("data-encoding-changed", encoding);

    reloadWithEncoding(encoding);
  }

  function reloadWithEncoding(encoding) {
    fetch(window.location.href, { credentials: "same-origin" })
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        const decoder = new TextDecoder(encoding);
        const decodedText = decoder.decode(buffer);
        document.open();
        document.write(decodedText);
        document.close();
      })
      .catch(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("_encoding", encoding);
        window.location.href = url.toString();
      });
  }
})();
