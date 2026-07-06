# Bug 001 — Multi-account stale state on YouTube account switch

- **Status:** Open
- **Severity:** P1 (real product bug, edge case, degrades trust for multi-account users)
- **Date reported:** 2026-07-06
- **Reporter:** User
- **Owner:** Unassigned
- **Related tasks:** none yet

## Symptom

When a user has more than one YouTube/Google account signed in and switches between accounts on YouTube, the extension continues to show the **previous account's** playlists, channel shelves, and (in some cases) settings. The Focus Home overlay and options page do not reflect the newly selected account until the user manually disconnects and reconnects YouTube — and even then, stale cached data can remain visible.

## Reproduction

### Case A — switch to another signed-in account with playlists

1. Sign in to YouTube with **Account A** in Chrome.
2. Open the extension options, click **Connect YouTube**, complete OAuth.
3. Import a few playlists and select a couple of channels. Confirm Focus Home shows Account A's shelves.
4. Without touching the extension, switch the active YouTube account to **Account B** via the YouTube avatar menu (top-right).
5. Open a new YouTube home tab, or navigate to `/`.

**Expected:** Focus Home shows Account B's playlists/subscriptions/channels (or shows a clear "reconnect to refresh" state if Account B was never connected).

**Actual:** Focus Home shows Account A's imported playlists and selected channel shelves. The options page still shows Account A as "Connected" with Account A's playlists selected. Manual playlist shortcuts and focus-mode preference also carry over unchanged.

### Case B — switch to a logged-out account or an account with no YouTube channel

Reported by the user. This is the sharper edge case.

1. Connect Account A (has playlists + a channel). Confirm Focus Home shows Account A's shelves.
2. Switch to **Account C** on YouTube — either an account with **no YouTube channel created**, or sign out of YouTube entirely on that profile.
3. Open a new YouTube home tab.

**Expected:** The extension either shows nothing (no data for Account C) or shows a "reconnect" / "this account has no channel" state.

**Actual:** Focus Home still shows Account A's playlists and channel shelves. Even though Account C has no channel (YouTube's API would return 403 `channel_required` — see `src/youtube/api.ts:132-139` `isChannelMissingError`) or is fully logged out, the extension never re-fetches, so it never hits that API response. It renders whatever is sitting in the unscoped `chrome.storage.local` keys from Account A's last successful fetch.

**Why this is worse than Case A:** In Case A, a naive fix (re-fetch on account switch) would at least return Account B's real data. In Case B, the extension would re-fetch and immediately hit `channel_required` or an auth error — but the **current code never re-fetches at all**, so the user sees Account A's data indefinitely until they manually disconnect and reconnect. The cached data has no expiry and no invalidation trigger.

## Root cause

Two compounding bugs, both confirmed in code:

### Cause 1 — The OAuth token is persisted locally and reused indefinitely

The user correctly diagnosed this. `chrome.identity.getAuthToken({ interactive: true }, ...)` (`src/background.ts:749`) is called **once**, inside `connectYouTube` (`src/background.ts:185`). The returned token is written to `chrome.storage.local` under `youtubeFocusAuth.accessToken` (`src/background.ts:190`). Every subsequent YouTube Data API call reads that token **from storage**, not from a fresh `getAuthToken` call:

- `fetchYouTubePlaylists(authState.accessToken)` — `src/background.ts:451`
- `fetchYouTubeSubscriptions(authState.accessToken)` — `src/background.ts:509`
- `fetchYouTubePlaylistPreview(authState.accessToken, ...)` — `src/background.ts:563`
- `fetchYouTubeChannelVideos(authState.accessToken, ...)` — `src/background.ts:623`

All four read `authState.accessToken` from `youtubeFocusAuth` (`src/youtube/storage.ts`-style modules) and pass it as `Authorization: Bearer ${accessToken}`. So once Account A connects, Account A's token lives in `chrome.storage.local` and is reused for every API call until the user explicitly clicks Disconnect (`src/background.ts:384-393` calls `removeCachedAuthToken` and clears the stored token). There is **no token refresh, no token re-validation, and no per-request `getAuthToken`**. Account switches on YouTube do not touch the stored token.

### Cause 2 — `chrome.identity.getAuthToken` is Chrome-sync-scoped, not YouTube-session-scoped

This is the deeper issue. `chrome.identity.getAuthToken` returns a token for the **Google account configured in Chrome's sync settings**, not for the account currently active in the YouTube.com session. YouTube's account switcher (avatar menu, top-right) switches the **YouTube cookie session** but does **not** change which account Chrome's identity API authenticates as.

