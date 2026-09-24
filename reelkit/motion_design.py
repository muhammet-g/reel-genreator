"""Typed visual plans separate from semantic storyboards and style tokens."""
from __future__ import annotations

from pathlib import Path
import math

from .core import load, save, validate_captions
from .motion_audio import verify_master
from .motion_storyboard import storyboard_approval_valid

SCENE_TYPES = {"typography", "statement", "number", "compare", "steps", "diagram", "progress",
               "notification", "section", "cta"}
LAYOUTS = {"centered", "left-weighted", "right-weighted", "split", "grid", "editorial", "full-screen"}
ENTRANCES = {"reveal", "rise", "slide", "scale"}
EMPHASIS = {"none", "pulse", "underline", "count", "fill", "connect"}
EXITS = {"fade", "slide", "hold"}
TRANSITIONS = {"cut", "fade", "push", "wipe"}
DENSITIES = {"low", "medium", "high"}
ENERGIES = {"calm", "balanced", "energetic"}

DEFAULT_STYLE = {
    "schema_version": 1, "name": "motion-foundation",
    "colors": {"background": "#111927", "foreground": "#f5f2e9", "muted": "#a6b7c5",
               "accent": "#76ddc8", "secondary": "#ffb56b", "surface": "#1d2a3a"},
    "font_family": "ReelArabic, ReelLatin, Arial, sans-serif",
    "radius": 28,
}


def _text(scene, key, *, required=False, limit=110):
    value = scene.get(key, "")
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ValueError(f"Scene {scene.get('id')} needs readable {key} (at most {limit} characters).")


