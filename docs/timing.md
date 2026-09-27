# Timing and finished audio

The source is immutable. Intake copies it under its content hash and measures its
decoded PCM sample count. `sampleCount / sampleRate` is the authoritative duration.
Compressed container duration is not used to guess a scene boundary.

Every plan time is an integer sample index at the master sample rate. Ranges are
half open: `[start,end)`. Scene ranges must cover the entire master without gaps.
Phrases are ordered, non-overlapping ranges with text, provenance and review state.
There is no automatic transcription or invented word timing. Import a measured
transcript or author phrase times after listening. Keep uncertain alignment marked.

Named events are an ID → sample map. Motion, camera and transition cues can use
an absolute sample or `{event, offset}`. SFX requires a named event. Offsets, trims
and durations use the project sample rate, including after resampling an SFX asset.

Convert seconds once at intake with `secondsToSamples`. Convert to frames with
`sampleToFrame`: ceiling activates an event on the first frame at/after its time;
floor is only for explicit earlier sampling. Frame duration uses
`ceil(sampleCount * fps.num / (sampleRate * fps.den))`. Integer arithmetic avoids
cumulative rounding drift. Never round and sum individual scene lengths.

The picture may be less than one frame longer than narration. AAC also has codec
padding; its decoded sample count may exceed the master by at most 1024 samples.
The original sample count never changes. Rendering remuxes the registered AAC
derivative without another audio encode. Verification hashes its decoded PCM and
compares the final MP4 audio to that derivative, then decodes the complete MP4.

Audio lineage includes source and derivative hashes. Derivative identity includes
the explicit SFX plan and assets. No silence cutting, speech edits, replacement
voice, automatic denoise, or recorded-video cleanup is part of this engine.
