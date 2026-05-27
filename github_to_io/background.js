chrome.action.onClicked.addListener((tab) => {
  const url = tab.url;
  const match = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/?#]+)/);
  if (match) {
    const user = match[1];
    const repo = match[2];
    const newUrl = `https://${user}.github.io/${repo}/`;
    chrome.tabs.update(tab.id, { url: newUrl });
  }
});
