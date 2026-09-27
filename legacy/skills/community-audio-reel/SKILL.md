---
name: community-audio-reel
description: Start a Motion-Only reel from a finished Master Audio file, with a script or timed transcript, and prepare a semantic storyboard for creator approval.
---

# Finished audio comes first

Read `docs/audio-motion.md` from the package root. Preserve the supplied audio as the immutable Master Audio. Use `audio-intake` with a new project name; never replace an existing project or modify its master file. Verify its hash with `audio-status` whenever reopening it.

Accept a user script as a reference to the recording, not a verbatim transcript. Prefer a timed transcript measured against real audio. Keep Arabic script shaped as phrases and Latin technical words in Latin letters. A transcription adapter is optional; do not upload audio or call a paid provider without authorization for that exact audio and cost. The Motion-Only project does not depend on any provider.

Create a semantic storyboard from the actual narration and its timing. For every scene, explain the message, hierarchy and reason for the proposed visual structure. Do not hard-code style tokens. Replay the Master Audio to verify scene boundaries before recording `timing_verified_by`. Show the storyboard to the creator and run `approve-storyboard` only after actual approval.

Build a visual motion plan with the reusable core scene set, one transition family, measured phrase captions and controlled density. Search the approved local resource manifest before creating a one-off effect. Use `audio-plan`, `audio-compose` and `audio-preview`. Show the exact preview to the creator; run `approve-preview` only after actual approval. Then use `audio-final`, inspect the verification report, and watch and listen to the output. Do not claim the final technical check grants permission to publish.

The legacy `dress` and `render` commands still serve recorded and faceless workflows. Motion-Only projects use their dedicated commands. No paid API, external upload or asset download is required when a script or timed transcript is supplied.
