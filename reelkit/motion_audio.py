"""Audio-first project intake and transcription input boundary.

No transcription provider is imported here. Adapters are injected explicitly.
"""
from __future__ import annotations

from pathlib import Path
from typing import Protocol
import math
import shutil
import tempfile
import time

from .core import digest, load, probe, project, save

SCHEMA_VERSION = 1
AUDIO_SUFFIXES = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}


class TranscriptionAdapter(Protocol):
    name: str
    external: bool

    def transcribe(self, master_audio: Path, reference_script: str | None) -> list[dict]: ...


def _audio_info(path: Path) -> tuple[float, dict, dict]:
    if not path.is_file() or path.suffix.lower() not in AUDIO_SUFFIXES:
        raise ValueError("Supply an existing WAV, MP3, M4A, FLAC, OGG or AAC audio file.")
    info = probe(path)
    streams = [s for s in info.get("streams", []) if s.get("codec_type") == "audio"]
    if not streams or any(s.get("codec_type") == "video" for s in info.get("streams", [])):
        raise ValueError("Motion-Only intake requires an audio file without video.")
    total = float(info["format"]["duration"])
    if not math.isfinite(total) or total <= 0:
        raise ValueError("The Master Audio must have a measurable positive duration.")
    stream = streams[0]
    return (total,
            {k: stream.get(k) for k in ("codec_name", "sample_rate", "channels", "channel_layout", "bit_rate")},
            {k: info["format"].get(k) for k in ("format_name", "size", "bit_rate")})


def intake_audio(audio_path: str | Path, name: str, script_path=None, transcript_path=None) -> Path:
    src = Path(audio_path).expanduser().resolve()
    total, stream, container = _audio_info(src)
    p = project(name)
    if p.exists():
        raise ValueError("Project already exists. Choose another name; intake never overwrites a project.")
    # Validate optional inputs before creating the project.
    transcript = make_transcript(total, script_path, transcript_path) if (script_path or transcript_path) else None
    p.mkdir(parents=True)
    master = p / ("master-audio" + src.suffix.lower())
    shutil.copy2(src, master)
    original_hash = digest(src)
    if digest(master) != original_hash:
        raise RuntimeError("The copied Master Audio differs from the supplied file.")
    save(p / "motion-project.json", {
        "schema_version": SCHEMA_VERSION, "mode": "motion-only", "duration": total,
        "frame": {"width": 1080, "height": 1920, "fps": 30},
        "master_audio": {"path": master.name, "sha256": original_hash, "source_name": src.name,
                         "extension": src.suffix.lower(), "stream": stream, "container": container},
        "render_audio": None,
        "transcript_status": ("reference-script" if transcript and not transcript["segments"] else
                              "timed-transcript-unreviewed" if transcript else "missing"),
    })
    if transcript:
        save(p / "transcript.json", transcript)
    return p


def verify_master(p: Path) -> tuple[Path, dict]:
    p = Path(p)
    state = load(p / "motion-project.json")
    if state.get("mode") != "motion-only" or state.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("This is not a supported Motion-Only project.")
    rel = Path(state["master_audio"]["path"])
    master = (p / rel).resolve()
    if rel.is_absolute() or not master.is_relative_to(p.resolve()) or not master.is_file():
        raise ValueError("The Master Audio path is invalid or missing.")
    if digest(master) != state["master_audio"]["sha256"]:
        raise ValueError("The Master Audio changed. Restore the original before continuing.")
    return master, state


def _script(path) -> str:
    value = Path(path).read_text(encoding="utf-8").strip()
    if not value:
        raise ValueError("The reference script is empty.")
    return value


