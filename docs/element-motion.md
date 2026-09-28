# Element motion primitives

`src/remotion/motion` animates arbitrary React children. It does not plan camera
movement or scene transitions. A future scene director can choose semantic effect
names without knowing CSS. This package is separate from `ProjectComposition`'s
existing object tracks; adopting it in generated scenes requires an explicit
authoring step.

```tsx
import {MotionElement,TextEffect} from '../src/remotion/motion';

<MotionElement motion={{
  enter:{type:'blur-pop',startFrame:0,durationFrames:20,intensity:'medium'},
  exit:{type:'slide',startFrame:75,durationFrames:16,direction:'up'},
  emphasis:{type:'punch',startFrame:36,durationFrames:12,intensity:'low'},
}}>
  <YourVisual />
</MotionElement>

<TextEffect text="السَلام عليكم 👩‍💻" direction="rtl" mode="stagger"
  motion={{enter:{type:'fade',durationFrames:10}}}/>
```

Frame numbers are relative to the containing Remotion `Sequence`. Entrance,
exit and emphasis each have their own start, duration, delay, easing, intensity,
direction and distance where applicable. Exit and emphasis require a start frame.
An explicit `spring` accepts mass, stiffness and damping. The default `settled`
curve lands without bounce. Ambient effects use a period and optional end frame.
All sampling is a pure function of the current frame.

| Phase | Effects |
|---|---|
| Entrance | `fade`, `pop`, `slide`, `rotate`, `flip`, `blur-pop`, `mask`, `scan`, `cube` |
| Exit | `fade`, `slide`, `scale`, `rotate`, `flip`, `blur`, `mask`, `zoom` |
| Emphasis | `punch`, `shake`, `glitch`, `glow` |
| Ambient | `float`, `tilt`, `neon`, `hologram` |

`scan` is a directional mask with a moving edge. `glitch` is a brief deterministic
color split and displacement. `hologram` has a bounded deterministic flicker.
`stagger` is a `TextEffect` mode that actually offsets unit start frames; it is not
an element effect. The old `terminal` duplicated a reveal mask; `particles` did
not contain particles; the old `circuit` polygon did not draw a circuit. Those
names are absent from the production API.

`TextEffect` has `block`, `typewriter`, `stagger` and `wave` modes. It uses
`Intl.Segmenter` with a fallback that keeps combining marks, skin tones, ZWJ
emoji and flags together. Typewriter reveals complete graphemes in one shaped
string. Arabic stagger/wave move complete words to preserve joining. `MixedText`
continues to isolate LTR code inside Arabic text. Flip, mask, blur and neon text
effects are composed through `motion`, rather than separate text components.

Transforms and opacity are the common path. Blur, shadows and masks are opt-in;
use them sparingly on large or dense scenes. `src/examples/motion-primitives-showcase.tsx`
is registered as `MotionPrimitivesShowcase` for development and contains no
project audio or production content.
