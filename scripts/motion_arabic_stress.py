"""Offline Arabic visual stress fixture. Synthetic audio contains no speech."""
from __future__ import annotations

from array import array
from pathlib import Path
import argparse
import math
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from reelkit.core import digest, load, project, save
from reelkit.motion_audio import intake_audio, verify_master
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import import_motion_plan
from reelkit.motion_render import render_preview, approve_preview, render_final

SCENES = [
    ("opening", "hook", "typography", "right-weighted", "تعلّم بخطوات واضحة",
     "يتعلم كثير من المطورين JavaScript،\nثم ينتقلون إلى React بسرعة.",
     "يتعلم كثير من المطورين JavaScript، ثم ينتقلون إلى React بسرعة.", {}),
    ("compare", "comparison", "compare", "split", "مقارنة مباشرة",
     "من الفكرة إلى التطبيق",
     "ما الفرق بين JavaScript و React؟",
     {"items": ["JavaScript: الأساس", "React: الواجهة"]}),
    ("steps", "sequence", "steps", "grid", "خطة العمل",
     "هناك 3 خطوات أساسية\nلبناء مشروع حقيقي.",
     "هناك 3 خطوات أساسية لبناء مشروع حقيقي.",
     {"items": ["افهم الفكرة", "اكتب API", "اختبر النتيجة"]}),
    ("closing", "conclusion", "statement", "right-weighted", "ابدأ الآن",
     "الخطوة الأولى: افهم الفكرة،\nثم طبّقها مباشرة.",
     "الخطوة الأولى: افهم الفكرة، ثم طبّقها مباشرة.",
     {"body": "حتى لو احتوى المشروع على React و API و 3 مراحل."}),
]


def synthetic_master(path: Path) -> None:
    rate, seconds = 48000, 16
    samples = array("h")
    for i in range(rate * seconds):
        t = i / rate
        local = t % 4
        envelope = math.exp(-22 * local) if local < .3 else 0
        value = int(1200 * envelope * math.sin(2 * math.pi * 660 * t))
        samples.extend((value, value))
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(samples.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", default="motion-arabic-stress")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    if project(args.name).exists():
        raise ValueError("Fixture project already exists; choose a new --name.")
    fixture = ROOT / "projects" / (args.name + "-input")
    fixture.mkdir(parents=True)
    master = fixture / "synthetic-48k-stereo.wav"
    synthetic_master(master)
    script = fixture / "script.txt"
    script.write_text(" ".join(scene[6] for scene in SCENES), encoding="utf-8")
    transcript = fixture / "timed-transcript.json"
    save(transcript, {"segments": [
        {"start": i * 4, "end": (i + 1) * 4, "text": scene[6], "direction": "rtl"}
        for i, scene in enumerate(SCENES)
    ]})
    p = intake_audio(master, args.name, script, transcript)
    board = {"schema_version": 1, "mode": "motion-only",
             "timing_verified_by": "synthetic visual fixture, no spoken Arabic or speech alignment",
             "scenes": []}
    plan = {"schema_version": 1, "mode": "motion-only", "motion_density": "medium",
            "visual_energy": "balanced", "transition_family": "fade",
            "captions": load(transcript)["segments"], "scenes": []}
    for i, (ident, function, kind, layout, eyebrow, headline, caption, extra) in enumerate(SCENES):
        start, end = i * 4, (i + 1) * 4
        board["scenes"].append({
            "id": ident, "start": start, "end": end, "narration": caption,
            "semantic_function": function, "importance": "high", "information_density": "medium",
            "visual_structure": kind, "visual_hierarchy": "headline then visual or supporting text",
            "motion_energy": "balanced", "recommended_presentation": kind,
            "visual_reason": "Exercises Arabic shaping, mixed direction, wrapping and scene hierarchy."})
        plan["scenes"].append({
            "id": ident, "start": start, "end": end, "type": kind, "layout": layout,
            "eyebrow": eyebrow, "headline": headline, "headline_direction": "rtl",
            "motion": {"entrance": "reveal" if kind == "typography" else "rise",
                       "emphasis": "connect" if kind == "steps" else "none", "exit": "fade"},
            **extra})
    board_file, plan_file = fixture / "storyboard.json", fixture / "motion-plan.json"
    save(board_file, board)
    save(plan_file, plan)
    import_storyboard(p, board_file)
    approve_storyboard(p, "synthetic fixture generator, not creator approval")
    import_motion_plan(p, plan_file)
    before = digest(p / "master-audio.wav")
    if not args.prepare_only:
        preview = render_preview(p)
        approve_preview(p, preview, "synthetic fixture generator, not creator approval")
        final = render_final(p)
        verify_master(p)
        if digest(p / "master-audio.wav") != before:
            raise RuntimeError("The Arabic fixture changed Master Audio.")
        save(p / "motion-only" / "stress-summary.json", {
            "synthetic_fixture": True, "no_spoken_arabic": True, "no_external_api": True,
            "master_sha256": before, "preview": str(preview.relative_to(p)).replace("\\", "/"),
            "final": str(final.relative_to(p)).replace("\\", "/")})
        print("Arabic visual stress preview:", preview)
        print("Arabic visual stress final:", final)
    else:
        print("Prepared Arabic fixture:", p)


if __name__ == "__main__":
    main()
