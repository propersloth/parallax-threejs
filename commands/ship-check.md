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
   it does **not** score performance (see step 2). If this errors with
   `INVALID_URL`, the page is almost certainly loaded via `file://` —
   Lighthouse requires an `http(s)://` origin. Tell the human and suggest
   serving the directory locally (e.g. `deno run --allow-net --allow-read
   jsr:@std/http/file-server <dir> --port <port>`, or whatever dev server
   the project already uses), then retry against that URL. Don't treat
   this as a `/ship-check` bug — it's a Lighthouse constraint.
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
   own judgment about the specific issues Lighthouse flagged. Mention the
   JSON/HTML report paths `lighthouse_audit` printed for each pass — they
   already exist on disk, so pointing at them costs nothing and gives the
   human somewhere to look for detail beyond the spoken summary. That
   said, `/ship-check` itself doesn't persist or export anything durable
   the way `/export-report` does for a `/diff` result — those temp report
   paths are `lighthouse_audit`'s own output, not something this command
   collects or writes anywhere.

No arguments — audits whatever page is currently loaded in the shared
tab, same implicit-target convention as `/checkpoint` with no label.
