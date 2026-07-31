# Parallax — Agent Instructions

This plugin exists to close the loop between "what the code does" and "what
you can see," for a vanilla three.js/GLSL prototype debugged mostly by eye.
Scope is deliberately narrow: vanilla three.js only, no React Three Fiber —
there's no framework branching to worry about, one project, one stack.

Everything below is written to make the MCP tools (chrome-devtools-mcp,
threejs-devtools-mcp, playwright-mcp, spector) and skills earn their keep
over a default coding session — don't fall back to guessing from a code
diff when a tool can just tell you.

---

## 1. Skill and tool routing

| Condition | Load |
|---|---|
| An acceptance/regression check is being run (see §4) | `qa-visual-test-harness` — the one skill shipped by default; documents this plugin's own regression suite specifically |
| General three.js task, and a general knowledge skill happens to be installed | Whatever's installed — see `docs/RECOMMENDED-SKILLS.md`. Not shipped by default; the core debug loop doesn't depend on it. If nothing's installed, proceed on general training knowledge as normal. |
| Perf complaint, WebGL context loss, or similar, and a debugging-knowledge skill happens to be installed | Same as above — optional, see `docs/RECOMMENDED-SKILLS.md`. |
| Project has rigid bodies, collisions, or a physics dependency, and a physics-integration skill happens to be installed | Load it — otherwise this is out of scope for what ships here. |
| Material/uniform values check out correct per threejs-devtools-mcp but the render is still wrong, or nothing draws with no console error | Spector MCP — inspect draw calls, compiled shader source, and GL state below the Three.js abstraction. Don't reach for this first; it only earns its cost once uniform/material-level evidence is exhausted. |

Don't preload everything "just in case." Load what the current task
actually calls for — and don't assume a general-knowledge skill is
installed just because a task would benefit from one; check what's
actually present rather than reasoning as if `docs/RECOMMENDED-SKILLS.md`'s
suggestions are guaranteed to be there.

---

## 1a. Subagents

Three specialized subagents live in `agents/`. Delegate to them rather than
reasoning inline when the task matches their scope — each has a narrower,
better-defined job than a general-purpose pass would do:

| Situation | Delegate to |
|---|---|
| GLSL or ShaderMaterial/RawShaderMaterial setup was just written or edited, not run yet | `shader-reviewer` — catches binding mismatches and vertex/fragment drift before they become a confusing runtime symptom |
| Something is rendering wrong *right now* and needs diagnosis | `visual-debugger` — correlates scene graph, console, GL state, and pixels per §2's evidence rule |
| A fix has been diagnosed, confirmed, and accepted by the human, and is worth protecting against future regression | `scenario-author` — writes and validates the actual scenario file, closing the loop described in §4 |

These aren't mutually exclusive across one work session — the natural
sequence for a shader bug is often `shader-reviewer` (before running, if
the code is new) → `visual-debugger` (if it still misbehaves once running)
→ `scenario-author` (once fixed, if worth protecting long-term). Each agent
names the next one explicitly when a handoff makes sense — see each
agent's own file for the specifics.

---

## 2. The core debug loop (this is the actual advantage)

A default coding agent debugs by reading code and reasoning about what it
*should* do. You have four evidence channels for diagnosing the *current
running state* — use them together, not sequentially as a last resort:

1. **Scene graph (threejs-devtools-mcp)** — ground truth: transforms,
   material props, shader compile status, light params. This is what's
   *actually true*, independent of what the code intends.
2. **Console/network/perf (chrome-devtools-mcp)** — silent failures: 404s on
   textures, shader compile warnings, dropped frames, GC pressure. These
   often produce zero visible symptom until you check.
3. **Pixels (playwright-mcp screenshots)** — what a human would see. Useful,
   but least informative on its own — a black object could be an unlit
   material, a missing texture, a shader error, or camera clipping. Never
   diagnose from a screenshot alone if the graph or console can settle it.
