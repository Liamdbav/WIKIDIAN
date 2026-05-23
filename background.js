console.log("Wikidian background service worker started.");

const OBSIDIAN_BASE = "http://127.0.0.1:27123";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "WIKI_CAPTURE") return;
  console.log("[Wikidian] Message reçu :", message.payload.title);
  saveToObsidian(message.payload).then(() => sendResponse("ok")).catch(() => sendResponse("error"));
  return true; // maintient le canal ouvert pour la réponse async
});

async function saveToObsidian({ title, body, url }) {
  const { obsidianApiKey } = await chrome.storage.local.get("obsidianApiKey");
  if (!obsidianApiKey) {
    console.warn("[Wikidian] Clé API absente — configure-la dans le popup.");
    return;
  }
  console.log("[Wikidian] Clé API présente, envoi vers Obsidian…");

  const filename    = title.replace(/\//g, "_");
  const notePath    = `Wikipedia/${filename}.md`;
  const encodedPath = notePath.split("/").map(encodeURIComponent).join("/");
  const markdown    = `# ${title}\n\n> Source : ${url}\n\n${body}`;

  console.log("[Wikidian] PUT", `${OBSIDIAN_BASE}/vault/${encodedPath}`);

  try {
    const res = await fetch(`${OBSIDIAN_BASE}/vault/${encodedPath}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${obsidianApiKey}`,
        "Content-Type": "text/markdown",
      },
      body: markdown,
    });

    if (res.ok) {
      console.log(`[Wikidian] Sauvegardé → ${notePath}`);
    } else {
      console.error(`[Wikidian] Erreur API ${res.status} :`, await res.text());
    }
  } catch (err) {
    console.error("[Wikidian] Impossible de joindre l'API Obsidian :", err.message);
  }
}
