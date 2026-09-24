# Motion-Only foundation stabilization

## HyperFrames structural lint review

The synthetic ten-scene demo's `check.json` contains 11 warnings and zero runtime, layout, motion, or contrast errors. Every warning was inspected. No warning was suppressed.

| Finding | Exact cause | Assessment |
| --- | --- | --- |
| `timeline_track_too_dense` on `[data-composition-id]` | All ten scene sections are timed elements on root track 1. | Editor timeline maintainability advisory. The generated timeline is seekable and data driven. A sub-composition split would change the current root timeline architecture and its selectors, so it is deferred until composition nesting can be validated end to end. |
| `nested_structure_needs_subcomposition` on `#scene-0` | Typography section has a nested `.scene-inner`, eyebrow, and headline. | Intentional grouping for one entrance/hold/exit scene; no hidden layout or accessibility error. |
| Same on `#scene-1` | Number section groups headline and animated counter. | Intentional grouping keeps count choreography with its scene. |
| Same on `#scene-2` | Compare section groups headline and two comparison nodes. | Intentional grouping; the two nodes are checked in the rendered scene. |
| Same on `#scene-3` | Steps section groups headline, steps, and connectors. | Intentional grouping; connector animation depends on the shared scene. |
| Same on `#scene-4` | Diagram section groups headline, nodes, and connectors. | Intentional grouping; connector animation depends on the shared scene. |
| Same on `#scene-5` | Progress section groups headline, track, and fill. | Intentional grouping for timed fill animation. |
| Same on `#scene-6` | Notification section groups headline and callout. | Intentional grouping for synchronized entrance and exit. |
| Same on `#scene-7` | Section transition groups headline and marker. | Intentional grouping for one visual beat. |
| Same on `#scene-8` | Statement section groups headline and supporting text. | Intentional grouping for hierarchy and timed entrance. |
| Same on `#scene-9` | CTA section groups headline and action. | Intentional grouping for synchronized scene choreography. |

The nested warnings recommend a separate HTML sub-composition per scene because HyperFrames shows only top-level rows. Current scene sections are genuine timed visual units; their child elements are required for typography and choreography. Splitting them into independent files is an architectural refactor with rendering and seekability risk. These advisories affect editor structure, while automated error checks and rendered-frame inspection cover the actual output. Reviewers should still inspect new warnings by code and selector: a future layout, motion, contrast, or runtime error is not covered by this rationale.

## Audio behavior

Intake copies the original supplied file to `master-audio.<extension>`, records its SHA-256, duration, codec, sample rate, channel count, layout, bit rate, and container metadata. `verify_master` checks its hash before rendering. FFmpeg creates a separate AAC/M4A derivative with a 192 kb/s target; no sample-rate or channel-downmix argument is passed. Preview and final remux that same derivative with stream copy. The output verification compares decoded audio SHA-256 against the derivative, plus sample rate and channels.

For the original local demo, FFprobe measured PCM 16-bit, 22,050 Hz mono Master Audio; AAC 22,050 Hz mono derivative and final. For the Arabic stress fixture, FFprobe measured PCM 16-bit, 48,000 Hz stereo Master Audio and AAC 48,000 Hz stereo derivative. The reported AAC bit rate on nearly silent synthetic audio may be below the target because the encoder emits fewer bits for silence; this is not a forced sample-rate downgrade. Real source audio at a suitable rate is preserved through this path.

## Arabic stress fixture

`scripts/motion_arabic_stress.py` creates four Arabic-first scenes with JavaScript, React, API, numbers, punctuation, multiline headlines, comparisons, steps, and RTL captions. It uses a local 48 kHz stereo tone fixture with **no spoken Arabic**. Transcript timing is synthetic visual timing, not speech alignment. The fixture uses no external API, uploads, paid model, or language model. The demo's approval records explicitly identify the synthetic generator; they are not creator approvals.

The reusable RTL corrections retain author-supplied line breaks and set logical RTL ordering for visual scene groups. Generated HTML marks Arabic projects with `lang="ar"`, and scene direction is explicit. The stress render exercises the same templates and components as ordinary Motion-Only projects.

## Validation result

The full regression suite passed: 40 tests, including all 20 original tests. `reel.py doctor` passed. The Arabic 16-second preview and final rendered locally; four representative preview frames were inspected for shaping, order, wrapping, hierarchy, and safe zones. HyperFrames reported zero runtime, layout, motion, and contrast errors for both the original ten-scene demo and Arabic stress composition. The original demo retains the 11 reviewed structural advisories; the four-scene Arabic fixture has seven advisories of the same two types.

The Arabic Master Audio SHA-256 still matches its intake record after both renders. Preview and final report identical decoded audio SHA-256, 48,000 Hz, and two channels. These checks validate media integrity and visual typography, not Arabic speech alignment; the synthetic fixture contains no narration.
