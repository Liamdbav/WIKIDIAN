console.log("Wikidian background service worker started.");

const OBSIDIAN_BASE = "http://127.0.0.1:27123";

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "WIKI_CAPTURE") return;
  saveToObsidian(message.payload);
});

async function saveToObsidian({ title, body, url }) {
  const { obsidianApiKey } = await chrome.storage.local.get("obsidianApiKey");
  if (!obsidianApiKey) {
    console.warn("[Wikidian] No API key set — open the popup to configure it.");
    return;
  }

  // Sanitize title for use as a filename (replace / to avoid path traversal)
  const filename = title.replace(/\//g, "_");
  const notePath = `Wikipedia/${filename}.md`;
  const markdown = `# ${title}\n\n> Source : ${url}\n\n${body}`;

  try {
    const res = await fetch(`${OBSIDIAN_BASE}/vault/${encodeURIComponent(notePath)}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${obsidianApiKey}`,
        "Content-Type": "text/markdown",
      },
      body: markdown,
    });

    if (res.ok) {
      console.log(`[Wikidian] Saved → ${notePath}`);
    } else {
      console.error(`[Wikidian] API error ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.error("[Wikidian] Failed to reach Obsidian REST API:", err.message);
  }
}
