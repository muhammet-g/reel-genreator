"""Build a picture-only, seekable HyperFrames composition for Motion-Only projects."""
from __future__ import annotations

from pathlib import Path
import html
import json
import shutil

from .composition import caption_html
from .core import ROOT, load, save
from .motion_audio import verify_master
from .motion_storyboard import storyboard_approval_valid
from .motion_design import load_style, validate_motion_plan
from .motion_resources import LIBRARY, load_manifest, select_resource


def _esc(value):
    return html.escape(str(value), quote=True)


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
                                       duration=end-start, energy=plan["visual_energy"])
        if resource and resource["type"] in ("image", "svg", "video"):
            source = LIBRARY / resource["path"]
            destination = assets / (f"resource-{i}" + source.suffix)
            shutil.copy2(source, destination)
            selected_resources.append({"scene": scene["id"], "resource_id": resource["id"],
                                       "sha256": resource["sha256"], "source": resource["source"],
                                       "license": resource["license"]})
            if resource["type"] == "video":
                parts += f'<video class="clip scene-resource" src="assets/{destination.name}" muted playsinline loop data-start="{start}" data-duration="{end-start}" data-track-index="2"></video>'
            else:
                parts += f'<img class="scene-resource" src="assets/{destination.name}" alt="">'
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
                         "visual_energy": plan["visual_energy"]}, ensure_ascii=False).replace("</", "<\\/")
    language = "ar" if any(__import__("re").search(r"[\u0600-\u06ff]", scene["headline"]) for scene in plan["scenes"]) else "en"
    document = f'''<!doctype html><html lang="{language}"><head><meta charset="utf-8"><title>{_esc(p.name)} Motion-Only</title>
<script src="assets/gsap.min.js"></script><style>{font_css}\n#reel{{{tokens}}}\n{css}</style></head>
<body><main id="reel" data-composition-id="reel" data-start="0" data-width="{frame["width"]}" data-height="{frame["height"]}" data-duration="{state["duration"]}" data-fps="{frame["fps"]}">
<div class="background-grid"></div><div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
<div class="top-rule"><span>COMMUNITY / MOTION</span><span>01—</span></div>
{''.join(scenes)}{''.join(captions)}<div class="bottom-rule"><span>IDEAS IN MOTION</span><i id="reel-progress"></i></div></main>
<script>const MOTION={config};\n{js}</script></body></html>'''
    (out / "index.html").write_text(document, encoding="utf-8")
    save(out / "hyperframes.json", {"name": p.name + "-motion-only"})
    save(out / "build.json", {"master_sha256": state["master_audio"]["sha256"],
                              "storyboard_approval": load(p / "storyboard-approval.json"),
                              "motion_plan_sha256": __import__("hashlib").sha256((p / "motion-plan.json").read_bytes()).hexdigest(),
                              "style": style["name"], "duration": state["duration"],
                              "selected_resources": selected_resources})
    return out
