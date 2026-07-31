# NowAction UI and Export Architecture
## Shape Appearance, Effects, Curves, Large Projects, and Copy Layer Code

**Status:** Draft approved direction  
**Product:** NowAction  
**Primary goal:** A mobile-first website motion editor with progressive-disclosure UI inspired by Alight Motion  
**New selected-layer action:** Copy Layer Code `</>`

---

# 1. Executive Decisions

This document locks the following decisions:

1. Rectangle, Circle, future Vector Drawing, and future Freehand Drawing use one SVG-based Shape renderer.
2. Fill, Stroke, Shadow, Layer Opacity, Blend Mode, Effects, Transform, and animation tracks remain separate concerns.
3. Every animatable property uses one shared keyframe data model.
4. Curve easing belongs to a property segment between two keyframes.
5. Effects are defined through an extensible registry.
6. Exported websites are not automatically heavy merely because they contain many objects.
7. Performance is determined by active animated layers, DOM/SVG complexity, animated properties, effects, and media size.
8. NowAction must compile and optimize exported output rather than copying the editor DOM.
9. Every selected object exposes a Code `</>` icon.
10. The Code screen generates copyable code from Export IR, not from the current editor DOM.
11. The initial copied-code target is a portable Vanilla Web bundle: HTML, CSS, and optional JavaScript/runtime data.
12. Selected-layer code includes required dependencies by default so that the copied result does not silently break.

---

# 2. Selected-Layer Property Dock

When one layer is selected, the contextual dock contains seven icon-only actions:

```text
[Edit] [Fill] [Border/Shadow] [Blend/Opacity]
[Transform] [Effects] [Code]
```

No permanent visible names.

Recommended width on a `390px` screen:

```text
available width after 16px side padding = 358px
7 controls × 48px                     = 336px
remaining spacing                     = 22px
```

Each control:

```text
touch target: 48 × 48 px
visual icon:  22–24 px
```

Recommended order:

```text
Edit
Fill
Border & Shadow
Blend & Opacity
Move & Transform
Effects
Code </>
```

The Code icon remains at the far right.

Type-specific categories may omit unsupported actions, but Code is available for every exportable layer and group.

---

# 3. Unified SVG Shape Renderer

All Shape-category layers use the same rendering system.

Supported initially:

- Rectangle;
- Circle/Ellipse.

Future additions:

- Polygon;
- Star;
- Line;
- Arrow;
- Vector Drawing;
- Freehand Drawing;
- custom path.

Recommended structure:

```html
<div
  class="na-layer"
  data-na-layer-id="shape-1"
>
  <svg
    class="na-shape"
    viewBox="0 0 140 90"
    preserveAspectRatio="none"
  >
    <rect
      class="na-shape-geometry"
      x="0"
      y="0"
      width="140"
      height="90"
      rx="12"
    />
  </svg>
</div>
```

Circle:

```html
<div class="na-layer" data-na-layer-id="shape-2">
  <svg class="na-shape" viewBox="0 0 120 120">
    <ellipse
      class="na-shape-geometry"
      cx="60"
      cy="60"
      rx="60"
      ry="60"
    />
  </svg>
</div>
```

Future path:

```html
<path class="na-shape-geometry" d="..." />
```

The HTML wrapper owns:

- project identity;
- layout position;
- timeline range;
- stacking;
- grouping;
- transforms;
- layer opacity;
- blend mode;
- editor selection.

The SVG owns:

- geometry;
- fill;
- stroke;
- line cap/join;
- path rendering;
- future vector/freehand data.

This avoids separate CSS-shape and SVG-shape architectures.

---

# 4. Shape Layer Data Model