def validate_segments(segments, total: float) -> list[dict]:
    if not isinstance(segments, list) or not segments:
        raise ValueError("A timed transcript needs at least one segment.")
    result, last = [], 0.0
    for item in segments:
        if not isinstance(item, dict):
            raise ValueError("Transcript segments must be objects.")
        try:
            a, b = float(item["start"]), float(item["end"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("Transcript segments need numeric start and end times.") from exc
        wording = item.get("text")
        direction = item.get("direction", "auto")
        if not all(math.isfinite(x) for x in (a, b)) or a < last - .001 or b <= a or b > total + .04:
            raise ValueError("Transcript segments must be ordered, non-overlapping and within the Master Audio.")
        if not isinstance(wording, str) or not wording.strip() or direction not in ("auto", "rtl", "ltr"):
            raise ValueError("Each segment needs text and a valid direction.")
        result.append({"start": a, "end": b, "text": wording.strip(), "direction": direction})
        last = b
    return result


def make_transcript(total: float, script_path=None, transcript_path=None) -> dict:
    if not script_path and not transcript_path:
        raise ValueError("Supply a script or timed transcript.")
    reference = _script(script_path) if script_path else None
    if transcript_path:
        data = load(transcript_path)
        segments = validate_segments(data.get("segments") if isinstance(data, dict) else data, total)
        return {"schema_version": SCHEMA_VERSION, "source": "user-timed-transcript", "alignment": "user-supplied-timing",
                "reference_script": reference, "segments": segments}
    return {"schema_version": SCHEMA_VERSION, "source": "user-script", "alignment": "unverified",
            "reference_script": reference, "segments": []}


def set_transcript(p: Path, script_path=None, transcript_path=None) -> dict:
    _, state = verify_master(p)
    result = make_transcript(state["duration"], script_path, transcript_path)
    save(Path(p) / "transcript.json", result)
    state["transcript_status"] = "reference-script" if not result["segments"] else "timed-transcript-unreviewed"
    save(Path(p) / "motion-project.json", state)
    return result


def transcribe_with_adapter(p: Path, adapter: TranscriptionAdapter, *, allow_upload=False) -> dict:
    master, state = verify_master(p)
    if adapter.external and not allow_upload:
        raise ValueError("External transcription needs explicit authorization for this Master Audio.")
    reference = load(Path(p) / "transcript.json").get("reference_script") if (Path(p) / "transcript.json").exists() else None
    # An adapter receives a disposable copy, so even a faulty provider implementation cannot rewrite the Master Audio.
    with tempfile.TemporaryDirectory(prefix="transcription-", dir=p) as temporary:
        adapter_input = Path(temporary) / master.name
        shutil.copy2(master, adapter_input)
        segments = adapter.transcribe(adapter_input, reference)
    verify_master(p)
    segments = validate_segments(segments, state["duration"])
    result = {"schema_version": SCHEMA_VERSION, "source": adapter.name, "alignment": "adapter-proposed",
              "reference_script": reference, "segments": segments}
    save(Path(p) / "transcript.json", result)
    state["transcript_status"] = "external-aligned-proposed" if adapter.external else "locally-aligned-proposed"
    save(Path(p) / "motion-project.json", state)
    return result


def review_alignment(p: Path, by: str) -> dict:
    """Record explicit creator review of timed wording, separately from storyboard approval."""
    p = Path(p)
    master, _ = verify_master(p)
    if not by.strip():
        raise ValueError("Name the creator who reviewed the timed transcript.")
    transcript_path = p / "transcript.json"
    transcript = load(transcript_path)
    if not transcript.get("segments"):
        raise ValueError("A reference script alone has no timing to review.")
    record = {"by": by.strip(), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "sha256": {"master_audio": digest(master), "transcript.json": digest(transcript_path)}}
    save(p / "alignment-review.json", record)
    return record


def alignment_review_status(p: Path) -> str:
    p = Path(p)
    record_path = p / "alignment-review.json"
    if not record_path.exists():
        return "not reviewed"
    try:
        master, _ = verify_master(p)
        record = load(record_path)
        expected = {"master_audio": digest(master), "transcript.json": digest(p / "transcript.json")}
        return "creator-reviewed" if record.get("sha256") == expected else "stale; review again"
    except (ValueError, FileNotFoundError, KeyError):
        return "stale; review again"
