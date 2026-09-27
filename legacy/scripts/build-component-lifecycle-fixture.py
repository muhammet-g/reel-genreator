"""Build a synthetic, silent browser fixture for component lifecycle checks."""
from pathlib import Path
import argparse
import json
import shutil
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reelkit.core import ROOT
from reelkit.motion_program import program_html, shared_array_html
from reelkit.style_system import adapt_base_css, install_brand_logo, install_fonts, presentation_css, resolve_style


def build(target: Path) -> Path:
    target.mkdir(parents=True, exist_ok=True)
    assets = target / "assets"
    assets.mkdir(exist_ok=True)
    style = resolve_style({"style": "code-dragon-v1"})
    font_css, _ = install_fonts(style, assets)
    install_brand_logo(style, assets)
    for name in ("gsap.min.js", "MotionPathPlugin.min.js"):
        shutil.copy2(ROOT / "node_modules/gsap/dist" / name, assets / name)

    base_visual = {"object_id": "items", "variable": "items", "cells": ["أ", "ب", "ج"],
                   "selected_index": 2, "expression": "items.at(-1)"}
    scenes = [
        {"id": "construct", "type": "statement", "start": 0, "end": 4,
         "headline": "بناء المصفوفة", "eyebrow": "مثال", "motion": {"entrance": "auto", "emphasis": "none", "exit": "hold"},
         "choreography": {"family": "construct", "beats": {"build": 1, "indexes": 2.3, "expression": 3}},
         "code_array": {**base_visual, "tokens": ["items", ".at", "(-1)"]}},
        {"id": "explain", "type": "statement", "start": 4, "end": 8,
         "headline": "شرح الفهرس", "eyebrow": "تفسير", "motion": {"entrance": "auto", "emphasis": "none", "exit": "hold"},
         "choreography": {"family": "count", "beats": {"count": .3, "expression": 3.3, "focus": 3.4}},
         "code_array": {**base_visual, "expression": "items[items.length - 1]",
                        "editor_comments": [{"arabic": "عدد العناصر =", "ltr": "3", "at": .8},
                                            {"arabic": "الفهارس تبدأ من", "ltr": "0", "at": 1.8},
                                            {"arabic": "آخر فهرس =", "ltr": "3 - 1 = 2", "at": 2.6}]}},
        {"id": "signature", "type": "section", "start": 8, "end": 10,
         "headline": "Code Dragon", "eyebrow": "", "brand_logo": True,
         "motion": {"entrance": "settle", "emphasis": "none", "exit": "hold"}},
    ]
    group = {"id": "items", "visual": base_visual, "start": 0, "end": 8, "first_index": 0}
    colors = style["colors"]
    color_vars = "".join(f"--{name}:{value};" for name, value in colors.items())
    css = adapt_base_css(style, (ROOT / "templates/motion-only.css").read_text(encoding="utf-8"))
    css += "\n" + presentation_css(style) + "\n" + font_css
    sections = []
    for i, scene in enumerate(scenes):
        motif = '<div class="scene-brand-motif motif-anchor" aria-hidden="true"></div>' if i == 0 else ""
        logo = ('<div class="brand-logo-frame" data-component="brand-logo"><img class="brand-logo" '
                'src="assets/brand-logo.png" alt="Code Dragon"></div>') if scene.get("brand_logo") else ""
        body = program_html(scene) if scene.get("code_array") else ""
        semantic = " semantic-scene" if scene.get("code_array") else ""
        sections.append(f'<section id="scene-{i}" class="scene{semantic}" dir="rtl">{motif}{logo}'
                        f'<div class="scene-inner"><div class="eyebrow">{scene["eyebrow"]}</div>'
                        f'<h1 class="headline">{scene["headline"]}</h1>{body}</div></section>')
    motion = {"duration": 10, "motion_density": "medium", "visual_energy": "balanced",
              "transition_family": "carry", "motion_flavor": style["motion_flavor"],
              "presentation_colors": {"focused": style["surface"]["focused"],
                                      "surface": style["surface"]["code_panel"],
                                      "accent": style["code"]["active"], "count": colors["accent_warm"]},
              "composition": {"scenes": [{"reflow": "natural"} for _ in scenes]},
              "scenes": scenes, "shared_arrays": [group], "captions": [], "sequences": []}
    html = (f'<!doctype html><html lang="ar"><meta charset="utf-8"><style>{css}</style>'
            f'<main id="reel" data-style="code-dragon-v1" style="{color_vars}">'
            + "".join(sections) + shared_array_html(group) + '</main>'
            + '<script src="assets/gsap.min.js"></script><script src="assets/MotionPathPlugin.min.js"></script>'
            + f'<script>const MOTION={json.dumps(motion, ensure_ascii=False)};</script>'
            + f'<script>{(ROOT / "templates/motion-only.js").read_text(encoding="utf-8")}</script>'
            + f'<script>{(ROOT / "templates/motion-program.js").read_text(encoding="utf-8")}</script></html>')
    (target / "index.html").write_text(html, encoding="utf-8")
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    print(build(parser.parse_args().output))
