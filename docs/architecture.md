# Remotion engine

Read only the module relevant to a task. A normal scene task needs its project's
`project.json`, the relevant contract fields, its style and selected resources.

## Boundaries

| Responsibility | Location |
|---|---|
| Versioned renderer-independent plan | `src/engine/contracts.ts` |
| References, timeline coverage, conflicts, ownership | `src/engine/validate.ts` |
| Sample/frame math | `src/engine/time.ts` |
| Persistent object and camera state | `src/engine/state.ts` |
| Scene relationship mechanics | `src/engine/transitions.ts` |
| Resource ranking, energy/density defaults, advisories | `src/engine/planning.ts` |
| Measured layout constraints | `src/engine/spatial.ts` |
| React presentation and bidi | `src/remotion/ProjectComposition.tsx`, `Text.tsx` |
| Remotion registration | `src/remotion/index.ts` → `Root.tsx` |
| Master intake, derivatives, hashes, verification | `tools/media.ts` |
| Local MP4 render | `tools/render.ts` |

Reasoning authors semantic intent. Validation does not understand speech.
The scene plan records narration, purpose, importance, teaching object, hierarchy,
structure, relationship, density, visual reason, source and uncertainty. Objects,
motion, camera and transitions have separate tracks. All tracks use the same
audio sample clock. Styles cannot rewrite narration, timing or identity.

Objects use normalized world coordinates, stable IDs and optional scene scope.
An object without scene scope persists across sections. Ownership is semantic;
it never implicitly adds a parent transform. This prevents double movement when
a function enters another function. Relationships remain inspectable at any frame.

Node tools alone touch files and media processes. Browser rendering has no Python,
provider or legacy builder dependency. JSON is data, never executable instructions.
Private audio, staged assets, plans, checks and exports stay under ignored `projects/`.

## Verification

1. `npm test` and `npm run typecheck`: contracts and deterministic mechanics.
2. `npm run check -- path/to/project.json`: schemas, hashes, planning advisories.
3. `npm run check:browser -- path/to/project.json`: real local fonts, measured
   clipping/collisions, safe areas, minimum text size, caption bounds, four
   history-vs-fresh seeks. Samples boundaries, beat starts/midpoints/ends.
4. `npm run render -- path/to/project.json`: H.264/AAC MP4, full decode, frame
   count, FPS, dimensions, duration and final decoded audio identity.
5. Review playback, meaning, wording, first/last phrase and representative frames.

Browser sampling is not an exhaustive proof for every frame. Seek checks require
identical DOM/state/geometry. SVG raster edges allow <=0.01% changed channels with
delta <=32/255; exact pixel matches are reported separately. No visual or technical
test records creator acceptance. Captions retain their proposed/verified status.

Windows with installed Edge is tested. `REMOTION_BROWSER`, `FFMPEG_PATH` and
`FFPROBE_PATH` override executable discovery. Other operating systems require
their own validation; no automatic browser download is required by our commands.
