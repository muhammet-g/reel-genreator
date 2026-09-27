"""Preview and final rendering from one immutable Master Audio and one AAC derivative."""
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import subprocess
import time

from .core import ROOT, digest, ffmpeg, hf, load, probe, run, save
from .motion_audio import verify_master
from .motion_composition import build_motion_composition
from .motion_design import load_style
from .motion_storyboard import storyboard_approval_valid
from .motion_sfx import ensure_mixed_audio


def decoded_audio_hash(path):
    return run(["ffmpeg", "-v", "error", "-i", path, "-map", "0:a:0", "-f", "hash", "-hash", "sha256", "-"], capture=True).strip()


def ensure_render_audio(p: Path) -> Path:
    p = Path(p)
    master, state = verify_master(p)
    record = state.get("render_audio")
    if record:
        derivative = (p / record["path"]).resolve()
        if not derivative.is_relative_to(p.resolve()) or not derivative.is_file() or digest(derivative) != record["sha256"]:
            raise ValueError("Render audio derivative is missing or changed. Restore it or create a new project version.")
        return derivative
    derivative = p / "motion-only" / "render-audio.m4a"
    derivative.parent.mkdir(parents=True, exist_ok=True)
    if derivative.exists():
        raise ValueError("Unregistered render audio already exists; inspect it before continuing.")
    ffmpeg(["-i", master, "-map", "0:a:0", "-vn", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", derivative])
    measured = float(probe(derivative)["format"]["duration"])
    if abs(measured - state["duration"]) > .12:
        raise ValueError("Render audio derivative has an unexpected duration mismatch.")
    verify_master(p)
    audio_stream = next(s for s in probe(derivative)["streams"] if s["codec_type"] == "audio")
    state["render_audio"] = {"path": str(derivative.relative_to(p)).replace("\\", "/"),
                             "sha256": digest(derivative), "decoded_sha256": decoded_audio_hash(derivative),
                             "duration": measured, "codec": "aac", "sample_rate": int(audio_stream["sample_rate"]),
                             "channels": int(audio_stream["channels"]), "bit_rate": int(audio_stream["bit_rate"]),
                             "derived_from_sha256": state["master_audio"]["sha256"]}
    save(p / "motion-project.json", state)
    return derivative


def _composition_check(out: Path):
    executable = ROOT / "node_modules" / ".bin" / ("hyperframes.cmd" if __import__("os").name == "nt" else "hyperframes")
    process = subprocess.run([str(executable), "check", str(out), "--json"], cwd=ROOT,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    raw = process.stdout or ""
    (out / "check.json").write_text(raw, encoding="utf-8")
    try:
        report = json.loads(raw[raw.index("{"):])
    except (ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError("Composition check returned no readable JSON: " + process.stderr[-1000:]) from exc
    errors = sum(int(value.get("errorCount", 0)) for value in report.values() if isinstance(value, dict))
    if errors:
        raise RuntimeError(f"Motion composition has {errors} HyperFrames errors; inspect {out / 'check.json'}.")
    return report


def _snapshot(p: Path, out: Path) -> dict:
    master, state = verify_master(p)
    return {"master_audio": digest(master), "storyboard_approval": digest(p / "storyboard-approval.json"),
            "transcript": digest(p / "transcript.json"), "storyboard": digest(p / "storyboard.json"),
            "motion_plan": digest(p / "motion-plan.json"), "composition": digest(out / "index.html"),
            "composition_build": digest(out / "build.json"),
            "style": hashlib.sha256(json.dumps(load_style(p), sort_keys=True).encode()).hexdigest(),
            "render_audio": state["render_audio"]["sha256"],
            "mixed_audio": state.get("mixed_audio", {}).get("sha256") if state.get("mixed_audio") else None}


def _verify_output(path: Path, derivative: Path, total: float, expected_audio_hash: str, frame=None):
    frame = frame or {"width": 1080, "height": 1920, "fps": 30}
    info = probe(path)
    streams = info["streams"]
    video = next((s for s in streams if s["codec_type"] == "video"), None)
    audio = next((s for s in streams if s["codec_type"] == "audio"), None)
    if not video or (video["width"], video["height"], video["codec_name"]) != (frame["width"], frame["height"], "h264"):
        raise ValueError("Motion output dimensions or video codec differ from the project frame settings.")
    if not audio or audio["codec_name"] != "aac":
        raise ValueError("Motion output lacks the approved AAC derivative audio.")
    measured = float(info["format"]["duration"])
    if abs(measured - total) > .12:
        raise ValueError("Motion output duration differs from the Master Audio.")
    actual = decoded_audio_hash(path)
    if actual != expected_audio_hash:
        raise ValueError("Output audio differs from the approved render-compatible derivative.")
    derivative_stream = next(s for s in probe(derivative)["streams"] if s["codec_type"] == "audio")
    if (audio["sample_rate"], audio["channels"]) != (derivative_stream["sample_rate"], derivative_stream["channels"]):
        raise ValueError("Output audio sample rate or channels differ from the render-compatible derivative.")
    return {"dimensions": [frame["width"], frame["height"]], "duration": measured, "video_codec": "h264", "audio_codec": "aac",
            "audio_sample_rate": int(audio["sample_rate"]), "audio_channels": int(audio["channels"]),
            "audio_bit_rate": int(audio.get("bit_rate", 0)),
            "audio_matches_derivative": "render-audio-mix-" not in derivative.name,
            "audio_matches_approved_source": True, "decoded_audio_sha256": actual}


def render_preview(p: Path, workers=1) -> Path:
    p = Path(p)
    storyboard_approval_valid(p)
    derivative = ensure_render_audio(p)
    approved_audio = ensure_mixed_audio(p, derivative)
    out = build_motion_composition(p)
    _composition_check(out)
    snapshot = _snapshot(p, out)
    frame = load(p / "motion-project.json").get("frame", {"width": 1080, "height": 1920, "fps": 30})
    key = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()[:12]
    folder = p / "motion-only" / "previews"
    folder.mkdir(parents=True, exist_ok=True)
    picture = folder / f"picture-{key}.mp4"
    preview = folder / f"preview-{key}.mp4"
    if not picture.exists():
        hf("render", out, "--output", picture, "--fps", str(frame["fps"]), "--quality", "draft",
           "--workers", str(workers), "--no-best-effort")
    if not preview.exists():
        ffmpeg(["-i", picture, "-i", approved_audio, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
                "-movflags", "+faststart", preview])
    _, state = verify_master(p)
    approved_hash = state["mixed_audio"]["decoded_sha256"] if state.get("mixed_audio") else state["render_audio"]["decoded_sha256"]
    report = _verify_output(preview, approved_audio, state["duration"], approved_hash, frame)
    save(folder / f"preview-{key}.json", {"snapshot": snapshot, "output_sha256": digest(preview), **report})
    return preview


def approve_preview(p: Path, preview: Path, by: str) -> dict:
    p, preview = Path(p), Path(preview).resolve()
    if not by.strip():
        raise ValueError("Name the creator who watched and approved this preview.")
    if not preview.is_relative_to((p / "motion-only" / "previews").resolve()) or not preview.is_file():
        raise ValueError("Approve a preview inside this Motion-Only project.")
    out = build_motion_composition(p)
    current = _snapshot(p, out)
    report = load(preview.with_suffix(".json"))
    if report["snapshot"] != current or report["output_sha256"] != digest(preview):
        raise ValueError("Preview or project inputs changed; render and review a new preview.")
    record = {"by": by.strip(), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "preview": str(preview.relative_to(p)).replace("\\", "/"), "preview_sha256": digest(preview),
              "snapshot": current}
    save(p / "preview-approval.json", record)
    return record


def preview_approval_valid(p: Path, out: Path) -> dict:
    record = load(Path(p) / "preview-approval.json")
    preview = (Path(p) / record["preview"]).resolve()
    if not preview.is_relative_to((Path(p) / "motion-only" / "previews").resolve()) or digest(preview) != record["preview_sha256"]:
        raise ValueError("Approved preview changed or is missing.")
    if record["snapshot"] != _snapshot(Path(p), out):
        raise ValueError("Project changed since preview approval; render and review a new preview.")
    return record


def render_final(p: Path, workers=1) -> Path:
    p = Path(p)
    storyboard_approval_valid(p)
    derivative = ensure_render_audio(p)
    approved_audio = ensure_mixed_audio(p, derivative)
    out = build_motion_composition(p)
    preview_approval_valid(p, out)
    _composition_check(out)
    snapshot = _snapshot(p, out)
    frame = load(p / "motion-project.json").get("frame", {"width": 1080, "height": 1920, "fps": 30})
    key = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()[:12]
    folder = p / "motion-only" / "finals"
    folder.mkdir(parents=True, exist_ok=True)
    picture = folder / f"picture-{key}.mp4"
    final = folder / f"final-{key}.mp4"
    if not picture.exists():
        hf("render", out, "--output", picture, "--fps", str(frame["fps"]), "--quality", "high",
           "--workers", str(workers), "--no-best-effort")
    if not final.exists():
        ffmpeg(["-i", picture, "-i", approved_audio, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
                "-movflags", "+faststart", final])
    _, state = verify_master(p)
    approved_hash = state["mixed_audio"]["decoded_sha256"] if state.get("mixed_audio") else state["render_audio"]["decoded_sha256"]
    report = _verify_output(final, approved_audio, state["duration"], approved_hash, frame)
    preview = p / load(p / "preview-approval.json")["preview"]
    preview_duration = float(probe(preview)["format"]["duration"])
    if abs(preview_duration - report["duration"]) > 1/30 + .01:
        raise ValueError("Preview and final timing differ by more than one frame.")
    save(folder / f"final-{key}.json", {"snapshot": snapshot, "output_sha256": digest(final),
                                          "preview_duration": preview_duration, "owner_final_approval": False, **report})
    return final
