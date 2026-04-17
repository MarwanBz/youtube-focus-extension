# React Chrome Extension Template

A minimal Chrome extension starter built with React 19, TypeScript, Vite, and Tailwind CSS.

## Quick Start

```bash
# Clone the template
git clone https://github.com/yosevu/react-chrome-extension-template.git my-extension
cd my-extension

# Run setup wizard
npm run setup
# (resets name/version/manifest to your project)

# Install dependencies
npm install

# Start development
npm run dev
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder

## Project Structure

```
├── options.html            # Options page entry
├── src/                    # Popup UI
│   ├── App.tsx
│   ├── background.ts       # Service worker (background)
│   ├── main.tsx
│   └── options.tsx         # Options UI
├── content-script/         # Content script (injected into pages)
│   └── src/
│       ├── App.tsx
│       └── main.tsx
├── lib/                    # Shared code
│   ├── components/
│   └── styles/
├── public/
│   └── icons/              # Extension icons (16, 32, 48, 128px)
├── manifest.json           # Extension configuration
└── scripts/
    └── setup.js            # Setup wizard
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run setup` | Run setup wizard |

## Customizing Icons

Replace the files in `public/icons/` with your own icon set:

```json
"icons": {
  "16": "icons/icon-16.png",
  "32": "icons/icon-32.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png"
}
```

## Background Service Worker

The service worker (`src/background.ts`) demonstrates a minimal use case:
increment a badge counter for quick visual feedback.

## Options Page

An options page is available at `options.html`. The popup includes a button
to open it, or you can open it from the extension details page. It also
includes a "Reset badge" button to show background messaging.

## Demo: Extension Tour

This template includes a tiny demo app that touches the core extension pieces:
- Content script overlay injected on pages.
- Popup buttons that message the content script and background.
- Background service worker that updates the badge.
- Options page that can trigger background actions.

Quick tour:
1. Visit any page and spot the content script overlay.
2. Use "Overlay" in the popup (or the in-page Hide/Show controls).
3. Click "Badge +" in the popup or overlay to update the toolbar badge.
4. Open Settings and click "Reset badge count".

## Customization

### Change Content Script URL Pattern

Edit `manifest.json` to change which pages the content script runs on:

```json
"content_scripts": [
  {
    "matches": ["https://example.com/*"],
    "js": ["content-script/src/main.tsx"]
  }
]
```

### Add Permissions

This template uses `activeTab`. Add more
permissions to `manifest.json` as needed:

```json
"permissions": ["storage", "activeTab"]
```

## Tech Stack

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [CRXJS](https://crxjs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [ESLint](https://eslint.org)

## License

MIT
