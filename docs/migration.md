# Remotion migration

Baseline: `f5dcf75` on `feature/style-system-v1`; migration branch `codex/remotion-engine`.
Existing project media and exports remain in ignored `projects/`.

## Gates

- [ ] Pure timing, planning and state contracts with adversarial tests.
- [ ] Independent React/Remotion entry and a rendered synthetic fixture.
- [ ] Immutable audio, local fonts, Arabic captions, assets and explicit SFX.
- [ ] Persistent objects, camera and transitions with direct-frame determinism.
- [ ] Generic Motion-Only and JavaScript functions reference projects ported.
- [ ] Complete output/audio verification and visual inspection.
- [ ] Dependency independence proven before legacy isolation.
- [ ] Minimal default instructions and targeted documentation.

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
