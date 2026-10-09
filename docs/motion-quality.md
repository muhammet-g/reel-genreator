# Visual design and motion quality

Persistent authoring lessons from creator feedback, recorded 2026-10-01.
Read this before visual work, then the requested project's brief and relevant source.
These rules guide authoring and review; they are not new engine capabilities or proof
that earlier films have achieved the desired artistic quality.

Use the [Remotion skill workflow](remotion-tools.md#skill-workflow-for-every-remotion-task)
alongside these design rules when implementing or reviewing Remotion work. Select
skills for the actual task and use their guidance in the plan and implementation;
judge the result through the visual and motion review below.

## Scope and preferences

- The creator wants detailed components, expressive entrances and exits, smooth
  acceleration, visible weight and rebound, and a connected visual story.
- Promotional Instagram reels default to Arabic, vertical framing, and sound effects
  without music. Duration, section exclusions, and message come from the current brief.
- A reference prompt's 120 BPM grid, monochrome palette, single morphing shape,
  cursor on every change, seamless loop, and bans on bounce, glow, or gradients are
  project choices. They are not standing restrictions on subsequent films.
- Springs, restrained squash/stretch, depth, gradients, lighting, and camera movement
  are available design choices when they serve the current visual identity and story.
- Keep the requested brand and motion reference as separate inputs. Reference
  choreography, camera and spatial transitions do not replace the brand's colors,
  typography, imagery or component anatomy. For an existing website, show recognizable
  designed sections from that site rather than a fictional dashboard bearing its logo.
  Creator correction: Nirox V6, 2026-10-04; V7 application remains pending approval.
- An excluded section also excludes its names, photos, messages, and associated
  recognition content. Put exclusions in the brief before implementation.

## Design the component before animating it

Give the main object a finished visual design: silhouette, proportions, typography,
padding, borders, icon language, color hierarchy, and material/depth where relevant.
Use the site's actual identity and reviewed assets. Build internal detail that still
reads at the intended phone viewing size. Do not add decoration solely to increase
element count.

A flattened full-page screenshot can hide all meaningful detail when scaled into a
reel. For animated site demonstrations, compose the meaningful layers separately:
brand, navigation, hero image, headline, action, and supporting components. A capture
can remain a reference for fidelity. Record which parts are original site assets and
which are editorial reconstructions.

Simplified placeholders are appropriate for a wireframe construction phase, followed
by a visible resolution into a designed component. They are not a finished substitute
for the advertised visual identity.

For a physical object, consider its structure. A book can have a spine, thickness,
page edges, a bookmark, cover ornament, front/back faces, and hinge-based page turns.
Those details should support its role and be visible during movement.

## Give each movement a reason and weight

Author a small motion sentence for each important change: what causes it, what moves
first, how it accelerates, what follows, and how it settles.

- Use anticipation where useful, then acceleration, controlled overshoot, and settling.
  A reading hold is intentional; a blank or unresolved object held between scenes is a defect.
- Vary response by material and role. A heavy cover and a lightweight reply should not
  share an identical spring response or duration.
- Offset related layers in time. Small delays between edges, pages, text, and supporting
  cards create follow-through. Do not launch every component in the same frame.
- Animate leading and trailing edges with different responses when a shape should stretch.
  Preserve deliberate proportions after the shape settles.
- Use arcs for traveling objects where they clarify direction and depth. Avoid arbitrary
  jumps or repeated identical straight slides.
- Keep typography sharp while held. Short transitional blur can communicate velocity;
  it must not hide unresolved overlap or make reading difficult.
- Use camera movement to follow the important object or reveal a relationship. A generic
  zoom pulse on every event is not a visual story. Check readability after camera transforms.
- Natural drag interaction derives the value from the pointer position while held, then
  releases into a spring. Do not show a cursor that fails to cause the visible change.

Motion must remain reconstructible from time. Use existing motion primitives first.
For custom Remotion work, a deterministic `spring()` response is an available option.
Continuous properties can use multiple target-change responses where appropriate;
do not implement them through timers or accumulated playback state. Keep engine
schema limits intact; custom composition behavior does not imply a new schema easing.

## Carry the story across scenes

Before coding, write a time-based visual plan with these fields:

| Field | Authoring question |
|---|---|
| Meaning | What should the viewer understand here? |
| Carrier | Which object or visual feature continues from the previous moment? |
| Mechanism | Does it open, turn, draw, expand, reflow, fold, split, or gather? |
| Trigger | What action or event causes the change? |
| Focus | Where should the viewer look, and what does the camera do? |
| Sound | Which nonmusical effect marks the action, and when should its peak land? |

Useful continuity examples: wireframe → composed site → responsive layout; book page
→ highlighted idea → reading card → dialogue → gathered brand mark. These are examples,
not mandatory templates. Choose the carrier from the content and retain stable IDs.

An entrance or exit needs an authored mechanism. Drawing, masking, unfolding, flipping,
layer assembly, traveling, and reflow can support the story. Opacity can assist those
mechanisms, but repeated fades alone do not satisfy this creator's request.

Content inside a changing container has its own timing. Remove the old content before
the new content becomes readable, or use a carefully authored mask/turn. Avoid a long
empty shell between them. Intentional temporary overlap must be narrow and documented.

## Reference-derived review practices

Use these focused checks when composition or element motion is weak. Their
project-specific applications remain candidates until compared in motion:

- Inspect key designed states at phone scale and in grayscale. Relative lightness
  should separate the subject from its background; extra ornament should not take
  the focal point. See [value structure](https://schoolofmotion.com/blog/design-value-structure-color-theory).
- Inspect how spacing and speed change throughout a transition and at joins.
  Start/end poses alone cannot establish smooth acceleration. See
  [Adobe's speed graph explanation](https://helpx.adobe.com/after-effects/desktop/animate-in-after-effects/speed-between-keyframes/speed.html).
- Sequence dependent layers to explain the space and focus attention. Retain shared
  elements across states; UI stagger examples are not mandatory reel timings. See
  [Carbon choreography](https://preview.carbondesignsystem.com/building-blocks/foundations/motion/choreography).

Full research, source access limits, and proposed experiments are indexed in the
ignored learning log. Reading a source does not establish improved film quality.

For paper-style work, consult the on-demand [initial paper reference](paper-reference.md).
Its local components, timings and Foley are examples to adapt; acceptance and
listening limits are recorded separately from technical verification.

## Sound without music

Choose sound by the visible action and material, not merely because an event is
called a transition. Opening an interface, moving a book, and landing a heavy
card need their own timbre, envelope and level decisions; sharing one whoosh
requires a scene-specific reason. These choices remain candidates until reviewed.

Use isolated paper, click, sweep, snap, or landing sounds to support visible actions.
Avoid turning recurring tonal effects into a musical backing track. No BPM analysis
is required when the film has no musical bed. Inspect the waveform/envelope when a
sound's peak should match a landing rather than placing every file by its start alone.

Keep source audio immutable. Synthesize or use reviewed assets, document the source,
preserve license information, and follow the engine's gain and timing contracts.

Never claim perceptual listening from waveform measurements, synchronized peaks
or the existence of A/B exports. Record whether actual listening was possible
and performed; if unavailable, disclose it and keep sound acceptance pending.
Use the required shared Studio preview alongside the technical checks described
in `AGENTS.md` and `docs/remotion-tools.md`.

Creator rejected Nirox V13 effects as motor-like despite technical mix checks.
Long noise sweeps repeated faster than their duration can overlap into a mechanical
bed. Review timbre and overlap separately from clipping/synchronization; do not
infer listening approval from a valid mix. Interface actions can use brief dry
transients while continuous rotation stays silent. V14 applies this correction;
its new sounds still require creator listening acceptance.

## Review artistic quality separately from technical validity

Review at three levels:

1. **Designed states:** Check the main component's detail, hierarchy, brand fidelity,
   phone readability, and visual balance before polishing the full timeline.
2. **Transitions in motion:** Review short playback segments or tightly spaced frames
   before, during, and after each turn, stretch, content swap, and convergence. Stable
   end-state screenshots alone cannot expose velocity, rebound, or follow-through.
3. **Export:** Run relevant tests and measured browser checks, then verify full decode,
   audio identity, duration, and first/last frames. Keep creator acceptance separate.

For closely spaced frames, include acceleration onset, the highest-speed moment,
maximum overshoot, and settled pose; choose spacing for the actual transition duration.
Check layer order, hinge origins, front/back visibility, connector routes, clipping,
and text collisions. Recheck the affected interval after a fix.

Custom compositions need review annotations on meaningful readable text, boundaries,
and connectors where applicable; see `docs/scenes.md`. A browser report with zero
advisories only covers the checks and annotations exercised. It does not establish
richness, rhythm, style, or compliance with the viewer's imagined result.

For a requested loop, compare geometry, content, lighting, pointer position, and
velocity at the seam. First/last-frame equality is not a default requirement for all films.

## Failure patterns observed and repairs

| Failure | Repair |
|---|---|
| Detailed site becomes a tiny screenshot | Recompose important layers at readable scale |
| Every entrance uses opacity and translation | Assign mechanisms based on the object and action |
| Desktop/mobile feel like replaced pictures | Carry one frame and reflow its meaningful content |
| Cover/page turn hidden by the page layer | Inspect intermediate frames; correct stacking and reveal timing |
| Old/new copy appears together in a morph | Give each content state independent exit/entry timing |
| Empty card waits for the next scene | Carry content or shorten the handoff; inspect the whole interval |
| Overshooting position snaps at its target | Keep the response continuous; avoid changing formulas at target crossing |
| Small zooms are used as the only energy | Add object mechanics, edge response, stagger, and directed travel |
| Technical success presented as creative approval | Report verification and creator acceptance separately |
| References claimed without concrete use | Record the actual asset or observed motion decision and its limitation |

## Preserve and reuse learning

Creator correction: research alone must not add a new tool, asset or technique to
the project brain. Keep untested proposals and reference observations separately
under `projects/research/`. Promote a decision into this guide only after a concrete
local application, technical validation and actual-motion review establish that it
works; record creator feedback and the limits of the conclusion. Failed or unfinished
experiments may remain in the learning log as evidence, never as approved guidance.

### Creator-confirmed improvement: Majalis V2

On 2026-10-01 the creator confirmed improvement in visual design, movement and
calmness relative to V1, and asked to retain the lessons. Treat V2 as a reference
for this improvement, not a ceiling for quality or approval to publish. Feedback
supports the combined approach; it does not isolate each technique's contribution.

Carry these decisions into future authoring, adapting them to the subject:

- Design meaningful structure and material before animation. Book edges, hinge,
  foil tooling and bookmark supported this film; another subject needs its own anatomy.
- Combine expressive movement with calm reading holds. Use fewer competing actions,
  directed attention and controlled settling; more energy does not require constant motion.
- Give roles distinct weight. A heavy carrier responds differently from light
  supporting elements. Tune damping against the actual frame, readable copy and settling.
- Retain a meaningful object and, where useful, its readable phrase through the
  transformation. Position, size and context can change while identity stays legible.
- Sequence the carrier, supporting layers and text deliberately. Reveal traveling
  copy when its route is clear; give incoming/outgoing copy independent masks and timing.
- Inspect acceleration, peak travel, overshoot and handoff frames before export.
  Repair geometry, clipping, empty intervals and layer order instead of hiding them
  with blur, camera pulses or extra effects.

The carried phrase, spatial opening geometry and independently timed text are
supported repairs. Measured SFX peaks remain a useful technical practice; the
creator did not separately rate sound synchronization. Consult the indexed Majalis
V2 entry for exact evidence and limitations before reusing its implementation.

The creator explicitly wants accumulating design and motion expertise. A learning
entry must change a subsequent authoring decision, review criterion, or reusable
behavior. Documentation alone does not establish an improvement.

On 2026-10-04 the creator explicitly adopted the detailed Nirox motion report as
learning material for stronger first drafts, while rejecting style-as-restriction.
Use [adaptive motion learning](adaptive-motion-learning.md) for initial planning
and review questions. For relevant digital-interface, deformation or sound work,
consult the local [digital UI reference](../projects/style-references/digital-ui/README.md).
Carry the diagnosis and mechanism; choose fresh parameters, material, brand and
sound for the current task. The six-card cylinder, teal world, glitch opening and
24-second timeline are examples, not project defaults. Adoption of the report is
permission to use its lessons, not blanket artistic acceptance of every V16 effect.

Apply this cycle during each video task and meaningful revision:

1. Read the relevant prior lessons and latest feedback. Identify the weakest visual
   dimensions for this brief; retain strengths that still serve the content.
2. Form a specific hypothesis: what is weak, what change should improve it, and what
   visible evidence would support that conclusion. Avoid promises of overall quality
   without an observable change.
3. When a reference is needed, study a relevant short segment: composition, layer
   order, action timing, acceleration, settling, camera, sound, and scene handoff.
   Record the source and the mechanism actually observed. Recheck uncertain details;
   do not assign precise motion curves or timings from a still image.
4. Apply the mechanism to the current story and identity. Compare the affected
   interval before/after at a consistent viewing scale, preserving earlier exports.
   Prefer improving weak scenes over adding arbitrary effects or element count.
5. Review the result in motion and perform the required technical checks. Record
   strengths, remaining weaknesses, and the creator's feedback separately.
6. Retain supported lessons, revise contradicted ones, and keep promising but
   unverified ideas marked as candidates. Add reusable behavior only when it has a
   justified interface and recurring purpose; adapt its parameters to each brief.

Review these dimensions together; improvement in one can harm another:

| Dimension | What to examine |
|---|---|
| Component quality | Proportions, silhouette, meaningful detail, material, typography, icon consistency, and legibility |
| Motion quality | Anticipation, acceleration/deceleration, weight, overshoot, rebound, follow-through, and a clean settled state |
| Synchronization | Trigger→response timing, relationships between layers, text readability windows, camera focus, and audible action peaks |
| Animation variety | Different mechanisms for different roles; repeated mechanisms remain purposeful rather than automatic |
| Visual strength | Focal point, contrast, hierarchy, depth, composition, and deliberate use of scale |
| Visual linkage | A carried object, shape, line, position, or action that makes the next scene understandable |
| Rhythm | Alternating action and readable holds, variation in visual acceleration, and no accidental dead intervals |

Do not optimize for continuous movement at the expense of comprehension. Variety
must preserve visual coherence; a book turn, a light reply, and a brand reveal can
have distinct mechanics within one visual language. A readable hold is a designed
part of rhythm, while unresolved blankness or repetitive presentation needs repair.

Distinguish speed (distance per frame), acceleration (change in that speed), and
editing rhythm (spacing of actions, accents and holds). A global time warp or a
slow drift followed by a cut does not demonstrate good acceleration. Review local
trajectories through takeoff, peak travel, braking and exit; when cutting during
travel, preserve the intended momentum and spatial relationship. Musical accents
can motivate actions when music is authorized, but do not repair poor trajectories.
For a website showcase, prioritize visual navigation and representative sections;
do not impose explainer-length reading holds on every card. A calmer hero can
contrast with brisk navigation, project selection and responsive transformations.
Check transitional layer collisions and duplicate cursors/navigation, not only
settled text bounds. These rules follow the Nirox V7 creator correction; subsequent
implementations still require their own visual review and creator acceptance.

For curved-card cylinders, derive final separation from arc width, radius and angular
pitch, then inspect projected gaps and formation trajectories. A separated final pose
can still hide cards in a stack during assembly. Give sequential arrivals their own
paths and bend timing, and review opposite-side exit while rotation continues. For
an interface-building opening, a visible click can trigger independent component
generation; keep short glitch effects local and the completed typography stable.
These are creator-directed Nirox V9 mechanisms, not defaults for every brand or style.

Respect later direction/sequence clarifications: specify whether an exit acts on
the group or on each object. For a following chain, share the route/tangent and
stagger progress; for individual restoration, show each object's curvature return
before it clears the screen. Nirox V10 explicitly replaces the V9 group exit with
right-fed formation and individual flat-card lower-left departure. Give this
transformation enough visible time; do not infer approval of an earlier mechanism.

Align logo marks and wordmarks by their visible ink and optical centre, not the
asset's padded viewBox or a font line box. Check the final rendered pixels. Reserve
character layout through writing effects and fade local glow smoothly. A generated
interface still needs measured internal padding. When a rotating card must reveal
its back, construct front and rear material on shared deformation geometry; hiding
backfaces without a rear plane leaves missing material. Nirox V11 explicitly requires
these repairs alongside click→identity exit→frame drawing→component generation.

When an explicit glitch exit is requested, make localized disruption observable:
scan-band displacement, staggered dropouts or color-edge separation differ from
pieces merely drifting and fading. Review the affected mark and word through the
short effect. For an overlong showcase preview, shorten unnecessary settled hold
before accelerating already reviewed gestures; update subsequent audio and frame
boundaries together. Nirox V12 applies this correction to the V11 identity exit.

Learning should accumulate during work on the project and survive session boundaries
through these files. Do not claim permanent model retraining, unattended background
learning, or an artistic improvement that has not been inspected.

Keep per-project source mapping, exclusions, failures, corrections, outputs, and
acceptance status under ignored `projects/`. Index transferable lessons in
`projects/learning-log/index.md`. Update this guide when new feedback changes an
authoring rule. Do not turn unapproved exports into canonical quality references.

Before adding a custom component, inspect the existing primitives and any relevant
library component. Extract a reusable behavior once its API and recurrence justify
it. A custom film is evidence of an implementation, not an already integrated library.
