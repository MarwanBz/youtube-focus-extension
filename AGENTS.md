# Agent Instructions

This directory is for the YouTube Focus Extension project.

## Source Of Truth

Before implementation work, read these files in order:

1. `README.md`
2. `architecture.md`
3. `tasks.md`
4. `progress.md`

## Tracking Rules

- Update `tasks.md` when a task changes status.
- Update `progress.md` after every meaningful implementation step.
- Keep statuses limited to: `Todo`, `Doing`, `Blocked`, `Done`, `Deferred`.
- Keep priorities limited to: `P0`, `P1`, `P2`, `P3`.
- When adding a new feature, add a task ID before writing code.
- When deferring a feature, record why in `progress.md`.

## Implementation Rules

- Default framework: the cloned `yosevu/react-chrome-extension-template` stack: React + TypeScript + Vite + CRXJS + Tailwind.
- Do not switch this project back to WXT unless the user explicitly asks.
- Default MVP styling: Tailwind CSS with small local components. Add shadcn/ui only when the extra component system is justified.
- No new API integration until the manual-playlist MVP works.
- No AI feature work until YouTube API integration is stable.
- Minimize permissions and document every new permission in `architecture.md`.
- Store user preferences in extension storage. Do not send user data to external services unless the user explicitly enables the relevant integration.

## Verification Rules

For Phase 1, completion requires:

- Extension builds successfully.
- Extension loads in Chrome developer mode.
- Focus mode hides or replaces YouTube home recommendations.
- Popup toggle updates the content script without a reload when possible.
- Options page persists playlist settings.
- Default/off state does not break normal YouTube browsing.

Record verification evidence in `progress.md`.
