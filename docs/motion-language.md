# Motion language: author intent, compile once

Use `choreograph(project, recipes)` from `src/engine/motion-language.ts` for new
scene work. It returns `{project, phases, activity, warnings}`. Render the returned
project through the normal Remotion path. Do not call the compiler per frame.

```ts
const result = choreograph(project, [
  {scene: 'opening', preset: 'expressiveReveal'},
  {scene: 'steps', preset: 'cascade',
    stagger: {strategy: 'directional', direction: 'down', strength: 'normal'}},
  {scene: 'formula', preset: 'softReveal',
    active: {kind: 'rest', reason: 'Read the exact expression'},
    emphasis: [{target: 'keyword', at: {event: 'meaning', offset: 0}}]},
  {scene: 'explanation', preset: 'focusPush',
    active: {kind: 'focus', target: 'teaching-object'},
    transition: {direction: 'left', reason: 'Continue the demonstrated flow'}},
]);
```

IDs/events must exist in your project. Emphasis must fit after landing and before
exit. For JSON authoring, put the recipe array in a separate file:

```powershell
npm run choreograph -- projects/MyProject/project.json projects/MyProject/motion.json projects/MyProject/compiled.json
npm run check:browser -- projects/MyProject/compiled.json
npm run render -- projects/MyProject/compiled.json
```

The CLI refuses to overwrite outputs. Edit the source plan and compile to a new
file; do not apply recipes again to an already compiled camera track.

## Five presets

| Preset | Problem it solves |
|---|---|
| softReveal | Functional text lands quickly; restrained presentation movement |
| expressiveReveal | A primary idea leads through a larger, still bounded entrance |
| cascade | Hierarchy/spatial staggering for cards, lists and supporting information |
| focusPush | Slower entrance and bounded camera attention toward the teaching object |
| directionalFlow | Camera anticipates a directional transition and crosses its boundary |

These are defaults over one compiler, not five separate animation implementations.
`style` may be productive, expressive or cinematic. Style here means motion timing
and amplitude; it never changes colors, fonts, dimensions or visual identity.

Generated entrances, emphasis, camera moves and scene bridges use `settled`, a
finite, deterministic spring-like curve with no bounce and zero velocity at both
ends. This changes the movement feel without shifting narration events or cue
durations. Exits keep a symmetric smooth curve so outgoing content remains
legible through the handoff. Explicit authored easing still takes precedence;
`spring` remains available when a deliberate spatial overshoot is wanted.

## Decision rules for scene authors

- **Productive:** explanations, subtitles, metadata, dense technical content. Small
  distances and quick arrival keep the reading task primary.
- **Expressive:** headline, significant reveal or contrast. Reserve the strongest
  movement for the primary object; secondary/context roles receive .62/.3 strength.
- **Cinematic:** a slower attention shift toward a meaningful subject. Use sparingly.
- **Camera:** one bounded push, pull, drift or focus during a reading interval. The
  default reverses to a gentle pull when accumulated zoom has reached its useful range.
  No looping drift. An explicit `active.at` may tie focus to a named semantic event.
- **Rest:** formulas, code inspection, sensitive/complex statements, or a conclusion
  that needs quiet. Supply a reason. Rest can include one deliberate emphasis beat.
- **Stagger:** use hierarchy when one thing leads; directional for spatial lists;
  center/wave for a group radiating outward; semantic when narration dictates order.
  Do not stagger simultaneous comparison labels that must be read together—use center
  on a symmetric pair or author that group's existing low-level cues explicitly.
- **Text:** animate complete text blocks through their role. `MixedText` keeps Arabic
  shaping and LTR expression isolation. Existing timed label/token changes still work.
  Do not split Arabic letters to manufacture activity.
- **Emphasis:** bind it to a real event, then release it. Avoid periodic pulsing or
  emphasizing every word. Scale/focus reinforce existing palette and hierarchy.

Stagger strategies: start, end, center, wave, directional, hierarchy, semantic.
Strength: subtle, normal, expressive. Semantic order must list each target exactly
once. Delay spread is compressed to fit short scenes and capped at 450ms.

## Phases and continuity

`entryFamily` and `exitFamily` are optional scene-level choices. Entries support
`spatial`, `codeScan`, `heroDepth`, and `groupAssemble`; exits support `none`,
`codeDeconstruct`, `heroDepart`, and `groupCascade`. Code effects reveal or remove
the code object through a local mask; hero effects add bounded depth and movement.
Group families use the existing stagger logic. These are semantic treatments of
the teaching object or group, not full-frame effects. Recipes that omit the fields
retain their existing behavior.

