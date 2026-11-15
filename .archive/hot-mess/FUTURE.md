# FUTURE.md — hardening the design for agent authors

This document assumes the context in [AGENTS.md](AGENTS.md) and adds the piece it
doesn't state: the intended use case. Route-kit and this pipeline are infrastructure
for an **agentic AI wireframing app**. A user describes an app; AI agents generate
real, running screens as route-kit-conformant code; the pipeline's output — the flow
canvas and the static exports — *is* the deliverable the human reviews. Kalaido is
the first app being wireframed. The generated code is real, but its initial purpose
is design iteration, not shipping.

That use case inverts the economics of the design. The compliance tax that would
make this contract unbearable for human teams (sibling `*.transitions.ts` files, no
inline links, a story per state, trigger prose on every edge) is near-free for
agents, who are good at mechanical convention and don't resent boilerplate. But the
failure mode gets worse in one way: humans route around rules *knowingly*; agents
violate them *plausibly*. The canonical example is the I3 bug — an inline
`transition={{...}}` that type-checks, runs, and looks fully compliant, but silently
vanishes from the canvas. Locally correct, globally corrupting, invisible in the
diff. With agent authors you cannot rely on guilt or code review, so the checks are
the only thing standing between the canvas and quiet corruption.

## Threat model: the three ways the canvas can lie

Every proposal below is evaluated against these. A canvas that renders beautifully
and lies is the failure this project exists to prevent.

- **T1 — Structural lie**: the graph is wrong. An edge is missing (navigation
  happens through an undeclared path: inline literal, raw `useNavigate`,
  `window.location`, `<a href>`) or an edge is phantom (declared but no code fires
  it).
- **T2 — Behavioral lie**: the graph is right on paper but wrong in the running
  app. The transition is declared *and* wired, but the affordance doesn't actually
  exist on the screen, is unreachable in that state, or navigates somewhere other
  than its declared `to`.
- **T3 — Semantic lie**: the graph and behavior are right, but the prose is wrong.
  `trigger: "Click a stream card"` survives after the card becomes a menu item.
  `to:` is functional and cannot drift; `trigger`/`when`/`animation` are
  human-language design intent the running app never consumes — and in the
  wireframing use case that prose is the primary review artifact, not
  documentation.

Today's defenses: `check:nav` (T1, import-level only), `check:routes` +
`ux:verify` (registry/artifact completeness), TypeScript (`to:` targets). T2 and T3
are essentially undefended.

---

## Part 1 — Strengthening the existing design

These are ordered roughly by leverage-per-effort. S1–S4 are compatible with each
other and with the current architecture; none abandons an AGENTS.md invariant.
Anything touching `src/routes/` must be flagged for back-porting to Kalaido (I14).

### S1. Brand declared transitions — make the I3 bug a compile error

Today an inline `TransitionDef` literal type-checks because `TransitionDef` is a
plain structural type. Fix: brand it.

```ts
// route-kit.ts — the symbol is NOT exported, so it cannot be forged by literals
declare const declared: unique symbol;
export type DeclaredTransition = TransitionDef & { readonly [declared]: true };

export const defineTransitions = <T extends Record<string, TransitionDef>>(
  t: T,
): { [K in keyof T]: DeclaredTransition } => t as never;
```

`go()` and `<RouteLink transition=…>` accept only `DeclaredTransition`. An inline
object literal — the exact shipped bug — becomes a red squiggle in the agent's loop
instead of a silent canvas omission.

*Residual risk*: an agent can still write `as DeclaredTransition` or `as any`. But
a cast is greppable in a way a plausible object literal is not — extend `check:nav`
to ban assertions to `DeclaredTransition` outside `src/routes/`. Defense in depth:
the compiler catches the honest mistake, the check catches the workaround.

*Threats addressed*: T1 (missing edges). *Effort*: hours. *Invariants*: strengthens
I3 from convention+lint to compiler-enforced.

### S2. Navigation tripwire — catch escape hatches import-scanning can't see

`check:nav` scans imports, so it is blind to `window.location.href = …`,
`history.pushState`, bare `<a href>`, and form submits — all navigations an agent
might plausibly generate. Fix at runtime: in dev and export builds,
`useAppNavigate` sets an in-flight flag around the real react-router navigate call;
a router subscription (plus patched `pushState`/`replaceState`) emits a
`console.error` whenever location changes while no `go()` is in flight.

The payoff is that this reuses the existing loud-failure channel for free: the
verifier already fails on any console error with an empty allowlist (I10), and
`ux:probe` drives the app in a real browser. An escaping navigation anywhere in a
story or probe run turns the pipeline red automatically, with a message naming the
URL change and pointing at I2.

