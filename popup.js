const keyInput  = document.getElementById("apiKey");
const saveBtn   = document.getElementById("save");
const captureBtn = document.getElementById("capture");
const status    = document.getElementById("status");

function setStatus(text, type = "ok") {
  status.textContent = text;
  status.style.color = type === "ok" ? "#a6e3a1" : type === "error" ? "#f38ba8" : "#cdd6f4";
}

// Load stored key on open
chrome.storage.local.get("obsidianApiKey", ({ obsidianApiKey }) => {
  if (obsidianApiKey) keyInput.value = obsidianApiKey;
});

saveBtn.addEventListener("click", () => {
  const key = keyInput.value.trim();
  if (!key) { setStatus("Key cannot be empty.", "error"); return; }
  chrome.storage.local.set({ obsidianApiKey: key }, () => {
    setStatus("Saved.");
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});

captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  setStatus("Récupération de l'onglet…", "info");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.match(/wikipedia\.org\/wiki\//)) {
      setStatus("Pas sur une page Wikipedia.", "error");
      return;
    }

    setStatus("Extraction de l'article…", "info");

    let payload;
    try {
      payload = await chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_CAPTURE" });
    } catch {
      setStatus("Content script inaccessible — recharge la page Wikipedia.", "error");
      return;
    }

    if (payload?.error) { setStatus(payload.error, "error"); return; }

    setStatus("Envoi vers Obsidian…", "info");

    const result = await chrome.runtime.sendMessage({ type: "WIKI_CAPTURE", payload });

    if (result?.ok) {
      setStatus(`Note créée : ${result.filename}`);
    } else {
      setStatus(result?.error ?? "Erreur inconnue.", "error");
    }

  } finally {
    captureBtn.disabled = false;
  }
});
