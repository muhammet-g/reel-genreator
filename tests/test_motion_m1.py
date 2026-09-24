"""Milestone 1: immutable audio, provider-independent text input and storyboard approval."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

from reelkit.core import digest, load, save
from reelkit.motion_audio import intake_audio, set_transcript, transcribe_with_adapter, verify_master
from reelkit.motion_storyboard import (approve_storyboard, import_storyboard, storyboard_approval_valid,
                                      validate_storyboard)


def tone(path):
    # Silent PCM is intentional test media; no speech recognition or provider is involved.
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(8000)
        out.writeframes(b"\0\0" * 16000)


def board(total=2):
    return {"schema_version": 1, "mode": "motion-only", "timing_verified_by": "Fixture editor",
            "scenes": [
                {"id": "hook", "start": 0, "end": 1, "narration": "First phrase",
                 "semantic_function": "hook", "importance": "high", "information_density": "low",
                 "visual_structure": "full-screen statement", "visual_hierarchy": "headline first",
                 "motion_energy": "energetic", "recommended_presentation": "kinetic typography",
                 "visual_reason": "Direct attention to the opening claim."},
                {"id": "answer", "start": 1, "end": total, "narration": "Second phrase",
                 "semantic_function": "explanation", "importance": "medium", "information_density": "medium",
                 "visual_structure": "two-part relationship", "visual_hierarchy": "cause then outcome",
                 "motion_energy": "balanced", "recommended_presentation": "connected diagram",
                 "visual_reason": "Show how the two ideas relate."},
            ]}


class MotionMilestoneOne(unittest.TestCase):
    def test_intake_preserves_original_and_distinguishes_derivative(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            src = root / "voice.wav"
            tone(src)
            before = src.read_bytes()
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(src, "fixture")
            master, state = verify_master(p)
            self.assertEqual(master.read_bytes(), before)
            self.assertEqual(src.read_bytes(), before)
            self.assertEqual(state["master_audio"]["sha256"], digest(src))
            self.assertIsNone(state["render_audio"])
            self.assertAlmostEqual(state["duration"], 2, places=2)
            with self.assertRaisesRegex(ValueError, "already exists"):
                with patch("reelkit.motion_audio.project", return_value=p):
                    intake_audio(src, "fixture")
            self.assertEqual(master.read_bytes(), before)

    def test_script_and_timed_transcript_are_separate_input_states(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            src = root / "voice.wav"
            script = root / "script.txt"
            timed = root / "timed.json"
            tone(src)
            script.write_text("مرحبا React", encoding="utf-8")
            save(timed, {"segments": [{"start": 0.1, "end": 1.9, "text": "مرحبا React", "direction": "rtl"}]})
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(src, "fixture", script_path=script)
            original = digest(p / "master-audio.wav")
            self.assertEqual(load(p / "transcript.json")["alignment"], "unverified")
            result = set_transcript(p, script, timed)
            self.assertEqual(result["alignment"], "user-supplied-timing")
            self.assertEqual(result["segments"][0]["text"], "مرحبا React")
            self.assertEqual(digest(p / "master-audio.wav"), original)

    def test_adapter_boundary_requires_external_authorization(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            src = root / "voice.wav"
            tone(src)
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(src, "fixture")
            class Adapter:
                name = "fixture adapter"
                external = True
                calls = 0
                def transcribe(self, master_audio, reference_script):
                    self.calls += 1
                    # A poorly behaved adapter may edit its input; it must only receive a disposable copy.
                    with master_audio.open("ab") as output:
                        output.write(b"adapter mutation")
                    return [{"start": 0, "end": 2, "text": "Fixture", "direction": "ltr"}]
            adapter = Adapter()
            with self.assertRaisesRegex(ValueError, "explicit authorization"):
                transcribe_with_adapter(p, adapter)
            self.assertEqual(adapter.calls, 0)
            adapter.external = False
            master_hash = digest(p / "master-audio.wav")
            result = transcribe_with_adapter(p, adapter)
            self.assertEqual(result["source"], "fixture adapter")
            self.assertEqual(adapter.calls, 1)
            verify_master(p)
            self.assertEqual(digest(p / "master-audio.wav"), master_hash)

    def test_storyboard_validation_approval_and_edit_invalidation(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            src = root / "voice.wav"
            script = root / "script.txt"
            draft = root / "draft.json"
            tone(src)
            script.write_text("First phrase. Second phrase.", encoding="utf-8")
            save(draft, board())
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(src, "fixture", script_path=script)
            master_hash = digest(p / "master-audio.wav")
            import_storyboard(p, draft)
            approve_storyboard(p, "Fixture creator")
            storyboard_approval_valid(p)
            edited = load(p / "storyboard.json")
            edited["scenes"][0]["visual_reason"] = "Revised explanation."
            save(p / "storyboard.json", edited)
            with self.assertRaisesRegex(ValueError, "no longer current"):
                storyboard_approval_valid(p)
            self.assertEqual(digest(p / "master-audio.wav"), master_hash)

    def test_invalid_scene_times_and_style_leakage(self):
        for change in ({"start": .8}, {"end": float("nan")}, {"color": "blue"}):
            data = board()
            data["scenes"][1].update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_storyboard(data, 2)

    def test_modified_master_is_detected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            src = root / "voice.wav"
            tone(src)
            with patch("reelkit.motion_audio.project", return_value=root / "project"):
                p = intake_audio(src, "fixture")
            with (p / "master-audio.wav").open("ab") as out:
                out.write(b"tamper")
            with self.assertRaisesRegex(ValueError, "changed"):
                verify_master(p)


if __name__ == "__main__":
    unittest.main()
