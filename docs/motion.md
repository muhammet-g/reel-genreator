# Motion and transitions

For new scenes, prefer the authoring compiler in `src/engine/motion-language.ts`.
Read [motion-language.md](motion-language.md) for presets, hierarchy, reading rest,
semantic stagger and camera/transition coordination. The tracks below remain the runtime.

Motion cues target an object ID, have a trigger and duration, and describe the
destination state. Intents: entrance, emphasis, exit, hold, move, state, path.
Easings: linear, smooth, out, in and productive/expressive enter, standard, exit.
An optional `from` state gives a seek-safe explicit start. A quadratic control point creates a curved path.
String labels, selected indices and ownership change at the cue start. Continuous
properties interpolate. Independent properties may animate together; conflicting
overlaps on the same property are rejected.

`objectStateAt` reconstructs from initial state and ordered cues at every sample.
No effects mutate timeline state; no playback history, selectors, randomness or
wall clock are involved. Named events preserve meaning when timing is revised.

`motionDefaults` derives suggested durations from style energy and scene density.
These are authoring defaults, not an instruction to animate every word.
`motionAdvisories` flags repeated entrances and excess camera activity for review.
Silence and stillness are valid choices.

Transitions connect adjacent scenes exactly at the incoming boundary. Cut, carry,
match and continuation retain the same persistent IDs without duplicating them.
Fade/focus blend scene-scoped objects; push shifts them; wipe/reveal clip them.
`shared` objects must be project-scoped. The transition reason explains the semantic
relationship. Plan object movement once: do not also add an entrance for an object
already carried by the transition. The contract is intentionally independent of
Remotion's component lifetime.
