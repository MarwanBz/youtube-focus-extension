# Roadmap

## Prioritization Model

- P0: required for the extension to work as a focus-mode MVP.
- P1: important for real user value after the MVP works.
- P2: polish, convenience, or optional engagement.
- P3: defer until the core product is stable.

## Build Now

Phase 1 is the only "build now" scope.

The MVP should use manual playlist input instead of OAuth. The extension is successful if it can replace the YouTube home feed with a clean overlay that links to Watch Later and selected playlists, and if the user can turn it on or off.

## Build Next

Phase 2 starts only after the MVP is manually verified in Chrome.

This phase adds import-led onboarding through YouTube OAuth, authenticated playlist fetching, resilient fallback UI, and cross-browser build scripts.

Current priority override: the product now treats this onboarding/import track as the official next implementation lane, ahead of the remaining Phase 1 temporary-disable and packaging tasks.

## Build Later

Phase 3 and Phase 4 are intentionally deferred.

Persona prompts, AI messages, AI images, stats, themes, and store publishing are valuable only after the extension reliably changes YouTube behavior without breaking normal browsing.

## Phase 1 - MVP Focus Mode

Target: weeks 1-2.

Deliverables:

- React Chrome Extension Template scaffold with Vite, CRXJS, React, TypeScript, and Tailwind.
- Manifest targets YouTube pages.
- Content script detects YouTube home page.
- Focus mode hides or replaces recommendation feed.
- Overlay shows Watch Later and up to three manually selected playlists.
- Popup toggles focus mode.
- Options page stores manual playlist settings.
- Settings persist across browser sessions.
- Chrome MV3 build can be loaded locally.

Exit criteria:

- Extension builds.
- Local Chrome load works.
- YouTube home recommendations disappear only when focus mode is active.
- Popup toggle and options settings update persisted state.
- Manual playlist links open correctly.

## Phase 2 - YouTube API And Improved UI

Target: weeks 3-4.

Named milestone: Import-Led Onboarding.

Priority order inside this phase:

1. Primary path: Connect YouTube and import the user's playlists through OAuth.
2. Secondary path: Add the current playlist from a YouTube playlist page without OAuth.
3. Fallback path: manual playlist URLs remain available, but they are not the preferred setup experience.

Deliverables:

- Google Cloud OAuth credentials documented.
- `identity` permission added only when OAuth work starts.
- YouTube readonly OAuth flow implemented from onboarding or settings, not automatically on install.
- User journey is: connect YouTube, fetch playlists, search and select or reorder up to three playlists, then continue with Add current playlist or manual setup if auth fails or is skipped.
- Authenticated playlist import is available only after OAuth succeeds; no-auth mode remains manual playlist URLs only.
- The no-auth bridge is Add current playlist from a YouTube playlist page before falling back to manual URL entry.
- Playlist fetch handles pagination, empty libraries, revoked tokens, and reconnect flows.
- Watch Later is treated as a product shortcut or fallback surface, not guaranteed imported API data.
- Options page lets user choose and order playlists from authenticated data when available and shows manual fallback when it is not.
- Overlay design polished for desktop and responsive widths.
- Chrome and Firefox build scripts documented.

Exit criteria:

- Authenticated user can fetch playlists after completing OAuth.
- User can skip, cancel, retry, or recover from auth failure without blocking onboarding completion.
- Add current playlist works without OAuth when the user is already on a YouTube playlist page.
- Manual fallback still works if OAuth fails, is skipped, or is disabled.
- Large playlist libraries remain usable with search, selection, and ordering.
- Empty playlist accounts show a useful state and manual fallback.
- API errors are visible in a useful local debug path.
- Cross-browser packaging commands are documented.

## Phase 3 - Persona And AI Content

Target: weeks 5-6.

Deliverables:

- Persona presets and custom prompt settings.
- Optional text generation provider integration.
- Short mentor messages under about 30 words.
- Session or daily message cache.
- Optional AI image provider integration.
- Daily or per-playlist image cache.
- Fallback copy and fallback image behavior.

Exit criteria:

- AI features are opt-in.
- API keys are configured from options.
- No AI API calls happen when disabled.
- Generated content is cached to avoid repeated calls.
- Overlay remains usable if AI providers fail.

## Phase 4 - Advanced Features And Quality

Target: weeks 7-8.

Deliverables:

- Temporary disable by duration, time, or schedule.
- Optional friction features outside the home page, such as Shorts hiding or thumbnail blur.
- Watch Later count and lightweight personal nudges.
- Mood presets and themes.
- Store assets, screenshots, privacy policy, and permission explanation.
- README, contribution guide, license, and release checklist.

Exit criteria:

- Advanced features do not make the MVP brittle.
- Privacy policy and permission explanations are ready for store review.
- Release package is reproducible.

## Deferred Until Explicitly Needed

- Sentry or remote error logging.
- AI image generation.
- YouTube history or partially watched video support.
- Detailed behavior analytics.
- Full theme system.
- Store publishing work.

These are deferred because they increase privacy, cost, permission, or maintenance burden before the core focus behavior is proven.