```js
layer = {
  id: "shape-1",
  type: "shape",
  name: "Rectangle 1",

  geometry: {
    type: "rectangle",

    width: 140,
    height: 90,

    cornerRadius: {
      staticValue: 12,
      keyframes: []
    },

    pathData: null
  },

  layout: {
    x: 24,
    y: 800,
    width: 140,
    height: 90
  },

  appearance: {
    fill: {
      type: "solid",

      color: {
        staticValue: "#6750A4",
        keyframes: []
      },

      opacity: {
        staticValue: 1,
        keyframes: []
      }
    },

    stroke: {
      enabled: false,

      color: {
        staticValue: "#000000",
        keyframes: []
      },

      opacity: {
        staticValue: 1,
        keyframes: []
      },

      width: {
        staticValue: 0,
        keyframes: []
      },

      lineCap: "round",
      lineJoin: "round",
      style: "solid"
    },

    shadows: []
  },

  compositing: {
    opacity: {
      staticValue: 1,
      keyframes: []
    },

    blendMode: "normal"
  },

  transform: {
    position: {
      staticValue: {
        x: 24,
        y: 800
      },
      keyframes: []
    },

    scale: {
      staticValue: {
        x: 1,
        y: 1
      },
      keyframes: []
    },

    rotation: {
      staticValue: 0,
      keyframes: []
    }
  },

  effects: [],

  timeline: {
    start: 0.20,
    end: 1
  }
};
```

---

# 5. Separate Opacity Concepts

These properties must not share one field.

```text
Fill Opacity
Stroke Opacity
Shadow Opacity
Layer Opacity
```

### Fill opacity

Affects only the shape fill.

### Stroke opacity

Affects only the border/stroke.

### Shadow opacity

Affects only one shadow instance.

### Layer opacity

Affects the final composed output of:

```text
fill + stroke + shadow + effects
```

Layer opacity is applied to the HTML layer wrapper.

This separation is required so that changing fill transparency does not unexpectedly fade the border or shadow.

---

# 6. Shared Animatable Value Model

Every animatable property uses:

```js
{
  staticValue: VALUE,

  keyframes: [
    {
      id: "kf-1",
      at: 0.25,
      value: VALUE,

      easingToNext: {
        type: "cubic-bezier",
        x1: 0.22,
        y1: 1,
        x2: 0.36,
        y2: 1
      }
    }
  ]
}
```

Examples:

```text
appearance.fill.color
appearance.fill.opacity
appearance.stroke.width
appearance.shadows[0].blur
compositing.opacity
transform.position
transform.scale
transform.rotation
effects[0].parameters.amount
```

Rules:

- `staticValue` is authoritative when there are no keyframes.
- Keyframe evaluation does not overwrite `staticValue`.
- Editing an animated property at a playhead without a keyframe creates a keyframe.
- Removing the last keyframe preserves the current evaluated value as `staticValue`.
- Keyframe positions use global normalized progress `0..1`.
- Easing belongs to the outgoing segment of a keyframe.

---

# 7. Fill UI

Tap the Fill icon.

Reference contextual layout:

```text
┌──────────────────────────────────────┐
│ [‹]              fill            [×] │ 40
├──────────────────────────────────────┤
│                                      │
│       [ large color swatch ]         │
│                                      │
│   opacity-icon ───────●      100%   │ 132
├──────────────────────────────────────┤
│   ◀◆             ◇             ◆▶   │ 48
└──────────────────────────────────────┘
```

No permanent property names.

Allowed visible data:

```text
#6750A4
100%
```

Tap the color swatch to replace the panel with the Color Picker.

Initial fill support:

```text
Solid color
```

Backlog:

- linear gradient;
- radial gradient;
- image fill;
- multiple fills.

---

# 8. Color Picker

```text
┌──────────────────────────────────────┐
│ [‹]             color            [×] │
├──────────────────────────────────────┤
│      saturation/value field          │
│                                      │
│ hue   ─────────────────●             │
│ alpha ─────────────────●             │
├──────────────────────────────────────┤
│ #6750A4                             │
└──────────────────────────────────────┘
```

The picker is mounted only when opened.

Color interpolation for the initial implementation:

```text
sRGB channel interpolation
```

