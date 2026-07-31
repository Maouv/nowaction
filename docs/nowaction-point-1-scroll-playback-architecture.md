# NowAction Architecture Decision — Point 1  
## Scroll-Based Playback, Stable Timeline, Document Size, and Background

**Status:** Approved for implementation planning  
**Product:** NowAction  
**Core direction:** A mobile-first website builder with an editing experience inspired by Alight Motion.

---

## 1. Core Product Decision

NowAction does **not** use elapsed time as the primary playback domain.

The project timeline represents the user's journey from the top of the website to the bottom of the website:

```text
Timeline start = top of the website
Timeline end   = bottom of the website
```

The visitor's real scroll position becomes the playhead.

```text
scroll position → normalized progress → animated object properties
```

The normalized progress is:

```js
progress = scrollTop / maxScroll;
```

Where:

```js
maxScroll = scrollHeight - viewportHeight;
```

The normalized value is clamped to the range `0..1`.

---

## 2. Meaning of the Play Button

The **Play** button exists only inside the NowAction editor as a preview tool.

When Play is pressed:

1. The preview begins from the current playhead position, or from the top when explicitly restarted.
2. The internal website document scrolls automatically.
3. The playhead follows the generated scroll position.
4. Every object's animation is evaluated from the same normalized scroll progress.
5. Playback ends when the preview reaches the bottom of the website.

The exported website does **not** need to autoplay.

On the exported website:

```text
visitor scroll → playhead progress → animation rendering
```

The visitor may:

- scroll slowly;
- scroll quickly;
- stop;
- reverse direction;
- jump to a different position.

The animation must always represent the current scroll position and must not depend on how long the visitor has been on the page.

---

## 3. Preview Speed Is Not Project Time

Auto-scroll speed in the editor is a preview preference, not project data.

Recommended editor controls:

```text
0.5×
1×
1.5×
2×
```

An implementation may use pixels per second:

```js
previewScrollTop += previewSpeedPxPerSecond * deltaSeconds;
```

A taller website therefore takes longer to preview from beginning to end.

Changing preview speed must not modify:

- object bars;
- keyframes;
- scroll progress;
- exported behavior;
- project layout.

---

## 4. Stable Timeline Rule

Object bars and keyframes are stored using normalized scroll progress:

```text
0.0 = beginning of the website journey
1.0 = end of the website journey
```

Example:

```js
object.timeline = {
  start: 0.20,
  end: 0.60
};

object.keyframes = [
  { position: 0.20, opacity: 0 },
  { position: 0.30, opacity: 1 }
];
```

### Approved behavior

When the website height changes:

- bars do not move automatically;
- keyframes do not move automatically;
- object timeline ranges remain unchanged;
- only the pixel position represented by a percentage changes.

Example:

```text
Before:
maxScroll = 4,000 px
20%       = 800 px

After:
maxScroll = 8,000 px
20%       = 1,600 px
```

The keyframe remains at `20%`.

This behavior intentionally gives the user full control. NowAction must not assume that an animation should follow an object's layout position.

---

## 5. Layout Position and Timeline Position Are Independent

Each object has at least two independent coordinate systems.

### Layout coordinates

These determine where the object exists inside the website document.

```js
layout: {
  x: 20,
  y: 1600,
  width: 300,
  height: 200
}
```

### Timeline coordinates

These determine where the object's bar and keyframes exist in the scroll timeline.

```js
timeline: {
  start: 0.20,
  end: 0.60
}
```

Moving an object in the website must not automatically move its bar or keyframes.

Moving a bar or keyframe must not automatically change the object's layout position.

Potential convenience commands may be added later, but they must be explicit user actions:

- Snap bar to the object's current viewport position.
- Move bar to the current playhead.
- Create animation near object entry.
- Align selected bars.

These must never run automatically.

---

## 6. Fixed Editor Viewport

The editor uses a fixed mobile viewport.

```text
Editor shell
└── Fixed mobile viewport
    └── Scrollable website document
```

