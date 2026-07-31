# NowAction Architecture Decision — Point 5
## Export Performance, Animation Runtime, Asset Budgets, and Failure Prevention

**Status:** Approved for implementation planning  
**Product:** NowAction  
**Scope:** Performance and reliability of websites exported by NowAction  
**Audit basis:** `nowaction-main.zip`, especially:

- `public/js/scroll-anim-runtime.js`
- `public/js/events-and-export.js`
- `public/js/render-and-panels.js`
- `public/js/scroll-anim-ui.js`
- `public/js/state-and-projects.js`

---

## 1. Core Product Decision

A website built in NowAction must not export the editor itself.

The exported website must contain only what is required to render the user's result:

```text
project data
→ export compiler
→ optimized HTML
→ optimized CSS
→ small animation runtime
→ optimized media assets
```

The editor and exported website are separate applications.

The export must not contain:

- editor panels;
- selection code;
- drag-and-drop logic;
- AI assistant code;
- project management code;
- timeline editing UI;
- editor state;
- editor-only dependencies.

The exported runtime should remain small and centralized.

---

## 2. Is a NowAction Website Automatically Heavy?

No.

A scroll-driven website is not automatically heavy merely because it contains:

- layers;
- bars;
- keyframes;
- groups;
- scroll-linked animations.

The website becomes heavy when its export architecture repeatedly performs expensive work, such as:

- evaluating every layer on every frame;
- scanning and allocating keyframe arrays every frame;
- animating layout properties;
- forcing browser layout reads after style writes;
- rendering large unoptimized media;
- duplicating runtime code;
- loading unnecessary fonts;
- keeping invisible layers active;
- exporting editor code;
- generating unsafe or invalid HTML.

The number of keyframes alone is not the complete performance metric.

The most important variables are:

```text
number of simultaneously active layers
× evaluation cost per layer
× rendering cost of animated properties
× media decoding cost
× DOM complexity
```

---

## 3. Positive Findings in the Current Repository

The existing runtime already has several useful foundations:

1. It has no runtime dependency.
2. The animation runtime source is approximately 14.7 KB uncompressed.
3. The audited runtime is approximately 4.4 KB when gzip-compressed.
4. It uses one scroll listener.
5. The scroll listener is passive.
6. Rendering is scheduled through `requestAnimationFrame`.
7. Cubic-bezier easing functions are cached.
8. The exporter does not currently include the full editor JavaScript.

These are good starting points.

The primary performance risk is not the current runtime file size. The larger risk is how much repeated computation and browser rendering work the runtime performs per frame.

---

## 4. Required Export Pipeline

NowAction should not directly concatenate the editor's mutable shape objects into final HTML.

Use a staged compiler:

```text
Authoring Model
    ↓
Validation
    ↓
Normalized Export IR
    ↓
Optimization
    ↓
HTML/CSS/JS/Asset Generation
```

### 4.1 Authoring Model

Contains flexible editor data:

- layer hierarchy;
- groups;
- bars;
- keyframes;
- names;
- editor metadata;
- selected state;
- UI preferences.

### 4.2 Validation

Rejects or repairs invalid data:

- missing layer IDs;
- hierarchy cycles;
- invalid keyframe positions;
- unsupported values;
- unsafe URLs;
- invalid dimensions;
- duplicated structural membership;
- malformed colors;
- non-finite numbers.

### 4.3 Export Intermediate Representation

Contains only normalized render data.

Example:

```js
exportIR = {
  viewport: {
    designWidth: 390
  },

  document: {
    height: 5000
  },

  background: {
    color: "#ffffff"
  },

  layers: [
    {
      id: "layer-a",
      type: "shape",
      parentId: null,
      order: 0,

      baseStyle: {
        x: 24,
        y: 800,
        width: 300,
        height: 180,
        opacity: 1
      },

      activeRange: [0.20, 0.70],

      compiledTracks: {
        translateX: {
          positions: [0.20, 0.50],
          values: [0, 120],
          easings: ["easeOut"]
        }
      }
    }
  ]
};
```

### 4.4 Optimization

The compiler:

- removes unused properties;
- removes disabled animations;
- merges duplicate keyframes;
- sorts tracks once;
- precompiles property tracks;
- classifies expensive effects;
- extracts shared CSS;
- calculates active ranges;
- prepares asset references;
- generates reduced-motion behavior.

### 4.5 Generation

Produces deployable files:

