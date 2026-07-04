# Sticker Positioning + Prompt Quality

## TL;DR
> **Summary**: Reposition AI sticker chips as absolute overlays on video cards, and rewrite the generation prompt to produce witty persona-driven text instead of mechanical anti-distraction labels.
> **Deliverables**: Absolutely-positioned sticker overlay on each video card; improved prompt producing voice-matched one-liners.
> **Effort**: Short
> **Parallel**: YES - 2 independent tasks
> **Critical Path**: None (tasks are independent)

## Context
### Original Request
User reported: (1) sticker is placed inline below the title instead of overlaying the video card like the blur effect, and (2) the AI-generated text is poor quality, not matching the intended persona voice.

### Interview Summary
- Positioning: sticker must overlay the same card node that gets blurred (`ytd-compact-video-renderer` / `yt-lockup-view-model`), using absolute positioning.
- Text quality: current prompt produces robotic "anti-distraction" text. Persona preview texts already demonstrate the desired voice ("jazz hands for your attention", "tiny emergency siren").

## Work Objectives
### Core Objective
Sticker appears as a positioned overlay on the video card with improved AI text.

### Deliverables
1. Absolutely-positioned sticker chip on each video card (centered overlay)
2. Rewritten prompt with system message producing persona-matched one-liners

### Definition of Done
- Build passes (`npm run build`)
- Lint passes (`npm run lint`)
- Playwright tests pass: `tests/ai-stickers.spec.ts` + `tests/watch-soft-focus.spec.ts`
- Manual QA: sticker renders on card surface, not inline below title

### Must Have
- Absolute positioning on card node
- Card gets `position: relative` (restored on cleanup)
- Shadow DOM cards handled
- Prompt rewritten with system message

### Must NOT Have
- Changing the blur/dim behavior
- Changing the persona settings schema
- Adding new dependencies
- Regressions in dismiss behavior

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after (existing test suite)
- QA policy: Every task has agent-executed scenarios
- Evidence: .sisyphus/evidence/task-{N}-{slug}.{ext}

## Execution Strategy
### Parallel Execution Waves
> Both tasks are independent.

Wave 1: Task 1 (positioning) + Task 2 (prompt) run in parallel

## TODOs

- [ ] 1. Reposition sticker as absolute overlay on video card

  **What to do**:
  1. In `createWatchStickerChip`: change display from `inline-flex` to absolute centering. Set `position: absolute`, `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`, `zIndex: 1`. Remove `marginTop`, `verticalAlign`, and `maxWidth` (let it size naturally within the card).
  2. In `attachWatchRecommendationStickers`: instead of appending to `parent` (title element parent), append the chip directly to the `node` (the card element itself: `ytd-compact-video-renderer` or `yt-lockup-view-model`).
  3. Before appending, save the card's original `position` style and set it to `relative` if not already positioned. Store the original value on a data attribute for restoration.
  4. For Shadow DOM cards: `node.getRootNode()` returns the shadow root. Append to `node` (the host), which works for both regular and shadow DOM since the chip goes on the host element.
  5. Update `removeWatchRecommendationStickers` to also restore card `position` styles from the saved data attribute.
  6. Update the existing chip dedup check (lines 147-157) to query on the card node instead of parent.

  **Must NOT do**:
  - Do NOT change the `onDismiss` callback wiring
  - Do NOT change sticker text content or styling colors
  - Do NOT change the blur/dim selectors or behavior

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: DOM manipulation + positioning
  - Skills: [`chrome-extension-development`] - content script DOM injection patterns

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: none

  **References**:
  - Pattern: `content-script/src/watchSoftFocus.ts:399-449` - current chip creation
  - Pattern: `content-script/src/watchSoftFocus.ts:101-167` - current attach logic
  - Pattern: `content-script/src/watchSoftFocus.ts:169-180` - current remove logic
  - Pattern: `content-script/src/watchSoftFocus.ts:295-317` - dimWatchTarget saves/restores style via data attributes (same pattern for position)

  **Acceptance Criteria**:
  - [ ] `npm run build` exits 0
  - [ ] `npm run lint` exits 0
  - [ ] Chip has `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1`
  - [ ] Card node has `position: relative` set (original saved on data attribute)
  - [ ] `removeWatchRecommendationStickers` restores card position styles
  - [ ] Shadow DOM cards (yt-lockup-view-model) receive chip on host element

  **QA Scenarios**:
  ```
  Scenario: Sticker overlays card with absolute positioning
    Tool: Playwright (tests/watch-soft-focus.spec.ts)
    Steps: Navigate to a watch page, enable focus mode, reveal suggestions, trigger sticker generation
    Expected: Sticker chip appears centered on card node, card has relative positioning
    Evidence: .sisyphus/evidence/task-1-sticker-position.png

  Scenario: Sticker cleanup restores card position
    Tool: Playwright
    Steps: Navigate away from watch page, verify card position styles restored
    Expected: No residual `position: relative` or data attributes on cards
    Evidence: .sisyphus/evidence/task-1-cleanup.png
  ```

  **Commit**: YES | Message: `fix(watch): position sticker as absolute overlay on video card` | Files: `content-script/src/watchSoftFocus.ts`

