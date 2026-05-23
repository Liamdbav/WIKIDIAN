# Wikidian — Dev context for Claude

## Objectif

Extension Chromium MV3 qui capture les articles Wikipedia visités et les sauvegarde
comme notes Markdown dans un vault Obsidian via le plugin **Local REST API**.

## Architecture

```
popup.js                 Orchestre la capture : bouton « Capturer cette page »
  │  (chrome.tabs.sendMessage → TRIGGER_CAPTURE)
  ▼
content.js               Reçoit TRIGGER_CAPTURE, extrait titre + corps via Turndown
  │  (sendResponse → payload {title, body, url})
  ▼
popup.js                 Reçoit le payload, le transmet au service worker
  │  (chrome.runtime.sendMessage → WIKI_CAPTURE)
  ▼
background.js            Service worker — reçoit WIKI_CAPTURE, appelle l'API Obsidian
  │  (fetch → REST API)
  ▼
Obsidian Local REST API  http://127.0.0.1:27123
  │  PUT /vault/{path}
  ▼
Vault Obsidian           note .md créée/mise à jour
```

Le popup (`popup.html` / `popup.js`) a deux rôles :
1. Stocker la clé API dans `chrome.storage.local` (clé `obsidianApiKey`).
2. Déclencher la capture de la page active et afficher le résultat.

Si le content script n'est pas encore chargé (onglet ouvert avant l'installation),
`popup.js` l'injecte à la volée via `chrome.scripting.executeScript`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `manifest.json` | Manifest MV3 (v0.1.0) — permissions : storage, activeTab, tabs, scripting |
| `background.js` | Service worker — reçoit `WIKI_CAPTURE`, PUT vers l'API Obsidian |
| `content.js` | Content script — écoute `TRIGGER_CAPTURE`, scrape + Turndown, renvoie le Markdown |
| `lib/turndown.js` | Bibliothèque Turndown (HTML → Markdown), embarquée en vendor |
| `popup.html` | UI du popup (thème Catppuccin Mocha) |
| `popup.js` | Logique popup : sauvegarde clé API + orchestration capture |
| `icons/` | Icônes 16/48/128 px |

## Conventions

- **Pas de bundler** : JS vanilla, pas de modules ES (MV3 service worker simple).
- **Pas de dépendance npm** : zéro `node_modules`. Turndown est embarqué dans `lib/`.
- Nommage des notes : `Wikipedia/{Article_Title}.md` (les `/` dans les titres sont
  remplacés par `_`).
- Encoding : UTF-8, titres URL-décodés avant insertion.
- Le contenu Markdown est généré dans `content.js` via **Turndown** en scrappant
  `.mw-parser-output` (éléments parasites retirés : `.mw-editsection`, `.navbox`,
  `.reference`, `.reflist`, `.hatnote`, `.ambox`).
- **Infobox** : sur frwiki, l'infobox est un `<div class="infobox_v3 infobox …">`,
  pas un `<table>`. Elle est extraite et convertie manuellement en blocs Markdown
  (entête, période, sections `<table>` avec `<caption>`) **avant** de passer à
  Turndown, puis prépendée au corps séparée par un `---`. Sélecteur :
  `div[class*='infobox']`.
- **Liens supprimés** : une règle Turndown `stripLinks` réduit toutes les balises
  `<a>` à leur texte brut — seul le lien source inséré par `background.js` subsiste.
- Guard `window.__wikidianLoaded` dans `content.js` pour éviter les doubles
  chargements lors de l'injection à la volée.

## Endpoints Obsidian Local REST API

Base URL : `http://127.0.0.1:27123`  
Auth : header `Authorization: Bearer <API_KEY>`

### Tester avec curl