4. **Raw GL state (Spector MCP)** — draw calls, compiled shader source,
   texture/framebuffer bindings. Only load per the routing table in §1 —
   this is the layer below the other three, for when they've run out of
   answers.

**Rule: before proposing a fix, correlate at least two channels.** "The
sphere looks dull" → check scene graph for the actual material properties
AND console for a failed texture load, *then* explain what's happening. A
screenshot-only diagnosis is a guess dressed as an observation — say so
explicitly if you're forced into one (e.g. graph/console tools unavailable).

When you report a finding, cite which channel supports it
("roughness=1.0 per scene graph, no console errors" vs. "console shows a 404
on `env.hdr`") — this is what makes your diagnosis checkable instead of
just plausible.

---

## 3. Two debug systems — don't conflate them

This plugin runs two structurally different things. Keep them separate in
how you talk about them and when you reach for each:

**Interactive debug loop** — `checkpoint` / `diff` / `sweep` / `sync-view` /
`replay`, driven through the MCP tools inside a live chat session. This is
for active back-and-forth: you and the human are both looking at the same
browser tab right now, iterating on something in real time. Ephemeral by
default — a checkpoint is a snapshot for the current conversation, not a
permanent record, unless explicitly promoted into the regression suite.

**Deterministic visual regression suite** — `deno task visual:run` /
`visual:accept`, under `test/visual/`. This runs headless, outside any chat
session (a post-commit hook, or manually), and is indexed by git SHA against
the last *accepted* screenshot per keyframe — not the interactive session's
transient state. It answers a different question: "did this commit change
what a specific, repeatable interaction sequence renders, compared to what
a human last signed off on?"

Do not treat one as a substitute for the other:

- Finding something in an interactive session does not mean it's covered by
  the regression suite — if a bug fix or new visual behavior is worth
  protecting against future regressions, it needs a scenario/keyframe added
  under `test/visual/scenarios/`, deliberately, not assumed to exist because
  it was checked once by hand.
- A passing regression run does not mean the interactive-session diagnosis
  work is done for whatever you're currently debugging — the suite only
  knows about keyframes someone already defined; anything outside that
  set is still eyeballed territory per §4.
- Never auto-accept a `pending-review` diff yourself. A significant diff is
  a gate for the human, not a decision for you to resolve by re-running
  until it passes.

---

## 4. Acceptance testing (the gap this plugin fills)

Automated coverage is procgen-only. Everything downstream of that — layout,
material assembly, lighting, the final rendered scene — is currently
verified by eye. Treat that as a real gap to compensate for, not a
constraint to work around silently.

**Definition of "checked" for any change touching rendering:**

1. Run existing procgen tests (if the change touches generation logic).
2. `checkpoint` — capture scene graph + console + screenshot as one unit,
   labeled with what was changed. This is the interactive-session record,
   per §3.
3. `diff` against the last checkpoint before the change. Report what moved,
   what didn't, and flag anything the diff shows that wasn't intended by the
   change — this is the tripwire for silent regressions that a "looks fine"
   glance would miss.
4. If the change is visually subtle or parameter-driven, prefer `sweep` over
   a single before/after — one contact sheet across the relevant range beats
   three sequential single-shot guesses and gives both of you the same
   evidence at once.
5. If the change is worth protecting long-term (not just checked once now),
   add or update a scenario in `test/visual/scenarios/` so it's covered by
   the SHA-indexed regression suite going forward — this is a deliberate
   step, not automatic.

**Do not declare a visual change "done" on the strength of a single
screenshot you generated.** A screenshot you produced and immediately
approved is not acceptance testing, it's a rubber stamp — the value of this
loop is the diff and the console cross-check, not the picture. Surface the
diff/console output and let the human make the accept call, especially for
anything not covered by procgen or the regression suite.

If a change has no visual manifestation (pure refactor, internal state),
say so and skip the checkpoint — don't manufacture screenshots for changes
that can't show anything.

---

## 5. Command discipline

- `sync-view` before any comparison that depends on framing — don't let
  "it looks different" be explained by camera drift instead of the actual
  change. If the human has Needle Inspector's free-tier overlay open (see
  §7), suggesting they glance at its node/hierarchy view right after a
  `sync-view` gives them a richer visual cross-check than the raw JSON
  scene graph you have access to — you can't query it yourself, but you can
  prompt them to look.
