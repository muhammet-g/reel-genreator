"""Semantic motion contracts and deterministic design advisories (not a quality score)."""
from __future__ import annotations

import json
import math
import re

FAMILIES = {"staged", "construct", "evaluate", "count", "tokens", "extract", "end-focus", "focus-step", "simplify", "behavior-compare"}
BEATS = {"build", "indexes", "expression", "focus", "result", "count", "reduce", "compare", "headline"}


def validate_choreography(scene):
    value = scene.get("choreography")
    if value is None:
        return
    if not isinstance(value, dict) or value.get("family") not in FAMILIES:
        raise ValueError("Choose a supported semantic choreography family.")
    if value["family"] != "staged" and not scene.get("code_array"):
        raise ValueError("Programming choreography needs code_array.")
    if value["family"] == "staged" and scene.get("code_array"):
        raise ValueError("Staged typography uses context labels; choose construct for an array.")
    duration = scene["end"] - scene["start"]
    beats = value.get("beats", {})
    if not isinstance(beats, dict) or set(beats) - BEATS:
        raise ValueError("Unknown choreography beat.")
    for at in beats.values():
        if type(at) not in (int, float) or not math.isfinite(at) or not 0 <= at <= duration - .4:
            raise ValueError("Choreography beats must leave time to settle inside the scene.")
    for key in ("context",):
        if key in value and (not isinstance(value[key], list) or len(value[key]) > 3 or any(
                not isinstance(s, str) or len(s) > 24 for s in value[key])):
            raise ValueError("Choreography context needs up to three short labels.")
    visual = scene.get("code_array", {})
    ident = visual.get("object_id")
    if ident is not None and (not isinstance(ident, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,40}", ident)):
        raise ValueError("Shared array object_id must be a safe identifier.")
    if value["family"] != "staged" and not ident:
        raise ValueError("Programming choreography needs a persistent object_id.")
    tokens = visual.get("tokens")
    if tokens is not None:
        if not isinstance(tokens, list) or not tokens or len(tokens) > 16 or any(not isinstance(t, str) or not t for t in tokens) or "".join(tokens) != visual.get("expression", ""):
            raise ValueError("Code tokens must reconstruct the exact expression.")
    times = visual.get("token_times")
    previous = visual.get("previous_expression")
    if previous is not None and (not isinstance(previous, str) or len(previous) > 48 or not previous.startswith(visual["variable"])):
        raise ValueError("Previous expression must use the same variable.")
    if times is not None:
        if not tokens or not isinstance(times, list) or len(times) != len(tokens) or any(
                type(t) not in (int, float) or not math.isfinite(t) or t < 0 or t > duration - .4 for t in times) or times != sorted(times):
            raise ValueError("Token times must be ordered scene-relative seconds.")
    reasoning = visual.get("reasoning", [])
    if not isinstance(reasoning, list) or len(reasoning) > 5:
        raise ValueError("Use at most five reasoning steps.")
    last = -1
    for step in reasoning:
        if not isinstance(step, dict) or any(not isinstance(step.get(k), str) or len(step[k]) > 32 for k in ("text", "value")):
            raise ValueError("Reasoning steps need short text and value.")
        at = step.get("at")
        if type(at) not in (int, float) or not math.isfinite(at) or not last < at <= duration - .6:
            raise ValueError("Reasoning steps need ordered times inside the scene.")
        last = at
    editor_comments = visual.get("editor_comments", [])
    if not isinstance(editor_comments, list) or len(editor_comments) > 3:
        raise ValueError("Teaching editor needs at most three comments.")
    last = -1
    for comment in editor_comments:
        if not isinstance(comment, dict) or any(
            not isinstance(comment.get(key), str) or not comment[key] or len(comment[key]) > 40
            for key in ("arabic", "ltr")
        ):
            raise ValueError("Teaching comments need Arabic prose and an isolated LTR expression.")
        at = comment.get("at")
        if type(at) not in (int, float) or not math.isfinite(at) or not last < at <= duration - .3:
            raise ValueError("Teaching comments need ordered scene-relative times.")
        last = at
    if value["family"] in ("extract", "behavior-compare"):
        result = visual.get("result", {})
        selected = visual.get("selected_index")
        if result.get("kind") != "array" or selected is None:
            raise ValueError("Extraction needs a selected source cell and Array result.")
        # This version animates one copied cell; do not imply support for arbitrary slices.
        if len(result["value"]) != 1 or result["value"][0].strip('"') != visual["cells"][selected].strip('"'):
            raise ValueError("Extraction currently supports one matching source cell.")


def shared_arrays(scenes):
    """A shared identity is contiguous and immutable; no silent identity collisions."""
    groups = {}
    for index, scene in enumerate(scenes):
        visual = scene.get("code_array", {})
        ident = visual.get("object_id") if scene.get("choreography") else None
        if not ident:
            continue
        if ident in groups:
            group = groups[ident]
            if group["last_index"] != index - 1 or group["end"] != scene["start"] or any(group["visual"][k] != visual[k] for k in ("variable", "cells")):
                raise ValueError("Shared array identity must keep cells and contiguous scenes.")
            group.update(end=scene["end"], last_index=index)
        else:
            groups[ident] = {"id": ident, "visual": visual, "start": scene["start"], "end": scene["end"], "first_index": index, "last_index": index}
    return list(groups.values())


def motion_advisories(plan):
    scenes = plan["scenes"]
    findings = []
    def runs(values, code):
        begin = 0
        for i in range(1, len(values) + 1):
            if i == len(values) or values[i] != values[begin]:
                if values[begin] and i - begin >= 3:
                    findings.append({"code": code, "severity": "advisory", "scenes": [s["id"] for s in scenes[begin:i]], "pattern": values[begin]})
                begin = i
    entrance, direction, signature = [], [], []
    slides = 0
    for scene in scenes:
        choreo, motion = scene.get("choreography", {}), scene["motion"]
        resolved = ({"compare": "settle", "steps": "staged", "diagram": "staged", "typography": "mask"}.get(scene["type"], "settle") if motion["entrance"] == "auto" else motion["entrance"])
        family = choreo.get("family", resolved)
        entrance.append(family)
        transition = scene.get("transition", plan.get("transition_family", "fade"))
        directional = "horizontal" if motion["entrance"] == "slide" or transition == "push" else "vertical" if motion["entrance"] == "rise" else ""
        direction.append(directional)
        slides += motion["entrance"] == "slide" or motion["exit"] == "slide" or transition == "push"
        signature.append(json.dumps({"family": family, "motion": motion, "type": scene["type"], "beats": sorted(choreo.get("beats", {})), "transition": transition}, sort_keys=True))
    runs(entrance, "repeated_entrance_family")
    runs(direction, "repeated_directional_translation")
    runs(signature, "repeated_choreography")
    if scenes and slides / len(scenes) > .4:
        findings.append({"code": "slide_transition_reliance", "severity": "advisory", "count": slides, "total": len(scenes)})
    return {"advisory_count": len(findings), "findings": findings, "slide_scene_count": slides,
            "scene_count": len(scenes), "families": entrance, "note": "Deterministic repetition checks; human motion review is still required."}
