"""Build a picture-only, seekable HyperFrames composition for Motion-Only projects."""
from __future__ import annotations

from pathlib import Path
import html
import json
import shutil

from .composition import caption_html
from .core import ROOT, digest, ffmpeg, load, save
from .motion_audio import verify_master
from .motion_storyboard import storyboard_approval_valid
from .motion_design import load_style, validate_motion_plan
from .motion_resources import LIBRARY, INSPECTION_VERSION, load_manifest, select_resource, sequence_frames, _upgrade_item


def _esc(value):
    return html.escape(str(value), quote=True)


def _resource_style(scene):
    placement = scene.get("resource_placement", {})
    rules = []
    if "x" in placement:
        rules += [f'left:{placement["x"]}%', "right:auto", "transform:translateX(-50%)"]
    if "y" in placement:
        rules += [f'top:{placement["y"]}%', "bottom:auto"]
    if "width" in placement:
        rules.append(f'width:{placement["width"]}%')
    if "opacity" in placement:
        rules.append(f'opacity:{placement["opacity"]}')
    if "color" in placement:
        rules.append(f'color:var(--{placement["color"]})')
    return _esc(";".join(rules))


def _loop_video(source: Path, assets: Path, index: int, duration: float, resource: dict) -> Path:
    """Bake a finite loop so arbitrary HyperFrames seeks map to real source frames."""
    key = __import__("hashlib").sha256(
        f'{resource["sha256"]}:{duration:.6f}:loop-v1'.encode()).hexdigest()[:12]
    extension = ".webm" if resource["format"] == ".webm" else ".mp4"
    target = assets / f"resource-{index}-loop-{key}{extension}"
    record = target.with_suffix(target.suffix + ".json")
    if target.exists():
        if not record.exists() or load(record) != {"source_sha256": resource["sha256"], "sha256": digest(target)}:
            raise ValueError("Cached video loop changed; inspect it before rendering.")
        return target
    args = ["-stream_loop", "-1"]
    if resource["format"] == ".webm" and resource["alpha"] and resource.get("codec") == "vp9":
        args += ["-c:v", "libvpx-vp9"]
    args += ["-i", source, "-t", f"{duration:.6f}", "-an"]
    if resource["format"] == ".webm":
        args += ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p" if resource["alpha"] else "yuv420p",
                 "-auto-alt-ref", "0", "-b:v", "0", "-crf", "24"]
    else:
        args += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20"]
    ffmpeg(args + [target])
    save(record, {"source_sha256": resource["sha256"], "sha256": digest(target)})
    return target


def _scene_body(scene):
    kind = scene["type"]
    if kind in ("compare", "steps", "diagram"):
        items = scene["items"]
        node_class = "compare-side" if kind == "compare" else "step-node" if kind == "steps" else "diagram-node"
        nodes = [f'<div class="{node_class} motion-part"><small>{i+1:02}</small><span dir="auto">{caption_html(x)}</span></div>' for i, x in enumerate(items)]
        if kind == "compare":
            content = "".join(nodes)
        else:
            content = '<div class="connector"><i></i></div>'.join(nodes)
        return f'<div class="visual {kind}-visual">{content}</div>'
    if kind == "number":
        value = scene["number"]
        suffix = _esc(scene.get("suffix", ""))
        return f'<div class="number-visual motion-part"><span class="counter" data-target="{value}">0</span><span class="number-suffix">{suffix}</span></div>'
    if kind == "progress":
        return f'<div class="progress-visual motion-part"><div class="progress-track"><i class="progress-fill" data-value="{scene["progress"]}"></i></div><span>{round(scene["progress"]*100)}%</span></div>'
    if kind == "notification":
        return f'<div class="notice motion-part"><span class="notice-dot"></span><span dir="auto">{caption_html(scene.get("body", ""))}</span></div>'
    if kind == "cta":
        return f'<div class="cta-action motion-part">{caption_html(scene.get("action", ""))}</div>'
    if kind == "section":
        return '<div class="section-mark motion-part"></div>'
    return f'<p class="supporting motion-part" dir="auto">{caption_html(scene.get("body", ""))}</p>' if scene.get("body") else ""


