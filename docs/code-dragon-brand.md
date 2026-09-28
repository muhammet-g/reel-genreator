# Code Dragon brand template

Use `src/remotion/CodeDragonBrand.tsx` for the persistent Code Dragon signature.
Both `ForEachFilm` and the generic `MotionProject` render it when the project has
`branding: {"template":"code-dragon","logo":"code-dragon-logo","username":"code__dragon_"}`.
It sits above scene content, outside camera and scene transitions, and remains
visible after its short entrance. Do not recreate the header inside each scene.

On a 1080×1920 canvas, the header begins 78 px from the left and 55 px from the
top. The transparent logo is 66×66 px, followed by a 17 px gap and the username
in 27 px Inter, weight 600, color `#E9D8AC`. The logo has a restrained gold
drop shadow. It pops in from frames 4–22; the username slides in from the left
from frames 10–30. Other frame rates preserve these times, and other canvas
sizes scale the geometry proportionally. The canonical creator-supplied logo is
`assets/brand/code-dragon-logo.png`; its SHA-256 is
`e4e3658eed59c7545a48b5474b136f78fab13ce6074b4037dbc1cefe4be6256b`.

For a new finished-audio Code Dragon project, run:

```powershell
npm run new -- ProjectId path/to/finished-audio.wav --code-dragon
```

This stages the canonical logo as a reviewed local resource and adds the
branding settings with username `code__dragon_`. Edit `branding.username` in
the project's `project.json` if a particular video needs a different display
name. Existing projects can use `tools/code-dragon-brand.ts` while authoring
their project, or add the same logo resource and branding block. Keep the
project's audio and scene timing independent of branding.
