"""Milestone 3 local resource import, integrity and selection."""
from pathlib import Path
import tempfile
import unittest

from reelkit.core import load, save
from reelkit.motion_resources import (import_resource, inspect_resource, load_manifest, select_resource,
                                      validate_manifest)
from reelkit.content_policy import validate_resource_content_metadata


def svg(path, text="<circle cx='12' cy='12' r='8'/>"):
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">{text}</svg>', encoding="utf-8")


class MotionMilestoneThree(unittest.TestCase):
    def test_import_manifest_and_select_approved_local_resource(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); library = root / "resources"; source = root / "arrow.svg"
            svg(source)
            item = import_resource(source, ident="arrow-01", category="svg", tags=["arrow", "flow"],
                                   license="CC0", origin="Synthetic fixture", safety="approved",
                                   compatible_scenes=["diagram"], library=library)
            self.assertEqual(item["width"], 24)
            self.assertTrue(item["alpha"])
            self.assertEqual(load_manifest(library)["resources"][0]["id"], "arrow-01")
            chosen = select_resource(scene_type="diagram", tags=["flow"], energy="balanced", library=library)
            self.assertEqual(chosen["id"], "arrow-01")
            self.assertIsNone(select_resource(scene_type="cta", tags=["call-to-action"], library=library))
            with self.assertRaisesRegex(ValueError, "already registered"):
                import_resource(source, ident="arrow-02", category="svg", tags=["arrow"],
                                license="CC0", origin="Fixture", library=library)

    def test_unreviewed_resource_never_selected_and_bad_path_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); library = root / "resources"; source = root / "icon.svg"; svg(source)
            import_resource(source, ident="icon-01", category="svg", tags=["notify"], license="CC0",
                            origin="Fixture", compatible_scenes=["notification"], library=library)
            self.assertIsNone(select_resource(scene_type="notification", tags=["notify"], library=library))
            manifest = load_manifest(library)
            manifest["resources"][0]["path"] = "../../outside.svg"
            with self.assertRaisesRegex(ValueError, "invalid or missing local path"):
                validate_manifest(manifest, library)

    def test_rejects_active_svg_and_unsupported_formats(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); unsafe = root / "unsafe.svg"; svg(unsafe, "<script>alert(1)</script>")
            with self.assertRaisesRegex(ValueError, "scripts"):
                inspect_resource(unsafe)
            aep = root / "project.aep"; aep.write_bytes(b"not supported")
            with self.assertRaisesRegex(ValueError, "Unsupported"):
                inspect_resource(aep)

    def test_lottie_registered_as_metadata_only(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); source = root / "animation.json"
            save(source, {"v": "5.12.0", "fr": 30, "ip": 0, "op": 60, "layers": [], "w": 200, "h": 200})
            item = import_resource(source, ident="lottie-01", category="lottie", tags=["pop"],
                                   license="CC0", origin="Fixture", safety="approved", library=root / "resources")
            self.assertEqual(item["duration"], 2)
            self.assertFalse(item["render_ready"])
            self.assertIsNone(select_resource(scene_type="notification", tags=["pop"], library=root / "resources"))

    def test_content_metadata_rejects_music_and_blocked_approved_tags(self):
        with self.assertRaisesRegex(ValueError, "Music"):
            validate_resource_content_metadata(tags=["music"], safety="unreviewed", kind="sfx")
        with self.assertRaisesRegex(ValueError, "blocked content"):
            validate_resource_content_metadata(tags=["animal"], safety="approved", kind="image")


if __name__ == "__main__": unittest.main()
