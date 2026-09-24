"""Focused Resource System v2 import, selection, rendering and SFX regressions."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

from reelkit.core import digest, ffmpeg, load, save
from reelkit.motion_audio import intake_audio, verify_master
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import import_motion_plan
from reelkit.motion_resources import (import_resource, inspect_resource, load_manifest, rank_resources,
                                      select_resource, sequence_frames, validate_manifest, refresh_resource)
from reelkit.motion_composition import build_motion_composition, _loop_video
from reelkit.motion_render import ensure_render_audio
from reelkit.motion_sfx import ensure_mixed_audio
from test_motion_m2 import fixtures


def svg(path):
    path.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
                    'viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>', encoding="utf-8")


def project_fixture(root, plan_edit=None):
    audio, script, board_file, plan_file, _, plan = fixtures(root)
    if plan_edit:
        plan_edit(plan)
        save(plan_file, plan)
    with patch("reelkit.motion_audio.project", return_value=root / "project"):
        p = intake_audio(audio, "fixture", script_path=script)
    import_storyboard(p, board_file)
    approve_storyboard(p, "Fixture creator")
    import_motion_plan(p, plan_file)
    return p


class ResourceV2(unittest.TestCase):
    def test_v2_suggestions_hash_and_cached_reimport(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); lib = root / "resources"; source = root / "notification.svg"; svg(source)
            item = import_resource(source, license="CC0-1.0", origin="Original fixture",
                                   safety="approved", compatible_scenes=["notification"], library=lib)
            self.assertEqual(load_manifest(lib)["schema_version"], 2)
            self.assertEqual(item["local_path"], item["path"])
            self.assertIn("modern", item["style_tags"])
            with patch("reelkit.motion_resources.inspect_resource", side_effect=AssertionError("reinspection")):
                self.assertEqual(import_resource(source, ident=item["id"], library=lib)["sha256"], item["sha256"])
            with self.assertRaisesRegex(ValueError, "already registered"):
                import_resource(source, ident="duplicate", library=lib)
            with self.assertRaisesRegex(ValueError, "invalid or missing"):
                item["path"] = "../../escape.svg"
                validate_manifest({"schema_version": 2, "resources": [item]}, lib)

    def test_ranking_license_safety_and_fallback(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); lib = root / "resources"
            one = root / "one.svg"; two = root / "two.svg"
            svg(one)
            two.write_text(one.read_text().replace('r="8"', 'r="7"'), encoding="utf-8")
            import_resource(one, ident="notice", category="icons", tags=["notification"],
                            license="CC0", origin="Fixture", safety="approved",
                            compatible_scenes=["notification"], style_tags=["modern"], library=lib)
            import_resource(two, ident="hidden", category="icons", tags=["notification"],
                            license="CC0", origin="Fixture", safety="unreviewed",
                            compatible_scenes=["notification"], library=lib)
            ranked = rank_resources(scene_type="notification", tags=["notification"],
                                    energy="balanced", style="modern", library=lib)
            self.assertEqual([x["resource"]["id"] for x in ranked], ["notice"])
            self.assertGreater(ranked[0]["score"], 0)
            self.assertIsNone(select_resource(scene_type="cta", tags=["unknown"], library=lib))
            sound = root / "pop.wav"
            with wave.open(str(sound), "wb") as output:
                output.setnchannels(1); output.setsampwidth(2); output.setframerate(8000)
                output.writeframes(b"\x20\x03" * 800)
            import_resource(sound, ident="pop", category="sfx/pops", tags=["pop"], license="CC0",
                            origin="Fixture", safety="approved", library=lib)
            self.assertEqual(select_resource(scene_type="notification", tags=["pop"], library=lib)["id"], "notice")
            self.assertEqual(select_resource(scene_type="notification", tags=["pop"], kind="sfx", library=lib)["id"], "pop")
            with self.assertRaisesRegex(ValueError, "verified supported license"):
                import_resource(root / "two.svg", ident="bad-license", category="svg", tags=["arrow"],
                                license="UNKNOWN", origin="Fixture", safety="approved", library=root / "other")

    def test_replaced_resource_reinspect_revokes_approval(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); lib = root / "resources"; source = root / "mark.svg"; svg(source)
            item = import_resource(source, ident="mark", category="svg", tags=["focus"],
                                   license="CC0", origin="Fixture", safety="approved", library=lib)
            self.assertEqual(refresh_resource("mark", lib)["sha256"], item["sha256"])
            registered = lib / item["path"]
            registered.write_text(registered.read_text().replace('r="8"', 'r="6"'), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "changed since registration"):
                load_manifest(lib)
            updated = refresh_resource("mark", lib)
            self.assertEqual(updated["safety"], "unreviewed")
            self.assertFalse(updated["safe_for_motion_only"])
            self.assertIsNone(select_resource(scene_type="statement", tags=["focus"], library=lib))

    def test_svg_placement_and_missing_resource_fallback(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); lib = root / "resources"; source = root / "ring.svg"; svg(source)
            import_resource(source, ident="ring", category="svg", tags=["focus"], license="CC0",
                            origin="Fixture", safety="approved", library=lib)
            def edit(plan):
                plan["scenes"][0]["resource_id"] = "ring"
                plan["scenes"][0]["resource_placement"] = {"x": 65, "width": 25, "color": "accent"}
                plan["scenes"][1]["resource_id"] = "missing"
            p = project_fixture(root, edit)
            with patch("reelkit.motion_composition.LIBRARY", lib), patch(
                    "reelkit.motion_composition.load_manifest", side_effect=lambda: load_manifest(lib)):
                out = build_motion_composition(p)
            html = (out / "index.html").read_text(encoding="utf-8")
            self.assertIn('class="scene-resource scene-resource-svg"', html)
            self.assertIn('color:var(--accent)', html)
            self.assertNotIn('id="missing"', html)
            self.assertEqual(len(load(out / "build.json")["selected_resources"]), 1)

    def test_video_timing_and_sequence_validation(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); lib = root / "resources"
            clip = root / "clip.mp4"
            ffmpeg(["-f", "lavfi", "-i", "color=c=red:s=64x64:r=30:d=1", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", clip])
            item = import_resource(clip, ident="clip", category="video/standard", tags=["focus"],
                                   license="CC0", origin="Fixture", safety="approved",
                                   safe_for_motion_only=True, library=lib)
            self.assertEqual(item["codec"], "h264")
            def edit(plan):
                plan["scenes"][0]["resource_id"] = "clip"
                plan["scenes"][0]["resource_placement"] = {"trim_start": .1, "x": 50, "width": 20}
            p = project_fixture(root, edit)
            with patch("reelkit.motion_composition.LIBRARY", lib), patch(
                    "reelkit.motion_composition.load_manifest", side_effect=lambda: load_manifest(lib)):
                html = (build_motion_composition(p) / "index.html").read_text(encoding="utf-8")
            self.assertIn('id="resource-video-0"', html)
            self.assertIn('data-media-start="0.1"', html)
            self.assertLess(html.index("</section>"), html.index('id="resource-video-0"'))
            sequence = root / "sequence"; sequence.mkdir()
            (sequence / "frame-000.png").write_bytes(b"not an image")
            (sequence / "frame-002.png").write_bytes(b"not an image")
            with self.assertRaisesRegex(ValueError, "contiguous"):
                sequence_frames(sequence)

    def test_local_vp9_alpha_and_numbered_sequence_are_render_ready(self):
        root = Path(__file__).resolve().parents[1] / "resources"
        overlay = root / "video" / "alpha" / "focus-ring-overlay.webm"
        sequence = root / "image-sequences" / "focus-ring-sequence"
        video = inspect_resource(overlay)
        frames = inspect_resource(sequence)
        self.assertEqual(video["codec"], "vp9")
        self.assertTrue(video["alpha"])
        self.assertTrue(video["render_ready"])
        self.assertEqual(frames["frame_count"], 30)
        self.assertEqual((frames["width"], frames["height"]), (320, 320))
        with tempfile.TemporaryDirectory() as d:
            item = next(x for x in load_manifest(root)["resources"] if x["id"] == "focus-ring-overlay")
            target = _loop_video(overlay, Path(d), 0, 2.0, item)
            self.assertEqual(_loop_video(overlay, Path(d), 0, 2.0, item), target)
            extended = inspect_resource(target)
            self.assertTrue(extended["alpha"])
            self.assertAlmostEqual(extended["duration"], 2.0, delta=.08)

    def test_sfx_mix_preserves_master_and_reuses_cache(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); lib = root / "resources"
            effect = root / "tap.wav"
            with wave.open(str(effect), "wb") as output:
                output.setnchannels(1); output.setsampwidth(2); output.setframerate(8000)
                output.writeframes(b"\x20\x03" * 800)
            import_resource(effect, ident="tap", category="sfx/clicks", tags=["tap"],
                            license="CC0", origin="Fixture", safety="approved", library=lib)
            def edit(plan):
                plan["sfx"] = [{"resource_id": "tap", "start": .5, "volume": .16, "fade_out": .04}]
            p = project_fixture(root, edit)
            master, _ = verify_master(p); before = digest(master)
            derivative = ensure_render_audio(p)
            with patch("reelkit.motion_sfx.LIBRARY", lib), patch(
                    "reelkit.motion_sfx.load_manifest", side_effect=lambda: load_manifest(lib)):
                mixed = ensure_mixed_audio(p, derivative)
                self.assertEqual(ensure_mixed_audio(p, derivative), mixed)
            self.assertNotEqual(digest(mixed), digest(derivative))
            self.assertEqual(digest(master), before)
            self.assertEqual(load(p / "motion-project.json")["mixed_audio"]["derived_from_sha256"], digest(derivative))


if __name__ == "__main__":
    unittest.main()
