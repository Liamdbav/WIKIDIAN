;(function () {
  if (window.__wikidianLoaded) return;
  window.__wikidianLoaded = true;

  console.log("Wikidian content script loaded.");

  // Convertit le <div class="infobox…"> de Wikipedia en blocs Markdown.
  // Structure réelle (frwiki) : div.infobox > div.entete + p.center + N×<table>
  // chaque table ayant une <caption> et des lignes <th>/<td>.
  function infoboxToMd(div) {
    const parts = [];

    const entete = div.querySelector(".entete");
    if (entete) {
      const t = entete.textContent.trim().replace(/\s+/g, " ");
      if (t) parts.push("**" + t + "**");
    }

    const center = div.querySelector("p.center");
    if (center) {
      const t = center.textContent.trim().replace(/\s+/g, " ");
      if (t) parts.push(t);
    }

    div.querySelectorAll("table").forEach(table => {
      const caption = table.querySelector("caption");
      const captionText = caption?.textContent.trim().replace(/\s+/g, " ");

      const rows = [];
      table.querySelectorAll("tr").forEach(tr => {
        const cells = [...tr.querySelectorAll("th, td")].map(cell =>
          cell.textContent.trim().replace(/\s+/g, " ").replace(/\|/g, "\\|")
        );
        if (cells.some(c => c)) rows.push(cells);
      });
      if (!rows.length) return;

      if (captionText) parts.push("**" + captionText + "**");

      const maxCols = Math.max(...rows.map(r => r.length));
      const pad = row => {
        const p = [...row];
        while (p.length < maxCols) p.push("");
        return "| " + p.join(" | ") + " |";
      };
      const sep = "| " + Array(maxCols).fill("---").join(" | ") + " |";
      const [first, ...rest] = rows;
      parts.push([pad(first), sep, ...rest.map(pad)].join("\n"));
    });

    return parts.join("\n\n");
  }

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

    // Extraire les infoboxes (div, pas table) avant Turndown
    const infoboxMd = [];
    clone.querySelectorAll("div[class*='infobox']").forEach(div => {
      const md = infoboxToMd(div);
      if (md) infoboxMd.push(md);
      div.remove();
    });

    const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

    td.addRule("ignoreStyleScript", {
      filter: ["style", "script"],
      replacement: () => "",
    });

    // Supprime tous les liens — garde uniquement le texte
    td.addRule("stripLinks", {
      filter: "a",
      replacement: content => content,
    });

    const articleBody = td.turndown(clone);
    const body = infoboxMd.length
      ? infoboxMd.join("\n\n") + "\n\n---\n\n" + articleBody
      : articleBody;

    sendResponse({ title, body, url });
    return true;
  });
})();
