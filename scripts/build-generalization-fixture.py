"""Six explicitly synthetic scenes; no provider, media download, or production approval."""
from pathlib import Path
import sys
import wave
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from reelkit.core import ROOT, save
from reelkit.motion_audio import intake_audio
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import import_motion_plan
from reelkit.motion_composition import build_motion_composition


def fixture_plan():
    scenes = [
        {"id": "A-code", "type": "statement", "layout": "centered", "headline": "اقرأ العنصر الأخير", "code_array": {
            "variable": "scores", "cells": ["12", "24", "36"], "selected_index": 2,
            "expression": "scores.at(-1)", "result": {"kind": "element", "value": "36", "label": "القيمة"}}},
        {"id": "B-statistic", "type": "number", "layout": "left-weighted", "headline": "نسبة الإنجاز", "number": 87, "suffix": "%"},
        {"id": "C-process", "type": "steps", "layout": "editorial", "headline": "3 خطوات لبناء مشروع",
         "items": ["افهم الفكرة وحدّد الهدف", "طبّقها ثم اختبر النتيجة", "راجع وشارك ما تعلّمته"], "composition": {"reflow": "stack", "information_density": "high"}},
        {"id": "D-comparison", "type": "compare", "layout": "split", "headline": "طريقتان للتعلّم", "items": ["مشاهدة فقط", "تطبيق ومراجعة"]},
        {"id": "E-relationship", "type": "diagram", "layout": "grid", "headline": "من الفكرة إلى الأثر", "items": ["فكرة", "تجربة", "نتيجة"]},
        {"id": "F-cta", "type": "cta", "layout": "centered", "headline": "جرّب الآن", "action": "خطوة واحدة",
         "composition": {"intentional_negative_space": True, "information_density": "low"}},
    ]
    captions = ["تُرجع scores.at(-1) قيمة واحدة.", "وصل الإنجاز إلى 87%، ثم نراجع الجودة.",
                "الخطوة الأولى: افهم الفكرة، ثم طبّقها مباشرة.", "هناك فرق بين المشاهدة والتطبيق.",
                "الفكرة تقود إلى تجربة، والتجربة إلى نتيجة.", "ابدأ بخطوة صغيرة."]
    for i, scene in enumerate(scenes):
        scene.update(start=i*6, end=(i+1)*6, headline_direction="rtl", eyebrow="",
                     motion={"entrance": "auto", "emphasis": "count" if scene["type"] == "number" else "none", "exit": "fade"})
    return {"schema_version": 1, "mode": "motion-only", "language": "ar", "motion_density": "medium",
            "visual_energy": "balanced", "transition_family": "fade", "scenes": scenes,
            "captions": [{"start": i*6+.3, "end": (i+1)*6-.2, "text": text, "direction": "rtl"} for i, text in enumerate(captions)]}


def build():
    base = ROOT / "projects" / "synthetic-generalization"
    inputs = base / "fixture-inputs"; inputs.mkdir(parents=True, exist_ok=True)
    audio = inputs / "synthetic-silence.wav"
    if not audio.exists():
        with wave.open(str(audio), "wb") as out:
            out.setnchannels(1); out.setsampwidth(2); out.setframerate(48000); out.writeframes(b"\0\0"*48000*36)
    script = inputs / "reference.txt"; script.write_text("Synthetic visual validation. Silent audio, no narration claim.", encoding="utf-8")
    plan = fixture_plan()
    board = {"schema_version": 1, "mode": "motion-only", "timing_verified_by": "Synthetic fixture author", "scenes": []}
    for s in plan["scenes"]:
        board["scenes"].append({"id": s["id"], "start": s["start"], "end": s["end"], "narration": "Synthetic silent fixture",
            "semantic_function": "explanation", "importance": "high", "information_density": s.get("composition", {}).get("information_density", "medium"),
            "visual_structure": s["type"], "visual_hierarchy": "Primary object, explanation, labels, captions",
            "motion_energy": "balanced", "recommended_presentation": "motion-only", "visual_reason": "Cross-domain engine validation."})
    save(inputs / "board.json", board); save(inputs / "plan.json", plan)
    p = base / "project"
    if not (p / "motion-project.json").exists():
        with patch("reelkit.motion_audio.project", return_value=p): intake_audio(audio, "synthetic", script_path=script)
    import_storyboard(p, inputs / "board.json"); approve_storyboard(p, "Synthetic fixture author (not production approval)")
    import_motion_plan(p, inputs / "plan.json")
    print(build_motion_composition(p))

if __name__ == "__main__": build()