- `replay` for anything interaction-dependent (hover states, click targets,
  animation triggers) — a fresh manual pass through the interaction is a new
  variable every time; the recorded macro isn't.
- `sweep` for anything tuned by a continuous parameter. If you catch
  yourself about to suggest "try 0.6... now 0.7," stop and sweep instead.
- Post-edit hook (auto checkpoint on save) is for active debug sessions,
  not every keystroke-adjacent save during unrelated work — if it's adding
  latency without adding evidence, say so and suggest disabling it for that
  stretch of work. Note the hook's actual mechanism: it writes a pending
  marker, it does not call MCP tools itself — see hooks/post-edit.js.
- `deno task visual:run` belongs in a post-commit hook, not pre-commit —
  the SHA it indexes against doesn't exist until the commit lands.

---

## 6. Guardrails

- Don't run performance profiling, an optional debugging-knowledge skill,
  or Spector speculatively on every session — load them when there's an
  actual symptom or an explicit ask, per the routing table in §1.
- Scene graph and console evidence outrank a screenshot when they disagree
  with what the picture seems to show — trust the instrumented state, and
  say clearly when pixels and graph don't match (that mismatch is usually
  the bug).
- Never auto-advance a `pending-review` regression entry yourself, and never
  present a self-generated screenshot as sufficient acceptance evidence on
  its own (§3, §4).

---

## 7a. Running on Raspberry Pi 5: perf numbers are not trustworthy

This deployment runs the browser headful, locally, on the Pi's own display —
not headless, and not proxied to a more capable machine. That fixes the
"can I even see it" problem, but it does *not* fix a separate, real issue:
headless/software-rendering fallback on Pi 5's WebGL pipeline is unreliable
even with GPU flags set correctly, and there are documented cases of correct
configuration still producing 1fps-class results with no clear cause.

Practical consequence: treat any FPS, frame-timing, or draw-call-rate number
from chrome-devtools-mcp's performance tools on this hardware as **advisory,
not diagnostic** — don't tell the human "this dropped from 60fps to 40fps"
as if that's a meaningful regression signal here. Scene graph correctness
(materials, transforms, compile status) and console errors remain fully
trustworthy regardless of rendering path — it's specifically the *timing*
numbers that are suspect on this hardware. If a genuine performance
investigation is needed, that's a signal to revisit the browser-location
decision (running the browser on a separate, more capable machine instead)
rather than trusting Pi-local numbers.

---

## 7. Human-side-only tools (not agent-accessible)

**Needle Inspector (free tier)** — a Chrome extension the human can install
to get a visual scene hierarchy, node-graph drill-down, and property
inspection directly in-browser. This is *not* MCP-connected at the free
tier — that's a Pro-only feature — so you cannot query it, read its state,
or drive it. Treat it as something the human has open on their own screen,
parallel to what you're doing through threejs-devtools-mcp.

The useful pattern is asking, not assuming: if a diagnosis would benefit
from a richer visual view than the JSON scene graph gives you (e.g.
untangling a deep node/material chain), ask the human to check Needle's
overlay and describe or screenshot what they see, rather than assuming
parity between what you can query and what they can see. This is genuinely
complementary to the "both looking at the same thing" goal of this whole
plugin — it just runs through the human, not through you.

---

## 8. AI-DLC compatibility

This plugin may run inside a larger project governed by AWS's AI-DLC
three-phase workflow (awslabs/aidlc-workflows, `main` branch — INCEPTION →
CONSTRUCTION → OPERATIONS). This section is scoped to that three-phase
model specifically. AI-DLC also has a `v2` branch with a materially
different architecture (5 phases, 32 stages, a 14-agent roster) — if the
governing project is actually on v2, this section's assumptions don't
transfer and would need to be revisited against v2's own structure rather
than assumed compatible.

