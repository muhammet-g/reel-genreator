# Semantic choreography correction

## Reference study (before implementation)

Principles are adapted to narrated vertical education; no branded layouts, animation sequences, or assets are copied.

- [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion): every movement must help explain a change; retain legible static end states, and avoid gratuitous movement. The canonical page requires JS; its official indexed text was also reviewed.
- [Material Motion](https://m1.material.io/motion/material-motion.html) and [Choreography](https://m1.material.io/motion/choreography.html): preserve a focal object across transitions, stage construction, and show relationships through movement. Use a consistent easing vocabulary, one primary action at a time, and reading holds. UI timing ranges are guidance, not narration timing requirements.
- [Motionographer inspiration](https://motionographer.com/inspiration/) and its [ChikaBOOM process article](https://motionographer.com/2026/07/27/practice-makes-magic-the-human-hands-behind-chikaboom/): use the curated editorial/process material as a craft reference. It is not evidence that a particular animation was watched or a template to reproduce. Judge rhythm and storytelling separately from runtime correctness.
- [Codrops GSAP hub](https://tympanus.net/codrops/hub/tag/gsap/) and [Highlights](https://tympanus.net/codrops/hub/gsap-highlights/): technique inventory includes masks, typography, SVG paths and grid transformations. Adapt only techniques that explain the content; no demo code or media is imported.
- [GSAP Timeline](https://gsap.com/docs/v3/GSAP/Timeline/) and [MotionPath](https://gsap.com/docs/v3/Plugins/MotionPathPlugin/): sequence tweens at explicit timeline positions; keep a paused, seekable timeline; retain children for backward seeks. Local MotionPath can move copied result tokens along controlled curves without wall-clock callbacks.

## Rules for short vertical lessons

1. Name the teaching action before selecting motion.
2. Preserve the subject when only the explanation changes.
3. Show cause, operation, then consequence; never reveal all three at once.
4. Keep one dominant moving object and a stable spatial reference.
5. Use small secondary emphasis only on the object the narration describes.
6. Leave a readable hold after each operation; preserve the narration's pauses.
7. Move code as tokens, but keep the full expression in one LTR isolation boundary. Do not split Arabic into letters.
8. Make type distinctions visible through structure, not color alone.
9. Do not attach a global push to every scene; translation needs a spatial reason.
10. Review sequences over time, including boundary frames and random-access seeks. Automated layout checks do not assess design quality.

## Diagnosis of rejected Step 3

The saved plan actually uses `rise` for scenes 2–10, a horizontal mask for scene 1, `hold` followed by abrupt hiding for all ten exits, and `cut` transitions. Thus it does not literally have ten horizontal slide tweens. Its repeated whole-container entrance/reset creates the perceived slide-deck behavior. The engine additionally permits a global push to add horizontal movement to every entrance and a horizontal slide exit. These defaults and whole-scene animation are the reusable problem.

Scenes 2–9 recreate the identical array instead of retaining it. The traditional-index scene displays the final expression without evaluating length/subtraction. Slice returns a static card rather than copying a selected cell into new brackets. Only scene 8 has a rudimentary index switch; it replaces attributes rather than moving a persistent indicator. Scene 10 is two cards. Generic headline emphasis is decorative when it does not point at the operation.

## Missing reusable patterns and planned implementation

| Pattern | Meaning | Implementation |
|---|---|---|
| Staged construction | A structure is assembled | Container, cells, then indexes |
| Semantic evaluation | An expression yields a value | Timed reasoning states and count highlights |
| Token construction | Method/argument structure | Escaped lexical tokens within one LTR code object |
| Object carry-over | The subject is unchanged | One persistent array DOM object shared by adjacent scenes |
| Path focus | Position from the end | Shared focus indicator moves to actual cell coordinates |
| Extraction/copy | A method returns a new structure | Copied cell follows a curve; source stays intact |
| Result transformation | Element versus Array | Brackets construct around returned value |
| Mask reveal | New concept enters attention | Vertical text mask; no whole-scene slide |
| Connector growth | Count relates to index | SVG stroke draw with staged values |
| Focus reduction | Simpler expression | Existing array recedes while hero code settles |
| Behavioral comparison | Different operations | Select in place versus copy into container |

The visual tokens and existing local fonts remain unchanged. Approved local arrow/focus resources were evaluated; the array's fitted focus outline and extraction path are procedural because they must track cell geometry exactly. A local arrow may serve the count/index relationship. No external resource packs or new dependency are needed.

## Authoring and validation

`choreography.family` chooses an operation, with optional `beats` in seconds relative to the scene. Supported beats are `build`, `indexes`, `expression`, `focus`, `result`, `count`, `reduce`, and `compare`. They must leave at least 0.4 seconds to settle. This is operation timing, not a new audio timeline.

Programming scenes use `code_array.object_id` to retain one array across contiguous scenes. Variable and cells must match for that identity. `tokens` must concatenate to the exact `expression`; optional `token_times` are ordered scene-relative seconds. `reasoning` consists of ordered `{text, value, at}` states, authored as visual explanations without executing arbitrary JavaScript. `previous_expression` enables an expression replacement in place. The current extraction primitive copies one selected cell into a one-item Array; unsupported multi-cell extraction is rejected rather than silently misrepresented.

Every composition writes `motion-design-check.json`: repeated entrance families, dominant directions, identical choreography and slide reliance are deterministic advisories. They never silently rewrite a plan or grant creative approval. HyperFrames structural/editor advisories remain separate.

Run `node scripts/check-motion-seek.cjs COMPOSITION_DIR CHROME_PATH REPORT_JSON` to compare fresh seeks against a forward/backward history at boundaries, midpoints and operation beats. It blocks external requests, checks runtime errors and compares actual screenshot hashes. The focus ring uses a consistent compositor layer to avoid history-dependent edge rasterization. MotionPath is copied from the existing pinned local GSAP dependency.
