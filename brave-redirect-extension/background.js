chrome.action.onClicked.addListener((tab) => {
  chrome.storage.sync.get(["fromPattern"], (data) => {
    const fromPattern = data.fromPattern || "https://www\\.imdb\\.com/title/(tt\\d+)";
    const regex = new RegExp("^" + fromPattern);
    const match = tab.url.match(regex);
    if (match) {
      const title = tab.title || "";
      const embedType = /tv series/i.test(title) ? "tv" : "movie";
      const newUrl = `https://streamimdb.ru/embed/${embedType}/${match[1]}`;
      chrome.tabs.update(tab.id, { url: newUrl });
    }
  });
});
