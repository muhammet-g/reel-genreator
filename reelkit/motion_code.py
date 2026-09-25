"""Reusable, small programming visual for a named array and an expression result."""
from __future__ import annotations

import html
import math
import re

IDENTIFIER = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*\Z")


def validate_code_array(value: dict, scene_id: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"Scene {scene_id} code_array must be an object.")
    variable = value.get("variable")
    cells = value.get("cells")
    if not isinstance(variable, str) or not IDENTIFIER.fullmatch(variable):
        raise ValueError(f"Scene {scene_id} code_array needs a JavaScript variable name.")
    if not isinstance(cells, list) or not 2 <= len(cells) <= 6 or any(
        not isinstance(cell, str) or not cell.strip() or len(cell) > 24 for cell in cells
    ):
        raise ValueError(f"Scene {scene_id} code_array needs 2–6 short cells.")
    expression = value.get("expression", "")
    if not isinstance(expression, str) or len(expression) > 48 or "\n" in expression:
        raise ValueError(f"Scene {scene_id} code_array expression is too long.")
    if expression and not expression.startswith(variable):
        raise ValueError(f"Scene {scene_id} code_array expression must use its variable.")
    selected = value.get("selected_index")
    if selected is not None and (type(selected) is not int or not 0 <= selected < len(cells)):
        raise ValueError(f"Scene {scene_id} code_array selected_index is invalid.")
    path = value.get("selection_path", [])
    if not isinstance(path, list) or len(path) > 6 or any(type(i) is not int or not 0 <= i < len(cells) for i in path):
        raise ValueError(f"Scene {scene_id} code_array selection_path is invalid.")
    if path and selected != path[-1]:
        raise ValueError(f"Scene {scene_id} code_array selected_index must finish selection_path.")
    result = value.get("result")
    if result is not None:
        if not isinstance(result, dict) or result.get("kind") not in ("element", "array"):
            raise ValueError(f"Scene {scene_id} code_array result needs element or array kind.")
        item = result.get("value")
        if result["kind"] == "element":
            if not isinstance(item, str) or not item.strip() or len(item) > 40:
                raise ValueError(f"Scene {scene_id} code_array element result is invalid.")
        elif not isinstance(item, list) or not 1 <= len(item) <= 4 or any(
            not isinstance(x, str) or not x.strip() or len(x) > 24 for x in item
        ):
            raise ValueError(f"Scene {scene_id} code_array Array result is invalid.")
        label = result.get("label", "")
        if not isinstance(label, str) or len(label) > 35:
            raise ValueError(f"Scene {scene_id} code_array result label is invalid.")
    for key in ("selection_at", "result_reveal_at"):
        number = value.get(key, .55)
        if not isinstance(number, (int, float)) or isinstance(number, bool) or not math.isfinite(number) or not 0 <= number <= 1:
            raise ValueError(f"Scene {scene_id} code_array {key} must be a fraction from 0 to 1.")
    return value


def code_array_html(value: dict) -> str:
    """All code structure is LTR; individual cell labels may shape as Arabic."""
    variable = html.escape(value["variable"])
    path = value.get("selection_path", [])
    initial = path[0] if path else value.get("selected_index")
    cells = []
    for index, cell in enumerate(value["cells"]):
        cells.append(
            f'<div class="code-array-slot"><span class="code-array-index">{index}</span>'
            f'<span class="code-array-cell" data-index="{index}" data-active="{str(index == initial).lower()}" '
            f'dir="auto">{html.escape(cell)}</span></div>'
        )
    expression = value.get("expression", "")
    expr_html = (f'<div class="code-expression motion-part"><code dir="ltr">{html.escape(expression)}</code></div>'
                 if expression else "")
    result = value.get("result")
    result_html = ""
    if result:
        label = html.escape(result.get("label", ""))
        if result["kind"] == "array":
            values = ", ".join(html.escape(str(x)) for x in result["value"])
            rendered = f'<span class="result-bracket">[</span>{values}<span class="result-bracket">]</span>'
        else:
            rendered = html.escape(result["value"])
        result_html = (f'<div class="code-result" data-result-kind="{result["kind"]}">'
                       f'<span class="code-result-label" dir="auto">{label}</span>'
                       f'<code dir="ltr">{rendered}</code></div>')
    return (f'<div class="code-array-visual" data-layout-allow-overlap="true">'
            f'<div class="code-array-name"><code dir="ltr">{variable}</code></div>'
            f'<div class="code-array-rail" dir="ltr">{"".join(cells)}</div>'
            f'{expr_html}{result_html}</div>')