*Residual risk*: only catches navigations that actually execute during story/probe
runs — dead code paths escape until exercised. That is acceptable: an edge that
never fires during capture also never corrupts a captured artifact.

*Threats addressed*: T1 (undeclared edges, beyond what static scanning can reach).
*Effort*: a day. *Invariants*: enforces I2 at runtime instead of only at
import-time.

### S3. Stamp affordances, then click them — verify every edge empirically

`RouteLink` knows its transition at render time. In dev/export builds, have it
stamp `data-transition="<sourceRouteId>:<key>"` on its rendered element. Then
extend `ux:probe`:

1. For every story, collect all stamped affordances in the DOM.
2. Click each one; assert the resulting path matches the declared target's route
   pattern (`buildRoutePath` gives the expected shape).
3. Coverage: every declared transition must appear stamped in *at least one* state
   of its source screen — otherwise it is a phantom edge (declared, rendered on the
   canvas, triggerable by nothing).

This turns every canvas edge into a verified behavior instead of a trusted
declaration. It also partially defends T3 for free: the probe knows *which DOM
element* carries each transition, so it can record the element's accessible name
next to the declared `trigger` prose for cheap human (or S5 judge) comparison.

*Residual risk*: programmatic `go()` calls have no DOM element to stamp. Cover
those with a dev-mode emit inside `go()` (transition key fired → recorded during
probe runs) so at minimum the coverage check knows they're live. Conditional
affordances need a story state where the condition holds — which is pressure in
the right direction: states the canvas shows should be states a story exercises
(I11).

*Threats addressed*: T2 (the currently-undefended one), plus phantom-edge T1.
*Effort*: days. *Invariants*: consistent with I1 — the stamp is derived from the
functional object at render time, not a new annotation.

### S4. Ban declared-but-unused transitions