def validate_motion_plan(plan: dict, board: dict, total: float) -> dict:
    if not isinstance(plan, dict) or plan.get("schema_version") != 1 or plan.get("mode") != "motion-only":
        raise ValueError("Motion plan needs schema_version 1 and motion-only mode.")
    if plan.get("motion_density") not in DENSITIES or plan.get("visual_energy") not in ENERGIES:
        raise ValueError("Choose low/medium/high motion_density and calm/balanced/energetic visual_energy.")
    scenes = plan.get("scenes")
    if not isinstance(scenes, list) or len(scenes) != len(board["scenes"]):
        raise ValueError("Motion plan needs one visual scene for each approved semantic scene.")
    family = plan.get("transition_family", "fade")
    if family not in TRANSITIONS:
        raise ValueError("Use one supported transition family for this reel.")
    for semantic, scene in zip(board["scenes"], scenes):
        if not isinstance(scene, dict) or scene.get("id") != semantic["id"]:
            raise ValueError("Motion scene ids must match the approved storyboard in order.")
        if scene.get("type") not in SCENE_TYPES or scene.get("layout") not in LAYOUTS:
            raise ValueError(f"Scene {scene['id']} needs a supported type and layout.")
        for key in ("start", "end"):
            try:
                value = float(scene[key])
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError(f"Scene {scene['id']} needs numeric {key}.") from exc
            if not math.isfinite(value) or abs(value - float(semantic[key])) > .001:
                raise ValueError(f"Scene {scene['id']} must keep approved storyboard timing.")
        _text(scene, "eyebrow", limit=45)
        _text(scene, "headline", required=True, limit=72)
        if scene.get("headline_direction", "auto") not in ("auto", "rtl", "ltr"):
            raise ValueError(f"Scene {scene['id']} has invalid headline_direction.")
        _text(scene, "body", limit=150)
        _text(scene, "action", limit=36)
        if scene["type"] in ("compare", "steps", "diagram"):
            items = scene.get("items")
            minimum = 2
            maximum = 4 if scene["type"] == "steps" else 3
            if not isinstance(items, list) or not minimum <= len(items) <= maximum or any(
                not isinstance(item, str) or not item.strip() or len(item) > 30 for item in items):
                raise ValueError(f"Scene {scene['id']} needs {minimum}–{maximum} short items.")
        if scene["type"] == "number":
            if not isinstance(scene.get("number"), (int, float)) or not math.isfinite(scene["number"]):
                raise ValueError(f"Scene {scene['id']} needs a finite number.")
        if scene["type"] == "progress":
            value = scene.get("progress")
            if not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
                raise ValueError(f"Scene {scene['id']} needs progress between 0 and 1.")
        motion = scene.get("motion")
        if not isinstance(motion, dict) or motion.get("entrance") not in ENTRANCES or motion.get("emphasis") not in EMPHASIS or motion.get("exit") not in EXITS:
            raise ValueError(f"Scene {scene['id']} needs supported entrance, emphasis and exit choices.")
        scene_duration = float(scene["end"]) - float(scene["start"])
        if scene_duration < 1.2:
            raise ValueError(f"Scene {scene['id']} is too short for a readable Motion-Only composition.")
        if len(scene["headline"].split()) > 10 and scene_duration < 2.4:
            raise ValueError(f"Scene {scene['id']} shows too many headline words for its duration.")
        if "transition" in scene and scene["transition"] != family:
            raise ValueError(f"Scene {scene['id']} conflicts with the video's transition family.")
        if "resource_tags" in scene and (not isinstance(scene["resource_tags"], list) or any(
            not isinstance(tag, str) or not tag.strip() for tag in scene["resource_tags"])):
            raise ValueError(f"Scene {scene['id']} needs a list of resource tags.")
        if "resource_id" in scene and not isinstance(scene["resource_id"], str):
            raise ValueError(f"Scene {scene['id']} needs a resource id string.")
        placement = scene.get("resource_placement", {})
        if not isinstance(placement, dict) or any(key not in {"x", "y", "width", "opacity", "trim_start", "loop", "color"} for key in placement):
            raise ValueError(f"Scene {scene['id']} has invalid resource placement controls.")
        for key, low, high in (("x", 0, 100), ("y", 0, 100), ("width", 5, 100), ("opacity", 0, 1),
                               ("trim_start", 0, 3600)):
            if key in placement and (not isinstance(placement[key], (int, float)) or
                                     not math.isfinite(placement[key]) or not low <= placement[key] <= high):
                raise ValueError(f"Scene {scene['id']} has invalid resource {key}.")
        if "loop" in placement and not isinstance(placement["loop"], bool):
            raise ValueError(f"Scene {scene['id']} needs a boolean resource loop.")
        if placement.get("loop") and placement.get("trim_start", 0):
            raise ValueError(f"Scene {scene['id']} cannot combine looping and trim_start; export a trimmed loop.")
        if "color" in placement and placement["color"] not in DEFAULT_STYLE["colors"]:
            raise ValueError(f"Scene {scene['id']} needs a known color token.")
    captions = plan.get("captions")
    if not captions:
        raise ValueError("Motion-Only captions are on by default; provide measured phrase captions.")
    validate_captions(captions, total)
    sfx = plan.get("sfx", [])
    if not isinstance(sfx, list) or len(sfx) > 24:
        raise ValueError("Motion plan needs at most 24 intentional SFX cues.")
    for cue in sfx:
        if not isinstance(cue, dict) or not isinstance(cue.get("resource_id"), str):
            raise ValueError("Each SFX cue needs a resource id.")
        for key, low, high in (("start", 0, total), ("volume", 0, .25), ("fade_in", 0, 2),
                               ("fade_out", 0, 2)):
            value = cue.get(key, 0 if key != "volume" else .18)
            if not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
                raise ValueError(f"SFX cue {key} is outside the safe range.")
    return plan


def import_motion_plan(p: Path, source: str | Path) -> Path:
    _, state = verify_master(p)
    storyboard_approval_valid(p)
    board = load(Path(p) / "storyboard.json")
    plan = validate_motion_plan(load(source), board, state["duration"])
    target = Path(p) / "motion-plan.json"
    save(target, plan)
    return target


def load_style(p: Path) -> dict:
    path = Path(p) / "motion-style.json"
    style = load(path) if path.exists() else DEFAULT_STYLE
    if style.get("schema_version") != 1 or not isinstance(style.get("colors"), dict):
        raise ValueError("Motion style needs schema_version 1 and color tokens.")
    import re
    for key in DEFAULT_STYLE["colors"]:
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(style["colors"].get(key, ""))):
            raise ValueError(f"Motion style color {key} must be a six-digit hex value.")
    return style
