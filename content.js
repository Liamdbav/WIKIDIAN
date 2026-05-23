console.log("Wikidian content script loaded.");

(function capture() {
  // Wikipedia marque les articles (namespace 0) avec la classe "ns-0" sur <body>.
  // Les pages spéciales (Spécial:, Discussion:, etc.) ont d'autres classes — on les ignore.
  if (!document.body.classList.contains("ns-0")) {
    console.log("[Wikidian] Pas un article (namespace != 0), ignoré.");
    return;
  }

  const titleEl = document.querySelector("#firstHeading");
  if (!titleEl) { console.warn("[Wikidian] #firstHeading introuvable"); return; }
  const title = titleEl.textContent.trim();

  // URL propre : sans query params ni ancre
  const url = window.location.origin + window.location.pathname;

  const root = document.querySelector("#mw-content-text .mw-parser-output");
  if (!root) { console.warn("[Wikidian] .mw-parser-output introuvable"); return; }

  const clone = root.cloneNode(true);
  const NOISE = ".mw-editsection, .navbox, .reference, .reflist, .hatnote, .ambox";
  clone.querySelectorAll(NOISE).forEach(el => el.remove());

  const body = clone.textContent.trim();
  console.log("[Wikidian] Article détecté :", title, "— body :", body.length, "chars");

  chrome.runtime.sendMessage({ type: "WIKI_CAPTURE", payload: { title, body, url } },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("[Wikidian] sendMessage échoué :", chrome.runtime.lastError.message);
      } else {
        console.log("[Wikidian] Background a répondu :", response);
      }
    }
  );
})();
