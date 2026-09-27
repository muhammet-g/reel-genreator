"""Objective Style System contracts; aesthetic judgment stays with the creator."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from reelkit.style_system import CODE_DRAGON, FONT_FILES, adapt_base_css, contrast, install_brand_logo, install_fonts, load_style, presentation_css, resolve_style
from reelkit.style_system import caption_presentation_css, scene_motif


class StyleSystemTests(unittest.TestCase):
    def test_caption_centering_uses_resolved_safe_zone_and_cross_scene_intersection(self):
        model = {"scenes": [{"start": 0, "end": 3, "caption_zone": [60, 1400, 960, 330]},
                            {"start": 3, "end": 6, "caption_zone": [80, 1400, 900, 330]}]}
        captions = [{"start": 1, "end": 2}, {"start": 2.5, "end": 3.5}]
        css = caption_presentation_css(resolve_style({"style": "code-dragon-v1"}), model, captions)
        self.assertIn("left:60px;right:auto;width:960px;display:flex;justify-content:center", css)
        self.assertIn("left:80px;right:auto;width:900px", css)
        self.assertEqual(caption_presentation_css(resolve_style(), model, captions), "")

    def test_motifs_are_deterministic_role_treatments_without_plan_mutation(self):
        import copy
        style = resolve_style({"style": "code-dragon-v1"})
        scenes = [{"type": "statement", "choreography": {"family": f}} for f in
                  ("staged", "construct", "evaluate", "tokens", "extract", "end-focus")]
        before = copy.deepcopy(scenes)
        self.assertEqual([scene_motif(style, s) for s in scenes], ["brace", "anchor", "none", "bracket", "none", "rule"])
        self.assertEqual(scenes, before)
        self.assertEqual(scene_motif(style, {"type": "section", "brand_logo": True}), "none")

    def test_complete_logo_is_opt_in_and_cannot_be_replaced_by_a_brace_motif(self):
        from reelkit.core import ROOT, digest
        style = resolve_style({"style": "code-dragon-v1"})
        with tempfile.TemporaryDirectory() as folder:
            filename = install_brand_logo(style, Path(folder))
            self.assertEqual(digest(Path(folder) / filename), style["brand_logo"]["sha256"])
            self.assertEqual(digest(ROOT / style["brand_logo"]["asset"]), style["brand_logo"]["sha256"])
        with self.assertRaisesRegex(ValueError, "complete approved logo"):
            resolve_style({"style": "code-dragon-v1", "overrides": {"brand_logo": {"asset": "motif-brace.png"}}})
        with self.assertRaisesRegex(ValueError, "padded safe region"):
            resolve_style({"style": "code-dragon-v1", "overrides": {"brand_logo": {"max_width": 800, "safe_padding": 200}}})

    def test_neutral_fallback_and_named_profile_are_deterministic(self):
        neutral = resolve_style()
        self.assertEqual(neutral["name"], "motion-foundation")
        self.assertEqual(resolve_style({"style": "code-dragon-v1"}), resolve_style({"style": "code-dragon-v1"}))
        self.assertEqual(resolve_style({"style": "code-dragon-v1"})["colors"]["accent"], "#FFB800")

    def test_selection_and_deliberate_override(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder)
            (p / "motion-style.json").write_text('{"style":"code-dragon-v1","overrides":{"colors":{"accent":"#FFC233"}}}')
            resolved = load_style(p)
            self.assertEqual(resolved["colors"]["accent"], "#FFC233")
            self.assertEqual(resolved["code"]["active"], "#FFC233")
            self.assertEqual(resolved["diagram"]["active_connector"], "#FFC233")
        with self.assertRaisesRegex(ValueError, "Unknown style token"):
            resolve_style({"style": "code-dragon-v1", "overrides": {"scene_timing": {"duration": 2}}})
        with self.assertRaisesRegex(ValueError, "Unknown style profile"):
            resolve_style({"style": "unknown"})
        self.assertTrue(resolve_style({"style": "code-dragon-v1", "overrides": {"caption": {"emphasize_code": True}}})["caption"]["emphasize_code"])

    def test_typography_roles_and_contrast(self):
        style = resolve_style({"style": "code-dragon-v1"})
        self.assertEqual(set(style["typography"]["roles"]), {"display", "headline", "subheadline", "body",
                         "explanation", "caption", "label", "metadata", "number", "code", "code_emphasis"})
        self.assertEqual(style["typography"]["families"], CODE_DRAGON["typography"]["families"])
        for role in ("text_primary", "text_secondary", "accent"):
            self.assertGreaterEqual(contrast(style["colors"][role], style["colors"]["canvas"]), 4.5)
        with self.assertRaisesRegex(ValueError, "Insufficient contrast"):
            resolve_style({"style": "code-dragon-v1", "overrides": {"colors": {"text_secondary": "#101827"}}})
        with self.assertRaisesRegex(ValueError, "approved Cairo"):
            resolve_style({"style": "code-dragon-v1", "overrides": {"typography": {"families": {"arabic": "Arial"}}}})

    def test_local_font_delivery_and_css_roles(self):
        style = resolve_style({"style": "code-dragon-v1"})
        with tempfile.TemporaryDirectory() as folder:
            css, manifest = install_fonts(style, Path(folder))
            self.assertEqual(len(manifest), sum(len(info[2]) for info in FONT_FILES.values()))
            for face in manifest:
                self.assertTrue((Path(folder) / face["file"]).is_file())
                self.assertTrue((Path(folder) / face["license"]).is_file())
                self.assertIn(face["family"], css)
        rules = presentation_css(style)
        self.assertIn("--cd-type-headline-family:var(--cd-font-arabic)", rules)
        self.assertIn("--cd-type-code-family:var(--cd-font-code)", rules)
        for selector in (".caption", ".code-expression", ".diagram-node", ".connector", ".number-visual"):
            self.assertIn(selector, rules)
        self.assertEqual(presentation_css(resolve_style()), "")

    def test_missing_font_fails_instead_of_silent_substitution(self):
        style = resolve_style({"style": "code-dragon-v1"})
        with tempfile.TemporaryDirectory() as folder, patch("reelkit.style_system.ROOT", Path(folder)):
            with self.assertRaisesRegex(FileNotFoundError, "Required font license missing"):
                install_fonts(style, Path(folder))

    def test_code_dragon_resolves_legacy_font_declarations_locally(self):
        from reelkit.core import ROOT
        original = (ROOT / "templates" / "motion-only.css").read_text(encoding="utf-8")
        self.assertEqual(adapt_base_css(resolve_style(), original), original)
        localized = adapt_base_css(resolve_style({"style": "code-dragon-v1"}), original)
        self.assertNotIn("Arial", localized)
        self.assertNotIn("Consolas", localized)
        self.assertIn("CDArabic,CDLatin", localized)
        self.assertIn("CDCode,monospace", localized)


if __name__ == "__main__":
    unittest.main()
