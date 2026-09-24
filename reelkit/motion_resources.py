"""Local, provenance-aware resources for Motion-Only compositions."""
from __future__ import annotations

from pathlib import Path
import math
import re
import shutil
import json
import hashlib
import subprocess
import time
import xml.etree.ElementTree as ET

from .core import ROOT, digest, load, probe, save
from .motion_design import SCENE_TYPES
from .content_policy import validate_resource_content_metadata

LIBRARY = ROOT / "resources"
MANIFEST = Path("manifests/resources.json")
CATEGORIES = {"motion/transitions", "motion/text-effects", "motion/logo-reveals", "motion/callouts",
              "motion/lower-thirds", "motion/notifications", "motion/arrows", "motion/loaders",
              "motion/counters", "motion/infographics", "motion/infographic", "motion/misc", "overlays/grain", "overlays/light",
              "overlays/paper", "overlays/noise", "overlays/textures", "icons", "svg", "lottie",
              "images", "video", "video/alpha", "video/standard", "image-sequences", "sfx", "fonts",
              "sfx/clicks", "sfx/pops", "sfx/impacts", "sfx/whooshes", "sfx/swipes",
              "sfx/typing", "sfx/page-turns", "sfx/notifications"}
VISUAL_ENERGY = {"calm", "balanced", "energetic"}
SAFETY = {"unreviewed", "approved", "blocked"}
FORMATS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp4", ".webm", ".mov", ".wav", ".mp3", ".ogg", ".json", ".png-sequence"}
INSPECTION_VERSION = 3
LICENSES = {"CC0", "CC0-1.0", "MIT", "Apache-2.0", "ISC", "CC-BY-4.0", "OFL-1.1"}
SFX_TAGS = {"click", "tap", "pop", "soft-impact", "whoosh", "swipe", "typing", "page-turn", "notification"}
TAXONOMY = {
    "text": ["word reveal", "mask reveal", "highlight sweep", "underline draw", "kinetic typography",
             "number counter", "tracking reveal", "focus emphasis"],
    "ui": ["notification pop", "message bubble", "cursor click", "button press", "browser frame",
           "phone frame", "loading", "progress"],
    "infographic": ["arrows", "connectors", "nodes", "timeline", "comparison", "counters",
                    "progress bars", "progress rings", "steps"],
    "transitions": ["cut", "fade", "push", "wipe", "zoom-through", "mask transition",
                    "shape carry-over", "card transition"],
    "accents": ["pop", "pulse", "subtle glow", "light impact", "micro shake", "focus shift", "blur reveal"],
    "sfx": sorted(SFX_TAGS),
}


def resource_hash(path: Path) -> str:
    path = Path(path)
    if path.is_file():
        return digest(path)
    if not path.is_dir():
        raise ValueError("Resource path is missing.")
    frames = sequence_frames(path)
    h = hashlib.sha256()
    for frame in frames:
        h.update(frame.name.encode("utf-8"))
        h.update(bytes.fromhex(digest(frame)))
    return h.hexdigest()


def sequence_frames(path: Path) -> list[Path]:
    path = Path(path)
    files = sorted(path.iterdir()) if path.is_dir() else []
    if not 2 <= len(files) <= 300 or any(not f.is_file() or f.suffix.lower() != ".png" for f in files):
        raise ValueError("Image sequence needs 2–300 numbered PNG frames and no other files.")
    matches = [re.fullmatch(r"(.+?)(\d+)\.png", f.name, re.I) for f in files]
    if any(m is None for m in matches):
        raise ValueError("Image sequence frame names need contiguous numbers.")
    prefix = matches[0].group(1)
    numbers = [int(m.group(2)) for m in matches]
    if any(m.group(1) != prefix for m in matches) or numbers != list(range(numbers[0], numbers[0] + len(files))):
        raise ValueError("Image sequence frame numbers must be contiguous.")
    return files


def ensure_resource_dirs(library=LIBRARY):
    for category in CATEGORIES:
        (Path(library) / category).mkdir(parents=True, exist_ok=True)
    (Path(library) / "manifests").mkdir(parents=True, exist_ok=True)


def manifest_path(library=LIBRARY):
    return Path(library) / MANIFEST


def load_manifest(library=LIBRARY) -> dict:
    path = manifest_path(library)
    data = load(path) if path.exists() else {"schema_version": 2, "resources": []}
    validate_manifest(data, library)
    return data


