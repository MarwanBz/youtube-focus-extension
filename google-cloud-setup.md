# Google Cloud Setup

This document defines the project setup required before implementing the
YouTube OAuth flow in `T102`.

## Goal

Prepare a Google Cloud project and Chrome extension OAuth client so the
extension can request a YouTube read-only token through `chrome.identity`.

Primary references:

- Chrome Extensions OAuth guide:
  https://developer.chrome.com/docs/extensions/how-to/integrate/oauth
- `chrome.identity` API:
  https://developer.chrome.com/docs/extensions/reference/api/identity
- Manifest `oauth2` key:
  https://developer.chrome.com/docs/extensions/reference/manifest/oauth2
- YouTube Data API authentication:
  https://developers.google.com/youtube/v3/guides/authentication
- YouTube `playlists.list`:
  https://developers.google.com/youtube/v3/docs/playlists/list

## What To Create

1. One Google Cloud project dedicated to this extension.
2. One OAuth client of type **Chrome Extension**.
3. One enabled API: **YouTube Data API v3**.
4. One OAuth scope for MVP import:
   `https://www.googleapis.com/auth/youtube.readonly`

No service account setup is needed. The YouTube Data API does not support
service accounts for normal user playlist access.

## Setup Steps

### 1. Keep a stable extension ID

Before creating the OAuth client, make sure the extension uses a consistent
ID across local development builds.

Chrome's OAuth guidance recommends:

1. Upload the extension package to the Chrome Developer Dashboard without
   publishing it.
2. Copy the extension public key from the dashboard.
3. Add that key to `manifest.json` using the `"key"` field.
4. Confirm the unpacked extension ID in `chrome://extensions` matches the
   dashboard item ID.

Reason: the OAuth client for a Chrome extension is tied to the extension ID.

### 2. Create or choose a Google Cloud project

In Google Cloud:

1. Create a new project for YouTube Focus Extension, or select an existing
   dedicated project.
2. Keep the project isolated from unrelated experiments so quota, consent,
   and credentials remain understandable.

### 3. Enable the API

Enable:

- **YouTube Data API v3**

No additional Google APIs are required for playlist import in the current
plan.

### 4. Configure the OAuth consent screen

Create the OAuth consent screen before creating credentials.

Recommended settings:

- App type: External unless this is truly limited to one organization
- App name: `YouTube Focus Extension`
- User support email: project owner email
- Developer contact email: project owner email

During development:

- add test users if Google requires it
- expect Google to show an unverified app warning until verification is
  completed for wider distribution

### 5. Create the OAuth client

Use the Chrome Extensions OAuth flow documented by Chrome:

1. Go to the Google Cloud **Clients** page.
2. Click **Create Client**.
3. Choose application type **Chrome Extension**.
4. Enter the extension ID from the stable manifest key setup.
5. Save the generated client ID.

Expected result:

- a client ID ending with `.apps.googleusercontent.com`

### 6. Record the values needed for implementation

`T102` will need:

- the OAuth client ID
- the final extension ID
- the chosen scope list

The planned MVP import scope is:

- `https://www.googleapis.com/auth/youtube.readonly`

### 7. Implementation handoff for `T102`

When `T102` starts, the extension should add:

- manifest permission: `identity`
- manifest `oauth2.client_id`
- manifest `oauth2.scopes`

The extension should then use `chrome.identity.getAuthToken()` for the
interactive sign-in flow.

## Constraints

- Do not add `identity` before `T102`.
- Do not add broader YouTube scopes unless a concrete feature requires them.
- Do not ask for write scopes for playlist import.
- Do not depend on API keys for the authenticated `mine=true` playlist flow.

## Expected Development Behavior

During local development, the team should expect:

- an unverified app screen until Google verification is completed
- auth failures if the extension ID and OAuth client ID do not match
- failures if the YouTube Data API is not enabled

Common setup issues to check first:

- wrong extension ID
- missing manifest `key`
- missing `identity` permission
- missing manifest `oauth2` block
- wrong OAuth client type
- YouTube Data API not enabled

## Out Of Scope

This task does not implement:

- the OAuth code path itself
- playlist fetching
- playlist picker UI
- onboarding UI
- token refresh UX

Those belong to `T102`, `T103`, `T105`, and `T106`.