---

- [ ] 2. Rewrite AI sticker prompt for persona-matched voice

  **What to do**:
  1. Add a system message to `generateStickerTextWithAiSdk` that sets the model's voice based on persona settings. The system message should describe the persona's speaking style using the same voice demonstrated in the persona preview texts (`src/settings/persona.ts:86-102`).
  2. System message template: use persona preset name and slider values to construct a voice description. Examples:
     - Funny (8/5/5): "You are a witty, slightly sarcastic friend who calls out distractions with humor. Short punchy one-liners. Never mean."
     - Strict (2/9/4): "You are a disciplined coach. Direct, firm, no-nonsense. Short commands. Respectful but unyielding."
     - Calm (1/2/9): "You are a gentle, kind guide. Soft encouragement. Warm but brief. Never pushy."
  3. Rewrite the user prompt from mechanical "anti-distraction sticker" to conversational. Model it after the persona preview texts:
     - Current: "Write one compact anti-distraction sticker for a YouTube recommendation. The sticker should help the user notice the temptation and return to their chosen video."
     - New: "A YouTube recommendation titled '{title}' by '{channel}' just appeared in the sidebar. Write one short line (under 96 chars) that acknowledges it and steers the user back to their current video. Make it sound like you - match your persona voice."
  4. Keep all existing constraints: no quotes, no emoji, no markdown, under 96 chars, profanity rules, custom instruction support.
  5. Pass the system message via the `system` parameter in `generateText`.

  **Must NOT do**:
  - Do NOT change the `maxOutputTokens`, `reasoningEffort`, or `textVerbosity` settings
  - Do NOT change the prompt builder's parameter signature
  - Do NOT change persona settings schema or storage

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: single function prompt rewrite, no DOM
  - Skills: [`chrome-extension-development`] - context

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: none

  **References**:
  - Pattern: `src/ai/stickers.ts:144-168` - current generateStickerTextWithAiSdk
  - Pattern: `src/ai/stickers.ts:77-106` - current buildRecommendationStickerPrompt
  - Pattern: `src/settings/persona.ts:86-102` - getPersonaPreviewText examples of desired voice
  - External: AI SDK `system` parameter - `https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text`

  **Acceptance Criteria**:
  - [ ] `npm run build` exits 0
  - [ ] `npm run lint` exits 0
  - [ ] `npx playwright test tests/ai-stickers.spec.ts` passes (existing prompt test may need update)
  - [ ] System message is constructed based on persona preset and sliders
  - [ ] User prompt is rewritten to be conversational (not "anti-distraction")

  **QA Scenarios**:
  ```
  Scenario: Prompt produces persona-matched text (mocked generator)
    Tool: Playwright (tests/ai-stickers.spec.ts)
    Steps: Run existing prompt test with updated expected output patterns
    Expected: Prompt includes system message with persona voice, user prompt is conversational
    Evidence: .sisyphus/evidence/task-2-prompt.txt

  Scenario: System message changes with persona
    Tool: Bash (unit test via node)
    Steps: Build prompt with funny preset (8/5/5) and strict preset (2/9/4), verify system messages differ
    Expected: System messages reflect different persona voices
    Evidence: .sisyphus/evidence/task-2-persona-diff.txt
  ```

  **Commit**: YES | Message: `feat(ai): rewrite sticker prompt with persona system message` | Files: `src/ai/stickers.ts`

## Final Verification Wave
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
Two independent commits, can be squashed or kept separate.

## Success Criteria
1. Sticker renders as absolutely-positioned overlay on video card surface
2. AI prompt produces persona-matched conversational one-liners
3. All existing tests pass, no regressions in dismiss or blur behavior
