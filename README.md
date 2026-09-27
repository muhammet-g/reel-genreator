# Remotion motion engine

Finished narration and a compact structured plan produce deterministic motion graphics.
React/TypeScript + Remotion are the actual renderer. Planning stays independent of it.

Designed by **E.B.E - powered by E-VIAS**. Original materials are CC0; credit is voluntary.
Third-party dependencies and creator-supplied assets retain their own terms.

## Start

Node 22+ and a local Chromium browser are required. Windows Edge was tested.

```powershell
npm ci
npm run doctor
npm run new -- MyProject path/to/finished-audio.wav
```

Author `projects/MyProject/project.json` with narration, measured phrase times,
semantic scenes, visual objects and motion. Intake creates an explicitly unplanned
placeholder; it does not transcribe or invent a storyboard.

```powershell
npm run check -- projects/MyProject/project.json
npm run studio -- --props=projects/MyProject/project.json
npm run check:browser -- projects/MyProject/project.json
npm run render -- projects/MyProject/project.json
```

Every render gets a new folder under `projects/remotion-renders/<id>/` containing
MP4, representative PNGs, project snapshot and verification report. Audio and all
project media stay local in ignored `projects/`. Existing exports are never overwritten.

## Synthetic example

```powershell
npm run fixture
npm run studio -- --props=projects/remotion-fixture/project.json
npm run render -- projects/remotion-fixture/project.json
```

The fixture is synthetic and demonstrates Arabic captions, persistent objects,
camera, a carry transition, local SVG and an explicit SFX cue. It is not customer work.

## Engineering

For coordinated scene motion, use `choreograph(project, recipes)` or `npm run choreograph`.
See [motion language](docs/motion-language.md) for five presets, semantic staggering,
intentional reading rests and camera/transition continuity. `npm run motion:demo`
prepares a five-scene silent before/after comparison using the existing visual identity.

`npm test` runs deterministic unit checks; `npm run typecheck` checks TypeScript.
Read [architecture](docs/architecture.md) for boundaries and verification limits.
Task-specific guides: [timing](docs/timing.md), [scenes](docs/scenes.md),
[motion](docs/motion.md), [camera](docs/camera.md), [resources/style/SFX](docs/resources.md).

The representative private-data import/check is `npm run import:references` followed
by `npm run check:references`; it requires the two existing project folders and never
executes their legacy builders. Ordinary new projects do not need this adapter.

See [migration evidence](docs/migration.md). `legacy/` is an inert reference archive,
outside the new runtime and skill discovery. Historical media in `examples/` and
old guide exports in `output/` are preserved; they are not Remotion examples.
