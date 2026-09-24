"""Local Windows TTS fixture for the Motion-Only workflow; no network or paid API."""
from __future__ import annotations

from array import array
from pathlib import Path
import argparse
import json
import math
import subprocess
import sys
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from reelkit.core import digest, load, project, save
from reelkit.motion_audio import intake_audio, verify_master
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import import_motion_plan
from reelkit.motion_resources import import_resource, load_manifest, LIBRARY
from reelkit.motion_composition import build_motion_composition
from reelkit.motion_render import render_preview, approve_preview, render_final

SCENES = [
    ("opening", "hook", "typography", "left-weighted", "THE IDEA", "فكرة واحدة — One clear story", {"headline_direction": "rtl"}),
    ("number", "number", "number", "left-weighted", "ATTENTION", "Seconds of attention", {"number": 42, "suffix": "s"}),
    ("compare", "comparison", "compare", "split", "CONTRAST", "Choose focus", {"items": ["Noise", "Focus"]}),
    ("steps", "process", "steps", "grid", "SEQUENCE", "A useful rhythm", {"items": ["Define", "Design", "Deliver"]}),
    ("diagram", "hierarchy", "diagram", "grid", "RELATIONSHIP", "Make the link visible", {"items": ["Message", "Motion", "Meaning"]}),
    ("progress", "process", "progress", "left-weighted", "DEMO PROGRESS", "Understanding moves forward", {"progress": .72}),
    ("notification", "emphasis", "notification", "editorial", "SIGNAL", "One useful notification", {"body": "Only when it matters"}),
    ("section", "reveal", "section", "full-screen", "NEW BEAT", "Space creates clarity", {}),
    ("statement", "statement", "statement", "right-weighted", "FOCUS", "Motion directs the eye", {"body": "A deliberate pause can do more than another effect."}),
    ("cta", "cta", "cta", "centered", "NEXT STEP", "Review. Then render.", {"action": "PLAY THE PREVIEW"}),
]


def _read_wav(path):
    with wave.open(str(path), "rb") as wav:
        params = wav.getparams()
        frames = wav.readframes(wav.getnframes())
    if params.sampwidth != 2 or params.nchannels != 1:
        raise ValueError("The local TTS voice must produce 16-bit mono PCM WAV.")
    samples = array("h")
    samples.frombytes(frames)
    return params.framerate, samples


def _click(path, rate):
    count = round(.11 * rate)
    samples = array("h", (int(2500 * math.sin(2*math.pi*900*i/rate) * math.exp(-35*i/rate)) for i in range(count)))
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(samples.tobytes())
    return samples


