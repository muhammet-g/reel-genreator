"""Content-independent composition contracts and deterministic measured advisories.

Coordinates are CSS pixels in the authored frame. Policies are review thresholds,
not aesthetic guarantees. This module never moves, scales, or restyles content.
"""
from __future__ import annotations
import math

ROLES = {"primary", "secondary", "context"}
DEFAULT_POLICY = {"minimum_text_px": 28, "small_primary_fraction": .045,
                  "low_occupancy_fraction": .16, "words_per_second": 4}


def box(value):
    if not isinstance(value, list) or len(value) != 4 or any(
        isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n) for n in value
    ) or value[2] <= 0 or value[3] <= 0:
        raise ValueError("Composition boxes need finite [x, y, width, height] with positive size.")
    return value


def contains(outer, inner, tolerance=1):
    return (inner[0] >= outer[0]-tolerance and inner[1] >= outer[1]-tolerance and
            inner[0]+inner[2] <= outer[0]+outer[2]+tolerance and
            inner[1]+inner[3] <= outer[1]+outer[3]+tolerance)


def intersects(a, b):
    return min(a[0]+a[2], b[0]+b[2])-max(a[0], b[0]) > 1 and min(a[1]+a[3], b[1]+b[3])-max(a[1], b[1]) > 1


def union_area(rects):
    xs = sorted({x for r in rects for x in (r[0], r[0]+r[2])})
    area = 0
    for left, right in zip(xs, xs[1:]):
        intervals = sorted((r[1], r[1]+r[3]) for r in rects if r[0] < right and r[0]+r[2] > left)
        top = end = None
        covered = 0
        for a, b in intervals:
            if end is None or a > end:
                if end is not None: covered += end-top
                top, end = a, b
            else: end = max(end, b)
        if end is not None: covered += end-top
        area += (right-left)*covered
    return area


def validate_contract(contract, frame):
    allowed = {"elements", "safe_area", "caption_zone", "reserved_areas", "information_density",
               "intentional_negative_space", "reading_words", "policy", "reflow"}
    if not isinstance(contract, dict) or set(contract)-allowed:
        raise ValueError("Unknown composition constraint; styles belong in style tokens.")
    canvas = [0, 0, frame["width"], frame["height"]]
    for key in ("safe_area", "caption_zone"):
        if key in contract and not contains(canvas, box(contract[key]), 0):
            raise ValueError(f"Composition {key} must fit the frame.")
    for area in contract.get("reserved_areas", []):
        if not contains(canvas, box(area), 0): raise ValueError("Reserved area must fit the frame.")
    elements = contract.get("elements", [])
    if not isinstance(elements, list): raise ValueError("Composition elements must be a list.")
    seen = set()
    for element in elements:
        if not isinstance(element, dict) or set(element)-{"id", "role", "importance"}:
            raise ValueError("Composition elements expose id, role and importance only.")
        if not isinstance(element.get("id"), str) or element["id"] in seen or element.get("role") not in ROLES:
            raise ValueError("Composition elements need unique ids and supported roles.")
        seen.add(element["id"])
        if element.get("importance", "high") not in {"high", "medium", "low"}: raise ValueError("Invalid importance.")
    if contract.get("information_density", "medium") not in {"low", "medium", "high"}: raise ValueError("Invalid information density.")
    if not isinstance(contract.get("intentional_negative_space", False), bool): raise ValueError("Negative space intent must be boolean.")
    words = contract.get("reading_words", 0)
    if isinstance(words, bool) or not isinstance(words, (int, float)) or not math.isfinite(words) or words < 0: raise ValueError("Invalid reading demand.")
    policy = contract.get("policy", {})
    if not isinstance(policy, dict) or set(policy)-set(DEFAULT_POLICY): raise ValueError("Unknown composition policy.")
    for key, value in policy.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0 or (key.endswith("fraction") and value > 1):
            raise ValueError("Composition policy thresholds must be positive and finite.")
    if contract.get("reflow", "natural") not in {"natural", "stack"}: raise ValueError("Unsupported reflow constraint.")


