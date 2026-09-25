"""Programming motion primitives: persistent arrays and per-scene operations."""
import html


def esc(value):
    return html.escape(str(value), quote=True)


def shared_array_html(group):
    visual = group["visual"]
    cells = ''.join(f'<div class="program-cell-slot"><span class="program-index">{i}</span><div class="program-cell" dir="auto">{esc(c)}</div><span class="negative-index" dir="ltr">{i-len(visual["cells"])}</span></div>' for i, c in enumerate(visual["cells"]))
    return (f'<div id="array-{group["id"]}" class="shared-array clip" data-start="{group["start"]}" data-duration="{group["end"]-group["start"]}" data-track-index="2" data-layout-allow-overlap="true" dir="ltr">'
            f'<code class="program-variable">{esc(visual["variable"])}</code><div class="program-container"><div class="program-rail">{cells}</div>'
            '<div class="selection-ring"></div></div><svg class="count-connector" viewBox="0 0 840 40" aria-hidden="true"><path d="M 4 4 V 26 H 836 V 4" pathLength="1"/></svg></div>')


def program_html(scene):
    value = scene["code_array"]
    expression = value.get("expression", "")
    tokens = value.get("tokens", [expression]) if expression else []
    code = ''.join(f'<span class="program-token" data-token="{i}">{esc(t)}</span>' for i, t in enumerate(tokens))
    previous = f'<code class="previous-expression" dir="ltr">{esc(value["previous_expression"])}</code>' if value.get("previous_expression") else ''
    steps = ''.join(f'<div class="reason-step" dir="ltr"><code>{esc(r["text"])}</code><span class="reason-equals">=</span><strong>{esc(r["value"])}</strong></div>' for r in value.get("reasoning", []))
    result = value.get("result")
    result_html = ""
    if result:
        is_array = result["kind"] == "array"
        text = result["value"][0] if is_array else result["value"]
        left = '<b class="return-bracket">[</b>' if is_array else ''
        right = '<b class="return-bracket">]</b>' if is_array else ''
        result_html = (f'<div class="program-result" data-result-kind="{result["kind"]}" dir="ltr"><span class="return-label" dir="auto">{esc(result.get("label", ""))}</span>'
                       f'<div class="return-container">{left}<span class="return-value" dir="auto">{esc(text)}</span>{right}</div></div>')
    # The copy begins at its source cell by design, then follows a path into the result.
    ghost = f'<div class="extraction-token" data-layout-allow-overlap="true" dir="auto">{esc(value["cells"][value.get("selected_index") or 0])}</div>'
    return (f'<div class="code-program" data-family="{esc(scene["choreography"]["family"])}" data-object="{esc(value["object_id"])}" data-layout-allow-overlap="true">'
            f'<div class="reasoning">{steps}</div><div class="program-expression">{previous}<code class="current-expression" dir="ltr">{code}</code></div>{result_html}{ghost}</div>')
