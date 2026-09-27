# Remotion migration

Baseline: `f5dcf75` on `feature/style-system-v1`; migration branch `codex/remotion-engine`.
Existing project media and exports remain in ignored `projects/`.

## Gates

- [x] Pure timing, planning and state contracts with adversarial tests.
- [x] Independent React/Remotion entry and a rendered synthetic fixture.
- [x] Immutable audio, local fonts, Arabic captions, assets and explicit SFX.
- [x] Persistent objects, camera and transitions with direct-frame determinism.
- [x] Generic Motion-Only and JavaScript functions reference projects ported.
- [x] Complete output/audio verification and representative frame inspection.
- [x] Dependency independence proven before legacy isolation.
- [x] Minimal default instructions and targeted documentation.

## Evidence (2026-09-27, Windows / Edge)

Checkpoint `dbe1d0c` preserves the independent replacement alongside the intact old
layout. Fourteen deterministic tests, TypeScript and the private reference integration
check pass. `npm ls hyperframes gsap --all --json` shows neither dependency installed.
Import/subprocess guards prohibit the former runtime in active TypeScript.
Studio compiled successfully and served HTTP 200 on localhost; the temporary preview
server was stopped after the check. Zod is pinned to Remotion CLI's required 4.5.4.
Studio/browser esbuild checks needed normal Windows filesystem access outside the
restricted agent shell sandbox; normal local execution was verified.

| Local output under `projects/remotion-renders/` | Master seconds | Video frames / seconds | Verification |
|---|---:|---:|---|
| `Synthetic/run-NTRiag/final.mp4` | 6 | 180 / 6 | Full decode, audio hash, frame/FPS/format checks; rendered after legacy isolation and dependency uninstall |
| `FunctionsRemotion/run-DTExQ7/final.mp4` | 94.9812291667 | 2850 / 95 | Full decode and registered derivative audio identity |
| `ArraysRemotion/run-FzUYQL/final.mp4` | 65.64 | 1970 / 65.666667 | Full decode and registered derivative audio identity |

All use 1080×1920, 30fps, H.264 yuv420p/BT.709 and AAC. The longer picture duration
is the documented ceiling-to-frame policy; original sample counts are unchanged.
Each output directory contains its verification JSON and first/middle/last PNGs.
New renders also retain exact props and only their own selected assets in the bundle.

Browser checks under `projects/remotion-checks/` cover 139 function-project frames,
87 array-project frames and 10 synthetic frames. Each includes four direct-seek
comparisons against a fresh page. The final synthetic comparisons are pixel-exact.
Checks include measured safe areas, collisions, clipping, readable text and captions.
Declared cross-scene blends permit temporary overlap; push transitions permit travel
outside the safe area only while that explicit transition is active.

`reference-equivalence.json` checks unchanged original audio hashes, every source
phrase and its times (36 function / 29 array), all 34 named function events, seven
function scene boundaries, receive/return ownership, progressive syntax, final causal
relationship and array selection. This is conceptual reproduction, not pixel parity.
The original visual layout was reauthored for reusable primitives.

## Preserved intelligence

| Former responsibility | New owner |
|---|---|
| motion_audio / core media checks | `tools/media.ts`: hash, decoded samples, immutable master, derivative lineage, full output decode |
| storyboard / design contracts | `contracts.ts`, `validate.ts`: authored semantics, hierarchy, uncertainty, visual reason and contiguous timing |
| choreography / program / code examples | persistent object state, named events, typed array selections and label changes; representative import adapter |
| layout / layout adapter | normalized boxes, roles, caption zone, measured `spatial.ts` and browser checks |
| resources / SFX | compact catalog, deterministic ranking, hash-verified staging, explicit sample-delayed local mix |
| style / composition bidi | independent project tokens, local font roles, React `MixedText`, measured captions |
| motion_render | Remotion registration and Node renderer; no HTML/GSAP builder underneath |

Camera and first-class transition tracks are new. Schema validation does not interpret
speech. No Gemini, provider calls, upload, voice generation or recording cleanup ran.

## Isolation and recovery

Automatic approval rejected a broad permanent deletion. The safer completed action
preserved the old implementation, manuals and six skills under `legacy/`, outside
runtime imports and automatic skill discovery. Seventy-seven archived implementation,
documentation and skill files were hash-compared with baseline Git and are unchanged.
Old source/exports in `projects/`, historical `examples/`, assets and guide PDFs remain.

The archived scripts are references, not supported entry points. Their original
relative layout and dependencies can be recovered in a separate worktree at `f5dcf75`.
Do not run old ignored project builders against the new root: their Python imports
were intentionally removed from the active architecture. Default work needs no archive.

## Limits and remaining review

- Technical checks and frame inspection are complete; human full-playback, wording
  approval and subjective art-direction acceptance are not claimed. Imported captions
  remain proposed, and all verification records keep `creatorAcceptance: false`.
- Browser sampling is finite, not exhaustive proof of every possible intermediate frame.
- Current visual resources support images/SVG. Video/image-sequence source assets are
  retained on demand; a dedicated tested Remotion adapter is required before using them.
- Camera is 2D with bounded movement and modest parallax. It is not a 3D renderer.
- Windows/Edge was tested; other operating systems were not.

## Decisions

Planning is JSON validated at the boundary. The browser never imports Python,
legacy builders, GSAP or HyperFrames. Node tools handle media identity, staging
and verification. React components only render deterministic state at a frame.

Time uses integer audio samples with a single sample rate per project. Frame
boundaries are computed from absolute sample positions with integer arithmetic,
never by adding rounded scene lengths. Duration rounds up to preserve the tail.

Persistent objects belong to a project, not a scene component. Semantic ownership
is explicit; world coordinates avoid accidental double transforms when a token
enters a container. Camera movement is separate from object movement. Captions
remain in screen space.

Schemas describe interpretation; they do not understand speech. Creative plans
retain narration references and uncertainty. Editorial asset restrictions are
project policy, separate from provenance and file-integrity enforcement.

Legacy deletion is conditional on the gates above. Incomplete proof must be
reported as incomplete; an MP4 alone does not establish conceptual equivalence.