The inverse of I3: a transition an agent declares but never wires draws a
confident, false edge on the canvas. Add a static check: every key exported from a
`*.transitions.ts` file must be referenced (property access, e.g.
`streamTransitions.openCard`) somewhere in its page's module graph. This is a
grep-grade check in the spirit of `check:nav` — deterministic, fast, and its
failure message can state the fix exactly ("wire `openCard` through `go()` or
`RouteLink`, or delete the declaration").

S3's coverage pass subsumes this at higher fidelity, but this static version runs
in `pnpm check` in milliseconds and fires before a browser ever launches — the
agent gets the signal one loop iteration earlier.

*Threats addressed*: T1 (phantom edges). *Effort*: hours. *Invariants*: enforces
the spirit of I1 (metadata the app doesn't execute is banned).

### S5. Automate the drift drill — mutation-test the checks themselves

AGENTS.md already demands a manual drift drill ("break something on purpose,
confirm the check fails, revert"). For agent reliability this must not depend on
anyone remembering: a check that can't fail is not a check, and with agent authors
the checks are the *only* line of defense. Codify it:

`scripts/check-the-checks.ts` holds a catalogue of known violations, each tied to
an invariant and to the check that must catch it — an inline `useNavigate` import
(I2 → `check:nav`), an inline transition literal (I3 → S1's compile error), a
registry line deleted (I4 → `check:routes`), a template-literal story title (I11 →
coverage check), a deleted screenshot (I10 → `ux:verify`), an unstamped rogue
`<a href>` (I2 → S2 tripwire). For each: apply the mutation in a temporary git
worktree, run the named check, **assert it exits non-zero**, discard the worktree.

The catalogue doubles as executable documentation of every failure mode the system
has ever seen. Run it in CI on any change to `scripts/` or `src/routes/`. When a
new invariant is added without a catalogue entry, that's a review-time smell with a
one-line remedy.

*Threats addressed*: all, indirectly — it defends the defenses. *Effort*: a day or
two; slow to run, so gate it to tooling changes rather than every commit.

### S6. LLM-as-judge verifier tier for prose drift

T3 cannot be caught by `tsc` or grep: whether "Click a stream card" still
describes the affordance is a semantic judgment. Add a *separate, clearly
non-deterministic* tier to `ux:verify`: for each edge, give a judge the
`trigger`/`when` prose, the source screen's screenshot, and (from S3) the
accessible name and a source snippet of the stamped element, and ask one question
— *does this prose accurately describe this affordance?* Structured verdict, with
reasoning.

Policy matters more than the model call: keep this tier out of the deterministic
gate (I10's "never weaken a threshold" applies to the deterministic checks — a
flaky judge blended into them would corrode trust in red). Start as warnings
surfaced in `export-report.json` and on the canvas edge itself (a "possibly stale
label" marker is honest UI for a design-review tool). Cache verdicts by content
hash of (prose, element, screenshot region) so only changed edges re-judge.
Promote to a blocking gate only if precision proves high in practice.

*Threats addressed*: T3, the gap the structural guarantee explicitly does not
cover. *Effort*: days, plus ongoing cost/flakiness management.

### S7. Treat check output as prompts — a failure-message contract

Small but compounding: in the agentic loop, every check's stderr is read by the
model that caused the failure, one iteration later. Adopt a contract for all
checks (existing and above): every failure must state **what broke**, **which
invariant it violates** (by AGENTS.md number), **the exact remediation** (file
paths, the two registry lines to add, the sibling file to create), and **what not
to do** (the tempting workaround that is a regression — AGENTS.md's rejected-
"improvements" list, inlined at the point of failure). `check:routes` and
`selectPattern`'s dev error already do this well; make it a stated requirement so
new checks inherit it.

*Threats addressed*: none directly — it raises the probability that every other
defense converts a red run into a correct fix rather than a plausible workaround.
*Effort*: hours.

---

## Part 2 — Alternate designs (clean-sheet)

Different architectures for the same goal: *a flow map that provably reflects the
generated app*. Each abandons or inverts parts of the current design; the
invariants it breaks are named, because breaking them is the point, not an
accident. These are not mutually exclusive with Part 1 — and A3/A4 in particular
compose with the current architecture.

### A1. Spec-first: the flow map is the source, the app is generated from it

Invert the extraction direction. Today: agents write code → extractor derives the
map. Instead: the map *is* a typed spec (`app.flow.ts` — screens, states,
transitions, prose, scopes), and codegen emits everything mechanical from it:
`route-ids.ts`, the registry, `*.transitions.ts` files, story scaffolds, all
carrying generated-file headers backed by a hash manifest so hand-edits fail a
check. Agents edit two things: the spec, and page component bodies. The canvas
renders the spec directly — the extractor ceases to exist, and with it the entire
category of extraction drift.

Why this fits the wireframing product specifically: the unit of iteration is the
*design*, not the code. "Move the approve dialog to its own screen" becomes a
five-line spec diff a human can actually review, instead of a scattered code diff.
Agents are at their best editing one declarative file with a schema; the diff of
the deliverable and the diff of the artifact are the same diff.

What it costs: deliberately abandons **I4** (colocation — the spec is exactly the
"central metadata module" AGENTS.md bans) and makes **I3/I7 moot** rather than
enforced. Colocation was load-bearing for *human* comprehension and import-cycle
hygiene; codegen sidesteps the cycle problem, and agents don't need locality the
way humans do. Residual risk is unchanged in one place: page bodies can still
contain rogue navigation, so `check:nav` and the S2 tripwire survive into this
design. Biggest practical danger is escape-hatch pressure — the first time the
spec can't express something, an agent will patch generated files; the hash
manifest must fail loudly and the spec must grow instead.

*Threat coverage*: T1 structurally eliminated for everything generated; T2 still
needs S3-style probing; T3 unchanged (prose lives in the spec but is still prose).

### A2. Empirical extraction: record the map, don't declare it

Abandon declarations entirely. Instrument the router, then *crawl*: load every
story (they already run against the mock client with fixtures — so crawling is
safe, deterministic-ish, and side-effect-free by construction), enumerate
interactive affordances, click each one, record the resulting route. The flow map
is what the app *demonstrably does*. Trigger labels are derived from the clicked
element's accessible name — prose that cannot lie, and a side-effect of pushing
generated screens toward real accessibility.

This is maximal truth for minimal authoring contract: agents just build screens
with ordinary router idioms; no sibling files, no route-kit, no `check:nav`. Every
edge on the canvas was *observed*.

Why it loses to the current design on its own: it recovers **behavior but not
intent**. `when: "Only when a draft exists"` and animation notes have no observable
counterpart; unreachable-in-fixtures flows silently vanish (the crawl can't know
an edge *should* exist); state spaces explode combinatorially; and the map is only
as complete as the crawler is clever. For a wireframing tool, intent prose is a
first-class deliverable, which is why the *hybrid* — declarations as source of
truth, crawler as verifier — is Part 1's S3 rather than this design.

*Threat coverage*: T1/T2 fully (for reachable states), T3 dissolved for triggers,
but `when`/intent prose is lost rather than verified. Breaks I1–I7 wholesale by
making them unnecessary.

### A3. Tool-mediated authoring: agents never write navigation code

Move enforcement from *check time* to *write time*. The wireframing app exposes a
scaffolding tool (MCP server or CLI): `add_screen`, `add_transition`,
`add_state`, `set_trigger_prose`. The tool owns every mutation to `route-ids.ts`,
the registry, and `*.transitions.ts`; agents write page-body JSX freely but insert
navigation affordances only by asking the tool. Invariants become preconditions
the tool checks before writing — a rejected call returns the error *in the same
turn*, which is the tightest feedback loop an agent can have (versus S7's
one-iteration-later stderr).

Enforcement has teeth if the harness denies direct agent edits to the owned files
(file-permission hooks), with checks retained as backstop for whatever slips
through. The tool can also do things checks can't: refuse a transition to a route
whose `requiredScope` is unsatisfiable from the source screen's stage, or demand
trigger prose at creation instead of hoping for it.

What it costs: the tool surface must anticipate every legitimate need, or agents
stall or fight it — every gap becomes escape-hatch pressure. It is also a second
implementation of the domain model, which can itself drift from route-kit (the
mirror-repo problem of I14, now internal). Best treated as a layer over either the
current design or A1, not a replacement: the checks remain the ground truth; the
tool is ergonomics plus early rejection.

*Threat coverage*: T1 largely prevented at write time; T3 improved at creation
time (prose is demanded, in context) but still unguarded against later edits.

### A4. Capability-injected navigation: no ambient authority to misuse

Redesign route-kit's API so a page *cannot express* undeclared navigation. Today
`useAppNavigate` is ambient — any component can import it and pass any
`TransitionDef`. Instead, the router injects each page's navigation capability as
a prop, typed by its own declaration:

```ts
// The page receives ONLY its declared transitions, as keys — there is nothing
// else to call. No hook to import, no def objects at call sites, ever.
function Stream({ nav }: { nav: NavCapability<typeof streamTransitions> }) {
  …
  nav.go("openCard", { params: { id } });   // key must be a declared key
}
```

Call sites reference declarations *by key*, so an inline literal is not merely
banned — there is no parameter that accepts one. The extractor sees the
declaration; the app can only fire the declaration; T1's whole
"plausible-but-undeclared" class becomes unrepresentable in the API. Chrome gets
its own injected capability from `defineChromeTransitions`. `RouteLink` becomes
`<nav.Link transition="openCard">`, keeping S3's stamping for free.

This is the strengthening-grade alternate: it can be retrofitted into the current
design incrementally (it strengthens I2/I3 rather than abandoning anything — I5's
lazy registry still matters, since the injector resolves through it). What it
doesn't cover: raw react-router imports and `window.location` remain possible in
the language, so `check:nav` and the S2 tripwire stay. And prop-drilling `nav`
through deep component trees is real friction — likely resolved with a
route-scoped context whose *provider* only the gatekeeper can construct, keeping
the capability non-ambient in practice while staying ergonomic.

*Threat coverage*: T1 (declared-path violations) eliminated at the API level; T2/
T3 unchanged — pair with S3/S6.

### A5. Statechart core (noted for completeness, probably not worth it)

Model navigation as a formal state machine (XState-style): screens as states,
transitions as events; the canvas becomes a statechart visualization, and
reachability/dead-state analysis comes free from mature tooling. Rejected as the
primary direction because it moves the problem rather than solving it — the
machine can drift from the UI exactly the way declarations can (the event exists;
the button that sends it doesn't), so T2/T3 survive intact while the whole team
(and every generation prompt) pays for a paradigm shift, plus heavy friction
integrating with react-router and Ladle. Its one genuinely superior property —
formal reachability over guarded flows — is worth stealing as a *check* on the
existing declaration graph (a graph-walk over `stageEntryRoute` + `requiredScope`
that proves every route is reachable from some stage) without adopting the
paradigm.

---

## Suggested path

Near-term, inside the current architecture: **S1 + S4 + S7** are hours each and
close the cheapest holes; **S2** rides the existing console-error gate; **S3** is
the highest-leverage single item because it is the only thing that defends T2, and
it feeds S6. **S5** should land before the agent fleet does — it is the insurance
policy on everything else.

Structurally, **A4 is the most attractive evolution**: it deletes the largest
threat class at the API level, retrofits incrementally, and back-ports to Kalaido
as a route-kit improvement (flag per I14). **A1 is the fork in the road** and
deserves a spike once the wireframing product's iteration loop is observable in
practice: if agents mostly iterate on *design shape* (screens, flows, states),
spec-first wins outright; if they mostly iterate on *screen content* with a stable
flow, the current code-first design with Part 1 hardening is already the right
one. A3 layers onto whichever of those wins. A2 should never ship as the design,
but its crawler is S3, and S3 should ship.

The through-line of all of it: with agent authors, **every invariant needs an
enforcement that can actually fail, and every failure needs to read as
instructions**. AGENTS.md got there first; this document is just that principle
applied forward.
