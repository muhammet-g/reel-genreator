# Motion-Only Resource System v2

This local library extends the committed Motion-Only foundation. It uses no provider API, no asset crawler, and no user media. The Master Audio remains immutable.

## Import and review

`python reel.py import-resource path/to/asset` inspects format, dimensions, duration, frame rate, transparency, audio presence, and file hash, then suggests a category, tags, style tags, and energy. A bare import is **unreviewed** with an unverified license and cannot be selected. Review the actual content and provenance before using `--license CC0-1.0 --source "..." --safety approved`; visual media also needs `--motion-only-safe`. Set `--scene`, `--tag`, and `--style-tag` when useful. Numbered PNG directories need `--sequence-fps 30`. Import never overwrites an ID or a different file with the same hash. Reimporting the same ID and hash returns cached metadata without media inspection.

`python reel.py refresh-resource ID` reinspects a replaced registered file. A changed hash revokes approval and Motion-Only eligibility until a person reviews it again. Invalid or missing paths stop selection. Manifest v1 remains readable; new imports save v2. The v2 entry records source, author, license, license URL, imported time, content safety, useful and avoid contexts, technical metadata, semantic/style tags, compatible scenes, and visual weight. Irrelevant fields are optional.

For an After Effects export, put the output under `resources/video/alpha`, `resources/image-sequences`, `resources/svg`, or `resources/lottie`, then import it. `.aep` is not read.

## Selection and fallback

`rank_resources` returns an explainable, stable score. It requires approved content, a supported recorded license, local file/hash integrity, Motion-Only eligibility, and render compatibility. It filters by scene compatibility, duration/loopability, requested transparency, and optional aspect ratio. It scores semantic tags first, then scene type, energy, style, duration, and a small SVG preference. Ties use ID order. `resource_id` selects an explicit approved asset; `resource_tags` asks the ranker. When no suitable asset exists, the scene's built-in component remains. External sources are only provenance candidates until separately acquired, licensed, reviewed, and imported.

The practical reuse order is approved local resource, built-in scene component, separately approved external source, procedural motion, then a custom one-off effect. The manifest taxonomy covers text, UI, infographic, transition, accent, and SFX vocabulary.

## Actual render support

| Format | State | Rendering behavior |
| --- | --- | --- |
| SVG | Rendered | Strictly sanitized and inlined; authored colors remain, `currentColor` can use a scene color token. Scale, position, opacity, and aspect ratio are controlled by scene placement. |
| PNG/JPEG/WebP | Rendered | Local static image in the scene, with scale, position, opacity, and aspect ratio. |
| VP9/WebM with alpha | Rendered and locally verified | FFmpeg/libvpx confirms a nonopaque decoded alpha channel; HyperFrames seeks the root-level video and the preview visibly composites it. |
| Standard MP4/H.264 or WebM | Rendered | Root-level timed muted clip with `data-media-start` trim. A short nonlooping asset ends at its natural duration. |
| Numbered PNG sequence | Rendered | Validates contiguous numbering and identical frame dimensions, then selects frames from composition time at the recorded FPS. Maximum 300 frames. |
| WAV/MP3/OGG SFX | Rendered | Approved cues are trimmed, delayed, faded, limited and mixed into a separate AAC artifact. |
| Lottie JSON | Metadata only | Direct browser playback would require a new player and a verified frame-seeking adapter. No dependency was added solely for this format. |
| MOV, including ProRes alpha | Metadata only | This Windows/HyperFrames path has not validated reliable in-browser alpha playback. Do not place MOV in a production scene. |

Use scene `resource_placement` with optional `x`, `y`, `width`, `opacity`, `color` (a style token for SVG), `trim_start`, and `loop`. Placement is bounds checked. A requested loop of a loopable video is baked into a cached, finite derivative so any HyperFrames seek maps to a real frame; the source asset remains unchanged. Looping and trimming cannot be combined until a trimmed loop has been exported. Videos are direct children of the HyperFrames composition with unique IDs; nesting a timed video inside a timed scene caused a real seek error and is prohibited by HyperFrames. The resource demo proves this corrected path.

**Recommended transparent After Effects handoff:** export a straight-alpha, silent, 30 fps PNG sequence, then encode VP9 WebM with `libvpx-vp9`, `yuva420p`, and `-auto-alt-ref 0`; verify alpha after encoding. A numbered PNG sequence at 30 fps is the safest lossless fallback. The local Windows FFmpeg 9.0.1 build has libvpx-vp9 encode/decode. We generated a transparent VP9 sample, decoded its alpha with libvpx, and rendered it over the Motion-Only scene. MOV-with-alpha is not advertised as supported.

## SFX and audio integrity

Plans may include up to 24 deliberate `sfx` cues with approved SFX IDs, start time, volume up to 0.25, and short fades. The intended categories are click, tap, pop, soft impact, whoosh, swipe, typing, page turn, and notification; music is prohibited. The separate hash-keyed mix is built from the Master-derived AAC derivative and local SFX. Preview and final remux the **same approved mix**, and decoded hashes must match. With no SFX cues, they use the unchanged derivative. The Master is verified before and after mix creation and is never overwritten. A low cue-volume ceiling and limiter protect speech, but real narration still needs a listening check in Step 3.

## Local validation

The 12-second synthetic demo uses an SVG notification icon, a finite-loop transparent VP9 ring, numbered PNG sequence, two intentional SFX cues, and a missing-resource fallback. It contains no real speech. Early and late frames of the VP9 loop were inspected for transparency and timing. HyperFrames reports zero runtime, layout, motion, and contrast errors. Preview/final decoded audio hashes match the mix, while the Master hash matches intake. Cue-window PCM comparison confirms the pop and whoosh at their planned times and no difference outside those windows.

The demo retains five structural editor advisories: one root-track density note and one nested-scene note for each of four scenes. They are the same inspected advisory types documented in [foundation stabilization](motion-stabilization.md), with no new runtime, layout, motion, or contrast finding.

All starter resources in this step were generated locally by `scripts/build_starter_resources.py` and recorded as original CC0-1.0 assets in the manifest. No third-party files were downloaded. Future candidates from LottieFiles, Lucide, Iconify, Heroicons, Mixkit, Pixabay SFX, or Freesound require individual source/license review before import; there is no automatic fetch.
