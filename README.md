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

Current stage: Phase 1 foundation complete through feed suppression on the YouTube home route.

Next concrete action: T102 - implement the Chrome identity OAuth flow now that the onboarding direction and Google Cloud setup are documented.