The architecture may later support another interpolation space, but preview and export must use the same color interpolation.

---

# 9. Border and Shadow Root

Tap Border & Shadow.

```text
┌──────────────────────────────────────┐
│ [‹]        border/shadow         [×] │
├──────────────────────────────────────┤
│                                      │
│          outlined-box   shadow-box   │
│                                      │
└──────────────────────────────────────┘
```

The two icon choices open:

- Border detail;
- Shadow detail.

Only the active detail screen is mounted.

---

# 10. Border Data and UI

Data:

```js
appearance.stroke = {
  enabled: true,

  color: {
    staticValue: "#111111",
    keyframes: []
  },

  opacity: {
    staticValue: 1,
    keyframes: []
  },

  width: {
    staticValue: 4,
    keyframes: []
  },

  style: "solid",
  lineCap: "round",
  lineJoin: "round"
};
```

UI:

```text
[swatch]     width-icon  4px     opacity-icon 100%
solid-preview    dashed-preview    dotted-preview
```

Initial support:

- solid stroke;
- round line cap;
- round line join.

Dash and dotted may remain backlog until the exported renderer handles them consistently.

Stroke alignment for initial SVG rendering:

```text
centered on the SVG path
```

The compiler includes half the stroke width in visual/render bounds.

Animated stroke width may affect visual bounds, but must not continuously redefine document height.

---

# 11. Shadow Data and UI

Data:

```js
appearance.shadows = [
  {
    id: "shadow-1",
    enabled: true,

    color: {
      staticValue: "#000000",
      keyframes: []
    },

    opacity: {
      staticValue: 0.35,
      keyframes: []
    },

    offsetX: {
      staticValue: 0,
      keyframes: []
    },

    offsetY: {
      staticValue: 8,
      keyframes: []
    },

    blur: {
      staticValue: 24,
      keyframes: []
    },

    spread: {
      staticValue: 0,
      keyframes: []
    }
  }
];
```

Initial UI:

```text
color swatch
horizontal-offset icon + value
vertical-offset icon + value
blur icon + value
spread icon + value
opacity icon + value
```

Initial product behavior may expose one shadow while storing shadows as an array.

This prevents a future data migration when multiple shadows are added.

Shadow size contributes to the render envelope used by viewport virtualization.

Shadow does not change base document layout height.

---

# 12. Blend and Layer Opacity

Root choices:

```text
layer-opacity icon
overlapping-circles blend icon
```

Layer opacity:

```js
compositing.opacity = {
  staticValue: 0.8,
  keyframes: []
};
```

Applied to:

```css
.na-layer {
  opacity: var(--na-layer-opacity);
}
```

Blend mode:

```js
compositing.blendMode = "multiply";
```

Export:

```css
mix-blend-mode: multiply;
```

Initial blend modes:

- normal;
- multiply;
- screen;
- overlay;
- darken;
- lighten.

Blend modes use visual preview thumbnails because abstract icons are not sufficiently clear.

Names remain available through:

- accessibility labels;
- long-press tooltip;
- transient selection feedback.

Groups establish a predictable local stacking/blending boundary:

```css
.na-group {
  isolation: isolate;
}
```

---

# 13. Effects Architecture

Flow:

```text
Effects
→ Applied Effects
→ Add Effect
→ Category
→ Effect Picker
→ Effect Detail
```

Only implemented effects are visible.

Initial effects:

- Blur;
- Brightness;
- Contrast;
- Saturation;
- Color Overlay;
- Drop Shadow.

Applied effect row:

```text
[reorder grip] [preview/icon] [enable/disable] [remove]
```

Effect order is authoritative.

```js
effects = [
  {
    id: "effect-1",
    type: "blur",
    enabled: true,
    parameters: { ... }
  },

  {
    id: "effect-2",
    type: "contrast",
    enabled: true,
    parameters: { ... }
  }
];
```

Changing effect order may change the visual result.

---

# 14. Effect Registry

