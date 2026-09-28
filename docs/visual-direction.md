# Visual direction and fast iteration

The project has no runtime AI director. First understand the narration, its scene
purpose, hierarchy, teaching object and neighboring scenes. An author chooses an explicit `intent` for
each scene: `explain`, `reveal`, `sequence`, `compare`, `inspect`, `connect`, or
`conclude`. Optional semantic `priority` is `passing`, `important` or `hero`;
the scene's `importance: key` also counts as important. `directScenes` uses intent,
priority, focus, density, duration and neighboring scenes to choose a starting
recipe and contextual creative weight. It returns a reason and review prompts.
It does **not** infer meaning from speech, match keywords or override authored
tracks. Review the choices before compiling them.

`relationship` can describe how a scene hands off to the next one: `independent`,
`continuation`, `replacement`, `contrast`, `detail`, or `overview`. A persistent
object ID shared by both scene hierarchies defaults the relationship to
`continuation`. The director uses the relationship, teaching-object kind and
priority to suggest local entrance/exit families and a push, focus or continuation
transition. An explicit continuation without a shared object produces a review
prompt. These are proposals; inspect the compiled boundary in preview.

```json
[
  {"scene":"opening","intent":"reveal","focus":"main-concept","priority":"hero"},
  {"scene":"steps","intent":"sequence"},
  {"scene":"formula","intent":"inspect","focus":"expression","restReason":"Read the expression"},
  {"scene":"handoff","intent":"connect","flow":"left"}
]
```

```powershell
npm run direct -- projects/MyProject/project.json projects/MyProject/visual-intents.json projects/MyProject/direction.json
npm run choreograph -- projects/MyProject/project.json projects/MyProject/direction.json.recipes.json projects/MyProject/compiled.json
npm run preview -- projects/MyProject/compiled.json --scene formula --event keyResult
npm run check:browser -- projects/MyProject/compiled.json
npm run render -- projects/MyProject/compiled.json
```

`preview` bundles the existing Remotion composition and writes only selected stills
to a new ignored run folder. `--scene` captures its start, middle and last visible
frame; `--event` captures a named event; `--frame` captures an exact frame. Options
can be repeated. It checks asset hashes but does not render video, validate every
frame, or verify final audio. Use the browser checker and full export for final QA.

For ordinary explanation, leave priority at its default and use the existing
restrained recipe. Give `important` or `hero` only to a genuine teaching, story or
transition beat. The director may then propose stronger entrances, focus and camera
travel without requiring the creator to supply zoom, pixels or easing. Safe-area
sampling adapts the proposal; measured browser checks remain the final layout gate.
An exceptional scene can set `creative` values in a motion recipe directly.

For ordinary groups, `placeObjects` in `layout-primitives.ts` can center one object
or place a stack, row or grid inside a chosen normalized zone. It respects RTL row
order and rejects objects that do not fit their cells. Pass the project's safe area
or a smaller zone that reserves a heading/caption region. It returns new objects;
the renderer and existing project schema stay unchanged. Inspect actual text bounds
with `check:browser` because geometric cells cannot predict glyph width.

## Reusable project learning

Promote a finding into this guide or an existing narrow document only when it
works in more than one scene/project and has a clear reason and validation method.
Keep one-off prompts, failed experiments and visual variants with the ignored
project that produced them. Do not add them to `AGENTS.md`. Reuse existing presets,
components and tokens before introducing a new motion primitive. Preserve an
explicit escape hatch through authored tracks when the vocabulary is insufficient.

## Reference decisions

| Idea | Decision | Reason |
|---|---|---|
| Natural-language scene iteration and precise frame feedback (video 1) | MERGE | Map reviewed intent to existing compiler; add selected-frame preview. |
| Reusable branded assets (video 1) | KEEP | Project style tokens and reviewed resource catalog already provide identity. |
| Input-driven reusable motion library (video 2) | MERGE | Keep one compiler with configurable presets; no second runtime framework. |
| Skill/rule guidance (video 2) | ADOPT narrowly | One on-demand guide; keep default agent context short. |
| New transcriber, music provider, asset marketplace | REJECT | Finished audio and local reviewed assets are the workflow; providers need separate authorization. |
| Charts, maps and large template gallery | EXPERIMENT | Add only after a concrete project needs them and a visual check proves reuse. |

Sources: [video 1](https://www.youtube.com/watch?v=Xdy1vkhSz-M) and
[video 2](https://www.youtube.com/watch?v=t9M38QMcUSA). The available public
descriptions/chapter summaries support these workflow themes; no unverified
implementation details from the videos were copied.
