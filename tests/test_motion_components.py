"""Rendered-browser contracts for reusable component entry, exit, and logo bounds."""
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

from reelkit.core import ROOT, digest, save
from reelkit.motion_audio import intake_audio
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import import_motion_plan
from reelkit.motion_composition import build_motion_composition
from test_motion_m2 import fixtures


class ComponentLifecycle(unittest.TestCase):
    def test_composition_uses_complete_logo_only_on_requested_scene(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            audio, script, board_file, plan_file, _, plan = fixtures(base)
            plan["scenes"][0]["brand_logo"] = True
            save(plan_file, plan)
            with patch("reelkit.motion_audio.project", return_value=base / "project"):
                project = intake_audio(audio, "fixture", script_path=script)
            import_storyboard(project, board_file)
            approve_storyboard(project, "Fixture creator")
            import_motion_plan(project, plan_file)
            (project / "motion-style.json").write_text('{"style":"code-dragon-v1"}', encoding="utf-8")
            composition = build_motion_composition(project)
            html = (composition / "index.html").read_text(encoding="utf-8")
            self.assertEqual(html.count('class="brand-logo-frame"'), 1)
            self.assertIn('src="assets/brand-logo.png" alt="Code Dragon"', html)
            self.assertIn("object-fit:contain", html)
            self.assertNotIn('class="scene-brand-motif', html.split('id="scene-1"')[0])
            self.assertEqual(digest(composition / "assets/brand-logo.png"),
                             digest(ROOT / "assets/brand/code-dragon-logo.png"))

    def test_synthetic_component_fixture_has_clean_entry_atomic_exit_and_contained_logo(self):
        browser_root = Path.home() / ".cache/hyperframes/chrome"
        candidates = sorted(browser_root.rglob("chrome-headless-shell.exe"))
        if not candidates:
            self.skipTest("Local HyperFrames render browser is unavailable")
        source = ROOT / "scripts/build-component-lifecycle-fixture.py"
        spec = importlib.util.spec_from_file_location("component_fixture", source)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            fixture = module.build(directory / "fixture")
            report_path = directory / "report.json"
            process = subprocess.run(
                ["node", str(ROOT / "scripts/check-motion-components.cjs"), str(fixture),
                 str(candidates[-1]), str(report_path)], cwd=ROOT,
                capture_output=True, text=True,
            )
            self.assertEqual(process.returncode, 0, process.stdout + process.stderr)
            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertTrue(report["ok"])
            self.assertTrue(all(report["checks"].values()))


if __name__ == "__main__":
    unittest.main()