The viewport itself must not behave like an infinite canvas.

### Allowed

- Vertical scrolling of the website document.
- Optional viewport zoom for inspection.
- Timeline scrubbing.
- Object editing inside the document.

### Not the primary behavior

- Panning the whole canvas freely in every direction.
- Moving the device viewport horizontally and vertically as the main navigation model.
- Treating the project as a desktop-sized infinite artboard.

Recommended structure:

```html
<div class="editor-stage">
  <div class="device-viewport">
    <div class="website-scroll-root">
      <div class="website-document">
        <!-- user objects -->
      </div>
    </div>
  </div>
</div>
```

---

## 7. Scroll Root Must Be Configurable

The editor and exported website use different scroll roots.

### In the editor

```js
scrollRoot = previewViewport;
```

Use:

```js
scrollRoot.scrollTop
scrollRoot.scrollHeight
scrollRoot.clientHeight
```

### In the exported website

```js
scrollRoot = document.scrollingElement;
```

The animation runtime must not permanently depend on:

```js
window.scrollY
document.documentElement.scrollHeight
window.innerHeight
```

Recommended API:

```js
ScrollEngine.init(animationManifest, {
  root: previewDocument,
  scrollRoot: previewViewport
});
```

---

## 8. Avoid Circular Layout Dependencies

A dangerous architecture would calculate progress from the live document height while the same animation changes that height.

Problem:

```text
animation changes height
→ document scroll height changes
→ progress changes
→ animation changes again
→ unstable feedback loop
```

The implementation must separate:

```text
layout space
from
visual animation
```

### Safe default animation properties

- translate X/Y;
- scale;
- rotation;
- opacity.

### Higher-risk animation properties

- width;
- height;
- top;
- left;
- display;
- properties that change document flow;
- large blur;
- large shadows;
- backdrop filters.

Layout-changing animation may be supported later, but it must not unpredictably redefine the scroll domain during evaluation.

Possible solutions include:

- stable wrappers;
- reserved layout space;
- explicit document height;
- recalculation only after editing operations;
- avoiding layout measurement on every animation frame.

---

## 9. Document Size

NowAction projects need an explicit document model.

Recommended initial structure:

```js
project.document = {
  designWidth: 390,
  heightMode: "auto", // "auto" | "custom"
  customHeight: null,
  bottomPadding: 0
};
```

### Auto height

The document height is derived from the lowest object boundary, with a minimum equal to the viewport height.

```js
documentHeight = Math.max(
  viewportHeight,
  lowestObjectBottom + bottomPadding
);
```

This value should be recalculated when the user changes layout, not continuously because of visual animation.

### Custom height

The user may set an explicit height:

```text
3,000 px
5,000 px
8,000 px
```

For the initial architecture, pixels should be the internal storage unit.

The editor may support more user-facing units later, but the engine requires a predictable scroll space.

---

## 10. Responsive Width

The design viewport may use a reference width such as:

```text
390 px
```

This width is an editor design reference, not a fixed exported body width.

Do not export:

```css
body {
  width: 390px;
}
```

The exported website should remain responsive:

```css
.website-document {
  width: 100%;
}
```

Object layout and responsive behavior may later require constraints or breakpoints, but the mobile design viewport remains the primary authoring context.

---

## 11. Project Background

Every project has a built-in Project Background.

Recommended initial state:

```js
project.background = {
  type: "color",
  value: "#ffffff"
};
```

The Project Background:

- automatically covers the full document;
- follows document width and height;
- is not a normal object;
- does not create a timeline bar;
- cannot be grouped;
- does not require layout coordinates;
- always remains behind all user-created objects;
- can be changed by the user;
- may support transparency.

Recommended initial options:

- solid color;
- transparent.

Gradient and image backgrounds may be added later.

---

## 12. Custom-Sized Backgrounds Are Normal Objects

The Project Background cannot have an independent width or height.

If the user needs a background-like area with custom dimensions, they create a regular object such as a rectangle.