Effects are defined through metadata.

```js
effectRegistry = {
  blur: {
    icon: "blur",
    category: "blur",
    exportStage: "filter",

    performance: {
      class: "paint-heavy"
    },

    parameters: {
      amount: {
        type: "number",
        default: 0,
        min: 0,
        max: 100,
        unit: "px",
        animatable: true,
        icon: "blur"
      }
    }
  },

  brightness: {
    icon: "brightness",
    category: "light",
    exportStage: "filter",

    performance: {
      class: "moderate"
    },

    parameters: {
      amount: {
        type: "number",
        default: 1,
        min: 0,
        max: 3,
        unit: "ratio",
        animatable: true,
        icon: "brightness"
      }
    }
  }
};
```

The same registry drives:

- Add Effect Browser;
- parameter controls;
- validation;
- serialization;
- animation support;
- export generation;
- performance classification;
- Code screen output.

Do not hardcode unrelated effect implementations into separate panels.

---

# 15. Render Pipeline

Recommended conceptual pipeline:

```text
Geometry
→ Fill
→ Stroke
→ Shape-local effects
→ Shadow
→ Layer opacity
→ Blend mode
→ Group composition
```

Not every effect maps to a CSS `filter`.

The export compiler determines the correct implementation stage.

Possible output technologies:

- SVG attributes;
- SVG filters;
- CSS filters;
- wrapper elements;
- generated raster assets for explicit flattening.

Preview and export must use the same ordering rules.

---

# 16. Curve Editor

The Curve Editor is available when the active property has at least two keyframes and a valid segment.

```text
┌──────────────────────────────────────┐
│ [‹]       property icon          [×] │ 40
├──────────────────────────────────────┤
│                                      │
│        cubic Bézier graph            │ 132
│                                      │
├──────────────────────────────────────┤
│ linear-thumbnail   ease thumbnails  │ 48
└──────────────────────────────────────┘
```

Preset buttons are visual curve thumbnails.

Initial presets:

- Linear;
- Ease In;
- Ease Out;
- Ease In-Out.

Custom mode supports draggable Bézier handles.

Data:

```js
keyframe.easingToNext = {
  type: "cubic-bezier",
  x1: 0.22,
  y1: 1,
  x2: 0.36,
  y2: 1
};
```

Constraints:

```text
x1 = 0..1
x2 = 0..1

y1 = -2..3
y2 = -2..3
```

Overshoot is valid for:

- position;
- scale;
- rotation.

Final evaluated values are clamped when required for:

- opacity;
- color channels;
- blur;
- other bounded properties.

---

# 17. Compound Transform Tracks

Initial motion-editor behavior:

```text
Position = one compound track containing X and Y
Scale    = one compound track containing X and Y
Rotation = one numeric track
```

Example:

```js
transform.position = {
  staticValue: {
    x: 120,
    y: 840
  },

  keyframes: [
    {
      id: "kf-pos-1",
      at: 0.20,
      value: {
        x: 120,
        y: 840
      }
    }
  ]
};
```

Benefits:

- one Position diamond;
- one Position curve;
- X and Y keyframes remain synchronized;
- simpler mobile editing;
- fewer accidental mismatched tracks.

Backlog:

```text
Separate X/Y dimensions
```

---

# 18. Will Many Exported Objects Make the User's App Heavy?

Not automatically.

Object count is only one part of the performance cost.

A project with:

```text
300 static simple rectangles
```

may be cheaper than:

```text
20 full-screen layers
with large blur, shadows, video, and continuous animation
```

The important cost dimensions are:

```text
total DOM/SVG node count
maximum simultaneously active animated layers
number of evaluated animation tracks
property cost
painted pixel area
group/filter complexity
image/video/font payload
asset decoding
layout changes
```

The exported website must therefore not use a single object-count hard limit as its only quality rule.

---

# 19. Static Objects Versus Animated Objects

### Static object

A simple static SVG shape generally requires:

- one wrapper;
- one SVG;
- one geometry node;
- CSS/style data.

It does not require frame-by-frame JavaScript evaluation.

### Animated object

Requires:

- compiled tracks;
- active-range checks;
- interpolation;
- style or SVG updates;
- rendering/compositing work.

### Expensive animated object

May include:

- large blur;
- large shadow;
- animated width/height;
- full-screen transparency;
- blend modes;
- nested group filters;
- large media.

Therefore, NowAction should display performance information based on active complexity, not merely `numberOfObjects`.

---

# 20. Export Performance Metrics

The compiler should calculate:

```js
performanceReport = {
  totalLayers: 280,
  totalSvgNodes: 420,
  animatedLayers: 74,
  totalAnimationTracks: 210,
  totalKeyframes: 920,

  maxSimultaneouslyActiveLayers: 46,
  maxSimultaneouslyActiveTracks: 138,

  expensiveEffects: {
    blur: 4,
    largeShadow: 7,
    blendMode: 9
  },

  assets: {
    totalImageBytes: 3_800_000,
    totalVideoBytes: 0,
    fontFiles: 3
  }
};
```

The most useful measurements are often:

```text
maximum simultaneously active animated layers
maximum simultaneously active animation tracks
large painted areas
media payload
```

---

# 21. Internal Project Complexity Tiers

These are NowAction engineering guidance, not universal browser guarantees.

### Light

```text
mostly static objects
few active animations
transform and opacity
small optimized media
```

### Moderate

```text
many objects
dozens of simultaneously active tracks
some shadows and blend modes
multiple images and fonts
```

### Heavy

```text
many full-screen active layers
large blur/shadows
many simultaneously animated properties
large unoptimized images or video
deep nested filtered groups
```

The UI should show an icon-based quality indicator rather than block export automatically.

Tap the indicator to show details.

Do not silently change the user's visual design.

---

# 22. Export Optimizations for Many Objects

The export compiler should perform:

### 22.1 Remove editor metadata

Do not export:

- selection state;
- panel state;
- timeline zoom;
- thumbnails used only by the editor;
- AI chat state;
- editor navigation state.

### 22.2 Compile keyframe tracks once

Do not filter raw keyframe arrays every frame.

### 22.3 Evaluate only active layers

Use bar ranges and an active-set index.

### 22.4 Use transform and opacity fast paths

Do not animate `left` and `top` for normal movement.

### 22.5 Deduplicate CSS

Shared declarations belong in shared classes.

### 22.6 Tree-shake runtime features

If a project uses no blur effect, do not include blur-specific runtime logic where modular output makes this possible.

### 22.7 Optimize media

- responsive image sizes;
- lazy media loading;
- reserved dimensions;
- compressed files;
- used font weights only.

### 22.8 Preserve stable layout

Inactive objects must not collapse the scroll domain unexpectedly.

### 22.9 Merge compatible static SVG content

When multiple static sibling shapes have:

- no independent animation;
- no independent interaction;
- no separate blend behavior;
- no runtime selection requirement in export;

the compiler may merge them into one SVG container.

This optimization must preserve z-order and appearance.

### 22.10 Optional flattening

A future explicit export option may flatten a static group into:

- one SVG;
- or one raster image.

Flattening is never automatic when it would remove:

- animation;
- interactivity;
- text accessibility;
- responsive behavior;
- independent code access.

---

# 23. Editor Virtualization Versus Export Structure

Editor:

```text
aggressive viewport and timeline virtualization
```

Export:

```text
stable semantic/render structure
+ lazy media
+ lazy animation evaluation
```

Do not unmount all exported text and shapes merely because they are outside the viewport.

That could harm:

- accessibility;
- anchor links;
- content discovery;
- stable layout;
- future SEO.

The exported page can keep lightweight structure while avoiding animation work for inactive layers.

---

# 24. Performance Warnings

NowAction should warn when a layer or project contains:

- large blur over a large area;
- many simultaneous shadows;
- animated width/height;
- many blend layers;
- deeply nested filtered groups;
- high-resolution media far beyond display size;
- too many font files;
- large simultaneously active track counts.

Warning flow:

```text
performance indicator icon
→ tap
→ compact issue list
→ tap issue
→ select/focus relevant layer
```

No warning should modify the user's project automatically.

---

# 25. Code `</>` Action

Every selected exportable layer exposes a Code icon:

```text
</>
```

Tap behavior:

```text
selected layer
→ Code screen
→ generate code from Export IR
→ show read-only code
→ copy through Copy icon
```

The Code screen must not serialize the current editor DOM.

The editor DOM contains:

- selection handles;
- editor-only wrappers;
- temporary styles;
- viewport scaling;
- editing IDs;
- interaction logic.

Code must be generated by the same compiler architecture used for project export.

---

# 26. Code Screen Layout

The Code screen may temporarily expand beyond the normal `220px` contextual area because code requires readable space.

Default compact state:

```text
┌──────────────────────────────────────┐
│ [‹]              </>       [expand][copy] │
├──────────────────────────────────────┤
│ <div class="na-layer"...>            │
│   ...                                │
│ </div>                               │
└──────────────────────────────────────┘
```

Compact height:

```text
220 px
```

Expanded height:

```text
approximately 60dvh
```

The website preview remains behind or above the expanded panel according to available height.

Controls:

- Back;
- Code context icon;
- Expand/Collapse;
- Copy.

All are icon-only.

Code area:

- read-only;
- monospace;
- vertically scrollable;
- horizontally scrollable;
- selectable;
- syntax highlighted only when the highlighter is loaded;
- plain text fallback required.

---

# 27. Initial Copied-Code Format

Initial target:

```text
Vanilla Web Layer Bundle
```

The copied text contains:

```html
<!-- NowAction Layer: Rectangle 1 -->
<div class="na-layer na-layer-shape" data-na-layer-id="shape-1">
  ...
</div>

<style>
  ...
</style>

<script>
  ...
</script>
```

The JavaScript section is omitted when the selected layer is completely static and has no runtime dependency.

For an animated layer, include:

- layer animation manifest fragment;
- minimal initialization call;
- runtime dependency instruction or import;
- current layer active range;
- required parent wrappers.

The copied code should favor correctness over extreme compactness.

---

# 28. Copy With Dependencies by Default

A selected object may depend on:

- parent group transforms;
- group stacking context;
- fonts;
- image assets;
- effects;
- masks or mattes in the future;
- runtime animation utilities;
- CSS variables;
- shared definitions;
- project viewport assumptions.

Therefore, the default Copy action must generate:

```text
selected layer
+ required parent wrapper chain
+ required styles
+ required asset references
+ required animation data
+ required runtime hook
```

It must not silently copy only the innermost DOM node when the result would look different.

Example group dependency:

```text
Project
└── Group A
    └── Group B
        └── Circle
```

Copying Circle with dependencies may include technical wrappers for:

```text
Group A
Group B
Circle
```

Only the selected layer's relevant dependency chain is included.

Unrelated sibling layers are excluded unless required by an effect or mask.

---

# 29. Code Dependency Indicator

The Code screen should indicate whether the snippet is:

```text
standalone
or
requires dependencies
```

Because permanent text labels are avoided, use:

- link/chain icon;
- small count badge;
- accessible description;
- tap to reveal dependency details.

Examples:

```text
chain icon + 3
```

may indicate three required dependencies.

Dependency details may display concise text because file names, runtime names, and asset URLs are data, not menu labels.

---

# 30. Static Layer Code

For a simple static shape, code can be nearly standalone.

Example:

```html
<div class="na-layer na-shape-layer">
  <svg viewBox="0 0 140 90" aria-hidden="true">
    <rect
      x="0"
      y="0"
      width="140"
      height="90"
      rx="12"
      fill="#6750A4"
    />
  </svg>
</div>

<style>
  .na-shape-layer {
    position: absolute;
    left: 24px;
    top: 800px;
    width: 140px;
    height: 90px;
  }

  .na-shape-layer > svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
</style>
```