So even if the extension called `getAuthToken` fresh on every request, it would still get Account A's token while the user browses YouTube as Account B. The extension's authenticated data is **always scoped to the Chrome sync account**, never to the YouTube session account. The two accounts can be (and usually are) different once the user uses YouTube's account switcher.

### Cause 3 — No account-switch detection + unscoped cached data

On top of the token mismatch, the cached per-account data (playlists, subscriptions, channel previews) lives under single global storage keys that are not namespaced by account ID. The content script watches SPA URL changes only (`content-script/src/urlChanges.ts`); YouTube account switches via the avatar menu do not reliably trigger a YouTube SPA navigation, and even when they do, no code path treats an account change as a signal to invalidate cached data. So the extension renders whatever is in storage — Account A's playlists — regardless of which YouTube session is active.

The affected keys (all defined in `src/`):

| Storage key | Schema file | What it holds | Account-scoped? |
|---|---|---|---|
| `youtubeFocusAuth` | `src/auth/schema.ts:1` | OAuth access token + `connected`/`uiState` | **No** |
| `youtubeFocusImportedPlaylists` | `src/youtube/schema.ts:1` | Imported playlist cache for the connected account | **No** |
| `youtubeFocusSubscriptions` | `src/youtube/subscriptions-schema.ts:1` | Subscribed channels list for the connected account | **No** |
| `youtubeFocusPlaylistPreviews` | `src/youtube/preview-schema.ts:1` | Per-playlist video thumbnail previews | **No** |
| `youtubeFocusChannelPreviews` | `src/youtube/channel-preview-schema.ts:6` | Per-channel latest-video previews | **No** |
| `youtubeFocusSettings` | `src/settings/schema.ts:11` | Manual playlists, selected channels, focus prefs | **No** (see "Design questions" below) |

None of the schemas track which account the data belongs to:
- `YouTubeAuthState` (`src/auth/schema.ts:14-19`) has `accessToken`, `connected`, `uiState`, `lastError` — no `accountId` / `channelId` / `profileName`.
- `YouTubePlaylistState`, `YouTubeSubscriptionState`, `YouTubePlaylistPreviewState`, `YouTubeChannelPreviewState` — none carry an account identifier.

Two compounding gaps on top of the causes above:

1. **No account-switch detection.** The content script only watches SPA URL changes (`content-script/src/urlChanges.ts`). YouTube account switches via the avatar menu do not reliably trigger a YouTube SPA navigation, and even when they do, no code path treats an account change as a signal to invalidate cached per-account data. The background service worker has no `chrome.identity`-based account tracking and no `onAccountChanged` listener (Chrome does not expose one).

2. **No re-fetch on account change.** `connectYouTube` in `src/background.ts:182` is the only path that calls `getAuthToken` and re-fetches playlists. It is triggered only by an explicit user click on "Connect YouTube." Account switches on YouTube do not trigger `connectYouTube`, so the cached data under the unscoped keys is never invalidated. The background settings subscription (`src/background.ts:121-125`) re-fetches on *settings* change but not on *account* change, because the account never appears in the settings shape.

3. **No diffing in the settings subscription.** `src/background.ts:121-125` re-fetches all playlists and channel previews on every settings change, but it does not detect "the connected account changed" because the account never appears in the settings shape. Combined with P0-5 in `TECH-DEBT.md` (17 API calls per toggle), this means account switches that *do* trigger a re-fetch still write results back to the unscoped key.

## Affected components

- `src/auth/schema.ts` — `YouTubeAuthState` has no account identifier.
- `src/auth/storage.ts` — single `AUTH_STORAGE_KEY`, no per-account namespace.
- `src/youtube/schema.ts`, `subscriptions-schema.ts`, `preview-schema.ts`, `channel-preview-schema.ts` — all per-account data shapes are unscoped.
- `src/youtube/storage.ts`, `subscriptions-storage.ts`, `preview-storage.ts`, `channel-preview-storage.ts` — all storage modules write to one global key.
- `src/background.ts:121-125` — settings subscription re-fetches on settings change but not on account change; no account-change signal exists.
- `src/background.ts:182` `connectYouTube` — re-fetches playlists on explicit reconnect but does not invalidate other cached surfaces.
- `content-script/src/urlChanges.ts` — watches URL changes only, no account-switch detection.
- `content-script/src/App.tsx` — Focus Home renders from cached storage; no "account changed, please reconnect" state.
- `src/options.tsx` — options page reads the same cached state; shows Account A as "Connected" after switching to Account B.

## Impact