That object follows the normal rule:

```text
one object = one timeline bar
```

Example:

```js
{
  id: "object-24",
  type: "rectangle",

  layout: {
    x: 0,
    y: 0,
    width: 390,
    height: 1200
  },

  timeline: {
    start: 0,
    end: 1
  }
}
```

The user may name it anything.

NowAction must not infer that the object is a hero background, section background, card background, or any other semantic role.

---

## 13. Scroll Distance Beyond Visible Layout

The initial implementation may define the scroll journey from document top to document bottom.

However, the architecture must not prevent future pinned or sticky scenes.

A future project may require:

```text
the viewport appears stationary
while scroll progress continues
```

This can be achieved later through:

- sticky objects or groups;
- reserved scroll distance;
- scene pinning;
- additional virtual scroll space.

This feature is not required for the first implementation, but the engine must avoid assuming that every unit of progress always creates an equal visible page displacement.

---

## 14. Runtime Performance Principles

The exported runtime should:

- use one global scroll listener;
- schedule rendering through `requestAnimationFrame`;
- calculate one shared progress value;
- evaluate only relevant animation tracks;
- avoid one animation loop per object;
- prefer transforms and opacity;
- pause unnecessary work when the document is hidden;
- support `prefers-reduced-motion`;
- avoid exporting editor-only code.

Potential future optimization:

```text
native CSS scroll-driven animation
with
JavaScript fallback
```

The first implementation may remain JavaScript-based as long as the runtime stays small and centralized.

---

## 15. Persistence Requirements

Project-level data must be persisted, including:

```js
{
  viewport,
  document,
  background,
  objectTimelineData,
  keyframes
}
```

At minimum:

```js
project = {
  viewport: {
    width: 390,
    height: 844
  },

  document: {
    heightMode: "auto",
    customHeight: null,
    bottomPadding: 0
  },

  background: {
    type: "color",
    value: "#ffffff"
  }
};
```

The editor and server must use the same schema. Saving and reopening a project must preserve the exact scroll domain and timeline data.

---

## 16. Export Manifest Requirements

Every animated object exported from NowAction must preserve:

```js
{
  id,
  rangeStart,
  rangeEnd,
  keyframes,
  animationProperties
}
```

Timeline trim values must not be discarded during export.

The exported runtime must evaluate the same normalized timeline ranges shown in the editor.

---

## 17. Non-Goals for Point 1

This decision does not define:

- the final layer-panel UI;
- grouping UX;
- object naming behavior;
- nested layer visualization;
- responsive layout constraints;
- breakpoints;
- component systems;
- object parenting behavior;
- the complete keyframe-property UI.

Those belong to later architecture decisions.

---

## 18. Acceptance Criteria

Point 1 is considered correctly implemented when all of the following are true:

1. The fixed mobile preview contains its own vertical scroll root.
2. Manual preview scrolling moves the global playhead.
3. Scrubbing the playhead moves the preview scroll position.
4. Play performs editor-only auto-scroll from the current position to the bottom.
5. Preview playback speed does not alter project data.
6. The exported website is driven by the visitor's real scroll.
7. Object bars and keyframes remain at the same normalized positions when document height changes.
8. Moving an object does not move its timeline data.
9. Project Background always covers the entire website.
10. Custom-sized backgrounds are regular objects with regular bars.
11. Timeline ranges survive save, reload, and export.
12. The runtime can use an internal editor scroll root or the exported document scroll root.
13. Visual animation does not continuously destabilize the document's scroll height.
14. A website with no user-created background object still exports with a valid background.

---

## 19. Final Architecture Statement

> NowAction uses normalized scroll progress as its global playback domain. The website's top and bottom define the initial journey, while the visitor's current scroll position acts as the playhead. Object layout and object timeline positions are independent. Bars and keyframes never move automatically when layout or document height changes. The editor provides auto-scroll only for preview. Every project has a built-in full-document background, while custom-sized backgrounds remain ordinary user-created objects.
