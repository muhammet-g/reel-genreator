# Camera track

The camera is a separate world-to-screen transform. Default is static at (.5,.5)
with zoom 1. Captions do not follow it.

Cues express static, zoom, push, pull, pan, focus, follow, settle or drift intent.
Each has trigger, duration, x/y, zoom, intensity, easing and a settle declaration;
target is optional. Intent names document the choice; endpoint values determine
the actual deterministic transform. There is no procedural endless drift.

Focus samples its subject at cue start. Follow samples the target through the cue,
then freezes its endpoint. Later cues interpolate from that settled state. Camera
overlaps are rejected. `settle` documents the authored end state; movement is bounded
for all cues, so a later move must be explicit. Object depth adds subtle horizontal
parallax. This is a 2D camera, not a 3D scene graph.

Use restrained intensity, leave readable holds, and avoid simultaneously moving the
subject and camera without a reason. Every camera plan goes through measured spatial
checks. Changing camera must not change narration, object ownership or caption timing.
