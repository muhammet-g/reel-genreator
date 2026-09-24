"""Stabilization regressions for Arabic layout and high quality audio."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

from reelkit.core import digest, load, probe, save
from reelkit.motion_audio import intake_audio, verify_master
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import import_motion_plan
from reelkit.motion_composition import build_motion_composition
from reelkit.motion_render import ensure_render_audio
from test_motion_m2 import fixtures


class FoundationStabilization(unittest.TestCase):
    def test_arabic_multiline_and_mixed_latin_use_reusable_direction_rules(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            audio, script, board_file, plan_file, _, plan = fixtures(root)
            plan["scenes"][1].update({
                "headline": "هناك 3 خطوات أساسية\nلبناء React.",
                "headline_direction": "rtl",
                "items": ["افهم JavaScript", "طبّق React"],
            })
            plan["captions"][0]["text"] = "هناك 3 خطوات\nمع React."
            save(plan_file, plan)
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(audio, "fixture", script_path=script)
            import_storyboard(p, board_file)
            approve_storyboard(p, "Fixture creator")
            import_motion_plan(p, plan_file)
            page = (build_motion_composition(p) / "index.html").read_text(encoding="utf-8")
            self.assertIn('<html lang="ar">', page)
            self.assertIn('id="scene-1"', page)
            self.assertIn('dir="rtl" data-start="2"', page)
            self.assertIn("هناك 3 خطوات أساسية\nلبناء", page)
            self.assertIn('<bdi dir="ltr"', page)
            self.assertIn(".headline,.supporting,.caption>span{white-space:pre-line}", page)
            self.assertIn(".scene[dir=rtl] .visual{direction:rtl}", page)

    def test_48khz_stereo_master_preserved_in_derivative(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            audio = root / "quality.wav"
            with wave.open(str(audio), "wb") as wav:
                wav.setnchannels(2)
                wav.setsampwidth(2)
                wav.setframerate(48000)
                wav.writeframes(b"\0\0\0\0" * 48000)
            source_hash = digest(audio)
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(audio, "fixture")
            master, state = verify_master(p)
            self.assertEqual(digest(master), source_hash)
            self.assertEqual(state["master_audio"]["stream"]["sample_rate"], "48000")
            self.assertEqual(state["master_audio"]["stream"]["channels"], 2)
            derivative = ensure_render_audio(p)
            audio_stream = next(s for s in probe(derivative)["streams"] if s["codec_type"] == "audio")
            self.assertEqual((audio_stream["sample_rate"], audio_stream["channels"]), ("48000", 2))
            record = load(p / "motion-project.json")["render_audio"]
            self.assertEqual((record["sample_rate"], record["channels"]), (48000, 2))
            self.assertEqual(record["derived_from_sha256"], source_hash)
            self.assertEqual(digest(master), source_hash)


if __name__ == "__main__":
    unittest.main()
