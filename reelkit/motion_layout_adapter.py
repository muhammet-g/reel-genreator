"""Renderer bindings: domain components expose roles to the neutral evaluator."""
from copy import deepcopy
from .motion_layout import validate_contract


def composition_model(plan, frame, board=None):
    result = {"schema_version": 1, "frame": frame, "scenes": []}
    for i, scene in enumerate(plan["scenes"]):
        semantic = next((s for s in (board or {}).get("scenes", []) if s["id"] == scene["id"]), {})
        prefix = f"#scene-{i} "
        bindings = []
        def bind(ident, selector, role, global_selector=False):
            bindings.append({"id": ident, "selector": selector if global_selector else prefix+selector,
                             "role": role, "importance": semantic.get("importance", "high") if role == "primary" else "medium"})
        kind = scene["type"]
        primary_head = kind in {"typography", "statement", "section", "cta"} and not scene.get("code_array")
        bind("headline", ".headline", "primary" if primary_head else "secondary")
        bind("labels", ".eyebrow", "context")
        if scene.get("code_array"):
            visual = scene["code_array"]
            if scene.get("choreography"):
                bind("teaching-object", f'#array-{visual["object_id"]} .program-container', "primary", True)
                bind("object-labels", f'#array-{visual["object_id"]} .program-variable', "context", True)
                bind("expression", ".current-expression", "secondary")
                bind("previous-expression", ".previous-expression", "secondary")
                bind("result", ".program-result", "secondary")
                bind("explanation", ".reason-step", "secondary")
            else:
                bind("teaching-object", ".code-array-rail", "primary")
                bind("object-labels", ".code-array-name", "context")
                bind("expression", ".code-expression", "secondary")
                bind("result", ".code-result", "secondary")
        elif kind in {"compare", "steps", "diagram"}: bind("teaching-object", ".visual", "primary")
        elif kind in {"number", "progress"}: bind("teaching-object", f".{kind}-visual", "primary")
        elif kind == "notification": bind("teaching-object", ".notice", "primary")
        elif kind == "cta": bind("action", ".cta-action", "secondary")
        else: bind("explanation", ".supporting, .program-context", "secondary")
        bind("resource", ".scene-resource", "context")
        authored = deepcopy(scene.get("composition", {}))
        validate_contract(authored, frame)
        overrides = {e["id"]: e for e in authored.pop("elements", [])}
        if set(overrides)-{e["id"] for e in bindings}: raise ValueError("Composition references an unknown component id.")
        for element in bindings: element.update(overrides.get(element["id"], {}))
        if not any(e["role"] == "primary" for e in bindings): raise ValueError("Composition needs a primary binding.")
        # Compatibility profile describes the existing vertical renderer, not a universal layout rule.
        sx, sy = frame["width"]/1080, frame["height"]/1920
        scale = lambda r: [r[0]*sx, r[1]*sy, r[2]*sx, r[3]*sy]
        item = {"id": scene["id"], "start": scene["start"], "end": scene["end"], "elements": bindings,
                "safe_area": scale([60, 220, 960, 1140]), "caption_zone": scale([60, 1400, 960, 330]),
                "reserved_areas": [], "information_density": semantic.get("information_density", "medium"), "intentional_negative_space": False,
                "reading_words": len(" ".join([scene["headline"], scene.get("body", ""), *scene.get("items", [])]).split()),
                "reflow": "natural", **authored}
        result["scenes"].append(item)
    return result


def composition_css(model):
    """Only explicitly requested flow changes; no heuristic-driven resizing."""
    rules = []
    for i, scene in enumerate(model["scenes"]):
        if scene["reflow"] == "stack":
            p = f"#scene-{i}"
            rules += [f"{p} .visual{{flex-direction:column;align-items:stretch;gap:8px;margin-top:35px}}",
                      f"{p} .visual>.motion-part{{flex:none;min-height:0;padding:18px 24px}}",
                      f"{p} .visual small{{display:inline-block;margin:0 18px}}",
                      f"{p} .connector{{flex:none;align-self:center;width:4px;height:24px}}",
                      f"{p} .connector i{{max-width:4px;height:24px}}"]
    return "\n".join(rules)
