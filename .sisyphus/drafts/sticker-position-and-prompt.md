# Draft: Sticker Positioning + Prompt Quality

## Requirements (confirmed)
- Sticker must overlay the video card using absolute positioning, same element as the blur
- AI generated text is unsatisfying - needs better prompt

## Technical Decisions
- Position: append chip to card node (ytd-compact-video-renderer / yt-lockup-view-model), set card `position:relative`, chip `position:absolute`
- Prompt: use system message + rewrite prompt to match persona preview voice

## Research Findings
- Card selector: `ytd-watch-flexy #secondary ytd-compact-video-renderer, ... yt-lockup-view-model`
- Current chip: inline-flex, appended to title parent
- Shadow DOM: some cards use shadow root, need `element.getRootNode()` check for append
- Persona preview texts: witty, conversational ("jazz hands", "emergency siren")
- Current prompt: mechanical anti-distraction framing

## Open Questions
- Where on the card? (bottom-right? top-right? overlay center?)
- What specific text quality direction? (more like persona previews? more aggressive? funnier?)
