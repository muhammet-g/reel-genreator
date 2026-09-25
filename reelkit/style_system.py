"""Resolved presentation profiles for Motion-Only compositions.

Only visual preferences belong here. Scene meaning, timing, geometry constraints,
and bidirectional text handling remain in the motion engine.
"""
from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import re
import shutil

from .core import ROOT, digest, load


NEUTRAL = {
    "schema_version": 1, "name": "motion-foundation",
    "colors": {"background": "#111927", "foreground": "#f5f2e9", "muted": "#a6b7c5",
               "accent": "#76ddc8", "secondary": "#ffb56b", "surface": "#1d2a3a"},
    "font_family": "ReelArabic, ReelLatin, Arial, sans-serif", "radius": 28,
}

CODE_DRAGON = {
    "schema_version": 1, "name": "code-dragon-v1",
    "colors": {
        "canvas": "#0B1221", "surface": "#0F172A", "surface_secondary": "#1E293B",
        "text_primary": "#E2E8F0", "text_secondary": "#94A3B8",
        "accent": "#FFB800", "accent_warm": "#FFA500",
        # Backward-compatible aliases consumed by the stable visual renderer.
        "background": "#0B1221", "foreground": "#E2E8F0", "muted": "#94A3B8",
        "secondary": "#FFA500",
    },
    "typography": {
        "families": {"arabic": "CDArabic", "latin": "CDLatin", "code": "CDCode"},
        "sizes": {"caption": 48, "label": 32, "code": 42, "array_index": 32, "result_label": 30,
                  "process_label": 32, "diagram_label": 32},
        "roles": {
            "display": {"family": "arabic", "weight": 700, "line_height": 1.15},
            "headline": {"family": "arabic", "weight": 700, "line_height": 1.18},
            "subheadline": {"family": "arabic", "weight": 600, "line_height": 1.25},
            "body": {"family": "arabic", "weight": 500, "line_height": 1.38},
            "explanation": {"family": "arabic", "weight": 500, "line_height": 1.4},
            "caption": {"family": "arabic", "weight": 600, "line_height": 1.4},
            "label": {"family": "latin", "weight": 600, "line_height": 1.2},
            "metadata": {"family": "latin", "weight": 500, "line_height": 1.25},
            "number": {"family": "latin", "weight": 700, "line_height": 1},
            "code": {"family": "code", "weight": 500, "line_height": 1.3},
            "code_emphasis": {"family": "code", "weight": 700, "line_height": 1.3},
        },
    },
    "surface": {"panel": "$surface", "code_panel": "$surface", "comparison_group": "$surface",
                "label": "$surface_secondary", "result": "$surface_secondary", "focused": "$surface_secondary"},
    "border": {"neutral": "#334155", "focus": "#B88700", "active": "$accent", "width": 2},
    "radius": {"panel": 20, "code_panel": 18, "pill": 999, "caption": 14},
    "shadow": {"panel": "0 24px 60px #00000038", "focus": "0 0 0 5px #FFB80024"},
    "focus": {"color": "$accent", "glow": "0 0 28px #FFB80044"},
    "caption": {"surface": "#0F172AEF", "border": "#334155", "emphasis": "$accent", "emphasize_code": False},
    "code": {"default": "$text_primary", "active": "$accent", "muted": "$text_secondary"},
    "diagram": {"node": "$surface", "connector": "#64748B", "active_connector": "$accent",
                "label": "$text_primary", "value": "$accent", "result": "$surface_secondary"},
    "icon": {"default": "$text_primary", "active": "$accent", "weight": "medium"},
    "brand_logo": {"asset": "assets/brand/code-dragon-logo.png",
                   "sha256": "e4e3658eed59c7545a48b5474b136f78fab13ce6074b4037dbc1cefe4be6256b",
                   "max_width": 520, "max_height": 520, "safe_padding": 76},
    "spacing": {"preference": "spacious", "group_scale": 1.0},
    "density": {"preference": "balanced"},
    "motifs": {"amber_rule": False, "technical_grid": False, "orbital_line": False,
               "terminal_dots": False},
    "motion_flavor": {"arrival_ease": "power3.out", "atmosphere_ease": "power2.inOut",
                      "rise_px": 64, "slide_px": 75, "settle_scale": 0.93, "part_rise_px": 14,
                      "intensity": "low-moderate"},
}

PROFILES = {"motion-foundation": NEUTRAL, "code-dragon-v1": CODE_DRAGON}
HEX = re.compile(r"#[0-9a-fA-F]{6}\Z")
FONT_FILES = {
    "CDArabic": ("cairo", "arabic", (400, 500, 600, 700)),
    "CDLatin": ("inter", "latin", (400, 500, 600, 700)),
    "CDCode": ("jetbrains-mono", "latin", (400, 500, 700)),
}


