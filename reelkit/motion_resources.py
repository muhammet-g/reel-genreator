"""Local, provenance-aware resources for Motion-Only compositions."""
from __future__ import annotations

from pathlib import Path
import math
import re
import shutil
import xml.etree.ElementTree as ET

from .core import ROOT, digest, load, probe, save
from .motion_design import SCENE_TYPES
from .content_policy import validate_resource_content_metadata

LIBRARY = ROOT / "resources"
MANIFEST = Path("manifests/resources.json")
CATEGORIES = {"motion/transitions", "motion/text-effects", "motion/logo-reveals", "motion/callouts",
              "motion/lower-thirds", "motion/notifications", "motion/arrows", "motion/loaders",
              "motion/counters", "motion/infographics", "motion/misc", "overlays/grain", "overlays/light",
              "overlays/paper", "overlays/noise", "overlays/textures", "icons", "svg", "lottie",
              "images", "video", "sfx", "fonts"}
VISUAL_ENERGY = {"calm", "balanced", "energetic"}
SAFETY = {"unreviewed", "approved", "blocked"}
FORMATS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp4", ".webm", ".mov", ".wav", ".mp3", ".ogg", ".json"}


def manifest_path(library=LIBRARY):
    return Path(library) / MANIFEST


def load_manifest(library=LIBRARY) -> dict:
    path = manifest_path(library)
    data = load(path) if path.exists() else {"schema_version": 1, "resources": []}
    validate_manifest(data, library)
    return data


def validate_manifest(data: dict, library=LIBRARY) -> dict:
    if not isinstance(data, dict) or data.get("schema_version") != 1 or not isinstance(data.get("resources"), list):
        raise ValueError("Resource manifest needs schema_version 1 and a resources list.")
    ids, root = set(), Path(library).resolve()
    for item in data["resources"]:
        if not isinstance(item, dict) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", str(item.get("id", ""))):
            raise ValueError("Every resource needs a stable lowercase id.")
        if item["id"] in ids:
            raise ValueError("Resource ids must be unique.")
        ids.add(item["id"])
        if item.get("category") not in CATEGORIES or item.get("format") not in FORMATS:
            raise ValueError(f"Resource {item['id']} has an unsupported category or format.")
        if item.get("safety") not in SAFETY or item.get("visual_energy") not in VISUAL_ENERGY:
            raise ValueError(f"Resource {item['id']} needs valid safety and visual energy values.")
        if not isinstance(item.get("safe_for_motion_only"), bool):
            raise ValueError(f"Resource {item['id']} needs a Motion-Only safety flag.")
        if not item.get("license") or not item.get("source") or not isinstance(item.get("tags"), list):
            raise ValueError(f"Resource {item['id']} needs license, source and tags.")
        if not isinstance(item.get("compatible_scenes"), list) or any(x not in SCENE_TYPES for x in item["compatible_scenes"]):
            raise ValueError(f"Resource {item['id']} has invalid compatible scenes.")
        validate_resource_content_metadata(tags=item["tags"], safety=item["safety"], kind=item.get("type"))
        relative = Path(str(item.get("path", "")))
        resolved = (root / relative).resolve()
        if relative.is_absolute() or not resolved.is_relative_to(root) or not resolved.is_file():
            raise ValueError(f"Resource {item['id']} has an invalid or missing local path.")
        if digest(resolved) != item.get("sha256"):
            raise ValueError(f"Resource {item['id']} changed since registration.")
        if item.get("duration") is not None and (not isinstance(item["duration"], (int, float)) or not math.isfinite(item["duration"]) or item["duration"] <= 0):
            raise ValueError(f"Resource {item['id']} has invalid duration.")
    return data


def _svg_metadata(path: Path):
    content = path.read_text(encoding="utf-8")
    if re.search(r"<\s*(script|foreignObject)\b|\bon\w+\s*=|(?:href|url)\s*=\s*['\"](?:https?:|file:|data:)", content, re.I):
        raise ValueError("SVG contains scripts, event handlers or external references.")
    root = ET.fromstring(content)
    if not root.tag.endswith("svg"):
        raise ValueError("The file is not an SVG image.")
    def number(x):
        m = re.match(r"([0-9.]+)", x or "")
        return float(m.group(1)) if m else None
    width, height = number(root.attrib.get("width")), number(root.attrib.get("height"))
    if (not width or not height) and root.attrib.get("viewBox"):
        parts = [float(x) for x in root.attrib["viewBox"].replace(",", " ").split()]
        if len(parts) == 4:
            width, height = parts[2], parts[3]
    return width, height


