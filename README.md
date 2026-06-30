<div align="center">
  <img src="LOGO.png" alt="Wikidian" width="180" />
</div>

# Wikidian

Extension Chromium Manifest V3 qui capture les articles Wikipedia que tu visites
et les sauvegarde comme notes Markdown dans un vault [Obsidian](https://obsidian.md),
via le plugin [Local REST API](https://github.com/Liamdbav/OBSIDIAN-API-LOCAL). 

## Comment ça fonctionne

1. Tu cliques sur **"Capturer cette page"** depuis n'importe quel article Wikipedia.
2. Le content script extrait le titre, convertit l'infobox en tableau Markdown et le corps de l'article en Markdown structuré grâce à [Turndown](https://github.com/mixmark-io/turndown). Tous les liens internes sont supprimés — seul le lien source est conservé.
3. Le service worker envoie la note à l'API Obsidian locale (`http://127.0.0.1:27123`).
4. La note apparaît dans ton vault sous `Wikipedia/{Titre}.md`.

## Prérequis

- [Obsidian](https://obsidian.md) ouvert sur le bureau.
- Plugin **[Liamdbav/OBSIDIAN-API-LOCAL](https://github.com/Liamdbav/OBSIDIAN-API-LOCAL)** installé et activé dans Obsidian — c'est ce plugin qui expose l'API REST locale utilisée par l'extension. Sans lui, Wikidian ne peut pas écrire dans ton vault.
- Chrome ou Chromium (toute version récente supportant MV3).

## Charger l'extension dans Chrome

1. Ouvre `chrome://extensions`.
2. Active le **Mode développeur** (interrupteur en haut à droite).
3. Clique sur **Charger l'extension non empaquetée** et sélectionne ce dossier.
4. Clique sur l'icône Wikidian dans la barre d'outils, colle ta clé API Obsidian et sauvegarde.

> Après toute modification du code, recharge l'extension dans `chrome://extensions` **puis rafraîchis** (F5) la page Wikipedia avant de capturer.

## Structure du projet

```
wikidian/
├── manifest.json     — manifest MV3
├── background.js     — service worker (appels API vers Obsidian)
├── content.js        — injecté dans les pages Wikipedia (extraction + conversion Markdown)
├── lib/turndown.js   — conversion HTML → Markdown (vendored)
├── popup.html/js     — popup barre d'outils (clé API + bouton Capturer)
├── icons/            — icon16/48/128.png
└── CLAUDE.md         — contexte de développement
```

## Remerciements

Merci à [@coddingtonbear](https://github.com/coddingtonbear) pour le projet
[Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api),
qui expose ton vault Obsidian via une API REST locale sécurisée et un serveur
Model Context Protocol (MCP) — permettant à n'importe quel agent IA (Claude,
Cursor, ou ton propre script) d'interagir directement avec tes notes.

Ce projet tourne sur ma propre reconstruction du plugin :
[Liamdbav/OBSIDIAN-API-LOCAL](https://github.com/Liamdbav/OBSIDIAN-API-LOCAL).

---

<div align="center">

Fait avec soin par **Liam** - License MIT — voir [LICENSE](LICENSE)

</div>
