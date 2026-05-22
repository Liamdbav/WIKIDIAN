const keyInput = document.getElementById("apiKey");
const saveBtn  = document.getElementById("save");
const status   = document.getElementById("status");

// Load stored key on open
chrome.storage.local.get("obsidianApiKey", ({ obsidianApiKey }) => {
  if (obsidianApiKey) keyInput.value = obsidianApiKey;
});

saveBtn.addEventListener("click", () => {
  const key = keyInput.value.trim();
  if (!key) {
    status.textContent = "Key cannot be empty.";
    status.style.color = "#f38ba8";
    return;
  }
  chrome.storage.local.set({ obsidianApiKey: key }, () => {
    status.textContent = "Saved.";
    status.style.color = "#a6e3a1";
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});
