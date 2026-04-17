# Architecture

## Goal

Replace YouTube's recommendation-first home page with an intentional viewing surface that points the user toward Watch Later and selected playlists.

The project now uses the cloned `yosevu/react-chrome-extension-template` starter. The architecture should follow that template instead of the earlier WXT plan.

## Current Template Stack

- Starter: `yosevu/react-chrome-extension-template`
- Browser extension model: Chrome Manifest V3
- Build system: Vite 6 with `@crxjs/vite-plugin`
- UI: React 19 + TypeScript
- Styling: Tailwind CSS 3
- Shared styles/components: `lib/`
- Content script isolation: Shadow DOM with injected Tailwind CSS
- Background runtime: Chrome extension service worker
- Options page: separate `options.html` Vite entry
- Tests: Playwright
- Package manager: npm
- Required runtime from template: Node 24+, npm 11+

## Template Files Now In This Directory

```text
youtube-focus-extension/
  manifest.json
  vite.config.ts
  package.json
  package-lock.json
  index.html
  options.html
  content-script/
    index.html
    src/
      App.tsx
      domIds.ts
      main.tsx
      urlChanges.ts
      youtubeHome.ts
  src/
    App.tsx
    background.ts
    main.tsx
    options.tsx
    settings/
      defaults.ts
      schema.ts
      storage.ts
    vite-env.d.ts
  lib/
    components/
      Logo.tsx
    styles/
      globals.css
  public/
    icons/
    favicon.ico
    logo192.png
    logo512.png
    robots.txt
  scripts/
    setup.js
  tests/
    preflight-isolation.spec.ts
  README.md
  TEMPLATE_README.md
  architecture.md
  roadmap.md
  tasks.md
  progress.md
```

`TEMPLATE_README.md` preserves the upstream template README because the local `README.md` is the project planning entrypoint.

## Template Entry Points

### Popup

Files:

- `index.html`
- `src/main.tsx`
- `src/App.tsx`

Current behavior:

- Renders a React popup.
- Opens the options page.
- Reads the focus-mode default from extension storage.

Target focus-mode behavior:

- Replace demo badge controls with a focus-mode switch.
- Show current status: active, disabled, or temporarily disabled.
- Provide quick disable buttons after the setting exists.
- Link to options.

### Options Page

Files:

- `options.html`
- `src/options.tsx`

Current behavior:

- Renders a React options page.
- Reads extension name and version from the manifest.
- Persists the focus-mode default in extension storage.

Target focus-mode behavior:

- Configure manual playlists for the MVP.
- Configure default focus mode.
- Configure temporary disable durations.
- Later, configure OAuth, persona prompts, and optional API keys.

### Background Service Worker

File:

- `src/background.ts`

Current behavior:

- Ensures the settings object exists on install.

Target focus-mode behavior:

- Listen for storage changes.
- Own cross-surface message routing where needed.
- Coordinate YouTube OAuth in Phase 2.
- Fetch and cache YouTube Data API responses in Phase 2.
- Call opt-in AI providers in Phase 3.

### Content Script

Files:

- `content-script/src/main.tsx`
- `content-script/src/App.tsx`

Current behavior:

- Injects a host element with id `extension-root`.
- Attaches a Shadow DOM root.
- Injects `@lib/styles/globals.css` as inline CSS into the Shadow DOM.
- Watches YouTube SPA URL changes.
- Marks the route state on the host element and renders a small focus-ready status only on the YouTube home route when focus mode is active.

Target focus-mode behavior:

- Keep the Shadow DOM approach to prevent Tailwind Preflight from leaking into YouTube.
- Detect YouTube SPA route changes.
- Only alter the YouTube home route in Phase 1.
- Hide or replace recommendation surfaces when focus mode is active.
- Render the focus overlay into the Shadow DOM.
- Avoid duplicate extension roots across YouTube route changes.

## Vite And CRXJS Build Flow

`vite.config.ts` uses:

```ts
plugins: [react(), crx({ manifest })]
```

It also registers separate Rollup inputs for:

- `index.html`
- `options.html`

The manifest directly references:

- `src/background.ts` as the module service worker.
- `content-script/src/main.tsx` as the content script.
- `index.html` as the popup.
- `options.html` as the options page.

This means implementation should edit the existing template entrypoints rather than introducing WXT-style `entrypoints/` folders.

## Manifest Direction

Current MVP manifest:

- Name: `YouTube Focus Extension`
- Permission: `storage`
- Content script match: `https://www.youtube.com/*`
- Popup: `index.html`
- Options page: `options.html`
- Background service worker: `src/background.ts`

Upcoming manifest guidance:

- Keep `activeTab` or `tabs` out unless popup-to-active-tab messaging becomes necessary.
- Do not add `identity` until Phase 2 OAuth work begins.

Permission reason: `storage` is required for the focus-mode default, manual playlist shortcuts, and temporary-disable state. Do not add future permissions early.

## Settings Storage

MVP settings are stored under `youtubeFocusSettings` in `chrome.storage.sync` because the data is small user preference data that can follow the browser profile. Defaults are conservative:

- `focusModeEnabled`: `false`
- `manualPlaylists`: `[]`
- `disabledUntil`: `null`

Manual playlist shortcuts are capped at three entries for the MVP. The temporary-disable field exists for T010 but is not exposed as a full UI yet.

## Runtime Data Flow