def _assemble_audio(folder):
    phrases = json.loads((folder / "phrases.json").read_text(encoding="utf-8-sig"))
    if len(phrases) != len(SCENES):
        raise ValueError("TTS output does not match the demo scene list.")
    lines = [_read_wav(folder / f"line-{i:02}.wav") for i in range(len(phrases))]
    rate = lines[0][0]
    if any(x[0] != rate for x in lines):
        raise ValueError("The local TTS output changed sample rate between lines.")
    click_source = folder / "soft-click.wav"
    click_samples = _click(click_source, rate)
    if not any(item["id"] == "synthetic-soft-click" for item in load_manifest()["resources"]):
        import_resource(click_source, ident="synthetic-soft-click", category="sfx", tags=["click", "soft", "synthetic"],
                        license="CC0-1.0", origin="Generated locally by scripts/motion_demo.py", safety="approved")
    combined = array("h")
    spans = []
    for i, (_, samples) in enumerate(lines):
        start = len(combined) / rate
        combined.extend(samples)
        combined.extend(array("h", [0]) * round(.16*rate))
        end = len(combined) / rate
        spans.append((round(start, 5), round(end, 5)))
        # One library SFX is reused at every new scene. It is part of the synthetic Master Audio.
        onset = round((start+.02)*rate)
        for j, sample in enumerate(click_samples):
            at = onset+j
            if at < len(combined):
                combined[at] = max(-32768, min(32767, combined[at] + sample))
    master = folder / "synthetic-master.wav"
    with wave.open(str(master), "wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(combined.tobytes())
    return master, phrases, spans


def _data(folder, phrases, spans):
    script = folder / "script.txt"
    script.write_text(" ".join(phrases), encoding="utf-8")
    transcript = folder / "timed-transcript.json"
    save(transcript, {"segments": [{"start": start, "end": end, "text": phrase, "direction": "ltr"}
                                   for phrase, (start, end) in zip(phrases, spans)]})
    board = {"schema_version": 1, "mode": "motion-only",
             "timing_verified_by": "synthetic TTS fixture generator; measured clip boundaries, not human review", "scenes": []}
    plan = {"schema_version": 1, "mode": "motion-only", "motion_density": "medium", "visual_energy": "balanced",
            "transition_family": "fade", "captions": load(transcript)["segments"], "scenes": []}
    for (ident, function, kind, layout, eyebrow, headline, extra), phrase, (start, end) in zip(SCENES, phrases, spans):
        board["scenes"].append({"id": ident, "start": start, "end": end, "narration": phrase,
            "semantic_function": function, "importance": "high" if ident in ("opening", "number", "cta") else "medium",
            "information_density": "low", "visual_structure": kind, "visual_hierarchy": "headline then supporting visual",
            "motion_energy": "energetic" if ident in ("opening", "number") else "balanced",
            "recommended_presentation": kind, "visual_reason": "A reusable demonstration of meaning-led visual structure."})
        motion = {"entrance": "reveal" if kind in ("typography", "section") else "rise",
                  "emphasis": "count" if kind == "number" else "fill" if kind == "progress" else "connect" if kind in ("steps", "diagram") else "pulse" if kind in ("notification", "cta") else "none",
                  "exit": "fade"}
        plan["scenes"].append({"id": ident, "start": start, "end": end, "type": kind, "layout": layout,
            "eyebrow": eyebrow, "headline": headline, "motion": motion, **extra})
    board_file = folder / "storyboard.json"; plan_file = folder / "motion-plan.json"
    save(board_file, board); save(plan_file, plan)
    return script, transcript, board_file, plan_file


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", default="motion-demo")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    if project(args.name).exists():
        raise ValueError("Demo project already exists. Choose another --name; no project is overwritten.")
    (ROOT / "projects").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="motion-demo-input-", dir=ROOT / "projects") as temp:
        folder = Path(temp)
        subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                        str(ROOT / "scripts" / "synth_motion_demo.ps1"), "-OutputDir", str(folder)], check=True)
        master, phrases, spans = _assemble_audio(folder)
        script, transcript, board_file, plan_file = _data(folder, phrases, spans)
        p = intake_audio(master, args.name, script, transcript)
        import_storyboard(p, board_file)
        approve_storyboard(p, "synthetic fixture generator, not creator approval")
        import_motion_plan(p, plan_file)
        build_motion_composition(p)
        master_hash = digest(p / "master-audio.wav")
    if not args.prepare_only:
        preview = render_preview(p)
        approve_preview(p, preview, "synthetic fixture generator, not creator approval")
        final = render_final(p)
        verify_master(p)
        if digest(p / "master-audio.wav") != master_hash:
            raise RuntimeError("Demo changed its Master Audio.")
        save(p / "motion-only" / "demo-summary.json", {"synthetic_fixture": True, "real_speech": False,
            "local_tts": True, "no_paid_api": True, "master_sha256": master_hash,
            "reused_sfx": "synthetic-soft-click", "preview": str(preview.relative_to(p)).replace("\\", "/"),
            "final": str(final.relative_to(p)).replace("\\", "/")})
        print("Synthetic preview:", preview)
        print("Synthetic final:", final)
    else:
        print("Synthetic Motion-Only composition:", p / "motion-only" / "composition")


if __name__ == "__main__": main()