def validate_manifest(data: dict, library=LIBRARY) -> dict:
    if not isinstance(data, dict) or data.get("schema_version") not in (1, 2) or not isinstance(data.get("resources"), list):
        raise ValueError("Resource manifest needs schema_version 1 or 2 and a resources list.")
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
        if data["schema_version"] == 2:
            if item.get("content_safety") != item.get("safety"):
                raise ValueError(f"Resource {item['id']} has inconsistent v2 aliases.")
            if not isinstance(item.get("style_tags"), list) or not isinstance(item.get("preferred_use"), list) or not isinstance(item.get("avoid_use"), list):
                raise ValueError(f"Resource {item['id']} needs v2 selection metadata.")
            if item.get("visual_weight") not in ("light", "medium", "heavy"):
                raise ValueError(f"Resource {item['id']} needs a visual weight.")
            if item.get("license") not in LICENSES and item.get("safety") == "approved":
                raise ValueError(f"Resource {item['id']} has an unverified license.")
        if not isinstance(item.get("compatible_scenes"), list) or any(x not in SCENE_TYPES for x in item["compatible_scenes"]):
            raise ValueError(f"Resource {item['id']} has invalid compatible scenes.")
        validate_resource_content_metadata(tags=item["tags"], safety=item["safety"], kind=item.get("type"))
        relative = Path(str(item.get("path", "")))
        resolved = (root / relative).resolve()
        if relative.is_absolute() or not resolved.is_relative_to(root) or not (resolved.is_dir() if item.get("type") == "image-sequence" else resolved.is_file()):
            raise ValueError(f"Resource {item['id']} has an invalid or missing local path.")
        if resource_hash(resolved) != item.get("sha256"):
            raise ValueError(f"Resource {item['id']} changed since registration.")
        if item.get("duration") is not None and (not isinstance(item["duration"], (int, float)) or not math.isfinite(item["duration"]) or item["duration"] <= 0):
            raise ValueError(f"Resource {item['id']} has invalid duration.")
    return data


def _upgrade_item(item: dict) -> dict:
    item = dict(item)
    item.setdefault("name", item["id"].replace("-", " ").title())
    item.setdefault("subtype", item.get("category", "").split("/")[-1])
    item.setdefault("local_path", item["path"])
    item.setdefault("semantic_tags", list(item.get("tags", [])))
    item.setdefault("style_tags", [])
    item.setdefault("motion_energy", item.get("visual_energy", "balanced"))
    item.setdefault("visual_weight", "medium")
    item.setdefault("preferred_use", [])
    item.setdefault("avoid_use", [])
    item.setdefault("content_safety", item["safety"])
    item.setdefault("license_url", None)
    item.setdefault("author", None)
    item.setdefault("imported_at", None)
    item.setdefault("notes", "")
    item.setdefault("aspect_ratio", item["width"] / item["height"] if item.get("width") and item.get("height") else None)
    item.setdefault("has_alpha", item.get("alpha", False))
    item.setdefault("trim_safe", item.get("type") == "video")
    item.setdefault("scalable", item.get("type") in ("svg", "lottie"))
    item.setdefault("scene_types", list(item.get("compatible_scenes", [])))
    return item