def _merge(base: dict, overrides: dict, path: str = "") -> dict:
    for key, value in overrides.items():
        if key not in base:
            raise ValueError(f"Unknown style token: {path}{key}")
        if isinstance(base[key], dict):
            if not isinstance(value, dict):
                raise ValueError(f"Style token {path}{key} needs an object.")
            _merge(base[key], value, f"{path}{key}.")
        elif type(value) is not type(base[key]):
            raise ValueError(f"Style token {path}{key} has the wrong type.")
        else:
            base[key] = value
    return base


def _resolve_color_refs(value, colors: dict):
    if isinstance(value, dict):
        return {key: _resolve_color_refs(item, colors) for key, item in value.items()}
    if isinstance(value, str) and value.startswith("$"):
        key = value[1:]
        if key not in colors:
            raise ValueError(f"Unknown color reference: {value}")
        return colors[key]
    return value


def _luminance(value: str) -> float:
    channels = [int(value[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
    return sum(a*b for a, b in zip(linear, (.2126, .7152, .0722)))


def contrast(a: str, b: str) -> float:
    hi, lo = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (hi + .05) / (lo + .05)


def validate_style(style: dict) -> dict:
    if style.get("schema_version") != 1 or style.get("name") not in PROFILES:
        raise ValueError("Motion style requires a known v1 profile.")
    for key, value in style["colors"].items():
        if not HEX.fullmatch(value):
            raise ValueError(f"Motion style color {key} must be a six-digit hex value.")
    if style["name"] == "code-dragon-v1":
        c = style["colors"]
        if style["typography"]["families"] != CODE_DRAGON["typography"]["families"]:
            raise ValueError("Code Dragon v1 uses the approved Cairo, Inter and JetBrains Mono families.")
        logo = style["brand_logo"]
        if logo["asset"] != CODE_DRAGON["brand_logo"]["asset"] or logo["sha256"] != CODE_DRAGON["brand_logo"]["sha256"]:
            raise ValueError("Code Dragon's complete approved logo asset cannot be replaced by a motif.")
        if any(type(logo[key]) is not int or not 64 <= logo[key] <= 800 for key in ("max_width", "max_height", "safe_padding")):
            raise ValueError("Brand logo sizing and safe padding must be bounded integers.")
        if logo["max_width"] > 1080 - 2 * logo["safe_padding"] or logo["max_height"] > 700:
            raise ValueError("Brand logo must fit its padded safe region.")
        if any(type(enabled) is not bool for enabled in style["motifs"].values()):
            raise ValueError("Motifs must be explicitly enabled or disabled.")
        if style["density"]["preference"] not in ("compact", "balanced", "spacious"):
            raise ValueError("Unknown visual density preference.")
        if not .75 <= style["spacing"]["group_scale"] <= 1.25 or style["spacing"]["preference"] not in ("compact", "balanced", "spacious"):
            raise ValueError("Spacing preferences are outside supported bounds.")
        for group in ("surface", "caption", "code", "diagram"):
            for role, value in style[group].items():
                if group == "caption" and role == "emphasize_code":
                    if type(value) is not bool:
                        raise ValueError("caption.emphasize_code must be boolean.")
                    continue
                if group == "caption" and role == "surface":
                    if not re.fullmatch(r"#[0-9a-fA-F]{8}", value):
                        raise ValueError("Caption surface requires an eight-digit hex color.")
                elif not HEX.fullmatch(value):
                    raise ValueError(f"Invalid {group}.{role} color.")
        for role in ("neutral", "focus", "active"):
            if not HEX.fullmatch(style["border"][role]):
                raise ValueError(f"Invalid border.{role} color.")
        for role in ("text_primary", "text_secondary", "accent"):
            if contrast(c[role], c["canvas"]) < 4.5:
                raise ValueError(f"Insufficient contrast: {role} on canvas.")
        for role, settings in style["typography"]["roles"].items():
            if settings["family"] not in style["typography"]["families"]:
                raise ValueError(f"Unknown font family in typography role {role}.")
            if settings["weight"] not in (400, 500, 600, 700) or not 1 <= settings["line_height"] <= 2:
                raise ValueError(f"Invalid typography role {role}.")
        if any(not 28 <= size <= 60 for size in style["typography"]["sizes"].values()):
            raise ValueError("Optical type sizes must stay within readable bounded preferences.")
        motion = style["motion_flavor"]
        if motion["arrival_ease"] not in ("power2.out", "power3.out") or motion["atmosphere_ease"] != "power2.inOut":
            raise ValueError("Motion flavor must use restrained supported easing.")
        if not 0 <= motion["rise_px"] <= 100 or not 0 <= motion["slide_px"] <= 110 or not .85 <= motion["settle_scale"] <= 1 or not 0 <= motion["part_rise_px"] <= 30:
            raise ValueError("Motion flavor exceeds restrained amplitude limits.")
    return style


def resolve_style(config: dict | None = None) -> dict:
    config = config or {"style": "motion-foundation"}
    if "style" in config:
        if set(config) - {"style", "overrides"}:
            raise ValueError("Style selection accepts only style and overrides.")
        name = config["style"]
        if name not in PROFILES:
            raise ValueError(f"Unknown style profile: {name}")
        style = deepcopy(PROFILES[name])
        _merge(style, config.get("overrides", {}))
        if style["name"] != name or style["schema_version"] != 1:
            raise ValueError("Overrides cannot change the style profile identity.")
        # The stable template consumes these aliases; canonical colors remain the source of truth.
        if name == "code-dragon-v1":
            c = style["colors"]
            c.update(background=c["canvas"], foreground=c["text_primary"], muted=c["text_secondary"],
                     secondary=c["accent_warm"])
            style = _resolve_color_refs(style, c)
        return validate_style(style)
    # Existing full v1 style files remain valid as the neutral compatibility path.
    if config.get("schema_version") != 1 or not isinstance(config.get("colors"), dict):
        raise ValueError("Motion style needs schema_version 1 and color tokens.")
    for key in NEUTRAL["colors"]:
        if not HEX.fullmatch(str(config["colors"].get(key, ""))):
            raise ValueError(f"Motion style color {key} must be a six-digit hex value.")
    return config


def load_style(p: Path) -> dict:
    path = Path(p) / "motion-style.json"
    return resolve_style(load(path) if path.exists() else None)


def install_fonts(style: dict, assets: Path) -> tuple[str, list[dict]]:
    """Copy pinned package fonts and notices; fail closed on any missing face."""
    if style["name"] != "code-dragon-v1":
        return "", []
    css, manifest = [], []
    for family, (package, subset, weights) in FONT_FILES.items():
        package_dir = ROOT / "node_modules" / "@fontsource" / package
        license_file = package_dir / "LICENSE"
        if not license_file.is_file():
            raise FileNotFoundError(f"Required font license missing: {license_file}. Run npm ci.")
        notice = f"FONT-LICENSE-{package}.txt"
        shutil.copy2(license_file, assets / notice)
        for weight in weights:
            filename = f"{package}-{subset}-{weight}-normal.woff2"
            source = package_dir / "files" / filename
            if not source.is_file():
                raise FileNotFoundError(f"Required {family} {weight} font missing: {source}. Run npm ci.")
            shutil.copy2(source, assets / filename)
            css.append(f'@font-face{{font-family:"{family}";src:url("assets/{filename}") format("woff2");font-style:normal;font-weight:{weight};font-display:block}}')
            manifest.append({"family": family, "weight": weight, "subset": subset, "file": filename,
                             "sha256": digest(assets / filename), "license": notice})
    return "\n".join(css), manifest


def install_brand_logo(style: dict, assets: Path) -> str:
    """Copy the exact approved logo only when a scene explicitly requests it."""
    spec = style.get("brand_logo")
    if not spec:
        raise ValueError("The selected style has no approved brand logo.")
    source = ROOT / spec["asset"]
    if not source.is_file() or digest(source) != spec["sha256"]:
        raise ValueError("The approved brand logo is missing or has changed.")
    destination = assets / "brand-logo.png"
    shutil.copy2(source, destination)
    return destination.name


def presentation_css(style: dict) -> str:
    if style["name"] != "code-dragon-v1":
        return ""
    c, t = style["colors"], style["typography"]
    roles = t["roles"]
    tokens = {
        "canvas": c["canvas"], "surface-secondary": c["surface_secondary"],
        "text-primary": c["text_primary"], "text-secondary": c["text_secondary"],
        "accent-warm": c["accent_warm"],
        "panel-surface": style["surface"]["panel"],
        "code-surface": style["surface"]["code_panel"],
        "compare-surface": style["surface"]["comparison_group"],
        "result-surface": style["surface"]["result"],
        "focused-surface": style["surface"]["focused"],
        "font-arabic": f'"{t["families"]["arabic"]}"',
        "font-latin": f'"{t["families"]["latin"]}"',
        "font-code": f'"{t["families"]["code"]}"',
        "border-neutral": style["border"]["neutral"],
        "border-focus": style["border"]["focus"],
        "border-active": style["border"]["active"],
        "border-width": f'{style["border"]["width"]}px',
        "radius-panel": f'{style["radius"]["panel"]}px',
        "radius-code": f'{style["radius"]["code_panel"]}px',
        "radius-pill": f'{style["radius"]["pill"]}px',
        "radius-caption": f'{style["radius"]["caption"]}px',
        "shadow-panel": style["shadow"]["panel"],
        "shadow-focus": style["shadow"]["focus"],
        "focus-glow": style["focus"]["glow"],
        "caption-surface": style["caption"]["surface"],
        "caption-border": style["caption"]["border"],
        "caption-emphasis": style["caption"]["emphasis"],
        "code-default": style["code"]["default"],
        "code-active": style["code"]["active"],
        "code-muted": style["code"]["muted"],
        "diagram-node": style["diagram"]["node"],
        "diagram-connector": style["diagram"]["connector"],
        "diagram-active": style["diagram"]["active_connector"],
        "diagram-label": style["diagram"]["label"],
        "diagram-value": style["diagram"]["value"],
        "icon-default": style["icon"]["default"],
        "icon-active": style["icon"]["active"],
        "space-group-scale": str(style["spacing"]["group_scale"]),
        "space-preference-scale": str({"compact": .92, "balanced": 1, "spacious": 1.08}[style["spacing"]["preference"]]),
        "density-scale": str({"compact": .92, "balanced": 1, "spacious": 1.08}[style["density"]["preference"]]),
        "logo-max-width": f'{style["brand_logo"]["max_width"]}px',
        "logo-max-height": f'{style["brand_logo"]["max_height"]}px',
        "logo-safe-padding": f'{style["brand_logo"]["safe_padding"]}px',
    }
    for role, settings in roles.items():
        tokens[f"type-{role}-family"] = f'var(--cd-font-{settings["family"]})'
        tokens[f"type-{role}-weight"] = str(settings["weight"])
        tokens[f"type-{role}-leading"] = str(settings["line_height"])
    for role, size in t["sizes"].items():
        tokens[f"size-{role}"] = f"{size}px"
    variables = "".join(f"--cd-{key}:{value};" for key, value in tokens.items())
    return f'#reel[data-style="code-dragon-v1"]{{{variables}}}\n' + (
        ROOT / "templates" / "code-dragon-v1.css"
    ).read_text(encoding="utf-8")


def adapt_base_css(style: dict, css: str) -> str:
    """Bind legacy template font declarations to the selected local families."""
    if style["name"] != "code-dragon-v1":
        return css
    families = style["typography"]["families"]
    return (css.replace("ReelArabic,ReelLatin,Arial,sans-serif",
                        f'{families["arabic"]},{families["latin"]},sans-serif')
               .replace("ui-monospace,Consolas,monospace", f'{families["code"]},monospace'))


def caption_presentation_css(style: dict, model: dict, captions: list[dict]) -> str:
    """Center the shaped surface in the engine's resolved caption safe area.

    Flex layout uses the actual post-shaping width, independently of text direction.
    A phrase crossing scene boundaries uses the intersection of their safe widths.
    """
    if style["name"] != "code-dragon-v1":
        return ""
    rules = []
    for i, caption in enumerate(captions):
        zones = [s["caption_zone"] for s in model["scenes"]
                 if caption["start"] < s["end"] and caption["end"] > s["start"]]
        left = max(z[0] for z in zones)
        right = min(z[0] + z[2] for z in zones)
        if right <= left:
            raise ValueError("Caption spans scenes without a shared horizontal safe area.")
        rules.append(f'#reel[data-style="code-dragon-v1"] #caption-{i}'
                     f'{{left:{left}px;right:auto;width:{right-left}px;display:flex;justify-content:center}}')
    return "\n".join(rules)


def scene_motif(style: dict, scene: dict) -> str:
    """Static brand accents follow presentation roles, never add semantic beats."""
    if style["name"] != "code-dragon-v1":
        return ""
    if scene.get("brand_logo"):
        return "none"  # A complete requested logo is its own semantic object.
    family = scene.get("choreography", {}).get("family")
    by_family = {"staged": "brace", "construct": "anchor", "evaluate": "none", "count": "none",
                 "tokens": "bracket", "extract": "none", "end-focus": "rule", "focus-step": "none",
                 "simplify": "brace", "behavior-compare": "none"}
    return by_family.get(family, {"typography": "brace", "section": "rule", "number": "anchor",
                                  "cta": "rule"}.get(scene["type"], "none"))