- **Correctness:** Account A's imported playlists and channel shelves render while the active YouTube account is Account B. The user sees another account's data mixed into their current browsing context.
- **Privacy:** In a shared-device or family-account scenario, account A's imported playlist titles and channel names remain visible in the extension UI after switching to account B. The cached data is not cleared on account switch.
- **Trust:** The user perceives the extension as "stuck" on the old account. The only recovery path is manual disconnect + reconnect, and even that only refreshes the surface the user explicitly re-triggered.
- **Quota:** See `TECH-DEBT.md` P0-5 — re-fetches are already over-firing; adding account-aware re-fetches without fixing that will compound the quota burn.

## Design questions (open)

1. **Are manual playlist shortcuts and focus-mode preferences per-account or per-browser-profile?** The user reported "settings show up from the previous account," which suggests they expect these to switch too. But manual playlist URLs are account-agnostic (a URL like `https://www.youtube.com/playlist?list=PL...` works for any account that has access), and focus-mode on/off is a browser-level preference in most users' mental model. We need a product decision before scoping the fix:
   - **Option A:** Manual playlists + focus prefs stay browser-profile-wide (current behavior); only imported playlists/subscriptions/channel previews become per-account.
   - **Option B:** Everything becomes per-account; switching accounts fully resets the extension experience.
   - **Recommendation:** Option A. Manual URLs are intentional user-curated data, not account-derived data. Imported data is account-derived and must be per-account.

2. **`chrome.identity.getAuthToken` is Chrome-sync-scoped, not YouTube-session-scoped. This is the core constraint.** YouTube's account switcher changes the YouTube cookie session, but `chrome.identity.getAuthToken` always returns a token for the Google account configured in Chrome's sync settings. The two can be (and usually are) different once the user uses YouTube's account switcher. So the extension's authenticated YouTube Data API calls are **always** for the Chrome sync account, never for the YouTube session account. Options:
   - **Accept the mismatch and label it.** Show "Connected as <Chrome sync account title>" in the popup/options. The extension is scoped to the Chrome account, not the YouTube session. Users who want per-YouTube-account data must switch their Chrome sync account (or use a separate Chrome profile). Simplest, most honest, worst UX for multi-account YouTube users.
   - **Switch to `chrome.identity.launchWebAuthFlow` with YouTube's OAuth flow.** This authenticates against the YouTube session, not the Chrome sync account. The token returned would match the YouTube session account. More complex (we own the flow, the redirect, the token refresh), but it aligns the extension's data with what the user sees on YouTube.com. This is the only way to truly fix the bug for multi-account YouTube users.
   - **Detect the YouTube session account from the page and refuse to show stale data.** Read the active account's channel ID/name from YouTube's DOM (the avatar button exposes it) and compare against the connected account. If they mismatch, hide Focus Home shelves and show "Connected as <X>, but you're watching YouTube as <Y>. Reconnect to refresh." Does not fix the underlying data scoping, but stops the stale-data display.
   - **Recommendation:** short term, do the detection + hide + "reconnect to refresh" approach (third option). It stops the user from seeing another account's data, which is the privacy-critical part. Long term, move to `launchWebAuthFlow` (second option) so the extension's auth matches the YouTube session. The "accept the mismatch" option is not acceptable — the user's report confirms it reads as a bug, not a design choice.

3. **What happens to cached data when the account changes?** Two sub-options:
   - **Discard:** clear all per-account caches on detected account change; force a re-fetch. Simple, but loses Account A's cached data if the user switches back.
   - **Namespace per account:** key storage as `youtubeFocusImportedPlaylists:UCxxxxx` (channel ID of the connected account). Each account gets its own cache; switching back is instant. More complex, but correct.
   - **Recommendation:** namespace per account. Channel IDs are stable, and `chrome.storage.local` has ample quota for a few accounts' worth of playlist metadata. This also future-proofs against the schema-versioning gap in `TECH-DEBT.md` P0-4. Note: namespacing only makes sense after we switch to `launchWebAuthFlow` (question 2) — with the current `getAuthToken`, there is only ever one account (the Chrome sync account), so namespacing by YouTube session account would require a different auth source.

4. **Should the token be re-validated or refreshed per request instead of cached indefinitely?** Currently `getAuthToken` is called once at connect time and the token is reused from storage forever. At minimum, the token should be re-fetched (or at least re-validated) on each `connectYouTube` call, and the cached playlists/subscriptions should be treated as stale if the token has changed. This does not fix the `chrome.identity` scope mismatch (question 2), but it removes the "token saved locally and reused indefinitely" half of the bug.

