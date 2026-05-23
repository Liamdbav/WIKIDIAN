;(function () {
  if (window.__wikidianLoaded) return;
  window.__wikidianLoaded = true;

  console.log("Wikidian content script loaded.");

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "TRIGGER_CAPTURE") return;

    if (!document.body.classList.contains("ns-0")) {
      sendResponse({ error: "Pas un article Wikipedia." });
      return true;
    }

    const title = document.querySelector("#firstHeading")?.textContent.trim();
    if (!title) { sendResponse({ error: "#firstHeading introuvable." }); return true; }

    const url = location.origin + location.pathname;

    const root = document.querySelector("#mw-content-text .mw-parser-output");
    if (!root) { sendResponse({ error: ".mw-parser-output introuvable." }); return true; }

    const clone = root.cloneNode(true);
    clone.querySelectorAll(".mw-editsection, .navbox, .reference, .reflist, .hatnote, .ambox")
         .forEach(el => el.remove());

    const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
    td.addRule("ignoreStyleScript", {
      filter: ["style", "script"],
      replacement: () => "",
    });

    const body = td.turndown(clone.innerHTML);
    sendResponse({ title, body, url });
    return true;
  });
})();