def inspect_resource(path: str | Path) -> dict:
    path = Path(path).expanduser().resolve()
    if not path.is_file() or path.suffix.lower() not in FORMATS:
        raise ValueError("Unsupported resource format. Use PNG/JPEG/WebP/SVG, MP4/WebM/MOV, WAV/MP3/OGG or Lottie JSON.")
    suffix = path.suffix.lower()
    if suffix == ".json":
        data = load(path)
        if not isinstance(data, dict) or not all(k in data for k in ("v", "fr", "ip", "op", "layers")):
            raise ValueError("JSON resources must be Lottie animations with version, frame rate and layers.")
        if data.get("assets"):
            for asset in data["assets"]:
                if str(asset.get("p", "")).startswith(("http:", "https:", "data:")):
                    raise ValueError("Lottie must not reference external or embedded remote assets.")
        fps = float(data["fr"])
        duration = (float(data["op"]) - float(data["ip"])) / fps
        if not math.isfinite(duration) or duration <= 0 or fps <= 0:
            raise ValueError("Lottie has invalid timing.")
        return {"type": "lottie", "width": data.get("w"), "height": data.get("h"), "duration": duration,
                "fps": fps, "alpha": True, "has_audio": False, "render_ready": False}
    if suffix == ".svg":
        width, height = _svg_metadata(path)
        return {"type": "svg", "width": width, "height": height, "duration": None, "fps": None,
                "alpha": True, "has_audio": False, "render_ready": True}
    info = probe(path)
    streams = info.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = any(s.get("codec_type") == "audio" for s in streams)
    duration = float(info["format"]["duration"]) if info["format"].get("duration") else None
    fps = None
    if video and video.get("avg_frame_rate") and video["avg_frame_rate"] != "0/0":
        a, b = video["avg_frame_rate"].split("/")
        fps = float(a) / float(b)
    alpha = bool(video and ("a" in video.get("pix_fmt", "").split("p")[0] or video.get("pix_fmt", "").startswith(("rgba", "bgra", "yuva"))))
    if suffix in (".wav", ".mp3", ".ogg"):
        kind = "sfx"
    elif suffix in (".png", ".jpg", ".jpeg", ".webp"):
        kind = "image"
    else:
        kind = "video"
    # MOV/alpha codecs are inventoried but require a render compatibility check before placement.
    return {"type": kind, "width": video.get("width") if video else None,
            "height": video.get("height") if video else None, "duration": duration, "fps": fps,
            "alpha": alpha, "has_audio": audio, "render_ready": suffix not in (".mov",)}


def import_resource(source, *, ident, category, tags, license, origin, safety="unreviewed",
                    visual_energy="balanced", compatible_scenes=None, loopable=False,
                    safe_for_motion_only=None, library=LIBRARY):
    src = Path(source).expanduser().resolve()
    if category not in CATEGORIES or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", ident):
        raise ValueError("Choose a supported category and lowercase resource id.")
    if not license.strip() or not origin.strip() or safety not in SAFETY or visual_energy not in VISUAL_ENERGY:
        raise ValueError("License, source, safety and visual energy metadata are required.")
    if any(scene not in SCENE_TYPES for scene in (compatible_scenes or [])):
        raise ValueError("Resource compatible scenes must use the core scene vocabulary.")
    data = load_manifest(library)
    if any(item["id"] == ident for item in data["resources"]):
        raise ValueError("Resource id already exists; existing assets are never overwritten.")
    metadata = inspect_resource(src)
    validate_resource_content_metadata(tags=tags, safety=safety, kind=metadata["type"])
    if safe_for_motion_only is None:
        safe_for_motion_only = category not in ("images", "video")
    source_hash = digest(src)
    if any(item["sha256"] == source_hash for item in data["resources"]):
        raise ValueError("This resource content is already registered.")
    relative = Path(category) / (ident + src.suffix.lower())
    target = Path(library) / relative
    if target.exists():
        raise ValueError("Resource target already exists; choose another id.")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, target)
    if digest(target) != source_hash:
        raise RuntimeError("Copied resource hash mismatch.")
    item = {"id": ident, "type": metadata["type"], "category": category, "format": src.suffix.lower(),
            "path": relative.as_posix(), "sha256": source_hash, "tags": sorted(set(tags)),
            "visual_energy": visual_energy, "compatible_scenes": compatible_scenes or [], "loopable": bool(loopable),
            "source": origin, "license": license, "safety": safety,
            "safe_for_motion_only": bool(safe_for_motion_only), **metadata}
    data["resources"].append(item)
    save(manifest_path(library), data)
    return item


def select_resource(*, scene_type, tags=(), duration=None, energy="balanced", aspect_ratio=None,
                    transparent=None, library=LIBRARY):
    choices = []
    for item in load_manifest(library)["resources"]:
        if item["safety"] != "approved" or not item["render_ready"] or not item["safe_for_motion_only"]:
            continue
        if item["compatible_scenes"] and scene_type not in item["compatible_scenes"]:
            continue
        matched_tags = set(tags) & set(item["tags"])
        if not matched_tags and scene_type not in item["compatible_scenes"]:
            continue
        if duration and item["duration"] and item["duration"] < duration and not item["loopable"]:
            continue
        if transparent is True and not item["alpha"]:
            continue
        if aspect_ratio and item["width"] and item["height"]:
            ratio = item["width"] / item["height"]
            if abs(ratio - aspect_ratio) > .8:
                continue
        score = 4 * len(matched_tags) + (2 if item["visual_energy"] == energy else 0)
        choices.append((score, item["id"], item))
    return max(choices, default=(None, None, None))[2]
