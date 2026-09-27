# Resources, sound and style

`resources/catalog.json` is the compact local catalog. `tools/resources.ts` validates
and stages one selected asset; a project contains only the resources it actually uses.
Metadata: stable ID, hash, provenance/license, review state, tags, compatible scene
types, energy, style compatibility, loopability and duration. `rankResources` filters
and scores deterministically, returning reasons. A score does not approve an asset.

Images/SVG and audio are supported by current primitives. Video metadata may remain
in the catalog for planning, but image objects reject video resources. Image sequences
and video need a dedicated tested renderer adapter before use; their source assets are
preserved. Do not silently turn an unsupported resource into an image.

SFX cues specify resource, named event plus offset, gain, trim and duration. All time
values use the master sample clock. FFmpeg resamples, trims, delays by exact samples
and mixes without automatic normalization. Maximum per-cue gain is 0.25; still review
the finished mix for audibility and clipping. Empty SFX is valid. No automatic noise.

Styles are project presentation tokens: palette, Arabic/Latin/code font roles, local
font files/hashes, radius, caption size and motion energy. Optional logos are normal
reviewed image objects. Style changes cannot rewrite semantic data or timing. Reuse
the existing Code Dragon palette in the fixture or author another token set.

Files are staged under content hashes in ignored `projects/remotion-public/`.
Verify before and after rendering. Staged Fontsource fonts carry their local license
notice. Original materials are CC0; dependency and supplied-asset terms remain separate.
No network lookup, paid call or upload is part of resource selection or rendering.
