"""Short offline proof of visual resources, SFX mixing and fallback."""
from __future__ import annotations

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
    ("notice", "emphasis", "notification", "editorial", "A SMALL SIGNAL", "Only when it matters",
     {"body": "A reusable icon reinforces one useful message.", "resource_id": "notification-bell",
      "resource_placement": {"x": 78, "y": 42, "width": 20, "color": "accent"}}),
    ("focus", "emphasis", "statement", "centered", "FOCUS", "One clear point",
     {"body": "A transparent VP9 resource can carry the emphasis.", "resource_id": "focus-ring-overlay",
      "resource_placement": {"x": 50, "y": 67, "width": 30, "opacity": .9, "loop": True}}),
    ("sequence", "process", "progress", "left-weighted", "FRAME BY FRAME", "A deterministic sequence",
     {"progress": .75, "resource_id": "focus-ring-sequence",
      "resource_placement": {"x": 80, "y": 70, "width": 19}}),
    ("fallback", "cta", "cta", "centered", "FALLBACK", "Keep moving",
     {"action": "REVIEW THE RESULT", "resource_id": "intentionally-missing-resource"}),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", default="motion-resource-demo")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    if project(args.name).exists():
        raise ValueError("Demo project already exists; choose another --name.")
    fixture = ROOT / "projects" / (args.name + "-input")
    fixture.mkdir(parents=True)
    master = fixture / "synthetic-master.wav"
    rate = 48000
    with wave.open(str(master), "wb") as wav:
        wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(rate)
        frames = bytearray()
        for i in range(rate * 12):
            t = i / rate
            envelope = .05 * math.exp(-12 * (t % 3))
            value = int(32767 * envelope * math.sin(2 * math.pi * 220 * t))
            frames += value.to_bytes(2, "little", signed=True) * 2
        wav.writeframes(frames)
    captions = [{"start": i*3, "end": (i+1)*3, "text": scene[5], "direction": "ltr"}
                for i, scene in enumerate(SCENES)]
    script = fixture / "script.txt"
    script.write_text(" ".join(scene[5] for scene in SCENES), encoding="utf-8")
    transcript = fixture / "transcript.json"
    save(transcript, {"segments": captions})
    p = intake_audio(master, args.name, script, transcript)
    board = {"schema_version": 1, "mode": "motion-only",
             "timing_verified_by": "synthetic fixture generator; visual timing only, no speech",
             "scenes": []}
    plan = {"schema_version": 1, "mode": "motion-only", "motion_density": "medium",
            "visual_energy": "balanced", "transition_family": "fade", "captions": captions,
            "sfx": [{"resource_id": "ui-pop", "start": .38, "volume": .16, "fade_out": .04},
                    {"resource_id": "short-whoosh", "start": 3.05, "volume": .12, "fade_in": .02,
                     "fade_out": .08}],
            "scenes": []}
    for i, (ident, function, kind, layout, eyebrow, headline, extra) in enumerate(SCENES):
        start, end = i*3, (i+1)*3
        board["scenes"].append({"id": ident, "start": start, "end": end,
            "narration": headline, "semantic_function": function,
            "importance": "medium", "information_density": "low", "visual_structure": kind,
            "visual_hierarchy": "headline before resource", "motion_energy": "balanced",
            "recommended_presentation": kind,
            "visual_reason": "Proof that local resources support a readable Motion-Only scene."})
        plan["scenes"].append({"id": ident, "start": start, "end": end, "type": kind,
            "layout": layout, "eyebrow": eyebrow, "headline": headline,
            "motion": {"entrance": "rise", "emphasis": "pulse" if kind == "notification" else "none",
                       "exit": "fade"}, **extra})
    board_file, plan_file = fixture / "storyboard.json", fixture / "motion-plan.json"
    save(board_file, board); save(plan_file, plan)
    import_storyboard(p, board_file)
    approve_storyboard(p, "synthetic fixture generator, not creator approval")
    import_motion_plan(p, plan_file)
    original_hash = digest(p / "master-audio.wav")
    if args.prepare_only:
        print("Prepared resource demo:", p)
        return
    preview = render_preview(p)
    approve_preview(p, preview, "synthetic fixture generator, not creator approval")
    final = render_final(p)
    verify_master(p)
    if digest(p / "master-audio.wav") != original_hash:
        raise RuntimeError("Resource demo changed its Master Audio.")
    state = load(p / "motion-project.json")
    save(p / "motion-only" / "resource-demo-summary.json",
         {"synthetic_fixture": True, "no_speech": True, "master_sha256": original_hash,
          "mixed_audio_sha256": state["mixed_audio"]["sha256"],
          "preview": str(preview.relative_to(p)).replace("\\", "/"),
          "final": str(final.relative_to(p)).replace("\\", "/")})
    print("Resource preview:", preview)
    print("Resource final:", final)


if __name__ == "__main__":
    main()
