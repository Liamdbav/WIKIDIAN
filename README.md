# Wikidian

A Chromium Manifest V3 extension that captures Wikipedia articles you visit and
saves them as Markdown notes in an [Obsidian](https://obsidian.md) vault via the
[Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin.

## How it works

1. You browse a Wikipedia article (`*.wikipedia.org/wiki/*`).
2. The content script collects the article title and body.
3. The background service worker sends the Markdown to Obsidian's REST API
   (`http://127.0.0.1:27123`).
4. A new note appears in your vault.

## Prerequisites

- [Obsidian](https://obsidian.md) desktop app running.
- **Local REST API** plugin installed, enabled, and its API key copied.
- Chrome / Chromium (any modern version supporting MV3).

## Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Click the Wikidian toolbar icon, paste your Obsidian REST API key, and save.

## Project structure

```
wikidian/
├── manifest.json   — MV3 manifest
├── background.js   — service worker (API calls to Obsidian)
├── content.js      — injected into Wikipedia pages
├── popup.html/js   — toolbar popup (API key storage)
├── icons/          — add icon16/48/128.png here
└── CLAUDE.md       — dev context & notes
```