```text
index.html
styles.css
nowaction-runtime.js
project-manifest.js or project-manifest.json
assets/
```

A single-file HTML export may remain available for convenience, but the optimized multi-file export should be the preferred production output.

---

## 5. Critical Defect — Global Progress Is Recomputed Per Layer

The current runtime calls `computeProgress()` for each active entry.

For a global animation, `computeProgress()` calls `computeGlobalProgress()`, which reads:

```js
document.documentElement.scrollHeight
window.innerHeight
window.scrollY
```

This means the same global progress may be recalculated once for every animated global layer during one frame.

Conceptually:

```text
100 active global layers
→ calculate identical global progress 100 times
```

### Required correction

Read the scroll state once per frame:

```js
function collectFrameState(scrollRoot) {
  const maxScroll =
    scrollRoot.scrollHeight -
    scrollRoot.clientHeight;

  return {
    scrollTop: scrollRoot.scrollTop,
    maxScroll,
    globalProgress:
      maxScroll <= 0
        ? 0
        : clamp01(scrollRoot.scrollTop / maxScroll)
  };
}
```

Then pass the same frame state to every layer evaluation.

---

## 6. Critical Defect — Keyframe Arrays Are Filtered Repeatedly Per Property Per Frame

The current `interpolateProp()` performs:

```js
keyframes.filter(...)
```

for each supported property:

- x;
- y;
- width;
- height;
- opacity;
- rotation;
- blur.

For one layer, this may scan and allocate arrays up to seven times per frame.

Conceptually:

```text
layers × properties × keyframes × frames
```

This creates unnecessary CPU work and garbage collection pressure.

### Required correction

Compile sparse unified keyframes into property tracks once, before playback:

```js
compiledLayer.tracks = {
  translateX: {
    positions: new Float32Array([0.0, 0.3, 0.8]),
    values: new Float32Array([0, 120, 0]),
    easingIds: new Uint8Array([2, 0])
  },

  opacity: {
    positions: new Float32Array([0.1, 0.2]),
    values: new Float32Array([0, 1]),
    easingIds: new Uint8Array([2])
  }
};
```

The frame loop must not call `filter()`, `map()`, or create temporary arrays.

---

## 7. Critical Defect — Layout Reads and Style Writes Can Be Interleaved

The current runtime may read:

```js
element.getBoundingClientRect()
```

and then write:

```js
style.width
style.height
style.left
style.top
style.filter
style.transform
style.display
```

for different entries in the same loop.

This can create layout thrashing:

```text
read layout
→ write style
→ read layout again
→ browser may synchronously recalculate layout
```

### Required correction

Use a three-phase frame:

```text
1. Read
2. Evaluate
3. Write
```

Example:

```js
function frame() {
  const frameState = readScrollStateOnce();

  const results = evaluateActiveLayers(
    frameState,
    compiledProject
  );

  commitStyleChanges(results);
}
```

All required layout reads must happen before the first style mutation of that frame.

For the approved global-scroll timeline, most layers should not require `getBoundingClientRect()` at all.

---

## 8. Critical Defect — Exported X and Y Animate `left` and `top`

The current export runtime applies animated X/Y by writing:

```js
element.style.left
element.style.top
```

These properties can trigger layout.

### Required correction

Separate base layout from animated visual transform:

```css
.na-layer {
  position: absolute;
  left: var(--na-base-x);
  top: var(--na-base-y);

  transform:
    translate3d(
      var(--na-anim-x, 0px),
      var(--na-anim-y, 0px),
      0
    )
    rotate(var(--na-anim-rotation, 0deg))
    scale(
      var(--na-anim-scale-x, 1),
      var(--na-anim-scale-y, 1)
    );
}
```

Runtime writes:

```js
element.style.setProperty("--na-anim-x", value + "px");
```

Base `left` and `top` remain stable.

Approved fast-path properties:

- translate X;
- translate Y;
- scale;
- rotation;
- opacity.

---

## 9. High-Risk Properties

The current runtime supports animated:

- width;
- height;
- blur.

It also uses `display` to hide a layer outside its bar.

These can trigger layout or expensive paint work.

### 9.1 Width and height

Animating width or height may cause layout recalculation.

Preferred visual alternative:

```text
scaleX / scaleY
```

Width and height animation may remain an advanced feature, but it must be classified as expensive.

### 9.2 Blur and filters

Large blur values can be costly to paint, especially on large layers.