No runtime is required when:

- there are no keyframes;
- no effects require JavaScript;
- no group animation dependency exists;
- no NowAction-specific interaction exists.

---

# 31. Animated Layer Code

For an animated layer, the snippet contains normalized timeline data.

Example:

```js
const layerManifest = {
  id: "shape-1",

  activeRange: [
    0.20,
    1
  ],

  tracks: {
    position: {
      positions: [0.20, 0.60],
      values: [
        [24, 800],
        [180, 1100]
      ],

      easings: [
        [0.22, 1, 0.36, 1]
      ]
    }
  }
};
```

The snippet must use the same compiled track format as full export.

Do not generate a separate animation implementation only for the Code panel.

---

# 32. Asset Handling in Copied Code

For image layers, copied code may reference:

```text
relative exported asset path
absolute hosted asset URL
or placeholder token
```

The Code screen must not embed huge binary assets into the clipboard by default.

Example:

```html
<img
  src="./assets/image-4.webp"
  width="1200"
  height="800"
  alt=""
>
```

If the asset is not available outside the NowAction project, show the dependency indicator.

Future option:

```text
Copy as self-contained data URL
```

should remain opt-in because it can make clipboard output extremely large.

---

# 33. Font Handling in Copied Code

When a selected Text layer uses a custom font, copied code must include or declare:

- required font family;
- required weight;
- required source/import information when available.

Do not copy every font in the project.

Only include the fonts required by the selected layer and dependency chain.

If licensing or hosting prevents embedding, the Code screen must show a dependency warning instead of pretending the font is self-contained.

---

# 34. Code Safety

Generated code must:

- escape user text;
- validate attribute values;
- validate URLs;
- sanitize SVG path/markup;
- avoid inline event handlers from user content;
- avoid serializing arbitrary editor HTML;
- use stable generated class names;
- avoid leaking project secrets;
- avoid including API keys or editor authentication state.

Clipboard code is generated output, not a raw dump.

---

# 35. Framework Export Backlog

Initial Code output target:

```text
Vanilla HTML + CSS + optional JavaScript
```

Backlog:

- React component;
- Vue component;
- Svelte component;
- Web Component;
- JSX with imported assets;
- CSS module;
- Tailwind-compatible output.

Do not add a generic More menu for these formats.

A future Code screen may use icon-only output-format selectors when each format works reliably.

---

# 36. Project Export Versus Layer Code

These are separate actions.

### Export

Top-right Export icon:

```text
generate complete website/project output
```

### Code `</>`

Selected-layer contextual icon:

```text
generate code for selected layer or group
with required dependencies
```

The Code action must not replace full export.

A group selected in the timeline generates code for the complete group subtree.

---

# 37. Copy Feedback

Tap Copy:

```text
copy generated code to clipboard
```

Success:

```text
short visual confirmation
check icon
optional short haptic response
```

Failure:

```text
warning icon
keep code selectable for manual copy
```

Do not close the Code screen automatically after copying.

---

# 38. Code Generation Cache

Code generation may be cached by:

```text
selected layer ID
project revision
code format
dependency mode
```

Example:

```js
codeCacheKey = [
  selectedLayerId,
  projectRevision,
  "vanilla-bundle",
  "with-dependencies"
].join(":");
```

Invalidate when:

- selected layer changes;
- a required parent changes;
- effect parameters change;
- keyframes change;
- fonts/assets change;
- export compiler version changes.

Do not regenerate the complete project on every Code panel scroll.

---

# 39. Architectural Defects to Avoid

## 39.1 Object count treated as the only performance metric

A few expensive full-screen effects can be worse than many static shapes.

## 39.2 Full editor DOM copied as code

This leaks editor implementation and produces incorrect results.