**Detection.** Check for an `aidlc-docs/` directory at the project root. If
present, the project is running under AI-DLC and everything below applies.
If absent, this plugin operates exactly as described in §§1–7, unaffected.

**Where this plugin fits.** AI-DLC's CONSTRUCTION phase ends in an
always-executing Build and Test stage covering six test categories: Unit,
Integration, Performance, Contract, Security, End-to-End. None of the six
cover visual/rendering regression — that's the gap this whole plugin
exists to fill, per §4. This plugin is additive to AI-DLC's testing
strategy, not a competing or overlapping one; it doesn't duplicate any of
the six categories.

One structural difference worth being clear about: AI-DLC's Build and Test
stage *generates instructions* (`build-instructions.md`,
`integration-test-instructions.md`, etc.) rather than executing tests
itself — it's documentation for a human or downstream tool to carry out.
This plugin is different in kind: `checkpoint`/`diff`/`sweep` and the
`test/visual/` regression suite actually execute. Treat this plugin as one
of the tools AI-DLC's generated build instructions can point to for the
visual-testing portion of a canvas-rendered project, not as another
instruction-generation step competing with AI-DLC's own.

**Audit logging.** AI-DLC requires a complete audit trail in
`aidlc-docs/audit.md` — every interaction logged, not just approvals, with
raw input captured rather than summarized. When `aidlc-docs/` is present:

- A completed `test/visual:run` (the regression suite, not an ad hoc
  interactive checkpoint) is a test-execution event and should be logged
  to `aidlc-docs/audit.md` with a timestamp and pass/fail summary, matching
  the same logging AI-DLC's own Build and Test stage performs for its
  other test categories.
- An interactive `checkpoint`/`diff` during active debugging is not, by
  itself, a formal test event — don't log every one of those, or the audit
  trail turns into noise AI-DLC never intended. Log it when a `diff` gets
  reviewed and explicitly accepted or rejected by the human (§3, §4) — that
  decision is the meaningful, auditable event, not the intermediate
  back-and-forth that led to it.
- `scenario-author` promoting a checkpoint into a permanent regression
  scenario is worth a log line too — it's a durable change to test
  coverage, which is exactly the kind of thing AI-DLC's audit trail exists
  to capture.

**Boundary: this plugin does not drive AI-DLC's own state machine.** Don't
write to `aidlc-state.md`, don't advance AI-DLC's phase/stage tracking, and
don't decide when CONSTRUCTION transitions to OPERATIONS — that's AI-DLC's
orchestrator's job, not this plugin's. This plugin's role under AI-DLC is
participant, not orchestrator: append to the audit trail, optionally
contribute a summary artifact (see below), and otherwise stay in its own
lane.

**Artifact alignment.** If generating a summary of a completed regression
run, follow AI-DLC's existing naming convention rather than inventing a
new location — write to
`aidlc-docs/construction/build-and-test/visual-test-instructions.md` and
fold the pass/fail result into `build-and-test-summary.md`'s test results
section if that file already exists for this project, rather than creating
a second, uncoordinated report.

**Approval gates already align — no change needed.** AI-DLC's human-in-the-
loop model requires explicit approval before proceeding past a stage. This
plugin's existing rule against auto-accepting a `pending-review` diff (§3,
§6) is already the same principle applied to visual regressions
specifically — this is intentional alignment worth naming, not a
coincidence to fix.

**No file-location conflict.** AI-DLC's own steering rules load from
`.aidlc-rule-details/` at the project root (the typical path for Claude
Code, Cursor, Cline, and Copilot). This plugin's `AGENTS.md` is scoped to
the plugin's own directory, loaded when the plugin is active — the two
don't compete for the same file or the same loading mechanism.
