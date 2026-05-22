# Wikidian — Dev context for Claude

## Objectif

Extension Chromium MV3 qui capture les articles Wikipedia visités et les sauvegarde
comme notes Markdown dans un vault Obsidian via le plugin **Local REST API**.

## Architecture

```
Wikipedia page
  └─ content.js          Extrait titre + corps de l'article (DOM scraping)
       │  (chrome.runtime.sendMessage)
       ▼
  background.js          Service worker — reçoit le message, appelle l'API Obsidian
       │  (fetch → REST API)
       ▼
  Obsidian Local REST API  http://127.0.0.1:27123
       │  PUT /vault/{path}
       ▼
  Vault Obsidian           note .md créée/mise à jour
```

Le popup (`popup.html` / `popup.js`) sert uniquement à stocker la clé API dans
`chrome.storage.local` sous la clé `obsidianApiKey`.

## Conventions

- **Pas de bundler** : JS vanilla, modules ES natifs non utilisés (MV3 service
  worker sans import dynamique pour rester simple).
- **Pas de dépendance npm** : zéro `node_modules`.
- Nommage des notes : `Wikipedia/{Article_Title}.md` (underscores → espaces dans
  le titre Obsidian).
- Encoding : UTF-8, titres URL-décodés avant insertion.
- Le contenu Markdown est généré dans `content.js` en scrappant `#mw-content-text`
  (conversion HTML → Markdown à la main ou via Turndown si ajouté plus tard).

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

## Pièges connus

- **CORS** : Le plugin Local REST API bloque les requêtes de pages web normales.
  Les fetch depuis un service worker MV3 ne sont pas soumis aux restrictions CORS
  navigateur → utiliser uniquement depuis `background.js`, jamais depuis `content.js`.
- **CSP Wikipedia** : Wikipedia injecte une CSP stricte. Toute communication réseau
  doit passer par `chrome.runtime.sendMessage` vers le service worker.
- **URL Wikipedia** : certaines URLs contiennent des ancres (`#Section`) ou des
  paramètres (`?action=edit`) — filtrer pour ne capturer que les pages article.
- **Réveil service worker** : le service worker MV3 peut se mettre en veille. Si un
  message est perdu, augmenter la robustesse avec `chrome.runtime.onInstalled` et
  une alarme keepalive si nécessaire.
- **Clé API manquante** : toujours vérifier que `obsidianApiKey` est défini avant
  d'appeler l'API et notifier l'utilisateur via `chrome.notifications` si absente.
- **Doublons** : un PUT écrase silencieusement la note existante — comportement
  voulu, mais à documenter pour l'utilisateur.

## Commandes utiles

```bash
# Charger l'extension (après modification) : recharger dans chrome://extensions
# Voir les logs du service worker : chrome://extensions → Détails → "Inspecter les vues : service worker"
# Voir les logs content script : DevTools de la page Wikipedia → Console

# Linter rapide (si eslint installé globalement)
eslint background.js content.js popup.js
```
