# Love Bookmarks — for Mena

A little board of the places you both love. Press **Save tab** to keep the page
you are on, then open it again in one tap. Rename a tile to whatever you call
it, or remove it with `×`.

Built for **Mena** — warm, small and private. No tracking, no network calls:
everything stays in your own browser storage.

## Features

- **Save tab** remembers the active tab's title + URL (type a name first if you like).
- De-duplicates: saving the same URL twice does nothing.
- **Rename** any tile (`✎`) — inline editing, Enter to save.
- **Remove** (`×`).
- Colour-coded initial avatars (deterministic per host).
- Follows your light/dark preference.

## Install (sideload)

Works in **Chrome, Edge and Firefox** from one codebase.

### Chrome / Edge
1. Copy `manifest.chrome.json` to `manifest.json`.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick this folder.
5. Pin the extension and click it to open the popup.

### Firefox (temporary add-on)
1. Copy `manifest.firefox.json` to `manifest.json`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and pick `manifest.json`.

## Permissions

- `tabs` — to read the active tab's title and URL when you press **Save tab**, and to open a saved tile.
- `storage` — to keep your board on your device.

## Development

No build step. Plain MV3 JavaScript.

```
node --check src/common/api.js
node --check src/background.js
node --check src/popup/popup.js
node test/harness.js
node tools/make-icons.js
```

## Data

Stored under the single key **`mena-bookmarks`** as an array of
`{ id, title, url }` using `chrome.storage.local`.

## License

MIT — see [LICENSE](LICENSE).
