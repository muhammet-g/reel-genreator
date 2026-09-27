# Authoring scenes

Start with the project's brief, narration and measured timing. Write purpose and
visual reason before choosing primitives. Do not infer semantics from schema success.

Available primitives (`objects[].kind`):

| Kind | Use |
|---|---|
| text | Arabic explanation, headline, isolated technical expression |
| value | Bordered scalar/result |
| function | Persistent function token |
| container | A function/region that can own a token |
| array | Ordered cells, indices, selected index |
| image | Reviewed local image or SVG; optional SVG palette tint |

Compose these primitives before adding a custom component. Add a new kind only
when it expresses a useful recurring visual behavior; update contracts, validation,
renderer and representative tests together. The registry is the schema, not a
second drifting list in another runtime module.

`role` controls hierarchy and stacking. `scene` scopes a visual to a section;
omit it for persistent identity. `size` and `initial.x/y` are frame-normalized.
`owner` expresses semantic containment; author world positions explicitly.
`allowOverlap` names intentional intersections, never a blanket exemption.

Safe area and caption zone are normalized rectangles `[x,y,width,height]`.
The renderer respects a minimum visible font size even when objects scale down.
The browser checker measures the resulting text and boxes. If text no longer fits,
rewrite the layout or shorten approved visual copy instead of shrinking below the
minimum. Camera changes must pass the same checks.

Use `direction: rtl` for Arabic, `ltr` for code, and `auto` only when appropriate.
`MixedText` isolates Latin expressions and signed indices with `bdi`. Text is React
escaped. Local Cairo/Inter/JetBrains Mono cover Arabic and technical content.
Captions live in screen space and keep actual measured centering.

References can point to reviewed resources with notes. They guide human/AI planning;
the engine does not fetch, clone or automatically interpret them.
