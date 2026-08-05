---
type: Slash Command
description: Optional pre-ship pass — Lighthouse accessibility/SEO/best-practices/agentic-browsing plus a Core Web Vitals trace
---

A deliberate, on-demand "am I actually done" pass for a finished piece —
not something to reach for mid-debugging-session, and not part of the
`/checkpoint`→`/diff` evidence bundle (that pair is about scene-state
correctness over time; this is a one-time page-load/markup audit).

1. Run `lighthouse_audit` (device: desktop, mode: navigation) against the
   currently loaded page. Then run it again with device: mobile. Each
   pass scores accessibility, SEO, best practices, and agentic browsing —
   it does **not** score performance (see step 2).
2. Run `performance_start_trace` (reload: true, autoStop: true), then
   `performance_analyze_insight` for whichever insight sets the trace
   itself flags as worth surfacing (e.g. `LCPBreakdown`, `DocumentLatency`)
   — don't guess a fixed insight list in advance, use what the trace
   actually reports as available.
3. Present both halves clearly separated, not as one undifferentiated
   score list:
   - **Accessibility/SEO/best-practices/agentic-browsing** (step 1):
     report as diagnostic — these come from DOM/ARIA/markup analysis, not
     frame timing, so they're trustworthy regardless of rendering path.
   - **Performance / Core Web Vitals** (step 2): if this session is
     running on the project's Pi 5 deployment path, report these numbers
     as **advisory, not diagnostic** per AGENTS.md §7a — don't tell the
     human "your LCP regressed" as if that's a meaningful signal on
     hardware where chrome-devtools-mcp's own timing numbers are already
     documented as unreliable. On any other deployment, report normally.
4. Give a plain-language verdict per category, not just raw scores —
   what's actually blocking a ship vs. what's a nice-to-have, using your
   own judgment about the specific issues Lighthouse flagged. This is a
   one-off spoken summary, not a written report (contrast `/export-report`,
   which persists a `/diff` result as a shareable file — this command
   doesn't produce a file).

No arguments — audits whatever page is currently loaded in the shared
tab, same implicit-target convention as `/checkpoint` with no label.