def _svg_metadata(path: Path):
    content = path.read_text(encoding="utf-8")
    if re.search(r"<\s*(script|foreignObject|style|image|use|animate)\b|\bon\w+\s*=|(?:href|url)\s*=|url\s*\(|@import", content, re.I):
        raise ValueError("SVG contains scripts, event handlers or external references.")
    root = ET.fromstring(content)
    if not root.tag.endswith("svg"):
        raise ValueError("The file is not an SVG image.")
    allowed_nodes = {"svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "defs",
                     "linearGradient", "radialGradient", "stop"}
    allowed_attrs = {"xmlns", "width", "height", "viewBox", "fill", "stroke", "stroke-width",
                     "stroke-linecap", "stroke-linejoin", "opacity", "fill-rule", "clip-rule",
                     "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "d", "points",
                     "transform", "offset", "stop-color", "stop-opacity", "id"}
    for element in root.iter():
        if element.tag.split("}")[-1] not in allowed_nodes:
            raise ValueError("SVG contains an unsupported active or referenced element.")
        for attribute in element.attrib:
            if attribute.split("}")[-1] not in allowed_attrs:
                raise ValueError("SVG contains an unsupported attribute.")
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
    if path.is_dir():
        frames = sequence_frames(path)
        streams = [next(s for s in probe(f)["streams"] if s["codec_type"] == "video") for f in frames]
        dimensions = {(s["width"], s["height"]) for s in streams}
        if len(dimensions) != 1:
            raise ValueError("All image sequence frames must have matching dimensions.")
        width, height = dimensions.pop()
        alpha = all(s.get("pix_fmt", "").startswith(("rgba", "bgra", "ya", "pal8")) for s in streams)
        return {"type": "image-sequence", "width": width, "height": height, "duration": None,
                "fps": None, "frame_count": len(frames), "alpha": alpha, "has_audio": False,
                "render_ready": True}
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
    if suffix in (".mp4", ".webm", ".mov") and video is None:
        raise ValueError("Video resource contains no video stream.")
    if suffix in (".wav", ".mp3", ".ogg") and not audio:
        raise ValueError("SFX resource contains no audio stream.")
    duration = float(info["format"]["duration"]) if info["format"].get("duration") else None
    fps = None
    if video and video.get("avg_frame_rate") and video["avg_frame_rate"] != "0/0":
        a, b = video["avg_frame_rate"].split("/")
        fps = float(a) / float(b)
    pixel_format = video.get("pix_fmt", "") if video else ""
    alpha_tag = bool(video and any(key.lower() == "alpha_mode" and str(value) == "1"
                                   for key, value in video.get("tags", {}).items()))
    alpha = bool(video and (pixel_format.startswith(("rgba", "bgra", "argb", "abgr", "yuva"))
                 or alpha_tag))
    if suffix == ".webm" and alpha and video and video.get("codec_name") == "vp9":
        # FFmpeg's native VP9 decoder may discard alpha. Explicit libvpx decoding proves local support.
        result = subprocess.run(["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", str(path),
                                 "-frames:v", "1", "-vf", "scale=16:16,format=rgba",
                                 "-f", "rawvideo", "-"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode or len(result.stdout) != 16 * 16 * 4:
            alpha = False
        else:
            alpha = any(value < 255 for value in result.stdout[3::4])
    if suffix in (".wav", ".mp3", ".ogg"):
        kind = "sfx"
    elif suffix in (".png", ".jpg", ".jpeg", ".webp"):
        kind = "image"
    else:
        kind = "video"
    # MOV/alpha codecs are inventoried but require a render compatibility check before placement.
    codec_compatible = (suffix == ".mp4" and video and video.get("codec_name") == "h264") or (
        suffix == ".webm" and video and video.get("codec_name") in ("vp8", "vp9"))
    return {"type": kind, "width": video.get("width") if video else None,
            "height": video.get("height") if video else None, "duration": duration, "fps": fps,
            "alpha": alpha, "has_audio": audio, "codec": video.get("codec_name") if video else None,
            "render_ready": (kind != "video" or codec_compatible) and not (suffix == ".webm" and
                            alpha_tag and not alpha)}


def suggest_resource(source: str | Path, metadata: dict | None = None) -> dict:
    src = Path(source)
    metadata = metadata or inspect_resource(src)
    stem = src.stem.lower()
    words = set(re.split(r"[^a-z0-9]+", stem)) - {""}
    kind = metadata["type"]
    if kind == "sfx":
        match = next((x for x in SFX_TAGS if x.replace("-", "") in stem.replace("-", "")), "click")
        category = {"click": "sfx/clicks", "pop": "sfx/pops", "whoosh": "sfx/whooshes",
                    "swipe": "sfx/swipes", "typing": "sfx/typing", "page-turn": "sfx/page-turns",
                    "notification": "sfx/notifications", "soft-impact": "sfx/impacts"}.get(match, "sfx")
        tags = sorted(words | {match})
    elif kind == "video":
        category = "video/alpha" if metadata["alpha"] else "video/standard"
        tags = sorted(words | {"overlay"})
    elif kind == "image-sequence":
        category = "image-sequences"; tags = sorted(words | {"motion"})
    elif kind == "lottie":
        category = "lottie"; tags = sorted(words | {"motion"})
    else:
        category = "svg" if kind == "svg" else "images"
        tags = sorted(words | ({"icon"} if kind == "svg" else set()))
    energy = "energetic" if words & {"impact", "burst", "fast"} else "calm" if words & {"soft", "subtle"} else "balanced"
    return {"category": category, "tags": tags, "style_tags": ["modern"], "visual_energy": energy}


def import_resource(source, *, ident=None, category=None, tags=None, license=None, origin=None, safety="unreviewed",
                    visual_energy=None, compatible_scenes=None, loopable=False,
                    safe_for_motion_only=None, style_tags=None, visual_weight="medium",
                    preferred_use=None, avoid_use=None, author=None, license_url=None,
                    notes="", sequence_fps=None, library=LIBRARY):
    src = Path(source).expanduser().resolve()
    if not src.exists():
        raise ValueError("Resource file or image sequence is missing.")
    ident = ident or re.sub(r"[^a-z0-9]+", "-", src.stem.lower()).strip("-")[:64]
    source_hash = resource_hash(src)
    data = load_manifest(library)
    existing = next((item for item in data["resources"] if item["id"] == ident), None)
    if existing:
        if existing["sha256"] == source_hash:
            return existing  # unchanged re-import: use cached inspection
        raise ValueError("Resource id already exists; existing assets are never overwritten.")
    if any(item["sha256"] == source_hash for item in data["resources"]):
        raise ValueError("This resource content is already registered.")
    metadata = inspect_resource(src)
    suggestion = suggest_resource(src, metadata)
    category = category or suggestion["category"]
    tags = tags if tags is not None else suggestion["tags"]
    style_tags = style_tags if style_tags is not None else suggestion["style_tags"]
    visual_energy = visual_energy or suggestion["visual_energy"]
    if category not in CATEGORIES or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", ident):
        raise ValueError("Choose a supported category and lowercase resource id.")
    if not license or not origin or safety not in SAFETY or visual_energy not in VISUAL_ENERGY:
        raise ValueError("License, source, safety and visual energy metadata are required.")
    if safety == "approved" and (license not in LICENSES or origin == "Local user import; provenance not yet verified"):
        raise ValueError("Approved resources need a verified supported license.")
    if visual_weight not in ("light", "medium", "heavy"):
        raise ValueError("Visual weight must be light, medium or heavy.")
    if any(scene not in SCENE_TYPES for scene in (compatible_scenes or [])):
        raise ValueError("Resource compatible scenes must use the core scene vocabulary.")
    validate_resource_content_metadata(tags=tags, safety=safety, kind=metadata["type"])
    if safe_for_motion_only is None:
        safe_for_motion_only = metadata["type"] in ("svg", "sfx", "image-sequence", "lottie")
    if metadata["type"] == "image-sequence":
        if not sequence_fps or not 1 <= sequence_fps <= 60:
            raise ValueError("Image sequences need an explicit frame rate from 1 to 60 fps.")
        metadata["fps"] = sequence_fps
        metadata["duration"] = metadata["frame_count"] / sequence_fps
    relative = Path(category) / (ident if src.is_dir() else ident + src.suffix.lower())
    target = Path(library) / relative
    if target.exists():
        raise ValueError("Resource target already exists; choose another id.")
    target.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(src, target)
    else:
        shutil.copy2(src, target)
    if resource_hash(target) != source_hash:
        raise RuntimeError("Copied resource hash mismatch.")
    item = {"id": ident, "name": src.stem.replace("-", " ").title(), "type": metadata["type"],
            "category": category, "subtype": category.split("/")[-1],
            "format": ".png-sequence" if src.is_dir() else src.suffix.lower(),
            "path": relative.as_posix(), "sha256": source_hash, "tags": sorted(set(tags)),
            "visual_energy": visual_energy, "compatible_scenes": compatible_scenes or [], "loopable": bool(loopable),
            "source": origin, "license": license, "safety": safety,
            "safe_for_motion_only": bool(safe_for_motion_only), **metadata,
            "style_tags": sorted(set(style_tags)), "visual_weight": visual_weight,
            "preferred_use": preferred_use or [], "avoid_use": avoid_use or [],
            "author": author, "license_url": license_url, "imported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "notes": notes, "inspection_version": INSPECTION_VERSION}
    item = _upgrade_item(item)
    data["schema_version"] = 2
    data["resources"] = [_upgrade_item(old) for old in data["resources"]]
    data["resources"].append(item)
    save(manifest_path(library), data)
    return item


def refresh_resource(ident: str, library=LIBRARY) -> dict:
    """Reinspect a replaced file; changed content loses approval until reviewed again."""
    path = manifest_path(library)
    data = load(path)
    item = next((entry for entry in data["resources"] if entry["id"] == ident), None)
    if item is None:
        raise ValueError("Resource id is not registered.")
    root = Path(library).resolve()
    source = (root / item["path"]).resolve()
    if not source.is_relative_to(root) or not source.exists():
        raise ValueError("Resource path is missing or invalid.")
    new_hash = resource_hash(source)
    if new_hash == item["sha256"] and item.get("inspection_version") == INSPECTION_VERSION:
        return item
    metadata = inspect_resource(source)
    if metadata["type"] != item["type"]:
        raise ValueError("Replacement changed resource type; register a new id.")
    changed = new_hash != item["sha256"]
    if metadata["type"] == "image-sequence":
        fps = item.get("fps")
        if not fps:
            raise ValueError("Image sequence needs its recorded frame rate.")
        metadata["fps"] = fps
        metadata["duration"] = metadata["frame_count"] / fps
    item.update(metadata)
    item["sha256"] = new_hash
    item["inspection_version"] = INSPECTION_VERSION
    if changed:
        item["safety"] = "unreviewed"
        item["content_safety"] = "unreviewed"
        item["safe_for_motion_only"] = False
        item["notes"] = (item.get("notes", "") + " Replacement requires content and license review.").strip()
    data["schema_version"] = 2
    data["resources"] = [_upgrade_item(entry) for entry in data["resources"]]
    validate_manifest(data, library)
    save(path, data)
    return item


def rank_resources(*, scene_type, tags=(), duration=None, energy="balanced", style=None,
                   aspect_ratio=None, transparent=None, kind=None, library=LIBRARY) -> list[dict]:
    """Return deterministic local matches with an explainable score."""
    if scene_type not in SCENE_TYPES:
        raise ValueError("Unknown scene type.")
    wanted = {str(t).lower() for t in tags}
    matches = []
    for raw in load_manifest(library)["resources"]:
        item = _upgrade_item(raw)
        if item["safety"] != "approved" or not item["render_ready"] or not item["safe_for_motion_only"]:
            continue
        if item["license"] not in LICENSES or (kind and item["type"] != kind):
            continue
        if kind is None and item["type"] == "sfx":
            continue
        if item["type"] == "video" and item.get("inspection_version", 0) < INSPECTION_VERSION:
            continue
        if item["compatible_scenes"] and scene_type not in item["compatible_scenes"]:
            continue
        if transparent is True and not item["alpha"]:
            continue
        if duration and item["duration"] and item["duration"] < duration and not item["loopable"]:
            continue
        if aspect_ratio and item["aspect_ratio"] and abs(item["aspect_ratio"] - aspect_ratio) > .8:
            continue
        semantic = wanted & {str(t).lower() for t in item["semantic_tags"]}
        scene_match = scene_type in item["compatible_scenes"]
        if not semantic and not scene_match:
            continue
        score = 8 * len(semantic) + (6 if scene_match else 0)
        score += 3 if item["motion_energy"] == energy else 1 if energy == "balanced" else 0
        score += 3 if style and style in item["style_tags"] else 0
        score += 2 if duration and item["duration"] and item["duration"] >= duration else 0
        score += 1 if item["type"] == "svg" else 0
        matches.append({"score": score, "reasons": {"semantic_tags": sorted(semantic),
                        "scene_match": scene_match, "energy_match": item["motion_energy"] == energy,
                        "style_match": bool(style and style in item["style_tags"])}, "resource": item})
    return sorted(matches, key=lambda result: (-result["score"], result["resource"]["id"]))


def select_resource(*, scene_type, tags=(), duration=None, energy="balanced", style=None,
                    aspect_ratio=None, transparent=None, kind=None, library=LIBRARY):
    ranked = rank_resources(scene_type=scene_type, tags=tags, duration=duration, energy=energy,
                            style=style, aspect_ratio=aspect_ratio, transparent=transparent,
                            kind=kind, library=library)
    return ranked[0]["resource"] if ranked else None
