# Task Board

Status values: `Todo`, `Doing`, `Blocked`, `Done`, `Deferred`.

Priority values: `P0`, `P1`, `P2`, `P3`.

## Current Rule

Work top to bottom within Phase 1 unless a task is blocked. Do not start Phase 2 until Phase 1 exit criteria in `roadmap.md` are met.

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
| T006 | Todo | P0 | Render React focus overlay in content script | T005 | Overlay mounts once, survives YouTube route changes, and does not duplicate containers. |
| T007 | Todo | P0 | Display Watch Later and manual playlists | T003, T006 | Overlay shows Watch Later plus up to three selected playlist links. |
| T008 | Todo | P0 | Build popup focus toggle | T003 | Popup switch persists focus mode and updates active YouTube tab behavior. |
| T009 | Todo | P0 | Build options page for manual playlist settings | T003 | User can add, edit, remove, and order manual playlist entries. |
| T010 | Todo | P0 | Add temporary disable setting foundation | T003, T008 | Settings model supports disabled-until behavior even if UI is basic. |
| T011 | Todo | P0 | Package Chrome MV3 build | T001-T010 | Build output can be loaded in Chrome developer mode. |
| T012 | Todo | P0 | Manual MVP verification | T011 | Verification notes in `progress.md` cover enabled, disabled, route-change, and playlist-link behavior. |

## Phase 2 - YouTube API And Improved UI

| ID | Status | Priority | Task | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| T101 | Todo | P1 | Document Google Cloud setup | T012 | OAuth client setup and required scopes are documented. |
| T102 | Todo | P1 | Add OAuth flow with Chrome identity API | T101 | User can sign in and receive a YouTube readonly access token. |
| T103 | Todo | P1 | Fetch playlists with YouTube Data API | T102 | Options page can list authenticated user's playlists. |
| T104 | Todo | P1 | Fetch Watch Later or provide supported fallback | T102 | Watch Later display is real when available or gracefully falls back. |
| T105 | Todo | P1 | Add API pagination and cache | T103, T104 | Large playlist sets load without repeated unnecessary requests. |
| T106 | Todo | P1 | Improve playlist selection UI | T103 | User can choose and reorder playlists from fetched results. |
| T107 | Todo | P2 | Add continue watching research spike | T102 | Feasibility and privacy constraints are documented before implementation. |
| T108 | Todo | P2 | Polish overlay responsiveness and states | T012 | Overlay handles narrow widths, empty states, loading, and errors. |
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

- T001 through T012.

Build after MVP:

- OAuth, real playlist fetching, better selection UI.

Defer:

- AI image generation.
- behavior analytics.
- theme presets.
- publishing.

Reason: these features add privacy, cost, quota, or maintenance risk before the core focus mode has been proven.
