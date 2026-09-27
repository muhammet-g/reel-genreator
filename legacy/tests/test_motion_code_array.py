"""Regressions for code in RTL captions, array visuals, and alignment state."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from reelkit.composition import caption_html
from reelkit.core import digest, load, save
from reelkit.motion_audio import intake_audio, set_transcript, verify_master, review_alignment, alignment_review_status
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import validate_motion_plan, import_motion_plan
from reelkit.motion_composition import build_motion_composition
from reelkit.motion_code import code_array_html
from test_motion_m2 import fixtures


class MotionCodeArray(unittest.TestCase):
    def test_complete_js_expressions_are_single_ltr_islands_inside_arabic(self):
        expressions = ("fruits[fruits.length - 1]", "fruits.slice(-1)", "fruits.at(-1)", "fruits.at(-2)")
        for expression in expressions:
            with self.subTest(expression=expression):
                rendered = caption_html("اكتب " + expression + " الآن")
                self.assertEqual(rendered.count('class="code-island"'), 1)
                self.assertIn(f'<code>{expression}</code></bdi>', rendered)
                self.assertIn('dir="ltr"', rendered)
        escaped = caption_html("اكتب fruits.at(-2) <script>")
        self.assertNotIn("<script>", escaped)
        self.assertIn("&lt;", escaped)
        self.assertIn("&gt;", escaped)
        self.assertIn('<code>−2</code></bdi>', caption_html("−2 يعني قبل الأخير"))
        self.assertIn('<code>-1</code></bdi>', caption_html("الفهرس -1 من النهاية"))

    def test_reusable_array_visual_and_arabic_decorations(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            audio, script, board_file, plan_file, _, plan = fixtures(root)
            plan["language"] = "ar"
            plan["scenes"][1].update({
                "headline": "العنصر قبل الأخير",
                "headline_direction": "rtl",
                "eyebrow": "فهرس سالب",
                "items": ["آخر عنصر", "قبل الأخير"],
                "code_array": {
                    "variable": "fruits", "cells": ["تفاح", "موز", "برتقال"],
                    "selected_index": 1, "selection_path": [2, 1],
                    "selection_at": .45, "result_reveal_at": .75,
                    "expression": "fruits.at(-2)",
                    "result": {"kind": "element", "value": "موز", "label": "العنصر"},
                },
            })
            save(plan_file, plan)
            validate_motion_plan(plan, load(board_file), 4)
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(audio, "fixture", script_path=script)
            import_storyboard(p, board_file)
            approve_storyboard(p, "Fixture creator")
            import_motion_plan(p, plan_file)
            page = (build_motion_composition(p) / "index.html").read_text(encoding="utf-8")
            self.assertIn('<html lang="ar">', page)
            self.assertNotIn("COMMUNITY / MOTION", page)
            self.assertNotIn("IDEAS IN MOTION", page)
            self.assertIn('<code dir="ltr">fruits.at(-2)</code>', page)
            self.assertIn('data-index="2" data-active="true"', page)
            self.assertIn('data-index="1" data-active="false"', page)
            self.assertIn('data-result-kind="element"', page)
            self.assertIn("selection_path", page)

    def test_array_result_and_invalid_index(self):
        with tempfile.TemporaryDirectory() as d:
            _, _, _, _, board, plan = fixtures(Path(d))
            visual = {"variable": "fruits", "cells": ["تفاح", "موز", "برتقال"],
                      "selected_index": 2, "expression": "fruits.slice(-1)",
                      "result": {"kind": "array", "value": ["برتقال"], "label": "مصفوفة جديدة"}}
            plan["scenes"][1]["code_array"] = visual
            validate_motion_plan(plan, board, 4)
            markup = code_array_html(visual)
            self.assertIn('data-result-kind="array"', markup)
            self.assertIn('<span class="result-bracket">[</span>', markup)
            self.assertIn('<span class="result-bracket">]</span>', markup)
            visual["selected_index"] = 4
            with self.assertRaisesRegex(ValueError, "selected_index"):
                validate_motion_plan(plan, board, 4)

    def test_reference_timing_and_creator_review_are_distinct(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            audio, script, _, _, _, _ = fixtures(root)
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(audio, "fixture", script_path=script)
            master, state = verify_master(p)
            original = digest(master)
            self.assertEqual(state["transcript_status"], "reference-script")
            self.assertEqual(alignment_review_status(p), "not reviewed")
            timed = root / "timed.json"
            save(timed, {"segments": [{"start": .2, "end": 1.8, "text": "مرحبا React", "direction": "rtl"}]})
            set_transcript(p, script_path=script, transcript_path=timed)
            self.assertEqual(load(p / "motion-project.json")["transcript_status"], "timed-transcript-unreviewed")
            self.assertEqual(alignment_review_status(p), "not reviewed")
            review_alignment(p, "Fixture creator")
            self.assertEqual(alignment_review_status(p), "creator-reviewed")
            transcript = load(p / "transcript.json")
            transcript["segments"][0]["text"] = "تعديل"
            save(p / "transcript.json", transcript)
            self.assertEqual(alignment_review_status(p), "stale; review again")
            self.assertEqual(digest(master), original)


if __name__ == "__main__":
    unittest.main()
