# YouTube Focus Extension

Planning and implementation tracker for a browser extension that replaces the YouTube home recommendation feed with user-chosen playlists, Watch Later access, and optional mentor-style prompts.

## Current Direction

Build the MVP on top of the cloned `yosevu/react-chrome-extension-template` starter.

The current stack is React 19, TypeScript, Vite, CRXJS, Tailwind CSS, Chrome Manifest V3, npm, and Node 24+. The upstream template README is preserved as `TEMPLATE_README.md`.

## Recommended Build Order

1. Install template dependencies with npm.
2. Add the YouTube content-script match pattern and the storage permission.
3. Implement storage schema and defaults.
4. Inject a content script on `https://www.youtube.com/*`.
5. Hide or replace the YouTube home recommendation feed only when focus mode is active.
6. Render the focus overlay with Watch Later and manually configured playlists.
7. Add popup toggle for focus mode.
8. Add options page for playlist input, default focus mode, temporary disable settings, and later API keys.
9. Package and manually verify in Chrome.
10. Add OAuth, YouTube API fetching, persona messages, AI imagery, and cross-browser polish after the MVP is stable.

## Document Map

- [architecture.md](architecture.md) - extension structure, data flow, permissions, storage, and module layout.
- [google-cloud-setup.md](google-cloud-setup.md) - Google Cloud, OAuth client, extension ID, and YouTube Data API prerequisites for playlist import.
- [roadmap.md](roadmap.md) - phase plan, milestones, and what to build now versus later.
- [tasks.md](tasks.md) - agent-trackable task board with priorities, dependencies, and acceptance criteria.
- [progress.md](progress.md) - current status, implementation log, and decision history.
- [AGENTS.md](AGENTS.md) - working rules for future coding agents inside this project directory.

## Status

Current stage: Phase 1 implementation is complete through temporary pause and unpacked packaging, with live Chrome manual verification still pending.

Next concrete action: T012 - run the live Chrome developer-mode verification pass against YouTube, then return to T104 cache work.

## Phase 1 Local Load

For the manual-playlist MVP, a Phase 1 build does not require `GOOGLE_CLIENT_ID`.

Local Chrome workflow:

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Turn on Developer Mode.
4. Choose `Load unpacked`.
5. Select the generated `dist/` folder.
