(function () {
  const STORAGE_KEY = "anti-fingerprint-session";

  function getSessionId() {
    let session = sessionStorage.getItem(STORAGE_KEY);
    if (!session) {
      session = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem(STORAGE_KEY, session);
    }
    return session;
  }

  function seededRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return function () {
      h = (h ^ (h >>> 16)) * 0x45d9f3b;
      h = (h ^ (h >>> 16)) * 0x45d9f3b;
      h = h ^ (h >>> 16);
      return (h >>> 0) / 4294967296;
    };
  }

  function loadSettings(callback) {
    chrome.storage.local.get(["settings"], (result) => {
      const defaults = {
        enabled: true,
        canvas: true,
        fonts: true,
        webgl: true,
        audio: true,
      };
      const settings = result.settings ? { ...defaults, ...result.settings } : defaults;
      callback(settings);
    });
  }

  loadSettings((settings) => {
    if (!settings.enabled) return;

    const sessionId = getSessionId();
    const rand = seededRandom(sessionId);

    function randomOffset(min, max) {
      return min + rand() * (max - min);
    }

    if (settings.canvas) {
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const origToBlob = HTMLCanvasElement.prototype.toBlob;

      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        perturbCanvas(this);
        return origToDataURL.apply(this, args);
      };

      HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
        perturbCanvas(this);
        return origToBlob.call(
          this,
          (blob) => {
            callback(blob);
          },
          ...args,
        );
      };

      function perturbCanvas(canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const len = imageData.data.length;
        const step = Math.max(1, Math.floor(len / 1000));
        for (let i = 0; i < len; i += step) {
          imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + Math.round(randomOffset(-1, 1))));
        }
        ctx.putImageData(imageData, 0, 0);
      }
    }

    if (settings.fonts) {
      const origMeasureText = CanvasRenderingContext2D.prototype.measureText;
      CanvasRenderingContext2D.prototype.measureText = function (text) {
        const metrics = origMeasureText.call(this, text);
        const offset = randomOffset(-0.5, 0.5);
        return new Proxy(metrics, {
          get(target, prop) {
            const val = target[prop];
            if (typeof val === "number" && val !== 0) {
              return val + offset;
            }
            return val;
          },
        });
      };

      const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () {
        const rect = origGetBoundingClientRect.call(this);
        if (this.offsetParent !== null && this.style.fontFamily) {
          const offset = randomOffset(-0.1, 0.1);
          return new Proxy(rect, {
            get(target, prop) {
              const val = target[prop];
              if (typeof val === "number" && val !== 0) {
                return val + offset;
              }
              return val;
            },
          });
        }
        return rect;
      };
    }

    if (settings.webgl) {
      const origGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (param) {
        const result = origGetParameter.call(this, param);
        if (param === 0x1f03) {
          return result + randomOffset(-0.01, 0.01);
        }
        if (param === 0x1f00) {
          return result + randomOffset(-0.5, 0.5);
        }
        if (param === 0x1f01) {
          return result + randomOffset(-0.5, 0.5);
        }
        if (param === 0x1f02) {
          return result + randomOffset(-0.5, 0.5);
        }
        return result;
      };

      const origGetSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
      WebGLRenderingContext.prototype.getSupportedExtensions = function () {
        const extensions = origGetSupportedExtensions.call(this);
        if (!extensions) return extensions;
        const noise = ["MOZ_debug", "WEBGL_lose_context_noise"];
        if (rand() > 0.5) {
          return [...extensions, noise[Math.floor(rand() * noise.length)]];
        }
        return extensions.filter((ext) => rand() > 0.1);
      };

      if (typeof WebGL2RenderingContext !== "undefined") {
        const origGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (param) {
          const result = origGetParameter2.call(this, param);
          if (param === 0x1f03) {
            return result + randomOffset(-0.01, 0.01);
          }
          return result;
        };
      }
    }

    if (settings.audio) {
      const origCreateDynamicsCompressor = OfflineAudioContext.prototype.createDynamicsCompressor;
      OfflineAudioContext.prototype.createDynamicsCompressor = function () {
        const compressor = origCreateDynamicsCompressor.call(this);
        const offset = randomOffset(-0.001, 0.001);
        try {
          compressor.threshold.value += offset;
          compressor.knee.value += offset;
          compressor.ratio.value += offset * 10;
        } catch {}
        return compressor;
      };

      const origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function (channel) {
        const data = origGetChannelData.call(this, channel);
        for (let i = 0; i < data.length; i++) {
          data[i] += randomOffset(-0.00001, 0.00001);
        }
        return data;
      };
    }
  });
})();