```text
Options page or popup
  -> reads/writes chrome.storage.sync settings
  -> background ensures defaults on install
  -> content script reacts to storage and URL changes
  -> YouTube DOM is restored or replaced based on active settings

Phase 2 API flow:
Options page
  -> requests YouTube sign-in
  -> background uses Chrome identity API
  -> background fetches playlists and Watch Later data
  -> background writes normalized cache
  -> content script reads cached display data

Phase 3 AI flow:
Options page
  -> user opts in and saves provider settings
  -> background generates short mentor message or image
  -> background writes daily/session cache
  -> content script displays cached result
```

## Planned Source Organization

Use the template layout and add feature modules under `src/` or `lib/` as the implementation grows.

```text
src/
  App.tsx                 # Popup app
  background.ts           # Service worker
  main.tsx                # Popup mount
  options.tsx             # Options app
  settings/
    defaults.ts
    schema.ts
    storage.ts
    selectors.ts
  youtube/
    dom.ts
    api.ts
    oauth.ts
    normalize.ts
  ai/
    mentor.ts
    images.ts
    cache.ts

content-script/
  src/
    App.tsx               # Focus overlay app
    main.tsx              # Shadow DOM mount
    youtubeHome.ts        # Route and container detection
    feedVisibility.ts     # Hide/restore recommendation DOM

lib/
  components/
    Button.tsx
    Switch.tsx
    TextInput.tsx
  styles/
    globals.css
```

Keep reusable UI primitives in `lib/components`. Keep extension settings and provider logic in `src/` so popup, options, and background code can share it. Keep DOM-specific YouTube page mutation code inside `content-script/`.

## Storage Model

Use a small wrapper over `chrome.storage.sync` and `chrome.storage.local`.

Recommended split:

- `chrome.storage.sync`: user preferences that should follow the user across browsers.
- `chrome.storage.local`: cached YouTube API results, generated AI content, and larger transient data.

Initial settings shape:

```ts
type FocusModeSettings = {
  focusModeEnabled: boolean;
  defaultFocusModeEnabled: boolean;
  disabledUntil?: string;
  selectedPlaylists: Array<{
    id: string;
    title: string;
    url: string;
    order: number;
  }>;
  watchLaterUrl: string;
  temporaryDisableMinutes: number[];
  persona: {
    mode: "none" | "preset" | "custom";
    presetId?: "strict-coach" | "calm-monk" | "creative-director";
    customPrompt?: string;
  };
  integrations: {
    youtubeOAuthEnabled: boolean;
    aiTextEnabled: boolean;
    aiImageEnabled: boolean;
    textProvider?: "gemini" | "openai" | "other";
    imageProvider?: "nano-banana" | "other";
  };
};
```

Cache shape:

```ts
type FocusModeCache = {
  playlists?: {
    updatedAt: string;
    items: Array<{
      id: string;
      title: string;
      url: string;
      thumbnailUrl?: string;
      videoCount?: number;
    }>;
  };
  watchLater?: {
    updatedAt: string;
    url: string;
    videos: Array<{
      id: string;
      title: string;
      url: string;
      thumbnailUrl?: string;
    }>;
  };
  mentorMessage?: {
    cacheKey: string;
    updatedAt: string;
    text: string;
  };
  mentorImage?: {
    cacheKey: string;
    updatedAt: string;
    dataUrl?: string;
    remoteUrl?: string;
  };
};
```

## YouTube DOM Strategy

YouTube is a single-page app, so normal page-load assumptions are not enough.

Phase 1 content-script behavior:

1. Mount the extension root once.
2. Watch for URL changes caused by YouTube client-side navigation.
3. Treat `https://www.youtube.com/` and `https://www.youtube.com/?...` as the home route.
4. When focus mode is active on the home route, hide or replace the recommendation feed container.
5. When focus mode is inactive or the route changes away, restore the original page.
6. Render the focus overlay with links from storage.

Recommended DOM approach:

- Prefer hiding containers with a reversible data attribute and inline style.
- Avoid permanently removing YouTube nodes in the MVP.
- Keep a single restore function for every mutation.
- Use defensive selectors because YouTube DOM changes often.

## API Strategy

### Phase 1

Use manual playlist URLs. This proves the YouTube route and DOM behavior without OAuth, quotas, or API fragility.

### Phase 2

Use YouTube Data API v3 through OAuth. The `identity` permission and YouTube readonly scope should be added in the same task that implements OAuth.

Scope:

```text
https://www.googleapis.com/auth/youtube.readonly
```

Handle:

- OAuth failure
- token expiration
- API quota errors
- pagination
- no playlists
- manual fallback

### Phase 3

Use opt-in text and image generation. Users provide their own API keys. Cache generated content daily or per session.

## Privacy Strategy

- Store settings in browser extension storage.
- Do not collect analytics by default.
- Do not send playlist data to AI providers unless the user explicitly enables the relevant integration.
- Keep provider keys in extension storage only after explaining the tradeoff to the user.
- Keep external API calls in the background service worker.
- Request the smallest practical YouTube OAuth scope.

## Testing Strategy

Use the template's Playwright setup as the first test foundation.

Existing test:

- `tests/preflight-isolation.spec.ts` verifies that Shadow DOM prevents Tailwind Preflight from leaking into host pages.

Add as work progresses:

- unit tests for settings defaults and storage merging
- unit tests for URL/home-route detection
- unit tests for reversible DOM hide/restore helpers
- Playwright checks for overlay isolation
- manual Chrome extension verification against YouTube

## Main Architectural Decision

Use the cloned CRXJS/Vite template as the implementation base, keep its Shadow DOM content-script isolation, and build the MVP around manual playlists before adding OAuth or AI providers.

Reason: the template already supplies the popup, options page, background worker, content-script overlay, Tailwind styling, and MV3 build path. The core product risk is reliable YouTube DOM behavior, so OAuth and AI should remain later layers.
