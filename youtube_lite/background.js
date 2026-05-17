chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable();

  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'www.youtube.com', pathPrefix: '/watch' }
          }),
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'm.youtube.com', pathPrefix: '/watch' }
          }),
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: '.youtu.be' }
          })
        ],
        actions: [new chrome.declarativeContent.ShowAction()]
      }
    ]);
  });
});

chrome.action.onClicked.addListener((tab) => {
  const videoId = new URL(tab.url).searchParams.get('v');
  if (videoId) {
    chrome.tabs.create({
      url: 'https://youcef07dz.github.io/youtube-lite/?v=' + videoId,
      active: true
    });
  }
});
