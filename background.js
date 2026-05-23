console.log("Wikidian background service worker started.");

const OBSIDIAN_BASE = "http://127.0.0.1:27123";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "WIKI_CAPTURE") return;
  saveToObsidian(message.payload)
    .then(result => sendResponse(result))
    .catch(err  => sendResponse({ ok: false, error: err.message }));
  return true;
});

async function saveToObsidian({ title, body, url }) {
  const { obsidianApiKey } = await chrome.storage.local.get("obsidianApiKey");
  if (!obsidianApiKey) {
    return { ok: false, error: "Clé API manquante — configure-la dans le popup." };
  }

  // Caractères interdits sur Windows + slash → remplacés par tiret
  const filename    = title.replace(/[/\\:*?"<>|]/g, "-");
  const notePath    = `Wikipedia/${filename}.md`;
  const encodedPath = notePath.split("/").map(encodeURIComponent).join("/");
  const markdown    = `# ${title}\n\n> Source : ${url}\n\n${body}`;

  const controller  = new AbortController();
  const timeoutId   = setTimeout(() => controller.abort(), 10_000);

  let res;
  try {
    res = await fetch(`${OBSIDIAN_BASE}/vault/${encodedPath}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${obsidianApiKey}`,
        "Content-Type": "text/markdown",
      },
      body: markdown,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, error: "Obsidian ne répond pas (délai de 10 s dépassé). Vérifiez qu'Obsidian est ouvert et que le plugin Local REST API est actif." };
    }
    return { ok: false, error: `Impossible de joindre l'API Obsidian : ${err.message}` };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Erreur API ${res.status} : ${text}` };
  }

  return { ok: true, filename: notePath };
}
