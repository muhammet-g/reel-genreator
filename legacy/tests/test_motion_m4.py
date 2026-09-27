"""Milestone 4 derivative integrity, preview approval and edit invalidation."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from reelkit.core import digest, ffmpeg, load, save
from reelkit.motion_audio import intake_audio, verify_master
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import import_motion_plan
from reelkit.motion_composition import build_motion_composition
from reelkit.motion_render import (ensure_render_audio, decoded_audio_hash, _snapshot, _verify_output,
                                   approve_preview, preview_approval_valid, render_final)
from test_motion_m2 import fixtures


def ready_project(root):
    audio, script, board_file, plan_file, _, _ = fixtures(root)
    with patch("reelkit.motion_audio.project", return_value=root / "project"):
        p = intake_audio(audio, "fixture", script_path=script)
    import_storyboard(p, board_file)
    approve_storyboard(p, "Fixture creator")
    import_motion_plan(p, plan_file)
    return p


class MotionMilestoneFour(unittest.TestCase):
    def test_derivative_is_distinct_and_master_is_unchanged(self):
        with tempfile.TemporaryDirectory() as d:
            p = ready_project(Path(d))
            master, state = verify_master(p)
            original = digest(master)
            derivative = ensure_render_audio(p)
            self.assertNotEqual(master, derivative)
            self.assertEqual(digest(master), original)
            self.assertEqual(load(p / "motion-project.json")["render_audio"]["derived_from_sha256"], original)
            self.assertEqual(ensure_render_audio(p), derivative)

    def test_remuxed_output_matches_one_approved_derivative(self):
        with tempfile.TemporaryDirectory() as d:
            p = ready_project(Path(d))
            derivative = ensure_render_audio(p)
            picture = p / "picture.mp4"; final = p / "output.mp4"
            ffmpeg(["-f", "lavfi", "-i", "color=c=0x111927:s=1080x1920:r=30:d=4",
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", picture])
            ffmpeg(["-i", picture, "-i", derivative, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", final])
            expected = decoded_audio_hash(derivative)
            report = _verify_output(final, derivative, 4, expected)
            self.assertTrue(report["audio_matches_derivative"])
            master, _ = verify_master(p)
            self.assertEqual(digest(master), load(p / "motion-project.json")["master_audio"]["sha256"])

    def test_preview_approval_invalidated_by_motion_edit(self):
        with tempfile.TemporaryDirectory() as d:
            p = ready_project(Path(d))
            ensure_render_audio(p)
            out = build_motion_composition(p)
            preview = p / "motion-only" / "previews" / "preview-fixture.mp4"
            preview.parent.mkdir(parents=True)
            preview.write_bytes(b"synthetic preview fixture")
            save(preview.with_suffix(".json"), {"snapshot": _snapshot(p, out), "output_sha256": digest(preview)})
            approve_preview(p, preview, "Fixture creator")
            preview_approval_valid(p, out)
            plan = load(p / "motion-plan.json")
            plan["scenes"][0]["headline"] = "Updated number"
            save(p / "motion-plan.json", plan)
            out = build_motion_composition(p)
            with self.assertRaisesRegex(ValueError, "changed since preview approval"):
                preview_approval_valid(p, out)

    def test_final_requires_preview_approval(self):
        with tempfile.TemporaryDirectory() as d:
            p = ready_project(Path(d))
            with patch("reelkit.motion_render.hf") as renderer:
                with self.assertRaises(FileNotFoundError):
                    render_final(p)
                renderer.assert_not_called()


if __name__ == "__main__": unittest.main()
