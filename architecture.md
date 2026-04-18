# Architecture

## Goal

Replace YouTube's recommendation-first home page with an intentional viewing surface that points the user toward Watch Later and selected playlists.

The project now uses the cloned `yosevu/react-chrome-extension-template` starter. The architecture should follow that template instead of the earlier WXT plan.

## Current Template Stack

- Starter: `yosevu/react-chrome-extension-template`
- Browser extension model: Chrome Manifest V3
- Build system: Vite 6 with `@crxjs/vite-plugin`
- UI: React 19 + TypeScript
- Styling: Tailwind CSS 3 + `shadcn/ui` primitives for extension-owned React surfaces
- Shared styles/components: `lib/` for global styles and `src/components/ui` for shadcn-backed popup/options primitives
- Content script isolation: Shadow DOM with injected Tailwind CSS
- Background runtime: Chrome extension service worker
- Options page: separate `options.html` Vite entry
- Tests: Playwright
- Package manager: npm
- Required runtime from template: Node 24+, npm 11+

## Template Files Now In This Directory

```text
youtube-focus-extension/
  components.json
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
      feedVisibility.ts
      focusBanner.ts
      main.tsx
      urlChanges.ts
      youtubeHomeBanner.ts
      youtubeMasthead.ts
      youtubeHome.ts
  src/
    App.tsx
    background.ts
    components/
      ui/
        button.tsx
        card.tsx
        input.tsx
        label.tsx
        badge.tsx
        separator.tsx
        scroll-area.tsx
        switch.tsx
    lib/
      utils.ts
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
    feed-visibility.spec.ts
    focus-banner.spec.ts
    youtube-home-banner.spec.ts
    preflight-isolation.spec.ts
    youtube-masthead.spec.ts
    youtube-route.spec.ts
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
- Reads the focus-mode state from extension storage.
- Lets the user toggle Focus Mode directly from the popup with the same shared setting used by the content script.

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
- Lets the user add, edit, remove, and reorder up to three manual playlist shortcuts with inline validation.

Target focus-mode behavior:

- Configure manual playlists for the MVP.
- Configure default focus mode.
- Configure temporary disable durations.
- Later, configure user-initiated YouTube OAuth, import-led onboarding states, persona prompts, and optional API keys.

### Background Service Worker

File:

- `src/background.ts`

Current behavior:

- Ensures the settings object exists on install.

Target focus-mode behavior:

- Listen for storage changes.
- Own cross-surface message routing where needed.
- Coordinate YouTube OAuth in Phase 2.
- Fetch and cache authenticated YouTube playlist data in Phase 2.
- Handle auth success, auth cancel, auth failure, token expiry, token revocation, and reconnect flows without blocking manual setup.
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
- Moves the Shadow DOM host into YouTube's masthead center, beside the search controls.
- Renders a Focus Mode pill switch that persists the global focus-mode setting.
- Uses a separate Shadow DOM host for the home-route status banner so the banner sits before the YouTube home feed instead of inside the masthead.
- Shows off/on visual states with inline banner icons; product images are style references, not rendered UI assets.
- Suppresses the native YouTube home recommendation feed, chip bar, and rich sections only while Focus Mode is active on the home route.
- Marks the route state on the host element for later feed behavior.

Target focus-mode behavior:

- Keep the Shadow DOM approach to prevent Tailwind Preflight from leaking into YouTube.
- Detect YouTube SPA route changes.
- Keep the masthead focus toggle placed after YouTube search controls without duplicate hosts.
- Only alter the YouTube home route in Phase 1.
- Hide or replace recommendation surfaces when focus mode is active.
- Render the focus overlay into the Shadow DOM.
- Avoid duplicate extension roots across YouTube route changes.
- Do not fetch private YouTube account data directly from the page.
- Do not scrape YouTube account playlists from the logged-in UI; imported playlist data must come from authenticated background-worker API flows.

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

Alias contract:

- `@/*` resolves app code under `src/`, including `@/components/ui/*` and `@/lib/utils`.
- `@lib/*` remains pointed at the top-level `lib/` directory for shared styles such as `@lib/styles/globals.css`.

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
- When `T102` starts, add the manifest `oauth2` block and keep the extension ID stable with a manifest `key`.

Permission reason: `storage` is required for the focus-mode default, manual playlist shortcuts, and temporary-disable state. Do not add future permissions early.

## Settings Storage

MVP settings are stored under `youtubeFocusSettings` in `chrome.storage.sync` because the data is small user preference data that can follow the browser profile. Defaults are conservative:

- `focusModeEnabled`: `false`
- `manualPlaylists`: `[]`
- `disabledUntil`: `null`

Manual playlist shortcuts are capped at three entries for the MVP. The temporary-disable field exists for T010 but is not exposed as a full UI yet.

No-auth mode supports only manual playlist URLs and local focus preferences. Importing a user's playlists is authenticated data access and must not be implied before OAuth succeeds.

OAuth prerequisites are documented in [google-cloud-setup.md](google-cloud-setup.md). That document is the source of truth for Google Cloud project setup, stable extension ID, OAuth client creation, enabled APIs, and the initial read-only scope.

## Runtime Data Flow

```text
Options page or popup
  -> reads/writes chrome.storage.sync settings
  -> background ensures defaults on install
  -> content script reacts to storage and URL changes
  -> masthead toggle updates the same stored focus setting
  -> YouTube DOM is restored or replaced based on active settings

Phase 2 API flow:
Options page
  -> offers Connect YouTube from onboarding or settings
  -> background uses Chrome identity API
  -> on auth success, background fetches authenticated playlist data
  -> background writes normalized cache
  -> content script reads cached display data
  -> on auth cancel or failure, options stay usable with manual playlist URLs
  -> on token expiry or revocation, UI shows reconnect path and retains manual fallback

Phase 2 import boundaries:
- User playlists cannot be imported without Google authorization.
- The extension must not promise automatic playlist import at install time.
- Watch Later may require shortcut or fallback behavior instead of API-backed imported data.
- If imported playlist caches grow beyond small preference storage, keep them separate from the sync settings object.

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

Keep reusable popup/options UI primitives in `src/components/ui` so shadcn-generated source stays inside the React app tree. Keep `lib/styles/globals.css` as the shared Tailwind + theme-token stylesheet. Keep extension settings and provider logic in `src/` so popup, options, and background code can share it. Keep DOM-specific YouTube page mutation code inside `content-script/`.

The current shadcn scope is intentionally limited to extension-owned React surfaces:

- Popup and options use shared shadcn-backed primitives.
- The YouTube content-script UI stays custom for now because it renders inside a Shadow DOM host and is tuned to native YouTube chrome rather than the extension settings aesthetic.

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