The export compiler should know:

```js
effectCost = {
  property: "blur",
  class: "expensive",
  affectedArea: layerWidth * layerHeight,
  maxValue: 40
};
```

### 9.3 Display toggling

The current runtime uses:

```js
element.style.display = "none";
```

outside a layer's active range.

This is architecturally unsafe because it may:

- collapse layout;
- alter document height;
- change global scroll progress;
- trigger layout repeatedly.

Use a stable layout wrapper and visual state:

```css
.na-layer[data-na-active="false"] {
  visibility: hidden;
  pointer-events: none;
}
```

When accessibility behavior requires a different rule, that must be compiled separately rather than using `display` as the general animation switch.

---

## 10. Transform Composition Must Be Centralized

The current exporter writes a base rotation into `transform`, and the runtime may overwrite `transform` later.

Future features will also need:

- group transforms;
- object transforms;
- animation transforms;
- responsive transforms;
- inspection transforms in the editor.

These transforms cannot safely overwrite each other.

### Required correction

Use one canonical transform composition model.

Example:

```css
transform:
  translate3d(var(--tx), var(--ty), 0)
  rotate(var(--rotation))
  skew(var(--skew-x), var(--skew-y))
  scale(var(--scale-x), var(--scale-y));
```

Or compile to a matrix when required.

The runtime must update transform components, not replace unrelated transforms.

---

## 11. Active-Range Indexing

Under the approved NowAction model, bars define the global scroll ranges in which layers are active.

The runtime must use this information to avoid evaluating every layer.

### Incorrect approach

```js
for every frame:
  for every animated layer:
    evaluate layer
```

### Required approach

Maintain an active set based on playhead progress.

Possible structure:

```js
compiledProject.rangeEvents = [
  { at: 0.10, type: "enter", layerId: "a" },
  { at: 0.20, type: "enter", layerId: "b" },
  { at: 0.55, type: "exit",  layerId: "a" }
];
```

When progress moves forward or backward, update the active set.

Alternative implementations:

- sorted enter/exit event arrays;
- interval tree;
- timeline buckets;
- binary search plus active-range checks.

The exact structure can evolve, but the runtime must not assume all global layers are active all the time.

---

## 12. Reversing Scroll Must Remain Correct

Visitors can scroll backward.

Therefore, active-range indexing cannot assume progress only moves forward.

Required behavior:

```text
scroll forward  → activate and deactivate ranges correctly
scroll backward → reactivate and deactivate ranges correctly
jump position   → rebuild active set correctly
```

A safe architecture stores:

```js
lastProgress
currentProgress
```

If the jump is too large or direction changes across many range boundaries, the engine may rebuild the active set using indexed lookup.

Correctness has priority over micro-optimization.

---

## 13. Cache Last Rendered Values

The current runtime writes style values every update even when the evaluated result has not changed.

### Required correction

Each runtime layer stores its last committed state:

```js
runtimeLayer.last = {
  tx: null,
  ty: null,
  rotation: null,
  scaleX: null,
  scaleY: null,
  opacity: null,
  blur: null,
  active: null
};
```

Only changed values are written:

```js
if (next.opacity !== last.opacity) {
  element.style.opacity = next.opacity;
  last.opacity = next.opacity;
}
```

For numeric values, use an appropriate precision threshold to avoid writing meaningless subpixel changes:

```js
Math.abs(next - last) > epsilon
```

The threshold must be property-specific and must not visibly damage animation quality.

---

## 14. No Avoidable Allocations in the Frame Loop

The playback frame must avoid:

- `filter()`;
- `map()`;
- `find()`;
- object spreads;
- temporary arrays;
- repeated JSON parsing;
- repeated selector queries;
- repeated easing compilation;
- repeated string construction when values did not change.

Allocation is allowed during:

- export compilation;
- runtime initialization;
- project load;
- resize reconciliation.

The hot frame loop should primarily perform numeric evaluation and necessary style commits.

---

## 15. IntersectionObserver Problems in the Current Runtime

The current runtime:

1. uses `root: null`;
2. does not use the editor's internal scroll root;
3. finds matching entries with `entries.find(...)`;
4. does not disconnect the observer in `destroy()`.

### Required correction

Use a direct map:

```js
const entryByElement = new Map();
```

Use the actual scroll root:

```js
new IntersectionObserver(callback, {
  root: scrollRootElementOrNull
});
```

Store the observer and disconnect it:

```js
destroy() {
  observer?.disconnect();
  scrollRoot.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onResize);
}
```

IntersectionObserver is useful for viewport visibility, but it does not replace timeline active-range indexing.

---

## 16. Scroll Root Must Be Configurable

This repeats a Point 3 requirement because it is also a performance requirement.

The current runtime is tied to the browser window.

Required API:

```js
NowActionRuntime.init(manifest, {
  root: document,
  scrollRoot: document.scrollingElement
});
```

Editor preview:

```js
scrollRoot: previewScrollRoot
```

Exported website:

```js
scrollRoot: document.scrollingElement
```

The engine should normalize window/document scrolling and element scrolling behind one adapter.

---

## 17. Cache Scroll Geometry

Do not read full scroll geometry once per layer.

Maintain:

```js
runtimeState = {
  scrollTop: 0,
  maxScroll: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  progress: 0
};
```

Recalculate geometry when:

- the viewport resizes;
- document height changes from an explicit layout edit;
- media finishes loading and affects stable layout;
- fonts change stable layout;
- the exporter initializes;
- a relevant `ResizeObserver` notification occurs.

Do not let visual animation continuously redefine geometry.

---

## 18. Runtime Lifecycle

The runtime requires explicit lifecycle methods:

```js
const runtime = NowActionRuntime.init(...);

runtime.update();
runtime.resize();
runtime.pause();
runtime.resume();
runtime.destroy();
```

Required lifecycle behavior:

- stop unnecessary work when the page is hidden;
- resume correctly when visible;
- detach all listeners;
- disconnect all observers;
- release maps and references;
- avoid duplicate initialization;
- support preview remounting.

The runtime should not permanently retain removed DOM elements.

---

## 19. Progressive Enhancement Path

NowAction may support two execution paths:

```text
Native scroll-driven animations when suitable
+
JavaScript fallback/runtime when required
```

The compiler can use native CSS scroll timelines for compatible tracks where:

- the property maps cleanly to CSS animation;
- group composition remains correct;
- easing is supported;
- the result matches the editor;
- required browser support is acceptable for the user's export target.

Use feature detection:

```js
CSS.supports("animation-timeline: scroll()")
```

Do not create two manually maintained animation models.

Both native and JavaScript output must be generated from the same normalized Export IR.

The JavaScript path remains the compatibility baseline until native output can reproduce NowAction behavior reliably.

---

## 20. Runtime Delivery

The current combined export injects the entire runtime source inline.

That is convenient for a one-file download, but it prevents browser caching across multiple pages.

### Recommended production export

```html
<link rel="stylesheet" href="./styles.css">
<script src="./nowaction-runtime.js" defer></script>
<script src="./project-manifest.js" defer></script>
```

Benefits:

- runtime can be cached;
- HTML becomes smaller;
- a multi-page project does not duplicate runtime code;
- Content Security Policy is easier to support;
- debugging is clearer.

### Single-file export

May inline everything as an explicit convenience mode:

```text
Export Type:
- Production ZIP
- Single HTML
```

Single HTML is not the preferred performance format for larger projects.

---

## 21. Shared CSS Instead of Repeated Inline Styles

The current exporter writes large inline style strings for every layer.

Recommended output:

```css
.na-layer {
  position: absolute;
  box-sizing: border-box;
}

.na-text {
  display: flex;
  white-space: pre-wrap;
  word-break: break-word;
}
```

Layer-specific data can use:

- CSS custom properties;
- generated per-layer classes;
- compact style attributes for values that are truly unique.

Example:

```html
<div
  class="na-layer na-shape layer-a"
  style="
    --na-x:24px;
    --na-y:800px;
    --na-width:300px;
    --na-height:180px;
  "
></div>
```

The compiler should avoid bloating output with repeated declarations.

---

## 22. Initial Visual State and Flash Prevention

The current page may render base styles before the animation runtime applies the correct state.

This can cause:

- flashing;
- an object appearing briefly at the wrong position;
- layout instability;
- a different first frame from the editor.

### Required correction

The compiler generates the initial state in CSS or HTML.

Example:

```css
.layer-a {
  --na-anim-x: 0px;
  opacity: 0;
}
```

The initial state must be derived from:

```text
progress = current initial scroll progress
```

For a normal page load at the top:

```text
progress = 0
```

Do not hide the entire page until JavaScript initializes.

---

## 23. Reduced Motion and Accessibility

The exported result must support:

```css
@media (prefers-reduced-motion: reduce)
```

The compiler needs a project policy:

```js
project.motionAccessibility = {
  mode: "reduce" // "reduce" | "disable-nonessential" | custom future mode
};
```

Recommended baseline:

- remove large parallax movement;
- remove rapid rotations;
- reduce blur animation;
- preserve content visibility;
- keep essential state transitions understandable;
- do not block access to content because an animation is disabled.

Animation should be progressive enhancement, not the only way meaningful content becomes accessible.

---

## 24. Security Defect — Raw User Text Is Inserted into Exported HTML

The current exporter inserts values such as:

```js
${shape.text}
```

directly into HTML.

This can produce:

- broken HTML;
- accidental markup injection;
- script injection;
- unsafe exported pages.

This is not only a security issue. Invalid markup can also create unexpected DOM size and rendering behavior.

### Required correction

Escape text nodes:

```js
function escapeHtmlText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
```

Escape attribute values separately.

Validate:

- font URLs;
- image URLs;
- link URLs;
- IDs;
- filenames;
- CSS values.

Do not rely on editor controls as the security boundary.

---

## 25. Media Asset Pipeline

Future image, video, audio, and vector support can dominate page weight more than the animation runtime.

NowAction needs a real asset pipeline.

### Images

The export pipeline should support:

- compression;
- appropriate modern formats;
- responsive sizes;
- `srcset` and `sizes`;
- explicit width and height;
- lazy loading for below-the-fold images;
- eager loading and priority for a real LCP image;
- avoiding export at unnecessarily huge source dimensions.

### Video

The pipeline should support:

- poster images;
- no forced autoplay with sound;
- appropriate codecs and resolutions;
- preload policy;
- lazy loading or delayed source attachment;
- user warnings for large files.

### SVG

- sanitize untrusted SVG;
- remove editor metadata;
- deduplicate repeated definitions where practical.

### Fonts

- export only used families and weights;
- avoid loading every editor font;
- use `font-display`;
- prefer cacheable or self-hostable assets when supported;
- warn when many font files are included.

---

## 26. Stable Media Dimensions

Images, videos, and embeds must reserve dimensions before loading.

Example:

```html
<img
  src="..."
  width="1200"
  height="800"
  alt=""
>
```

Or use CSS aspect ratio:

```css
.na-media {
  aspect-ratio: 3 / 2;
}
```

Media loading must not unexpectedly shift the page or continuously change the scroll domain.

If a user intentionally chooses auto-height media, the document geometry may be recalculated after the asset resolves, but timeline bars and keyframes remain at their normalized positions according to Point 1.

---

## 27. Performance Cost Classification

Every animatable property and effect should have compiler metadata.

Example:

```js
propertyCapabilities = {
  translateX: {
    costClass: "fast",
    affectsLayout: false
  },

  opacity: {
    costClass: "fast",
    affectsLayout: false
  },

  width: {
    costClass: "layout",
    affectsLayout: true
  },

  blur: {
    costClass: "paint-heavy",
    affectsLayout: false
  }
};
```

Recommended classes:

```text
Fast
Moderate
Layout-heavy
Paint-heavy
Media-heavy
```

This metadata will later support UI warnings without hardcoding performance logic into the interface.

---

## 28. Do Not Promote Every Layer Permanently

Using `will-change` on every animated layer can consume excessive memory.

Rules:

- do not export `will-change` globally for all layers;
- apply it only when useful;
- optionally activate it near an active range;
- remove it when a layer is far outside the active range;
- keep the strategy conservative.

The browser should not be forced to create a compositor layer for every object in a large project.

---

## 29. Group Performance

Groups from Point 2 create compositing opportunities and risks.

### Useful behavior

A group-level transform can move many children with one transform write.

### Risk

Unnecessary nested stacking contexts, filters, opacity, or clipping can create large offscreen surfaces.

Compiler rules should inspect:

- nested group depth;
- group opacity;
- group filters;
- clip content;
- animated group size;
- number of children.

A group should not receive expensive compositing behavior merely because it exists structurally.

---

## 30. DOM Size and Layer Count

NowAction must not silently promise unlimited layers with identical performance.

The engine should remain correct for large projects, while the editor provides a performance report.

Relevant project measurements:

```text
total layer count
maximum group depth
animated layer count
simultaneously active layer count
total keyframe count
active keyframe tracks
large painted area count
large media count
font file count
```