def analyze(model, measurements):
    """Evaluate browser observations. No scene-type, language, or domain branching."""
    findings = []
    def add(severity, code, scene, detail):
        entry = {"severity": severity, "code": code, "scene": scene, "detail": detail}
        if entry not in findings: findings.append(entry)
    signatures = []
    occupied_regions = {}
    for scene in model["scenes"]:
        ident = scene["id"]
        samples = [s for s in measurements.get("samples", []) if s["scene"] == ident]
        if not samples:
            add("error", "missing-measurement", ident, "No browser measurements for this scene."); continue
        policy = {**DEFAULT_POLICY, **scene.get("policy", {})}
        safe = scene["safe_area"]
        primary_seen = False
        occupancies, primary_areas = [], []
        major_ids = {element["id"] for element in scene["elements"] if element.get("occupancy") == "major"}
        occupied_regions[ident] = []
        for sample in samples:
            objects = sample["objects"]
            visible = [o for o in objects if o["visible"]]
            occupied_regions[ident].append({"time": sample.get("time"), "regions": [
                {"id": o["id"], "box": o["box"]} for o in visible if o["id"].split("#")[0] in major_ids]})
            primary = [o for o in visible if o["role"] == "primary"]
            primary_seen |= bool(primary)
            primary_areas.append(union_area([o["box"] for o in primary])/(safe[2]*safe[3]))
            occupancies.append(union_area([o["box"] for o in visible])/(safe[2]*safe[3]))
            for index, a in enumerate(visible):
                for b in visible[index+1:]:
                    if intersects(a["box"], b["box"]):
                        major = a["id"].split("#")[0] in major_ids or b["id"].split("#")[0] in major_ids
                        code = "major-surface-overlap" if major else "content-overlap-risk"
                        add("advisory", code, ident, f'{a["id"]} / {b["id"]}; review occupied regions before rendering.')
            for o in visible:
                if not contains(safe, o["box"]): add("error", "safe-area", ident, o["id"])
                if o.get("clipped"): add("error", "clipping", ident, o["id"])
                if o.get("min_font", 1000) < policy["minimum_text_px"]:
                    add("advisory", "readability", ident, o["id"])
                if any(intersects(o["box"], area) for area in scene["reserved_areas"]):
                    add("error", "reserved-area", ident, o["id"])
                if intersects(o["box"], scene["caption_zone"]): add("advisory", "caption-zone-competition", ident, o["id"])
                if any(intersects(o["box"], c["box"]) for c in sample.get("captions", []) if c["visible"]):
                    add("error", "caption-overlap", ident, o["id"])
            for c in sample.get("captions", []):
                if c["visible"] and (not contains(scene["caption_zone"], c["box"]) or c.get("clipped")):
                    add("error", "caption-safe-area", ident, c["id"])
            if sample.get("bidi_errors"): add("error", "bidi-isolation", ident, ", ".join(sample["bidi_errors"]))
            if primary:
                pfont = max(o.get("max_font", 0) for o in primary)
                if any(o["role"] == "context" and o.get("max_font", 0) > pfont*1.25 for o in visible):
                    add("advisory", "context-dominance", ident, "Context text is larger than the primary object's text.")
        if not primary_seen: add("error", "primary-invisible", ident, "No visible primary object at sampled hold times.")
        if primary_seen and max(primary_areas) < policy["small_primary_fraction"]:
            add("advisory", "small-primary", ident, "Primary bounds occupy unusually little usable area; review intent.")
        if max(occupancies) < policy["low_occupancy_fraction"] and not scene["intentional_negative_space"]:
            add("advisory", "unused-space", ident, "Low measured occupancy; negative space may be intentional.")
        if scene["reading_words"]/(scene["end"]-scene["start"]) > policy["words_per_second"]:
            add("advisory", "reading-demand", ident, "Review reading time against authored text demand.")
        signature = tuple((e["id"], e["role"]) for e in scene["elements"]) + (scene["reflow"],)
        signatures.append(signature)
        if len(signatures) >= 3 and signatures[-1] == signatures[-2] == signatures[-3]:
            add("advisory", "repeated-composition", ident, "Three consecutive scenes share role bindings and flow; review continuity versus repetition.")
    for error in measurements.get("errors", []): add("error", "browser-runtime", "document", error)
    return {"schema_version": 1, "error_count": sum(f["severity"] == "error" for f in findings),
            "advisory_count": sum(f["severity"] == "advisory" for f in findings), "findings": findings,
            "occupied_regions": occupied_regions,
            "scope": "Sampled geometry and text metrics; does not certify aesthetic quality or unsampled animation frames."}
