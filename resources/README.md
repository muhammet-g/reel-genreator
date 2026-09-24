# Local Motion-Only resource library

Use `python reel.py import-resource` to inspect and register one local asset. The manifest at `manifests/resources.json` records its content hash, media metadata, semantic tags, compatible scene types, source, license and content-safety status. The importer rejects duplicate content, invalid paths, unknown formats and unsupported Lottie JSON. Resources remain local; the importer performs no search or download.

Resource selection uses approved local entries whose scene type and tags fit the visual plan and whose `safe_for_motion_only` flag is true. An unreviewed or blocked entry is never selected. Images and videos default to false for that flag; `--motion-only-safe` marks one reviewed import as eligible. If nothing fits, the composition uses its built-in component. Source and license details are provenance records, not a claim that the engine has independently verified rights. Metadata cannot prove that an image is compliant; the reviewer must inspect the actual asset.

Folders cover `motion/{transitions,text-effects,logo-reveals,callouts,lower-thirds,notifications,arrows,loaders,counters,infographics,misc}`, `overlays/{grain,light,paper,noise,textures}`, and `icons`, `svg`, `lottie`, `images`, `video`, `sfx`, `fonts`, `manifests`. They are created on demand by the importer.

PNG, JPEG, WebP, SVG, MP4, WebM, MOV, WAV, MP3, OGG and Lottie JSON can be inventoried. MOV and Lottie are metadata-only until a compatible playback adapter is verified. The importer does not read `.aep` files. Some codecs and alpha modes still require render testing before production use.