def build_motion_composition(p: Path) -> Path:
    p = Path(p)
    _, state = verify_master(p)
    storyboard_approval_valid(p)
    board = load(p / "storyboard.json")
    plan = validate_motion_plan(load(p / "motion-plan.json"), board, state["duration"])
    style = load_style(p)
    frame = state.get("frame", {"width": 1080, "height": 1920, "fps": 30})
    out = p / "motion-only" / "composition"
    assets = out / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "node_modules/gsap/dist/gsap.min.js", assets / "gsap.min.js")
    fonts = ROOT / "node_modules/@fontsource/noto-sans-arabic/files"
    font_css = ""
    for subset, family in (("arabic", "ReelArabic"), ("latin", "ReelLatin")):
        filename = f"noto-sans-arabic-{subset}-600-normal.woff2"
        if (fonts / filename).exists():
            shutil.copy2(fonts / filename, assets / filename)
            font_css += f'@font-face{{font-family:{family};src:url(assets/{filename});font-weight:600}}'
    scenes = []
    selected_resources = []
    sequences = []
    media_overlays = []
    manifest = load_manifest()
    for i, scene in enumerate(plan["scenes"]):
        start, end = scene["start"], scene["end"]
        parts = f'<div class="eyebrow motion-part" dir="auto">{caption_html(scene.get("eyebrow", ""))}</div>'
        parts += f'<h1 class="headline motion-part" dir="{_esc(scene.get("headline_direction", "auto"))}">{caption_html(scene["headline"])}</h1>'
        parts += _scene_body(scene)
        resource = None
        if scene.get("resource_id"):
            resource = next((item for item in manifest["resources"] if item["id"] == scene["resource_id"]
                             and item["safety"] == "approved" and item["render_ready"]
                             and item["safe_for_motion_only"]), None)
        elif scene.get("resource_tags"):
            resource = select_resource(scene_type=scene["type"], tags=scene["resource_tags"],
                                       duration=end-start, energy=plan["visual_energy"], style=style["name"])
        if resource:
            resource = _upgrade_item(resource)
            if resource["type"] == "sfx":
                resource = None
            elif resource["type"] == "video" and resource.get("inspection_version", 0) < INSPECTION_VERSION:
                resource = None
        if resource and resource["type"] in ("image", "svg", "video", "image-sequence"):
            source = LIBRARY / resource["path"]
            destination = assets / (f"resource-{i}" + source.suffix if source.is_file() else f"resource-{i}")
            if source.is_dir():
                if destination.exists():
                    shutil.rmtree(destination)
                shutil.copytree(source, destination)
            else:
                shutil.copy2(source, destination)
            selected_resources.append({"scene": scene["id"], "resource_id": resource["id"],
                                       "sha256": resource["sha256"], "source": resource["source"],
                                       "license": resource["license"]})
            style_attr = _resource_style(scene)
            if resource["type"] == "video":
                placement = scene.get("resource_placement", {})
                trim = float(placement.get("trim_start", 0))
                looping = bool(placement.get("loop", False) and resource["loopable"])
                available = max(0, float(resource["duration"] or 0) - trim)
                if available > 0:
                    clip_duration = end-start if looping else min(end-start, available)
                    media_file = _loop_video(source, assets, i, clip_duration, resource) if looping else destination
                    if looping:
                        selected_resources[-1]["looped_sha256"] = digest(media_file)
                    media_overlays.append(
                        f'<video id="resource-video-{i}" class="clip scene-resource" '
                        f'src="assets/{media_file.name}" style="{style_attr}" muted playsinline '
                        f'data-start="{start}" data-duration="{clip_duration}" data-media-start="{trim}" '
                        f'data-track-index="2" data-layout-allow-overlap="true"></video>')
                else:
                    selected_resources.pop()  # built-in scene remains the fallback
            elif resource["type"] == "image-sequence":
                frames = sequence_frames(destination)
                fps = float(resource["fps"])
                looping = bool(scene.get("resource_placement", {}).get("loop", False) and resource["loopable"])
                frame_count = min(round((end-start)*fps), 300) if looping else min(round((end-start)*fps), len(frames))
                urls = [f'assets/{destination.name}/{frames[j % len(frames)].name}' for j in range(frame_count)]
                parts += f'<img id="sequence-{i}" class="scene-resource" style="{style_attr}" src="{urls[0]}" alt="">'
                sequences.append({"selector": f"#sequence-{i}", "start": start, "fps": fps, "frames": urls})
            elif resource["type"] == "svg":
                # Import rejects active SVG; inline markup preserves authored colors and supports currentColor.
                markup = source.read_text(encoding="utf-8")
                parts += f'<div class="scene-resource scene-resource-svg" style="{style_attr}">{markup}</div>'
            else:
                parts += f'<img class="scene-resource" style="{style_attr}" src="assets/{destination.name}" alt="">'
        layout = scene["layout"]
        scenes.append(f'<section id="scene-{i}" class="clip scene type-{scene["type"]} layout-{layout}" '
                      f'dir="{_esc(scene.get("headline_direction", "auto"))}" '
                      f'data-start="{start}" data-duration="{end-start}" data-track-index="1" '
                      f'data-layout-allow-overlap="true"><div class="scene-inner">{parts}</div></section>')
    captions = []
    for i, cap in enumerate(plan["captions"]):
        captions.append(f'<div id="caption-{i}" class="clip caption" dir="{_esc(cap.get("direction", "auto"))}" '
                        f'data-start="{cap["start"]}" data-duration="{cap["end"]-cap["start"]}" '
                        f'data-track-index="3" data-layout-allow-overlap="true"><span>{caption_html(cap["text"])}</span></div>')
    css = (ROOT / "templates" / "motion-only.css").read_text(encoding="utf-8")
    js = (ROOT / "templates" / "motion-only.js").read_text(encoding="utf-8")
    tokens = "".join(f"--{key}:{value};" for key, value in style["colors"].items())
    config = json.dumps({"duration": state["duration"], "scenes": plan["scenes"], "captions": plan["captions"],
                         "transition_family": plan["transition_family"], "motion_density": plan["motion_density"],
                         "visual_energy": plan["visual_energy"], "sequences": sequences}, ensure_ascii=False).replace("</", "<\\/")
    language = "ar" if any(__import__("re").search(r"[\u0600-\u06ff]", scene["headline"]) for scene in plan["scenes"]) else "en"
    document = f'''<!doctype html><html lang="{language}"><head><meta charset="utf-8"><title>{_esc(p.name)} Motion-Only</title>
<script src="assets/gsap.min.js"></script><style>{font_css}\n#reel{{{tokens}}}\n{css}</style></head>
<body><main id="reel" data-composition-id="reel" data-start="0" data-width="{frame["width"]}" data-height="{frame["height"]}" data-duration="{state["duration"]}" data-fps="{frame["fps"]}">
<div class="background-grid"></div><div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
<div class="top-rule"><span>COMMUNITY / MOTION</span><span>01—</span></div>
{''.join(scenes)}{''.join(media_overlays)}{''.join(captions)}<div class="bottom-rule"><span>IDEAS IN MOTION</span><i id="reel-progress"></i></div></main>
<script>const MOTION={config};\n{js}</script></body></html>'''
    (out / "index.html").write_text(document, encoding="utf-8")
    save(out / "hyperframes.json", {"name": p.name + "-motion-only"})
    save(out / "build.json", {"master_sha256": state["master_audio"]["sha256"],
                              "storyboard_approval": load(p / "storyboard-approval.json"),
                              "motion_plan_sha256": __import__("hashlib").sha256((p / "motion-plan.json").read_bytes()).hexdigest(),
                              "style": style["name"], "duration": state["duration"],
                              "selected_resources": selected_resources})
    return out
