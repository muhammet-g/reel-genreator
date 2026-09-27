# Motion-Only Style System v1

The renderer resolves a named presentation profile from `motion-style.json`. Omit the file to keep the existing neutral `motion-foundation` look. To select the first brand profile, use:

```json
{"style": "code-dragon-v1"}
```

Deliberate overrides are nested under `overrides`, for example `{"style":"code-dragon-v1","overrides":{"colors":{"accent":"#FFC233"},"motifs":{"technical_grid":true}}}`. Unknown tokens, unknown profiles, unapproved font families, invalid role values, and insufficient canvas/text contrast fail before rendering. The resolved profile is included in preview snapshot integrity, so a style change invalidates an old preview approval.

`reelkit/style_system.py` owns profile resolution, token validation, local font delivery, and CSS custom-property generation. `templates/code-dragon-v1.css` consumes the presentation tokens. Existing scene templates still own semantic structure and safe-zone geometry. The timeline still owns timing and choreography; it reads only a bounded arrival ease/displacement preference. `motion-style.json` cannot set narration, timing, scene types, choreography, RTL isolation, or layout constraints.

## Code Dragon presentation

The canonical palette is canvas `#0B1221`, panel `#0F172A`, secondary surface `#1E293B`, primary text `#E2E8F0`, secondary text `#94A3B8`, accent `#FFB800`, and warm accent `#FFA500`. Amber is reserved for active values, selection, focus, and conclusions. Code defaults to pale text, with secondary text for context and amber for the explained token. No general syntax theme is implied. Caption, code, diagram, comparison, result, icon, border, radius, shadow, spacing, density, and motion preferences have named tokens. Semantic role colors reference the canonical palette, so an accent override reaches active code and diagram relationships without repetitive edits. The optional amber rule, technical grid, orbital line, and terminal dots are all off by default.

Typography roles are `display`, `headline`, `subheadline`, `body`, `explanation`, `caption`, `label`, `metadata`, `number`, `code`, and `code_emphasis`. The approved Cairo, Inter, and JetBrains Mono fonts are pinned through `@fontsource` in `package-lock.json`. The renderer copies exact WOFF2 faces and their OFL notices to composition assets and records SHA-256 digests in `font-manifest.json`. The short CSS family aliases `CDArabic`, `CDLatin`, and `CDCode` point only to these local files. Legacy template font declarations are resolved to local aliases for Code Dragon, preventing HyperFrames from requesting remote substitutes. A missing required file or license fails the build. Browser shaping, Bidi isolation, text measurement, wrapping, overflow, and caption segmentation remain engine work.

The neutral profile still uses the existing Noto Sans Arabic faces, also copied locally with its notice. Future profiles can be added to the registry with the same boundary: visual tokens and a presentation stylesheet, no scene-specific choreography.

## Synthetic review and validation

`scripts/build-generalization-fixture.py --style code-dragon-v1` produces six synthetic scenes: programming/code, statistic, process, comparison, diagram, and conclusion/CTA. It includes Arabic headlines and captions, a two-line Arabic heading and caption, numbers, and an isolated `scores.at(-1)` expression. The audio is synthetic silence, not narration. Use HyperFrames `check` and `snapshot` against the generated composition for objective and visual review. `tests/test_style_system.py` covers resolution, role presence, contrast, overrides, local font files, and presentation selectors; the full unit suite covers existing engine behavior.

Remaining judgment is visual: the creator should review spacing, pacing, emphasis, and legibility at phone size. The Style System does not infer a syntax palette or force motifs into every scene. It does not add Phase 2 media generation or stock sourcing.

## Real Step 3 refinement

Code Dragon captions use the engine's resolved `caption_zone`, rather than the legacy asymmetric page offsets. A flex container centers the actual shaped caption surface; direction stays on the text and LTR islands. When a caption spans scene boundaries, the shared horizontal safe area is used. No timeline, phrase boundary, or shaping rule is changed. `scripts/check-style-captions.cjs COMPOSITION CHROME REPORT` tests every actual caption plus Arabic, mixed text, code, numbers and two-line stress samples with all external requests blocked and all local font faces explicitly loaded.

Optical sizes for captions, labels, code, array indexes, result labels and generic diagram/process labels live in `typography.sizes`. The focus outline's vertical offset follows the index leading so that changing label size does not detach it from the cells. The semantic timeline consumes resolved presentation colors; its operations, paths and beat timing are unchanged.

The repeated bottom progress rule is hidden for Code Dragon. Static upper-edge motifs vary by presentation role: brace for an opening or simplification, anchor for construction, bracket for token introduction, short rule for end focus, and no added motif for evaluation/count/extraction/comparison states. A motif is decoration, never a substitute for the logo. Construction motifs enter only with real content, so they do not appear as empty placeholders.

The complete approved Code Dragon logo is `assets/brand/code-dragon-logo.png` (dragon and braces together). A scene must explicitly request `"brand_logo": true`; the default is no logo. The composition copies the exact asset after SHA-256 verification and displays it with `object-fit: contain` inside a padded frame. A logo request suppresses that scene's optional motif. Use the logo for a deliberate signature or brand moment, not as an automatic watermark. Its occupied region participates in layout advisories.

Semantic components now own their chrome: an array rail enters with the first cell, a teaching editor's border/background/comments enter and exit as one component, and a code expression is a separate semantic component. Large surfaces expose runtime occupied regions to the composition analyzer. Collisions with resources, arrows, results or other surfaces produce a `major-surface-overlap` advisory for author review; the engine does not invent new scene choreography or move content by taste.