## 39.3 Layer code copied without parent dependencies

Grouped or animated output may look wrong.

## 39.4 Separate code-generation logic from Export

The Code view and actual export can diverge.

Use one Export IR and compiler.

## 39.5 Huge images embedded into clipboard automatically

This makes code unusable and may freeze the app.

## 39.6 Every shape exported as many unnecessary wrappers

Keep wrappers only when required by layout, animation, compositing, grouping, or interaction.

## 39.7 Automatic flattening of editable or accessible content

Flattening can destroy text access, responsiveness, animation, and code reuse.

## 39.8 Effect-specific hardcoded UI and export logic

Use the registry.

## 39.9 One opacity field for fill, stroke, shadow, and layer

Keep them separate.

## 39.10 UI icon-only without accessibility metadata

Every icon requires a semantic accessible name.

---

# 40. Recommended Implementation Order

## Phase 1 — Shared property foundation

- AnimatableValue;
- stable keyframe IDs;
- generic numeric control;
- generic color control;
- property registry;
- contextual navigation.

## Phase 2 — SVG Shape renderer

- Rectangle;
- Circle;
- Fill;
- Stroke;
- corner radius;
- preview/export parity.

## Phase 3 — Compositing

- Fill opacity;
- Layer opacity;
- Blend mode;
- group isolation.

## Phase 4 — Shadow

- one visible shadow;
- shadow array data;
- render envelope;
- performance classification.

## Phase 5 — Curve Editor

- presets;
- custom Bézier;
- segment selection;
- bounded-property clamping.

## Phase 6 — Effects registry

- Blur;
- Brightness;
- Contrast;
- Saturation;
- Color Overlay;
- Drop Shadow.

## Phase 7 — Code `</>`

- Code dock icon;
- Code screen;
- selected-layer Export IR;
- static HTML/CSS bundle;
- animated bundle;
- dependency collection;
- clipboard copy;
- security validation.

## Phase 8 — Large-project compiler optimization

- active-layer indexing;
- static SVG merging;
- runtime tree shaking;
- media optimization;
- performance report;
- optional explicit flattening.

---

# 41. Acceptance Criteria

This architecture is correct when:

1. Rectangle and Circle render through the shared SVG Shape renderer.
2. Future Vector and Freehand can use the same geometry/fill/stroke pipeline.
3. Fill, Stroke, Shadow, and Layer Opacity remain distinct.
4. Every animatable property uses the shared AnimatableValue model.
5. Curves are stored per property segment.
6. Effects are generated from the registry.
7. Effect order remains identical in preview and export.
8. Large project warnings use active complexity and media cost, not only object count.
9. Static objects do not consume per-frame animation evaluation.
10. Export evaluates only active animated layers.
11. Compatible static shapes may be merged without changing output.
12. Flattening remains explicit and does not silently destroy accessibility or animation.
13. Every selected exportable layer has a Code `</>` icon.
14. Code is generated from Export IR rather than editor DOM.
15. Static layer code omits unnecessary runtime JavaScript.
16. Animated layer code uses the same compiled tracks as full export.
17. Parent and asset dependencies are included or clearly reported.
18. Group code includes its required subtree.
19. Code output safely escapes user content.
20. Clipboard failure still leaves manually selectable code.
21. Full project Export and selected-layer Code remain separate actions.
22. Preview, project export, and copied layer code produce matching visuals at equivalent progress values.

---

# 42. Final Architecture Statement

> NowAction uses one SVG-based Shape renderer for Rectangle, Circle, future Vector Drawing, and future Freehand Drawing. Appearance, compositing, transforms, effects, and animation tracks remain separately modeled and share a generic animatable-property system. Large exported projects are optimized according to active animation complexity, visual effects, DOM/SVG structure, and media payload rather than object count alone. Every selected layer exposes a Code `</>` action that generates safe, copyable Vanilla HTML/CSS/JavaScript from the same Export IR used by full project export, including required dependencies by default.
