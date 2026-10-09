# Remotion tools and documentation

## Project integration

The project includes 12 skills from `remotion-dev/skills` in `.agents/skills/`.
Their sources and content hashes are recorded in `skills-lock.json`.
Start with [remotion-best-practices](../.agents/skills/remotion-best-practices/SKILL.md)
and read only the skill and references needed for the current task.

| Task | Local skill |
| --- | --- |
| New video or composition | `remotion-create` |
| Content, animation and effects | `remotion-markup` |
| Documentation lookup | `remotion-docs` |
| Captions | `remotion-captions` |
| Studio preview | `remotion-studio` |
| Video export | `remotion-render` |
| Browser media processing | `remotion-multimedia` |
| Editable Studio content | `remotion-interactivity` |
| Geographic animation | `remotion-maps` |
| Remotion-powered applications | `remotion-saas` |
| Dependency upgrades | `remotion-upgrade` |

Follow the creator brief and `AGENTS.md` alongside these skills. Before designing,
revising or reviewing a video, use [motion quality](motion-quality.md); for a first
draft, also use [adaptive motion learning](adaptive-motion-learning.md).
Technical documentation supports implementation; it does not substitute for a
visual reference, motion review or creator acceptance.

## Skill workflow for every Remotion task

1. Read the requested project's `project.json` and brief. Identify the current
   deliverable, existing composition, visual identity, audio and exclusions.
2. Read the router and select skills from the table above. Load `remotion-create`
   for a new video/composition and `remotion-markup` for React content or motion
   edits. Add captions, maps, multimedia or interactivity only when the task needs
   them. Revisit the selection when the requested work changes.
3. Apply the selected guidance to the semantic/visual plan. In the existing private
   project notes, record a short **skills applied** note: skill/reference read,
   concrete choice it changes, relevant runtime/package version, and how the result
   will be checked. Do not add unsupported fields to the engine's project schema.
4. Reuse the engine's primitives, deterministic timing and project tokens. For an
   unfamiliar API, use `remotion-docs` and the relevant official page; verify
   compatibility before adopting examples. A skill does not install its example
   dependencies or authorize external services.
5. Use `remotion-studio` when previewing. For new or edited compositions, open
   Studio as soon as the project can run and keep the actual target composition
   visible during work. For structured projects, use `npm run studio:project --
   projects/<project>/project.json` to stage the intended project and audio.
6. Apply the motion-quality review to actual playback or closely spaced frames.
   Check text at phone scale, Arabic/code isolation, transition continuity,
   acceleration, settling, layer order and sound timing. Run relevant technical
   checks, including measured browser checks before rendering.
7. For an explicitly requested export, load `remotion-render` and use the existing
   project render/verification workflow. Confirm that the chosen composition
   contains all authored layers and audio; preserve masters and prior exports.
   Verify complete decode, audio identity, duration and first/last frames.
8. Record the observed result in the private learning log: which skill informed
   the choice, evidence, remaining uncertainty and creator acceptance. Carry a
   supported lesson into reusable guidance when it generalizes beyond one video.

Keep project requirements and creator instructions authoritative. The skills
support the finished-audio workflow; they do not replace source audio, introduce
music, permit uploads/publishing, or make technical checks stand for approval.
Use this workflow proportionally: documentation-only work needs document/link
checks, not Studio or a video render. Do not load every skill for every task.

## Official references supplied by the creator

| Area | Documentation |
| --- | --- |
| Fonts / الخطوط | [Fonts](https://www.remotion.dev/docs/fonts) |
| Text measurement / قياس النصوص | [Layout utilities](https://www.remotion.dev/docs/layout-utils) |
| Animation and graphics APIs / واجهات الحركة والرسوم | [API](https://www.remotion.dev/docs/api) |
| Transitions / الانتقالات | [Transitioning](https://www.remotion.dev/docs/transitioning) |
| Captions / النصوص المصاحبة | [Captions](https://www.remotion.dev/docs/captions) |
| Lottie | [Lottie](https://www.remotion.dev/docs/lottie) |
| Effects / المؤثرات | [Effects](https://www.remotion.dev/docs/effects) |
| Motion blur / تمويه الحركة | [Motion blur](https://www.remotion.dev/docs/motion-blur) |
| 3D / ثلاثي الأبعاد | [Three.js integration](https://www.remotion.dev/docs/three) |

These links are a reference index, not a claim that every linked capability is
installed or has been tested in this engine. Read the relevant current page when
using an API and check it against the versions in `package.json`. Skill versions
and documentation may be newer than the installed runtime. Reuse local primitives
and project tokens; add or upgrade dependencies only when the task calls for it.