The most useful runtime number is often:

```text
maximum simultaneously active animated layers
```

not merely the total number of layers.

---

## 31. Export Performance Report

Before export, NowAction should be able to produce a machine-readable report.

Example:

```js
performanceReport = {
  totalLayers: 180,
  animatedLayers: 92,
  maxSimultaneouslyActive: 38,
  totalKeyframes: 740,

  expensiveProperties: {
    blur: 6,
    width: 2,
    height: 4
  },

  assets: {
    imageBytes: 4_200_000,
    videoBytes: 0,
    fontFiles: 3
  },

  warnings: [
    {
      code: "LARGE_BLUR_AREA",
      layerId: "layer-a"
    }
  ]
};
```

This report becomes the architecture basis for a future UI performance panel.

The compiler should never change the user's design silently to improve the score.

It may:

- warn;
- recommend;
- offer an explicit optimization action;
- generate an optimized alternative after confirmation.

---

## 32. Internal Performance Budgets

These are NowAction engineering targets, not guarantees for every user-created design.

### Runtime payload

Recommended initial target:

```text
core animation runtime ≤ 12 KB gzip
```

The current audited runtime is below this target, leaving room for proper lifecycle, compiled tracks, groups, and scroll-root support.

Optional feature modules should not inflate the core runtime when unused.

### Animation frame work

Recommended benchmark target on a defined mid-range mobile test device:

```text
NowAction animation evaluation + commit
≤ 4 ms for a normal 60 Hz frame
```

This leaves browser time for:

- style calculation;
- layout;
- paint;
- compositing;
- input processing.

### JavaScript behavior

- no routine long tasks during scroll;
- no per-frame DOM queries;
- no per-frame keyframe array allocation;
- one animation scheduler per page;
- one authoritative scroll progress read per frame.

### Core Web Vitals goal

A normally optimized exported project should be capable of meeting:

```text
LCP ≤ 2.5 s
INP ≤ 200 ms
CLS ≤ 0.1
```

measured at the 75th percentile.

These are quality goals, not a guarantee for projects containing arbitrarily large media or intentionally expensive effects.

---

## 33. Benchmark Scenes

NowAction needs repeatable benchmark fixtures.

### Scene A — Basic

```text
30 layers
15 animated layers
100 keyframes
transform + opacity only
```

### Scene B — Typical

```text
100 layers
40 maximum simultaneously active
500 keyframes
nested groups
mixed text and shapes
```

### Scene C — Stress

```text
250 layers
100 maximum simultaneously active
2,000 keyframes
nested groups
several moderate effects
```

### Scene D — Paint-heavy

```text
large blur
large translucent surfaces
clipping
multiple overlapping groups
```

### Scene E — Media-heavy

```text
responsive images
custom fonts
video or animated media when supported
```

Run benchmarks on:

- a defined mid-range Android device;
- a recent iPhone class device;
- desktop Chromium;
- desktop Safari or WebKit;
- Firefox.

Do not optimize only against a high-end development computer.

---

## 34. Testing Requirements

### Automated tests

- interpolation correctness;
- forward and reverse scroll;
- jump-to-progress correctness;
- active-range indexing;
- group stacking;
- reduced-motion output;
- destruction and remounting;
- no hierarchy cycles;
- export escaping;
- stable timeline after media load;
- identical editor/export values at sampled progress points.

### Performance tests

Measure:

- runtime initialization;
- frame evaluation duration;
- style commit duration;
- memory growth;
- garbage collection frequency;
- maximum active layer count;
- runtime payload;
- output HTML/CSS size;
- asset payload.

### Visual regression

Capture the same project at:

```text
0%
25%
50%
75%
100%
```

in:

- editor scrub;
- editor preview;
- exported website.

The results must match within defined rendering tolerance.

---

## 35. Current Repository Defect Summary

### Severity: Critical

1. Global progress is recalculated for each global layer.
2. Keyframe arrays are filtered repeatedly per property per frame.
3. Animated X/Y use `left` and `top` in export.
4. Width and height can be written every frame.
5. `display: none` outside a range can destabilize layout and scroll height.
6. Layout reads and style writes may be interleaved.
7. User text is inserted into exported HTML without proper escaping.
8. Export omits `rangeStart` and `rangeEnd` from the animation manifest.
9. The runtime is hard-coded to window/document scrolling.
10. Transform state can be overwritten rather than composed.

### Severity: High

