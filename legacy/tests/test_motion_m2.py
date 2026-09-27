"""Milestone 2 scene grammar, timing and reusable picture composition."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

from reelkit.core import load, save
from reelkit.motion_audio import intake_audio
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import SCENE_TYPES, validate_motion_plan, import_motion_plan
from reelkit.motion_composition import build_motion_composition


def fixtures(root):
    audio = root / "demo.wav"
    with wave.open(str(audio), "wb") as output:
        output.setnchannels(1); output.setsampwidth(2); output.setframerate(8000)
        output.writeframes(b"\0\0" * 32000)
    script = root / "script.txt"
    script.write_text("Four second fixture.", encoding="utf-8")
    board = {"schema_version": 1, "mode": "motion-only", "timing_verified_by": "Fixture editor", "scenes": []}
    for ident, a, b in (("opening", 0, 2), ("comparison", 2, 4)):
        board["scenes"].append({"id": ident, "start": a, "end": b, "narration": "Fixture speech",
            "semantic_function": "hook" if a == 0 else "comparison", "importance": "high", "information_density": "low",
            "visual_structure": "meaningful structure", "visual_hierarchy": "first, then second",
            "motion_energy": "balanced", "recommended_presentation": "visual explanation", "visual_reason": "Support comprehension."})
    board_file = root / "board.json"; save(board_file, board)
    plan = {"schema_version": 1, "mode": "motion-only", "motion_density": "medium", "visual_energy": "balanced",
            "transition_family": "fade", "captions": [
                {"start": 0, "end": 1.95, "text": "مرحبا React", "direction": "rtl"},
                {"start": 2, "end": 3.95, "text": "Second phrase", "direction": "ltr"}],
            "scenes": [
                {"id": "opening", "start": 0, "end": 2, "type": "number", "layout": "left-weighted",
                 "eyebrow": "DATA", "headline": "One number", "number": 42, "suffix": "%",
                 "motion": {"entrance": "rise", "emphasis": "count", "exit": "fade"}},
                {"id": "comparison", "start": 2, "end": 4, "type": "compare", "layout": "split",
                 "eyebrow": "COMPARE", "headline": "Two paths", "items": ["Before", "After"],
                 "motion": {"entrance": "slide", "emphasis": "none", "exit": "fade"}}]}
    plan_file = root / "plan.json"; save(plan_file, plan)
    return audio, script, board_file, plan_file, board, plan


class MotionMilestoneTwo(unittest.TestCase):
    def test_core_scene_set_is_explicit_and_extensible(self):
        self.assertEqual(SCENE_TYPES, {"typography", "statement", "number", "compare", "steps", "diagram",
                                       "progress", "notification", "section", "cta"})

    def test_plan_rejects_timing_changes_and_unreadable_scenes(self):
        with tempfile.TemporaryDirectory() as d:
            _, _, _, _, board, plan = fixtures(Path(d))
            validate_motion_plan(plan, board, 4)
            plan["scenes"][1]["start"] = 1.8
            with self.assertRaisesRegex(ValueError, "approved storyboard timing"):
                validate_motion_plan(plan, board, 4)
            plan["scenes"][1]["start"] = 2
            plan["scenes"][0]["headline"] = "Too many words " * 20
            with self.assertRaises(ValueError):
                validate_motion_plan(plan, board, 4)

    def test_plan_has_reusable_components_and_no_source_video(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            audio, script, board_file, plan_file, _, _ = fixtures(root)
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(audio, "fixture", script_path=script)
            import_storyboard(p, board_file)
            approve_storyboard(p, "Fixture creator")
            import_motion_plan(p, plan_file)
            out = build_motion_composition(p)
            page = (out / "index.html").read_text(encoding="utf-8")
            self.assertIn('class="counter" data-target="42"', page)
            self.assertEqual(page.count('class="compare-side motion-part"'), 2)
            self.assertIn('<bdi dir="ltr"', page)
            self.assertIn('window.__timelines.reel=timeline', page)
            self.assertNotIn('<video', page)
            self.assertTrue((out / "assets" / "gsap.min.js").exists())
            self.assertIsNone(load(p / "motion-project.json")["render_audio"])


if __name__ == "__main__": unittest.main()
