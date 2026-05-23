console.log("Wikidian content script loaded.");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "TRIGGER_CAPTURE") return;

  if (!document.body.classList.contains("ns-0")) {
    sendResponse({ error: "Pas un article Wikipedia." });
    return true;
  }

  const titleEl = document.querySelector("#firstHeading");
  if (!titleEl) { sendResponse({ error: "#firstHeading introuvable." }); return true; }
  const title = titleEl.textContent.trim();

  const url = window.location.origin + window.location.pathname;

  const root = document.querySelector("#mw-content-text .mw-parser-output");
  if (!root) { sendResponse({ error: ".mw-parser-output introuvable." }); return true; }

  const clone = root.cloneNode(true);
  clone.querySelectorAll(".mw-editsection, .navbox, .reference, .reflist, .hatnote, .ambox")
       .forEach(el => el.remove());

  const body = clone.textContent.trim();
  sendResponse({ title, body, url });
  return true;
});