11. Every global layer remains active.
12. No last-rendered-value cache exists.
13. No precompiled property-track format exists.
14. IntersectionObserver entry lookup uses a linear search.
15. IntersectionObserver is not disconnected during destroy.
16. The combined export duplicates runtime code inline.
17. Repeated inline styles increase output size.
18. No reduced-motion export policy exists.
19. No media optimization pipeline exists.
20. No stable initial animation-state generation exists.

### Severity: Medium

21. No performance-report model exists.
22. No runtime pause/resume lifecycle exists.
23. No standardized benchmark suite exists.
24. No native scroll-timeline progressive-enhancement path exists.
25. No compiler property-cost metadata exists.
26. No export schema versioning is defined.

---

## 36. Recommended Implementation Phases

### Phase 1 — Correctness and security

- configurable scroll root;
- include active ranges in export;
- escape user text and attributes;
- replace `display: none`;
- centralize transform composition;
- implement complete destroy lifecycle.

### Phase 2 — Compile once

- introduce Export IR;
- compile sparse keyframes into property tracks;
- cache easing IDs;
- validate and normalize all numeric values;
- remove per-frame array filtering.

### Phase 3 — Efficient frame loop

- read scroll state once;
- maintain active layer set;
- separate reads and writes;
- use transforms for movement;
- cache last rendered values;
- eliminate avoidable hot-loop allocations.

### Phase 4 — Production export

- external cacheable runtime;
- shared stylesheet;
- optimized manifest;
- production ZIP as preferred format;
- initial-state CSS;
- reduced-motion output.

### Phase 5 — Assets and diagnostics

- image pipeline;
- video pipeline;
- font optimization;
- performance report;
- compiler warnings;
- benchmark automation.

### Phase 6 — Progressive enhancement

- compile compatible tracks to native scroll-driven CSS;
- retain JavaScript fallback;
- compare native and fallback visual output.

---

## 37. Non-Goals for Point 5

This decision does not finalize:

- the editor UI layout;
- timeline panel dimensions;
- toolbar placement;
- mobile navigation;
- exact performance-warning visual design;
- final property inspector design;
- final export dialog design;
- pricing or export limits.

Those should be discussed in the NowAction UI redesign.

---

## 38. Acceptance Criteria

Point 5 is correctly implemented when:

1. Export never includes editor application code.
2. Export runs from a normalized, validated Export IR.
3. Global scroll progress is read once per frame.
4. Keyframe tracks are compiled before the frame loop.
5. The frame loop creates no avoidable temporary arrays.
6. Animated movement uses transform rather than `left` and `top`.
7. Fast-path properties are separated from expensive properties.
8. Inactive timeline ranges are not fully evaluated.
9. Scrolling backward and jumping progress remain correct.
10. Style writes occur only when values change.
11. Layout reads are batched before style writes.
12. Scroll root is configurable.
13. All observers and listeners are released on destroy.
14. User text and attributes are safely escaped.
15. Initial animation state is present before runtime initialization.
16. Reduced-motion output preserves content access.
17. Production export uses cacheable shared runtime and CSS.
18. Media dimensions are reserved before loading.
19. The compiler generates a performance report.
20. Editor scrub, editor preview, and export match at sampled progress positions.
21. Benchmarks run on defined mobile and desktop targets.
22. The architecture can add native CSS scroll timelines without creating a second authoring model.

---

## 39. Final Architecture Statement

> NowAction websites are generated by a dedicated export compiler, not by serializing the editor DOM. The compiler produces a validated and optimized representation, a small shared runtime, stable initial CSS, and optimized assets. The runtime reads scroll progress once per frame, evaluates only active compiled tracks, batches reads and writes, caches committed values, and uses transform and opacity as its fast path. Expensive properties remain possible but are explicitly classified and reported. Website weight is controlled through runtime budgets, active-layer indexing, asset optimization, secure generation, and repeatable mobile performance tests.

---

## 40. External Technical References

- W3C Scroll-driven Animations specification:  
  https://www.w3.org/TR/scroll-animations-1/

- W3C current Scroll-driven Animations draft:  
  https://drafts.csswg.org/scroll-animations-1/

- web.dev high-performance animation guidance:  
  https://web.dev/articles/animations-guide

- web.dev Core Web Vitals:  
  https://web.dev/articles/vitals

- MDN Intersection Observer API:  
  https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

- MDN performance fundamentals:  
  https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Fundamentals
