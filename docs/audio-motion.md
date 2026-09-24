# Motion-Only audio workflow

This route starts with finished narration. It does not cut, stretch, normalize, replace or trim the supplied file. The original is copied to `projects/<name>/master-audio.<ext>` and its SHA-256, duration, codec, channels, sample rate and container metadata are saved in `motion-project.json`. `render_audio` is a separate state field for an AAC derivative. Every later operation verifies the Master Audio hash.

## Intake and text input

```sh
python reel.py audio-intake narration.wav --name my-audio-reel --script script.txt
python reel.py audio-status my-audio-reel
```

The script is a reference, not a claim that its words or times match the recording. To add measured timing, supply a JSON file:

```json
{"segments": [
  {"start": 0.20, "end": 1.80, "text": "مرحبا React", "direction": "rtl"},
  {"start": 1.85, "end": 3.10, "text": "Start here.", "direction": "ltr"}
]}
```

```sh
python reel.py audio-transcript my-audio-reel --script script.txt --transcript timed.json
```

`audio-intake` also accepts `--transcript` directly, with or without `--script`. The Python `TranscriptionAdapter` interface in `reelkit/motion_audio.py` accepts a local adapter or an explicitly authorized external adapter. No speech model or provider is installed by default. An external adapter cannot run without explicit authorization; the engine hands any adapter a disposable copy of the audio.

## Semantic storyboard

The storyboard describes meaning and visual intent, leaving appearance to later style and motion layers. Save JSON such as:

```json
{
  "schema_version": 1,
  "mode": "motion-only",
  "timing_verified_by": "Editor who listened to the Master Audio",
  "scenes": [
    {
      "id": "opening", "start": 0, "end": 3.1,
      "narration": "The words heard in this scene",
      "semantic_function": "hook", "importance": "high",
      "information_density": "low", "visual_structure": "full-screen statement",
      "visual_hierarchy": "main claim first", "motion_energy": "energetic",
      "recommended_presentation": "kinetic typography",
      "visual_reason": "Reveal the claim at the speech beat and allow it to be read."
    }
  ]
}
```

Scenes must be chronological, non-overlapping and cover the entire audio duration. Their semantic function must use the vocabulary in `reelkit/motion_storyboard.py`. Do not put color, font or final appearance tokens into a scene. The example times and approval name are placeholders, never measured facts about a real recording.

```sh
python reel.py audio-storyboard my-audio-reel --file storyboard.json
python reel.py audio-status my-audio-reel
```

Show the storyboard to the creator. Only after they actually approve it:

```sh
python reel.py approve-storyboard my-audio-reel --by "Creator name"
```

The approval hashes the Master Audio, transcript input and storyboard. Editing any one makes approval stale. `audio-status` reports that state.

## Motion plan, resources and render

After storyboard approval, write `motion-plan.json` with one visual scene per semantic scene. Scene ids and times must match the approved storyboard. The core types are `typography`, `statement`, `number`, `compare`, `steps`, `diagram`, `progress`, `notification`, `section` and `cta`. Each scene chooses a layout and `motion` with an entrance, emphasis and exit. The plan chooses one `transition_family`, `motion_density`, `visual_energy`, and measured phrase `captions`. See the synthetic example in `projects/motion-demo/motion-plan.json` after generating it.

```sh
python reel.py audio-plan my-audio-reel --file motion-plan.json
python reel.py audio-compose my-audio-reel
```

The Motion-Only composition contains no source-video element. It separates storyboard semantics, motion choices and style tokens. Optional `motion-style.json` changes palette and type tokens without changing the semantic storyboard. Approved local SVGs, images, supported videos and PNG sequences may be selected by `resource_tags` or `resource_id`; the built-in component remains as fallback. See [Resource System v2](resource-system.md) for the local manifest, placement and SFX cues. The default content rules are centralized in `reelkit/content_policy.py`; metadata checks do not replace visual review.

```sh
python reel.py import-resource my-icon.svg --id my-icon-01 --category svg --tag process --license CC0 --source "Creator's own SVG" --safety approved --scene diagram
python reel.py list-resources
```

After reviewing the storyboard, render a draft preview. The derivative is created once from the unchanged Master Audio and remains a separate file. If the plan has approved SFX cues, a separate hash-keyed AAC mix is made from that derivative; otherwise the derivative is used directly. The preview uses HyperFrames draft quality; final uses high quality. Both remux the same approved audio artifact and verify its decoded hash. WAV/FLAC/MP3 originals remain byte-identical in the project; AAC in MP4 is a technical conversion and cannot be byte-identical to those source codecs.

```sh
python reel.py audio-preview my-audio-reel
python reel.py approve-preview my-audio-reel --file projects/my-audio-reel/motion-only/previews/preview-<id>.mp4 --by "Creator name"
python reel.py audio-final my-audio-reel
```

Only run `approve-preview` after the creator actually watches and approves the specific preview. A changed motion plan, style, storyboard, transcript, master or selected resource invalidates that approval. Previous preview and final files have content-derived names and remain in separate folders. The final verification JSON reports dimensions, duration and audio integrity; creator playback is still the final QA gate. Nothing publishes automatically.

## Offline synthetic demo

On Windows, `python scripts/motion_demo.py --name motion-demo` creates ten locally spoken synthetic scenes, one reusable non-musical click SFX, a storyboard, a draft preview and a final render. It calls no external provider, downloads no resource pack and labels synthetic approvals as fixtures rather than creator acceptance. The demo tests the rendering and audio path; it does not establish transcription accuracy for real speech.
