"""Semantic Motion-Only storyboard validation and creator approval."""
from __future__ import annotations

from pathlib import Path
import math
import time

from .core import digest, load, save
from .motion_audio import verify_master

SCHEMA_VERSION = 1
FUNCTIONS = {
    "hook", "statement", "explanation", "definition", "comparison", "contrast", "cause-effect",
    "sequence", "process", "timeline", "list", "statistic", "number", "warning", "question",
    "quote", "emphasis", "reveal", "transformation", "hierarchy", "conclusion", "cta",
}
LEVELS = {"low", "medium", "high"}
ENERGIES = {"calm", "balanced", "energetic"}


def validate_storyboard(board: dict, total: float) -> dict:
    if not isinstance(board, dict) or board.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("The storyboard needs schema_version 1.")
    if board.get("mode") != "motion-only":
        raise ValueError("The storyboard must declare motion-only mode.")
    if not str(board.get("timing_verified_by", "")).strip():
        raise ValueError("Replay the Master Audio and name the editor who verified storyboard timing.")
    scenes = board.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError("The storyboard needs at least one semantic scene.")
    last, ids = 0.0, set()
    for i, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            raise ValueError("Each scene must be an object.")
        ident = scene.get("id")
        if not isinstance(ident, str) or not ident.strip() or ident in ids:
            raise ValueError("Each scene needs a unique, nonempty id.")
        ids.add(ident)
        try:
            a, b = float(scene["start"]), float(scene["end"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("Each scene needs numeric start and end times.") from exc
        if not all(math.isfinite(x) for x in (a, b)) or a < 0 or b <= a or b > total + .04:
            raise ValueError(f"Scene {ident} has invalid times.")
        if a < last - .001:
            raise ValueError(f"Scene {ident} overlaps or is out of order.")
        if a - last > .05:
            raise ValueError(f"Scene {ident} leaves an uncovered gap; include a deliberate visual hold.")
        if scene.get("semantic_function") not in FUNCTIONS:
            raise ValueError(f"Scene {ident} needs a supported semantic_function.")
        if scene.get("importance") not in LEVELS or scene.get("information_density") not in LEVELS:
            raise ValueError(f"Scene {ident} needs low, medium or high importance and information_density.")
        if scene.get("motion_energy") not in ENERGIES:
            raise ValueError(f"Scene {ident} needs calm, balanced or energetic motion_energy.")
        for field in ("narration", "visual_structure", "visual_hierarchy", "recommended_presentation", "visual_reason"):
            if not isinstance(scene.get(field), str) or not scene[field].strip():
                raise ValueError(f"Scene {ident} needs {field}.")
        # The semantic file describes decisions, not a finished visual style.
        if "style" in scene or "color" in scene or "font" in scene:
            raise ValueError(f"Scene {ident} contains appearance tokens; keep style separate from semantics.")
        last = b
    if total - last > .05:
        raise ValueError("The storyboard does not cover the Master Audio ending.")
    return board


def import_storyboard(p: Path, source: str | Path) -> Path:
    _, state = verify_master(p)
    if not (Path(p) / "transcript.json").exists():
        raise ValueError("Add a script or transcript before importing a storyboard.")
    board = validate_storyboard(load(source), state["duration"])
    target = Path(p) / "storyboard.json"
    save(target, board)
    return target


def approve_storyboard(p: Path, by: str) -> dict:
    master, state = verify_master(p)
    if not by.strip():
        raise ValueError("Name the creator who reviewed and approved the storyboard.")
    transcript_path = Path(p) / "transcript.json"
    if not transcript_path.exists():
        raise ValueError("Add a transcript or script before storyboard approval.")
    board_path = Path(p) / "storyboard.json"
    validate_storyboard(load(board_path), state["duration"])
    record = {"by": by.strip(), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "sha256": {"master_audio": digest(master), "transcript.json": digest(transcript_path),
                         "storyboard.json": digest(board_path)}}
    save(Path(p) / "storyboard-approval.json", record)
    return record


def storyboard_approval_valid(p: Path) -> dict:
    master, state = verify_master(p)
    board = Path(p) / "storyboard.json"
    transcript = Path(p) / "transcript.json"
    validate_storyboard(load(board), state["duration"])
    record = load(Path(p) / "storyboard-approval.json")
    expected = {"master_audio": digest(master), "transcript.json": digest(transcript), "storyboard.json": digest(board)}
    if record.get("sha256") != expected:
        raise ValueError("Master Audio, transcript or storyboard changed; creator approval is no longer current.")
    return record
