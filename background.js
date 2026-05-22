console.log("Wikidian background service worker started.");

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "WIKI_CAPTURE") return;

  const { title, body, url } = message.payload;
  console.log("[Wikidian] Captured:", title);
  console.log("[Wikidian] URL:", url);
  console.log("[Wikidian] Body preview:", body.slice(0, 200));
});