## Proposed fix (rough sketch, not a commitment)

Two phases. Phase 1 stops the bleeding (stale data display). Phase 2 fixes the root cause (auth scope mismatch).

### Phase 1 — Stop showing stale data (short term)

1. Detect the active YouTube session account from the page. The YouTube avatar button (top-right) exposes the current account's channel ID or display name. Read it from the DOM in the content script on each YouTube navigation (we already watch SPA URL changes in `content-script/src/urlChanges.ts`; extend the route detection to also extract the active account identifier).
2. Store `connectedAccountId` / `connectedAccountTitle` on `YouTubeAuthState` (`src/auth/schema.ts`) at connect time, by calling `channels.list?part=snippet&id=mine` with the token and saving the returned channel ID + title.
3. In the content script, compare the YouTube session account (step 1) against `connectedAccountId` (step 2). If they mismatch, **hide the Focus Home playlist/channel shelves** and show a banner: "Connected as <connectedAccountTitle>, but you're watching YouTube as <sessionAccountTitle>. Reconnect to refresh." Provide a "Reconnect" button that triggers `connectYouTube`.
4. Do not clear the cached data yet — the user may switch back. Just hide it until they reconnect.
5. Surface "Connected as <connectedAccountTitle>" in the popup and options so the user can always see which account the extension is scoped to.

This phase does not fix the data scoping, but it stops the privacy-impacting behavior (Account A's playlist titles visible while browsing as Account B / logged-out Account C). It directly addresses the user's report: "even these, I still see the playlist."

### Phase 2 — Fix the auth scope mismatch (longer term)

1. Replace `chrome.identity.getAuthToken` (`src/background.ts:749`) with `chrome.identity.launchWebAuthFlow` using YouTube's OAuth 2.0 endpoint. This authenticates against the YouTube session account, not the Chrome sync account. The returned token matches whatever account is active on YouTube.com.
2. On each `connectYouTube` call (and on detected account change via the Phase 1 DOM signal), call `launchWebAuthFlow` fresh, fetch `channels.list?mine=true` to get the session account's channel ID, and namespace the four per-account caches by that channel ID:
   - `youtubeFocusImportedPlaylists:<accountId>`
   - `youtubeFocusSubscriptions:<accountId>`
   - `youtubeFocusPlaylistPreviews:<accountId>`
   - `youtubeFocusChannelPreviews:<accountId>`
3. Keep `youtubeFocusAuth` as a single key but store `connectedAccountId` / `connectedAccountTitle` on it so Phase 1's mismatch detection still works.
4. Add a "Sign out / forget this account's data" action that clears the four namespaced keys for the current `connectedAccountId` and resets `YouTubeAuthState`.
5. Leave `youtubeFocusSettings` (manual playlists, focus prefs, temporary disable) unscoped per Option A in the design questions.

This fix pairs naturally with the `createStorageModule<T>` factory proposed in `TECH-DEBT.md` P1-1 — the namespacing becomes a parameter on the factory (`key: (accountId) => \`youtubeFocusImportedPlaylists:${accountId}\``).

## Non-issues (confirmed working)

- Shadow DOM isolation is unaffected.
- Focus-mode on/off toggling is unaffected.
- Manual playlist shortcuts are account-agnostic by design and work across accounts (this is the intended part of the current behavior).
- The bug is not a data corruption issue — the cached data is correct for the account that produced it; it is simply shown under the wrong account context.

## Verification plan (when the fix lands)

1. Connect Account A, import playlists, select channels, confirm Focus Home shows Account A data.
2. Switch to Account B on YouTube. Confirm Focus Home either (a) shows Account B's data if Account B was previously connected, or (b) shows a "reconnect to refresh" state if Account B is new.
3. Reconnect with Account B. Confirm Account A's cached data is no longer rendered and Account B's data appears.
4. Switch back to Account A. Confirm Account A's cached data returns without a full re-fetch (if namespacing is implemented).
5. Confirm manual playlist shortcuts and focus-mode preference are unchanged across both accounts (per Option A).
6. Confirm no Account A titles/channel names leak into Account B's UI (privacy check).

## Related notes

- This bug is worsened by `TECH-DEBT.md` P0-5 (background over-fires 17 API calls per settings toggle) — if the fix adds account-change-triggered re-fetches, fix P0-5 first or the quota burn compounds.
- The missing schema versioning (`TECH-DEBT.md` P0-4) makes namespacing riskier to add retroactively — if the namespaced shapes ever change, migration runs per-account. Add `version: 1` to each namespaced shape at the same time.
