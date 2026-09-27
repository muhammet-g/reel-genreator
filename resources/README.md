# Local resources

Use `catalog.json` for the Remotion planner and `tools/resources.ts` to stage a
selected asset with hash verification. Read `docs/resources.md` only for resource,
SFX or style work. No provider or upload is needed.

`manifests/resources.json` retains original provenance and richer inspection data
for historical assets. It is on-demand reference data, not a runtime dependency.
The image sequence and alpha video remain preserved; the current core renders
images/SVG and audio, and rejects unsupported visual media rather than guessing.