```bash
# Vérifier que l'API est joignable
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $OBSIDIAN_KEY" \
  http://127.0.0.1:27123/

# Lister les fichiers à la racine du vault
curl -s \
  -H "Authorization: Bearer $OBSIDIAN_KEY" \
  http://127.0.0.1:27123/vault/ | jq

# Créer / écraser une note (PUT)
curl -s -X PUT \
  -H "Authorization: Bearer $OBSIDIAN_KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary "# Test note\n\nContenu." \
  "http://127.0.0.1:27123/vault/Wikipedia/Test.md"

# Lire une note existante
curl -s \
  -H "Authorization: Bearer $OBSIDIAN_KEY" \
  "http://127.0.0.1:27123/vault/Wikipedia/Test.md"

# Supprimer une note
curl -s -X DELETE \
  -H "Authorization: Bearer $OBSIDIAN_KEY" \
  "http://127.0.0.1:27123/vault/Wikipedia/Test.md"
```

> Exporter la clé : `export OBSIDIAN_KEY="votre_clé_ici"`

## Messages inter-composants

| Message | Direction | Payload |
|---|---|---|
| `TRIGGER_CAPTURE` | `popup.js` → `content.js` | _(vide)_ |
| _(response)_ | `content.js` → `popup.js` | `{ title, body, url }` ou `{ error }` |
| `WIKI_CAPTURE` | `popup.js` → `background.js` | `{ payload: { title, body, url } }` |
| _(response)_ | `background.js` → `popup.js` | `{ ok, filename }` ou `{ ok: false, error }` |

## Pièges connus

- **CORS** : Le plugin Local REST API bloque les requêtes de pages web normales.
  Les fetch depuis un service worker MV3 ne sont pas soumis aux restrictions CORS
  navigateur → utiliser uniquement depuis `background.js`, jamais depuis `content.js`.
- **CSP Wikipedia** : Wikipedia injecte une CSP stricte. Toute communication réseau
  doit passer par `chrome.runtime.sendMessage` vers le service worker.
- **URL Wikipedia** : certaines URLs contiennent des ancres (`#Section`) ou des
  paramètres (`?action=edit`) — `popup.js` filtre via regex `wikipedia.org/wiki/`.
- **Content script absent** : pour les onglets ouverts avant l'installation de
  l'extension, `chrome.tabs.sendMessage` échoue. `popup.js` rattrape l'erreur et
  injecte `lib/turndown.js` + `content.js` via `chrome.scripting.executeScript`.
- **Double chargement** : le guard `window.__wikidianLoaded` dans `content.js`
  empêche l'enregistrement de listeners en double lors de l'injection à la volée.
  Attention : après rechargement de l'extension sans rechargement de la page,
  l'ancien script peut encore répondre aux messages → toujours faire F5 sur la
  page Wikipedia après avoir rechargé l'extension pour garantir le nouveau code.
- **Infobox frwiki = `<div>`, pas `<table>`** : le sélecteur `table.infobox` ou
  `table[class*='infobox']` ne trouve rien. Utiliser `div[class*='infobox']`.
  Turndown ne peut pas intercepter `<table>` globalement (il descend dans les
  enfants avant d'atteindre le nœud TABLE) — toujours pré-traiter via DOM avant
  d'appeler `td.turndown()`.
- **Réveil service worker** : le service worker MV3 peut se mettre en veille. Si un
  message est perdu, augmenter la robustesse avec `chrome.runtime.onInstalled` et
  une alarme keepalive si nécessaire.
- **Clé API manquante** : `background.js` vérifie que `obsidianApiKey` est défini
  et renvoie une erreur explicite si absente.
- **Doublons** : un PUT écrase silencieusement la note existante — comportement
  voulu.
- **Namespace article** : `content.js` vérifie `body.ns-0` pour ne capturer que
  les articles (pas les pages de discussion, utilisateur, etc.).

## Commandes utiles

```bash
# Charger l'extension (après modification) : recharger dans chrome://extensions
# Voir les logs du service worker : chrome://extensions → Détails → "Inspecter les vues : service worker"
# Voir les logs content script : DevTools de la page Wikipedia → Console

# Linter rapide (si eslint installé globalement)
eslint background.js content.js popup.js
```
