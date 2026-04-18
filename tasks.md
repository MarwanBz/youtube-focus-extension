# Task Board

Status values: `Todo`, `Doing`, `Blocked`, `Done`, `Deferred`.

Priority values: `P0`, `P1`, `P2`, `P3`.

## Current Rule

Work top to bottom within Phase 1 unless a task is blocked. Do not start Phase 2 until Phase 1 exit criteria in `roadmap.md` are met.

Current override: product priority now favors OAuth-first onboarding work. `T010` through `T012` stay open, but the official next track is `T100` through `T106B`.

## Phase 1 - MVP Focus Mode

| ID | Status | Priority | Task | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| T001 | Done | P0 | Scaffold from `yosevu/react-chrome-extension-template` | None | Template files are present; dependencies installed; build, lint, and Playwright checks were run. |
| T002 | Done | P0 | Configure manifest for YouTube content script | T001 | Content script runs on `https://www.youtube.com/*`; minimal permissions are declared. |
| T003 | Done | P0 | Add settings schema and storage wrapper | T001 | Defaults exist; settings can be read and written from popup/options/content code. |
| T004 | Done | P0 | Detect YouTube home route in content script | T002 | Content script can distinguish home page from watch, shorts, search, and playlist pages. |
| T004A | Done | P0 | Add YouTube masthead focus toggle | T003, T004 | Focus toggle appears next to the YouTube search controls, matches YouTube chrome, persists active/inactive state, and does not duplicate across route changes. |
| T004B | Done | P0 | Match masthead toggle + top banner to product design references | T004A | Toggle uses pill switch styling, banner matches off/on reference states on home route, and icon style follows product image references. |
| T005 | Done | P0 | Hide or replace recommendation feed when focus mode is active | T003, T004 | Recommendations are removed or hidden only when enabled; disabled mode restores normal behavior. |
| T006 | Done | P0 | Render React focus overlay in content script | T005 | Overlay mounts once, survives YouTube route changes, and does not duplicate containers. |
| T007 | Done | P0 | Display Watch Later and manual playlists | T003, T006 | Overlay shows Watch Later plus up to three selected playlist links. |
| T008 | Done | P0 | Build popup focus toggle | T003 | Popup switch persists focus mode and updates active YouTube tab behavior. |
| T009 | Done | P0 | Build options page for manual playlist settings | T003 | User can add, edit, remove, and order manual playlist entries. |
| T010 | Todo | P0 | Add temporary disable setting foundation | T003, T008 | Settings model supports disabled-until behavior even if UI is basic. |
| T011 | Todo | P0 | Package Chrome MV3 build | T001-T010 | Build output can be loaded in Chrome developer mode. |
| T012 | Todo | P0 | Manual MVP verification | T011 | Verification notes in `progress.md` cover enabled, disabled, route-change, and playlist-link behavior. |

## Phase 2 - YouTube API And Improved UI

