# Motion-Only engine generalization

This pass treats the real Arabic programming Reel as one regression fixture. The creator subsequently approved the engine generalization and froze this architecture as Motion-Only Engine v1. That checkpoint does not establish Preview approval or final render authorization.

## Classification of Step 3 findings

| Finding | Classification | Engine action / boundary |
|---|---|---|
| Mixed RTL/LTR punctuation and complete technical expressions | A: invariant | Existing escaped, isolated LTR code units; expression/token validation; local browser isolation check. Never reverse source strings. |
| Master Audio replaced, mutated or silently resampled | A: invariant | Existing intake/hash/derivative verification and render decoded-audio check remain mandatory. Composition never writes audio. |
| Invalid timing, changed approved scene times | A: invariant | Existing semantic and visual schema validation retains approved times and rejects invalid beats. |
| Unrepeatable pictures when seeking | A: invariant | Fresh-seek versus history-seek screenshot checks; wait two compositor frames before comparison. |
| Content outside the authored safe area, clipping, hidden primary, actual caption collision | A: invariant | Sampled browser geometry errors. Safe-area profile is an explicit output constraint, not a universal percentage. Invisible during an authored entrance is allowed; primary must appear during sampled holds. |
| Missing, changed, unsafe or unlicensed selected resource | A: invariant | Existing manifest/hash/inspection/provenance checks. Existing safe built-in fallback remains supported. |
| Tiny teaching object / unused space | B: heuristic | Deterministic occupancy advisories, never automatic enlargement. Intentional negative space can suppress only the unused-space advisory. |
| Small text/code / labels that dominate | B: heuristic | Configurable readability and hierarchy advisories. A CSS-pixel threshold is a review signal, not a universal readability guarantee. Actual clipping is an error. |
| Excessive reading demand | B: heuristic | Words per second advisory; creator may supply reading demand. Speech and visual reading are not interchangeable. |
| Repeated composition or choreography | B: heuristic | Role/flow repetition and resolved motion-family advisories. Continuity may justify repetition; no random motion substitution. |
| Semantically continuous objects disappear between scenes | B: heuristic / explicit choreography | Existing authored persistent identities carry across contiguous compatible scenes. Never infer identity merely from equal text. Cross-domain automatic carry-over remains deferred. |
| Captions compete with teaching content | B, becoming A on actual overlap | Reserved caption-zone intersection is advisory; measured visible collision is error. |
| Fixed English decorative copy in Arabic | Language/configuration correctness, with wording a C/D choice | Existing configurable language-aware decorations remain. Technical Latin text is not decoration. |
| Font, colors, glow, branding, backdrop, headline alignment | C: Style | No new universal font/theme/alignment rule. Existing visual defaults retained. |
| Exact fruits scale/position, extraction beat, heading wording | D: project | Kept in existing project plan or compatibility component geometry; not promoted into generic policy. No Step 3 tuning in this pass. |

Before adding a rule, ask whether the failure recurs across domains, whether it can be stated without content names, and whether another scene type could be damaged. Objective failures become safeguards; uncertain composition judgments become advisories. A fixture-specific preference stays in that fixture.

## Composition contract

Pipeline: **Scene semantics → composition constraints → motion choreography → style tokens → resources**.

`motion_layout.py` evaluates neutral rectangles and text observations. It has no scene-type, programming-language or Array branch. `motion_layout_adapter.py` binds existing render components into that contract. A new component adds bindings rather than changing policy.

Every resolved scene identifies:

- primary, secondary and context elements, with stable component IDs and semantic importance;
- caption zone, usable safe area and optional additional reserved rectangles;
- information density inherited from the storyboard unless explicitly overridden;
- reading demand, intentional-negative-space intent, optional adaptive flow and review thresholds.

Coordinates use CSS pixels in the authored frame. The default profile describes the current 1080 × 1920 vertical renderer. It is not a claim that all platforms share these safe areas. The renderer itself is still optimized for that frame; other aspect ratios need independent validation.

