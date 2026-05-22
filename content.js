console.log("Wikidian content script loaded.");

(function capture() {
  const cfg = window.mw?.config;
  if (!cfg) return;

  const articleId = cfg.get("wgArticleId");
  if (!articleId) return;

  const title = cfg.get("wgTitle");
  const url   = "https:" + cfg.get("wgServer") + "/wiki/" + cfg.get("wgPageName");

  const root = document.querySelector("#mw-content-text .mw-parser-output");
  if (!root) return;

  const clone = root.cloneNode(true);
  const NOISE = ".mw-editsection, .navbox, .reference, .reflist, .hatnote, .ambox";
  clone.querySelectorAll(NOISE).forEach(el => el.remove());

  const body = clone.innerText.trim();

  chrome.runtime.sendMessage({ type: "WIKI_CAPTURE", payload: { title, body, url } });
})();
