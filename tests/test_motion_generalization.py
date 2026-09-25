from copy import deepcopy
import importlib.util
from pathlib import Path
import unittest
from reelkit.motion_layout import analyze, validate_contract, union_area
from reelkit.motion_layout_adapter import composition_model, composition_css
from reelkit.motion_choreography import motion_advisories

spec = importlib.util.spec_from_file_location("general_fixture", Path(__file__).resolve().parents[1]/"scripts/build-generalization-fixture.py")
fixture = importlib.util.module_from_spec(spec); spec.loader.exec_module(fixture)
FRAME = {"width": 1080, "height": 1920, "fps": 30}


class GeneralCompositionTests(unittest.TestCase):
    def test_auto_motion_advisories_use_resolved_choreography(self):
        plan = fixture.fixture_plan()
        self.assertEqual(motion_advisories(plan)["families"], ["settle", "settle", "staged", "settle", "staged", "settle"])
        self.assertEqual(motion_advisories(plan)["advisory_count"], 0)

    def test_semantic_density_and_importance_pass_through_without_branding(self):
        plan = fixture.fixture_plan()
        board = {"scenes": [{"id": "A-code", "importance": "low", "information_density": "high"}]}
        scene = composition_model(plan, FRAME, board)["scenes"][0]
        self.assertEqual(scene["information_density"], "high")
        self.assertEqual(next(e for e in scene["elements"] if e["role"] == "primary")["importance"], "low")

    def measurement(self, model):
        return {"samples": [{"scene": s["id"], "objects": [{"id": "object", "role": "primary", "visible": True,
            "box": [100, 400, 700, 400], "min_font": 40, "max_font": 60}], "captions": []} for s in model["scenes"]]}

    def test_six_domains_keep_distinct_roles_and_opt_in_flow_without_mutation(self):
        plan = fixture.fixture_plan(); before = deepcopy(plan)
        model = composition_model(plan, FRAME)
        self.assertEqual(plan, before)
        self.assertEqual(len(model["scenes"]), 6)
        self.assertIn('#scene-2 .visual', composition_css(model))
        self.assertNotIn('#scene-0', composition_css(model))
        self.assertTrue(model["scenes"][-1]["intentional_negative_space"])
        self.assertEqual(analyze(model, self.measurement(model))["error_count"], 0)

    def test_advisories_do_not_move_content_or_require_domain_knowledge(self):
        model = composition_model(fixture.fixture_plan(), FRAME); observations = self.measurement(model)
        observations["samples"][0]["objects"][0]["box"] = [100, 400, 50, 50]
        before = deepcopy(observations)
        report = analyze(model, observations)
        self.assertIn("small-primary", {f["code"] for f in report["findings"]})
        self.assertEqual(observations, before)
        self.assertEqual(report, analyze(model, observations))

    def test_negative_space_does_not_disable_objective_safeguards(self):
        model = composition_model(fixture.fixture_plan(), FRAME); obs = self.measurement(model)
        item = obs["samples"][-1]["objects"][0]; item.update(box=[-5, 400, 50, 50], clipped=True)
        codes = {f["code"] for f in analyze(model, obs)["findings"] if f["scene"] == "F-cta"}
        self.assertNotIn("unused-space", codes); self.assertIn("safe-area", codes); self.assertIn("clipping", codes)

    def test_caption_collision_hidden_primary_and_bidi_are_errors(self):
        model = composition_model(fixture.fixture_plan(), FRAME); obs = self.measurement(model)
        obs["samples"][0]["objects"][0]["visible"] = False
        obs["samples"][1]["captions"] = [{"id": "caption", "visible": True, "box": [100, 400, 500, 100]}]
        obs["samples"][2]["bidi_errors"] = ["isolated expression"]
        codes = {f["code"] for f in analyze(model, obs)["findings"]}
        self.assertTrue({"primary-invisible", "caption-overlap", "caption-safe-area", "bidi-isolation"} <= codes)

    def test_missing_measurements_and_repetition_are_not_silent(self):
        model = composition_model(fixture.fixture_plan(), FRAME)
        self.assertEqual(analyze(model, {"samples": []})["error_count"], 6)
        model["scenes"] = [deepcopy(model["scenes"][0]) for _ in range(3)]
        for i, s in enumerate(model["scenes"]): s["id"] = str(i)
        self.assertIn("repeated-composition", {f["code"] for f in analyze(model, self.measurement(model))["findings"]})

    def test_schema_rejects_style_leaks_invalid_boxes_and_unknown_bindings(self):
        for invalid in ({"font": "brand"}, {"safe_area": [0, 0, -1, 2]}, {"caption_zone": [0, 0, 2000, 2000]}, {"policy": {"minimum_text_px": float('nan')}}):
            with self.assertRaises(ValueError): validate_contract(invalid, FRAME)
        plan = fixture.fixture_plan(); plan["scenes"][0]["composition"] = {"elements": [{"id": "invented", "role": "primary"}]}
        with self.assertRaises(ValueError): composition_model(plan, FRAME)

    def test_occupancy_union_does_not_double_count_nested_objects(self):
        self.assertEqual(union_area([[0, 0, 100, 100], [10, 10, 30, 30], [50, 0, 100, 100]]), 15000)

    def test_readability_reading_demand_and_context_dominance_are_advisories(self):
        model = composition_model(fixture.fixture_plan(), FRAME); obs = self.measurement(model)
        model["scenes"][0]["reading_words"] = 100
        obs["samples"][0]["objects"][0]["min_font"] = 12
        obs["samples"][0]["objects"].append({"id": "label", "role": "context", "visible": True, "box": [100, 250, 500, 100], "min_font": 100, "max_font": 100})
        report = analyze(model, obs)
        self.assertEqual(report["error_count"], 0)
        self.assertTrue({"readability", "reading-demand", "context-dominance"} <= {f["code"] for f in report["findings"]})

if __name__ == "__main__": unittest.main()
