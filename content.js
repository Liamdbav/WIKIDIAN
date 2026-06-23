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

    // Supprime les éléments parasites structurels
    clone.querySelectorAll(
      ".mw-editsection, .navbox, .reference, .reflist, .hatnote, .ambox, " +
      ".thumb, .thumbinner, .thumbcaption, " +
      ".bandeau-portail, .sistersitebox, .noprint, " +
      ".mw-references-wrap, .mw-empty-elt, .locmap, .geobox"
    ).forEach(el => el.remove());

    // Supprime toutes les images (URLs protocol-relative inutilisables dans Obsidian)
    clone.querySelectorAll("img, figure, figcaption").forEach(el => el.remove());

    // frwiki enveloppe chaque heading dans <div class="mw-heading">.
    // h.nextElementSibling est donc null — il faut marcher depuis le div parent.
    function headingContainer(h) {
      return h.closest(".mw-heading") || h;
    }

    // Supprime "Notes et références" et variantes (heading + contenu)
    const SKIP_H2 = ["Notes et références", "Notes", "Références"];
    clone.querySelectorAll("h2").forEach(h2 => {
      const text = h2.textContent.trim().replace(/\[.*?\]/g, "").trim();
      if (!SKIP_H2.includes(text)) return;
      const container = headingContainer(h2);
      const toRemove = [container];
      let next = container.nextElementSibling;
      while (next) {
        if (next.querySelector("h2") || next.tagName === "H2") break;
        toRemove.push(next);
        next = next.nextElementSibling;
      }
      toRemove.forEach(e => e.remove());
    });

    // Marque les liens dans "Liens externes" et "Articles connexes" pour les rendre clicables.
    // On marche depuis le div.mw-heading (pas depuis le h3 lui-même).
    const KEEP_LINK_H = ["Voir aussi", "Annexes", "Liens externes", "Articles connexes"];
    clone.querySelectorAll("h2, h3").forEach(h => {
      const text = h.textContent.trim().replace(/\[.*?\]/g, "").trim();
      if (!KEEP_LINK_H.some(s => text.includes(s))) return;
      const container = headingContainer(h);
      const level = parseInt(h.tagName[1]);
      let next = container.nextElementSibling;
      while (next) {
        const nextH = next.querySelector("h1,h2,h3") ||
                      (next.tagName && next.tagName.match(/^H[1-6]$/) ? next : null);
        if (nextH && parseInt(nextH.tagName[1]) <= level) break;
        next.querySelectorAll("a[href]").forEach(a => a.setAttribute("data-keep-link", "1"));
        next = next.nextElementSibling;
      }
    });

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

    // Supprime les liens dans le corps de l'article (trop nombreux, Wikipedia interne)
    // mais conserve les liens marqués data-keep-link (Liens externes, Articles connexes)
    td.addRule("stripLinks", {
      filter: "a",
      replacement: (content, node) => {
        if (node.getAttribute("data-keep-link") === "1") {
          const href = node.href || node.getAttribute("href") || "";
          if (href && content.trim()) return "[" + content.trim() + "](" + href + ")";
        }
        return content;
      },
    });

    // Filet de sécurité : images/figures non supprimées par le DOM
    td.addRule("stripImages", {
      filter: ["img", "figure", "figcaption"],
      replacement: () => "",
    });

    const articleBody = td.turndown(clone);
    const body = infoboxMd.length
      ? infoboxMd.join("\n\n") + "\n\n---\n\n" + articleBody
      : articleBody;

    sendResponse({ title, body, url });
    return true;
  });
})();