When an exit is selected, its interval is reserved at the end of the scene, so
active camera travel ends before it. If a transition follows, the exit starts
before the boundary and finishes during that transition; outgoing content is still
visible as incoming content arrives. Persistent objects shared with the following
scene skip generated exits and entrances. A bridge carries the camera through the
boundary and records those shared IDs. Inspect selected stills near both sides of
the boundary, then use `check:browser` for sampled layout and seek consistency.

The compiler budgets entrance, settle, active, optional shift and exit from actual
scene duration. It uses existing energy/density defaults, bounded delays and a short
reading landing, not a fixed percentage template. Very short scenes omit active
camera motion. The phase report explains the generated intervals in sample units.

Persistent objects are never re-entered or reset. Existing authored object tracks
are preserved. Authored entrances finish before generated reading-camera motion.
Camera/property conflicts fail validation rather than silently moving or dropping
someone's cues. Use `targets` to limit which scene-scoped objects the recipe introduces.

Directional transitions own outgoing/incoming travel. Incoming objects do not also
play a second entrance. The camera begins a small pan before the boundary and finishes
after it; its state is inherited by the next scene. No reset to neutral at each cut.
Left/right/up/down are supported. Legacy transitions keep their original default.

## Creative preferences and technical checks

Quiet recipes retain the original small travel, scale, camera and stagger values as
**preferences**, preserving existing projects. They are not creative ceilings.
`creative` can name `restrained`, `normal`, `expressive`, `cinematic` or `hero` weight
with a visual reason. The compiler considers scene duration, object role and available
space; it may propose larger travel, scale or camera moves. An author can optionally
set entrance travel/scale/rotation/easing and camera zoom delta or target center for
an exceptional visual decision. The viewer normally supplies the teaching goal, not
these numbers. `spring` is a deterministic spatial easing with a brief overshoot;
opacity continues on a monotone curve. Presets remain starting points.

The compiler samples the proposed entrance and camera paths against visible objects,
including rotated bounds. If an ambitious move would leave the safe area, it reduces
that move and reports a warning. Existing authored tracks still take precedence.
This estimate cannot see glyph clipping or all collisions: `check:browser` measures
real rendered frames, including typography and RTL. Camera/property conflicts,
identity continuity and transition ownership remain hard validation rules.

Semantic easing families live in `easing.ts`: productive/expressive enter, standard,
exit. They follow the bezier references in the task brief, solving x(time) correctly.
The older linear/smooth/in/out curves remain available. No animation dependency was added.

Recipes compile into existing `motions`, `camera`, `transitions`. Optional contract
fields include `motion.from`, a local `motion.effect`, and transition
`direction`/`ease`/`kind`. The renderer remains deterministic and sample-driven.

`motionActivity` reports moving-track fraction and longest still interval. These are
coverage measurements, **not perceptual quality scores**. The compiler distinguishes
explicit rest from suspicious long holds; it warns instead of adding random movement.

## Avoid these patterns

Independent arbitrary delays in components; simultaneous equal-strength entrances;
fade-in followed by an unexplained long freeze; global always-on drift; resetting a
persistent token at every scene; duplicating entrance and transition travel; expanding
camera motion merely to improve a coverage percentage. Keep creative decisions tied
to narration, and deterministic mechanics in the engine.

## Demonstration and verification

`npm run motion:demo` prepares five silent scenes using existing Code Dragon tokens,
Cairo/Inter/JetBrains Mono and text/value/function primitives. No music or imagery was
added. `projects/motion-language-demo/before.json` has identical layouts and timings,
but only the old fade-in-and-hold behavior. The new `project.json` uses recipes; the
adjacent report explains phases, rest and activity measurements. `source.json` and
`recipes.json` reproduce the same compiled project through the JSON CLI.

Verified local exports:

- After: `projects/remotion-renders/MotionLanguage/run-04874V/final.mp4`
- Before: `projects/remotion-renders/MotionLanguageBefore/run-dJyYmJ/final.mp4`

The control has 5.5 seconds of stillness after each half-second entrance. Four new
scenes reduce the longest unplanned gap to .22 seconds through bounded movement;
the emphasis scene deliberately retains 2.92 seconds of reading rest. Do not optimize
these figures as a quality target; inspect the video and the narration's needs.

Local evidence: 23 unit tests, TypeScript, existing private reference checks, and
101 measured demo frames with 10 fresh/history seek comparisons passed. Both 30s
MP4s passed full decode, audio identity, 900-frame/30fps/1080×1920 format checks.

Remaining limits: static bounding-box estimates do not understand narration or moving
object/camera conflicts perceptually; browser sampling is finite. The deterministic
renderer still scans object tracks per frame, so very large projects may eventually
benefit from an indexed compiled timeline. No new runtime framework is needed for that.