| ID | Status | Priority | Task | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| T100 | Done | P1 | Define OAuth-first onboarding and fallback lanes | T012 | Onboarding makes Connect YouTube the primary setup path, Add current playlist the secondary no-auth bridge, and manual URL entry the last-resort fallback. |
| T101 | Done | P1 | Document Google Cloud setup | T100 | OAuth client setup and required scopes are documented. |
| T102 | Done | P1 | Add OAuth flow with Chrome identity API | T101 | User can sign in and receive a YouTube readonly access token from onboarding or settings without launching auth automatically on install. |
| T102A | Done | P1 | Add OAuth failure and manual fallback states | T102 | User can skip, cancel, fail, retry, or reconnect YouTube auth; onboarding never blocks on auth; Add current playlist and manual playlist setup remain available. |
| T103 | Done | P1 | Fetch playlists with YouTube Data API | T102 | Authenticated playlist fetch starts only after OAuth succeeds; options can list the authenticated user's playlists; empty, paginated, revoked-token, and unavailable-playlist states are handled without implying import works before authorization. |
| T104 | Todo | P1 | Add API pagination and cache | T103, T105 | Large playlist sets load without repeated unnecessary requests. |
| T104A | Done | P1 | Cache selected-playlist preview items for Focus Home | T103, T104, T105 | Background fetches and caches lightweight playlist-item preview data for selected imported playlists so Focus Home can render video-thumbnail shelves without scraping YouTube pages. |
| T105 | Done | P1 | Improve playlist selection UI | T103 | User can search, choose, and reorder playlists from authenticated cached results; the dropdown or checklist appears only when authenticated playlist data exists; otherwise the UI shows reconnect plus fallback paths and privacy copy that avoids implying automatic account access. |
| T106 | Todo | P1 | Build import-led onboarding flow | T100, T102, T103, T105 | Onboarding starts with Connect YouTube, then fetch, search, select, and reorder up to three playlists, while preserving fallback exits when auth fails or is skipped. |
| T106A | Todo | P1 | Add current-playlist quick capture without OAuth | T012 | When the user is on a YouTube playlist page, the extension offers Add this playlist and saves it into Focus Home without requiring Google sign-in. |
| T106B | Todo | P1 | Fetch Watch Later or provide supported fallback | T102 | Watch Later display uses real data only when supported; otherwise the product shows a clearly labeled shortcut or fallback instead of promising imported Watch Later API data. |
| T107 | Todo | P2 | Add continue watching research spike | T102 | Feasibility and privacy constraints are documented before implementation. |
| T108 | Todo | P2 | Polish overlay responsiveness and states | T012 | Overlay handles narrow widths, empty states, loading, and errors. |
| T108A | Done | P2 | Render Focus Home playlists as native-like cards | T105 | Focus Home shows Watch Later plus playlist cards with thumbnail-led styling for imported playlists, graceful fallbacks for manual playlists, and stable responsive grid behavior. |
| T108B | Done | P2 | Render Focus Home playlist shelves with video thumbnails | T104A, T108A | Focus Home shows each selected imported playlist as a titled shelf with thumbnails from videos inside that playlist, while Watch Later and manual playlists keep a clear fallback treatment when preview data is unavailable. |
| T109 | Todo | P2 | Add cross-browser build scripts | T012 | Chrome and Firefox build commands are documented and tested. |

## Phase 3 - Persona And AI Content

| ID | Status | Priority | Task | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| T201 | Deferred | P2 | Add persona preset settings | T012 | User can choose preset or custom prompt; no AI API calls yet. |
| T202 | Deferred | P2 | Add text generation provider settings | T201 | API key and provider settings are stored only after opt-in. |
| T203 | Deferred | P2 | Generate cached mentor messages | T202 | Messages are short, cached, and fail closed without breaking overlay. |
| T204 | Deferred | P3 | Add optional AI image provider settings | T201 | User can opt in to image generation separately from text. |
| T205 | Deferred | P3 | Generate and cache AI images | T204 | Images cache daily or per playlist; fallback appears on failure. |

## Phase 4 - Advanced Features And Release

| ID | Status | Priority | Task | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| T301 | Todo | P2 | Expand temporary disable controls | T010 | User can disable for X minutes or until a selected time. |
| T302 | Deferred | P3 | Add scheduled breaks | T301 | Schedule works without surprising the user. |
| T303 | Deferred | P3 | Add friction outside home page | T012 | Shorts hiding or thumbnail blur is opt-in and reversible. |
| T304 | Deferred | P3 | Add personal nudges and counts | T103, T104 | Counts are local, understandable, and privacy-preserving. |
| T305 | Deferred | P3 | Add mood presets and themes | T108 | Themes do not reduce readability or accessibility. |
| T306 | Todo | P2 | Prepare store publishing assets | Stable release | Icons, screenshots, privacy policy, and permission statement exist. |
| T307 | Todo | P2 | Prepare open-source release docs | Stable release | README, license, contribution guide, and release checklist exist. |

## Backlog Triage

Build first:

- T001 through T009, then T100 through T106B, then T104A and T108B.

Temporarily deprioritized:

- T010 through T012 until the onboarding/import direction is established.

Build after MVP:

- T010 through T012, then the remaining Phase 2 polish and cross-browser work.

Defer:

- AI image generation.
- behavior analytics.
- theme presets.
- publishing.

Reason: these features add privacy, cost, quota, or maintenance risk before the core focus mode has been proven.