Optional scene contract example (content-neutral):

```json
{
  "composition": {
    "safe_area": [60, 220, 960, 1140],
    "caption_zone": [60, 1400, 960, 330],
    "reserved_areas": [],
    "information_density": "high",
    "reading_words": 18,
    "reflow": "stack",
    "intentional_negative_space": false,
    "elements": [{"id": "teaching-object", "role": "primary", "importance": "high"}]
  }
}
```

Role entries override registered bindings; arbitrary CSS selectors, fonts, colors and branding are not accepted. The final model must retain a primary binding. Generated `composition-model.json` is inspectable evidence. Code/Array exposes its teaching object, expression, result, explanatory steps and labels in exactly this model.

`reflow: stack` is an explicit flow constraint for an existing node group. It changes stacking and connector direction without reducing text or choosing brand tokens. Natural flow remains the default. Advisories never alter project input, geometry, styles or choreography.

## Advisories and safeguards

Errors: missing measurements, browser runtime failure, no visible primary at any sampled hold, safe-area escape, clipped text, actual caption overlap, caption escape, reserved-area collision and failed LTR isolation.

Advisories: low primary occupancy, unused space, small text, context dominance, reading demand, content overlap risk, caption-zone competition and repeated composition. Motion checks separately report repeated resolved entrance families, repeated choreography, directional runs and reliance on slides. `auto` is resolved to its actual scene family before motion repetition checks.

Default thresholds: 28 CSS px text, primary occupancy 4.5%, overall occupancy 16%, four reading words/second. These are editable review thresholds, **not** auto-layout targets. No rule says Arrays must occupy a fraction of the screen, code must be largest, or headlines must have one alignment. Density/importance are descriptive constraints; they do not silently select a theme or resize objects.

Occupancy uses rectangle union, so nested rectangles are not double-counted. Bounding boxes estimate occupied area; they do not measure optical weight or prove good composition. Role/flow repetition is intentionally a coarse review signal and may flag a useful continuous explanation.

## Reproducible local validation

Use the installed local Python, Node and Chromium. No transcription provider, API, downloaded media or full synthetic production video is required.

```text
python scripts/build-generalization-fixture.py
node scripts/check-motion-layout.cjs COMPOSITION_DIR LOCAL_CHROME measurements.json
python scripts/analyze-motion-layout.py COMPOSITION_DIR measurements.json composition-check.json
node scripts/check-motion-seek.cjs COMPOSITION_DIR LOCAL_CHROME seek-check.json
python -m unittest discover -s tests -v
python reel.py doctor
```

Browser requests are restricted to local file/data URLs. The geometry analyzer exits nonzero on errors. These explicit QA commands complement the render's existing HyperFrames/audio gates; they do not silently run or assert creator acceptance. Run against the current build, not observations from a different build.

Six synthetic scenes cover an unrelated `scores` programming example, statistic, dense three-step flow, comparison, relationship diagram and minimal CTA. Arabic text, Latin code, digits, punctuation and multiline captions are included. The process explicitly opts into stacking; other layouts remain distinct. Synthetic storyboard approval is clearly labeled and cannot approve a production project.

## Scope limits and deferrals

Browser geometry samples 25%, 50%, 75% and 90% of each scene; exact seek tests include entrance, hold, exit and authored motion beats. These checks do not prove absence of every possible unsampled transient collision or assess speech intelligibility. HyperFrames' motion checker is disabled in the installed version; independent seek and motion-advisory checks provide separate evidence, not a claim that it ran.

Style work remains: optical scale, font selection, themes, decorative treatments, branding, deliberate whitespace and per-style alignment. Small labels and diagram typography remain visible review findings; they are not suppressed or automatically enlarged.

Later engine work: broader domain-neutral persistent-object adapters, richer diagrams, arbitrary multi-cell extraction, larger content stress matrices, full animation-interval geometry coverage and independently tested nonvertical frames. Phase 2 remains separate: AI image/video generation, B-roll, external provider workflows and resource-pack acquisition are not added here.
