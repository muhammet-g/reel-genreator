"""Intentional SFX cues mixed into a separate, hash-keyed render artifact."""
from __future__ import annotations

from pathlib import Path
import hashlib
import json

from .core import digest, ffmpeg, load, probe, save
from .motion_audio import verify_master
from .motion_resources import LIBRARY, LICENSES, load_manifest


def resolve_sfx(p: Path) -> list[dict]:
    plan = load(Path(p) / "motion-plan.json")
    manifest = {item["id"]: item for item in load_manifest()["resources"]}
    cues = []
    for cue in plan.get("sfx", []):
        item = manifest.get(cue["resource_id"])
        if not item or item["type"] != "sfx" or item["safety"] != "approved" or not item["safe_for_motion_only"]:
            raise ValueError(f"SFX {cue['resource_id']} is missing or not approved for Motion-Only.")
        if item["license"] not in LICENSES or "music" in item["tags"]:
            raise ValueError(f"SFX {item['id']} has unsafe or unverified licensing/content.")
        cues.append({"cue": cue, "item": item, "source": LIBRARY / item["path"]})
    return cues


def ensure_mixed_audio(p: Path, derivative: Path) -> Path:
    p = Path(p)
    master, state = verify_master(p)
    cues = resolve_sfx(p)
    if not cues:
        if state.get("mixed_audio"):
            state["mixed_audio"] = None
            save(p / "motion-project.json", state)
        return derivative
    ingredients = {"mix_version": 2, "derivative": digest(derivative),
                   "cues": [{"cue": x["cue"], "resource": x["item"]["sha256"]} for x in cues]}
    key = hashlib.sha256(json.dumps(ingredients, sort_keys=True).encode()).hexdigest()[:16]
    target = p / "motion-only" / f"render-audio-mix-{key}.m4a"
    record = state.get("mixed_audio")
    if record and record.get("key") == key:
        if not target.is_file() or digest(target) != record["sha256"]:
            raise ValueError("Registered SFX mix is missing or changed.")
        return target
    if target.exists():
        raise ValueError("Unregistered SFX mix already exists; inspect before continuing.")
    inputs = ["-i", derivative]
    filters = []
    labels = ["[0:a]"]
    for i, entry in enumerate(cues, 1):
        cue, item = entry["cue"], entry["item"]
        duration = min(float(item["duration"]), state["duration"] - float(cue["start"]))
        if duration <= 0:
            raise ValueError("SFX cue has no room within the Master Audio duration.")
        fade_in = min(float(cue.get("fade_in", 0)), duration / 2)
        fade_out = min(float(cue.get("fade_out", 0)), duration / 2)
        volume = float(cue.get("volume", .18))
        if not 0 <= volume <= .25:
            raise ValueError("SFX volume must stay within the speech-safe 0–0.25 range.")
        inputs += ["-i", entry["source"]]
        chain = f"[{i}:a]atrim=0:{duration:.6f},asetpts=PTS-STARTPTS,volume={volume:.4f}"
        if fade_in:
            chain += f",afade=t=in:st=0:d={fade_in:.6f}"
        if fade_out:
            chain += f",afade=t=out:st={duration-fade_out:.6f}:d={fade_out:.6f}"
        chain += f",alimiter=limit=0.15:level=0,adelay={round(float(cue['start'])*1000)}:all=1[fx{i}]"
        filters.append(chain)
        labels.append(f"[fx{i}]")
    filters.append("".join(labels) + f"amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=0.95[out]")
    source_audio = next(s for s in probe(derivative)["streams"] if s["codec_type"] == "audio")
    ffmpeg(inputs + ["-filter_complex", ";".join(filters), "-map", "[out]", "-c:a", "aac",
                     "-b:a", "192k", "-ar", source_audio["sample_rate"], "-ac", str(source_audio["channels"]),
                     "-movflags", "+faststart", target])
    verify_master(p)
    from .motion_render import decoded_audio_hash
    state["mixed_audio"] = {"path": str(target.relative_to(p)).replace("\\", "/"), "key": key,
                            "sha256": digest(target), "decoded_sha256": decoded_audio_hash(target),
                            "derived_from_sha256": digest(derivative),
                            "sample_rate": int(source_audio["sample_rate"]), "channels": int(source_audio["channels"]),
                            "cues": ingredients["cues"]}
    save(p / "motion-project.json", state)
    return target
