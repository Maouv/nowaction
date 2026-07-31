# NowAction Architecture Decision — Point 3
## Fixed Mobile Viewport and Internal Website Scrolling

**Status:** Approved for initial implementation planning  
**Product:** NowAction  
**Backlog:** Dedicated Preview Pan & Zoom inspection mode

---

## 1. Core Product Rule

NowAction uses a fixed mobile preview frame.

The preview frame itself is not navigated like an infinite canvas. The website document inside the frame is the primary vertical scroll surface.

```text
editor workspace
└── fixed mobile preview frame
    └── vertically scrollable website document
```

Primary behavior:

```text
frame remains fixed
website document scrolls vertically
scroll position drives the global playhead
```

The project must not use free canvas panning as its default navigation model.

---

## 2. Required DOM Structure

Recommended structure:

```html
<div class="editor-workspace">
  <div class="preview-frame">
    <div class="website-scroll-root">
      <div class="website-document">
        <div class="project-background"></div>
        <div class="project-layer-root"></div>
      </div>
    </div>

    <div class="editor-selection-overlay"></div>
  </div>
</div>
```

Responsibilities:

### `editor-workspace`

- positions the mobile preview inside the NowAction editor;
- owns editor chrome and available screen space;
- is never exported.

### `preview-frame`

- represents the current device viewport;
- clips the actual website rendering at the viewport boundary;
- remains fixed during normal editing and playback.

### `website-scroll-root`

- is the editor preview's vertical scroll container;
- provides `scrollTop`, `scrollHeight`, and `clientHeight`;
- drives the global normalized scroll progress.

### `website-document`

- contains the project background and user-created layers;
- owns project document coordinates;
- may be taller than the preview frame.

### `editor-selection-overlay`

- contains editor-only outlines, handles, labels, and interaction affordances;
- is not part of the exported website.

---

## 3. Baseline CSS Behavior

```css
.editor-workspace {
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.preview-frame {
  position: relative;
  overflow: hidden;
}

.website-scroll-root {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
}

.website-document {
  position: relative;
  width: 100%;
  min-height: 100%;
}
```

The exact dimensions are determined by the active project viewport preset.

---

## 4. Three Independent Coordinate Spaces

NowAction must keep three coordinate systems separate.

### 4.1 Editor workspace coordinates

These determine where the preview is displayed inside the NowAction interface.

Examples:

- frame position inside the editor;
- fit-to-screen scale;
- editor-only inspection offset.

These coordinates are not project content and are not exported.

### 4.2 Website document coordinates

These determine where an object exists in the website.

```js
layer.layout = {
  x: 24,
  y: 1600,
  width: 300,
  height: 200
};
```

These coordinates are persisted and exported.

### 4.3 Scroll timeline coordinates

These determine where bars and keyframes exist in the normalized scroll timeline.

```js
layer.timeline = {
  start: 0.20,
  end: 0.70
};
```

Rules:

```text
editor display scaling does not change document layout
document scrolling does not move the preview frame
moving an object does not move its timeline bar
moving a timeline bar does not move the object's layout position
```

---

## 5. Logical Viewport and Displayed Viewport

A project may use a logical viewport such as:

```text
390 × 844
```

The editor may display it at a smaller scale when the device screen cannot fit the full logical viewport together with the timeline and toolbar.

Example:

```text
logical viewport: 390 × 844
display scale:    0.70
displayed size:   273 × 591
```

Recommended project data:

```js
project.viewport = {
  designWidth: 390,
  designHeight: 844
};
```

Recommended editor-only state:

```js
editorPreview = {
  scaleMode: "fit",
  displayScale: 0.70
};
```

The display scale must not be exported or used to rewrite project coordinates.

---

## 6. Pointer Coordinate Conversion

When the preview is displayed at a scale other than `1`, pointer coordinates must be converted into logical document coordinates.

Conceptual conversion:

```js
const frameRect = previewFrame.getBoundingClientRect();

const viewportX =
  (event.clientX - frameRect.left) / editorDisplayScale;

const viewportY =
  (event.clientY - frameRect.top) / editorDisplayScale;

const documentX = viewportX;
const documentY = viewportY + websiteScrollRoot.scrollTop;
```

The implementation must also account for any editor-only inspection transform if that feature is added later.

Directly storing `event.clientX` or `event.clientY` as project coordinates is invalid.

---

## 7. Horizontal Overflow Policy

The website preview does not provide horizontal scrolling by default.

```css
.website-scroll-root {
  overflow-x: hidden;
}
```

However, user-created layers may exist partially outside the logical viewport.

Example:

```js
layer.layout = {
  x: -60,
  width: 200
};
```

This is valid for effects such as entering from outside the screen.

Rules:

- off-screen layers must not enlarge document width;
- off-screen layers must not create a horizontal scrollbar;
- the document width follows the logical viewport width;
- viewport clipping must match exported behavior.

The project document height may grow, but its width must not be calculated from the farthest horizontal object bounds.

---

## 8. Editing and Scrolling Gestures

### Gesture on empty preview space

A vertical drag scrolls the website document.

```text
finger moves upward
→ website scrolls downward
→ global playhead advances
```

### Gesture on a selectable layer

A drag edits the selected layer according to the active transform tool.

```text
drag selected object
→ object layout changes
→ scroll position remains unchanged
```

### Gesture on a transform handle

The handle owns the gesture and may prevent native scrolling.

Recommended touch-action separation:

```css
.website-scroll-root {
  touch-action: pan-y;
}

.layer-transform-handle {
  touch-action: none;
}
```

Do not call `preventDefault()` for every touch event in the preview.

Only capture pointer interaction when the user clearly begins an object or handle operation.

---

## 9. Editing Mode

Editing Mode is the default authoring mode.

Behavior:

- the preview frame remains fixed;
- the internal website document can scroll vertically;
- user-created layers can be selected and transformed;
- selection handles are visible;
- horizontal canvas panning is unavailable;
- free infinite-canvas navigation is unavailable;
- manual scrolling updates the global playhead;
- object editing does not automatically change timeline bars.

---

## 10. Preview Mode

Preview Mode represents the behavior of the exported website.

Behavior:

- the preview frame remains fixed;
- selection outlines and handles are hidden;
- layer editing is disabled;
- manual website scrolling drives the playhead;
- editor Play performs auto-scroll;
- animation output should match export;
- the user can stop, reverse, or manually scrub the scroll position.

The editor shell remains outside the preview and must never be included in the export.

---

## 11. Selection and Navigation Must Be Separate

Selecting a timeline bar must not automatically scroll the website.

```text
tap layer bar
→ select layer
→ preserve current scroll and playhead
```

A separate explicit command may navigate to the layer:

```text
Focus Layer
```

Conceptual behavior:

```js
function focusLayer(layer) {
  websiteScrollRoot.scrollTo({
    top: calculateLayerFocusScroll(layer),
    behavior: "smooth"
  });
}
```

This separation prevents selection from unexpectedly changing the animation state.

---

## 12. Selecting Overlapping or Off-Screen Layers

The active timeline scope remains the reliable way to select layers even when:

- a layer is outside the current viewport;
- a layer is covered by another layer;
- a layer is partially clipped;
- a group outside the current scope is dimmed.

A viewport tap selects the frontmost eligible layer.

An alternate selection interaction, defined in Point 2, must allow access to covered layers.

Selecting an off-screen timeline bar does not move the viewport until the user invokes an explicit focus action.

---

## 13. Selection Overlay and Viewport Clipping

Actual website pixels are clipped by the mobile preview frame.

Editor controls may be drawn in a separate overlay so they remain usable near viewport boundaries.

Rules:

- exported content is clipped exactly at the viewport;
- editor-only handles may extend beyond the content boundary when necessary;
- editor-only handles are never exported;
- handles must still map to the correct logical project coordinates.

The selection overlay must not become the scroll root.

---

## 14. No Automatic Scroll While Dragging in the Initial Version

Automatic edge scrolling during object drag is deferred.

Reason:

```text
auto-scroll changes playhead
→ animation state changes
→ selected object's evaluated visual position may change
→ object can detach from the pointer
```

Initial behavior:

1. user releases the layer;
2. user scrolls the document;
3. user continues editing.

A future implementation may support drag auto-scroll only after defining how animation evaluation is frozen or compensated during the gesture.

---

## 15. Scroll Chaining and Overscroll

The preview should not unintentionally scroll the NowAction page when the internal document reaches its top or bottom.

```css
.website-scroll-root {
  overscroll-behavior: contain;
}
```

Normalized progress must always be clamped:

```js
const maxScroll =
  websiteScrollRoot.scrollHeight -
  websiteScrollRoot.clientHeight;

const progress =
  maxScroll <= 0
    ? 0
    : Math.max(
        0,
        Math.min(
          1,
          websiteScrollRoot.scrollTop / maxScroll
        )
      );
```

This protects the runtime against elastic or negative overscroll behavior.

---

## 16. Different Visitor Viewport Heights

The editor uses a design reference viewport, but exported websites may be opened on devices with different viewport dimensions.

Examples:

```text
360 × 740
390 × 844
412 × 915
tablet
desktop browser
```

The exported scroll progress must use the actual visitor scroll root:

```js
maxScroll =
  actualDocumentHeight -
  actualViewportHeight;
```

Consequences:

- the same normalized keyframe remains at the same timeline percentage;
- its exact pixel scroll position may differ across devices;
- the exported website must not force every visitor into the editor's design height.

Device preview presets may be added so users can test multiple viewport dimensions.

---

## 17. Background Separation

NowAction must distinguish three background concepts.

### Editor workspace background

- surrounds the mobile preview;
- belongs only to the NowAction interface;
- is not exported;
- has no layer bar.

### Project Background

- defined in Point 1;
- automatically covers the full website document;
- is exported;
- has no layer bar.

### User-created background layer

- is a normal rectangle, image, or other user-created layer;
- has one layer bar;
- follows normal stacking and grouping rules;
- may be animated.

These three backgrounds must not share state or rendering responsibilities.

---

## 18. Repository Migration Requirements

The current NowAction architecture uses an infinite-canvas model with state such as:

```js
panX
panY
scale
canvasWorld
```

and applies a world transform similar to:

```js
canvasWorld.style.transform =
  `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
```

This model must not remain the primary preview navigation system.

Migration target:

```text
canvasWorld + panX/panY
```

becomes:

```text
fixed preview frame
+ internal website scroll root
+ editor-only display scale
```

Required changes include:

- removing background-drag canvas panning from the default mode;
- removing unconditional touch-event prevention;
- assigning vertical native scrolling to the internal preview;
- changing the default project viewport from desktop artboard assumptions to mobile viewport data;
- separating editor display scale from project layout;
- adapting hit testing to scaled preview coordinates;
- ensuring export uses the website document rather than the editor canvas transform.

---

## 19. Recommended State Separation

### Project data

```js
project = {
  viewport: {
    designWidth: 390,
    designHeight: 844
  },

  document: {
    heightMode: "auto",
    customHeight: null
  }
};
```

### Editor-only state

```js
editorState = {
  interactionMode: "edit",
  previewScaleMode: "fit",
  previewDisplayScale: 0.75
};
```

### Playback state

```js
playbackState = {
  scrollProgress: 0,
  isPlaying: false,
  previewSpeed: 1
};
```

Do not reuse a single `scale`, `panX`, or `panY` value for all three concerns.

---

## 20. Backlog — Dedicated Preview Pan & Zoom Mode

A dedicated inspection-only Pan & Zoom mode is deferred.

The future mode may allow:

- zooming the displayed preview;
- panning the displayed preview when zoomed;
- resetting to Fit;
- inspecting details without editing layer coordinates.

Strict requirements for the future feature:

- it is a separate explicit mode;
- it is not active by default;
- it does not change object layout;
- it does not change website scroll progress;
- it does not move timeline bars or keyframes;
- it is not persisted as project content;
- it is not exported;
- pointer conversion includes its inspection transform;
- a clear reset control is provided.

Until this backlog item is implemented, the preview remains fixed and may only use automatic Fit scaling.

---

## 21. Additional Backlog Items

The following are intentionally deferred:

- drag-edge auto-scroll;
- sticky layers;
- fixed-position user layers;
- pinned scroll scenes;
- multiple breakpoint previews;
- orientation switching;
- custom viewport presets;
- simultaneous two-finger inspection gestures;
- editor minimap;
- detached external preview window.

These features must build on the fixed-frame and internal-scroll-root architecture rather than reintroducing a global infinite canvas.

---

## 22. Acceptance Criteria

Point 3 is correctly implemented when:

1. The mobile preview frame remains fixed during normal editing.
2. The website document inside the frame is the vertical scroll root.
3. Horizontal website scrolling is disabled.
4. Objects may extend horizontally off-screen without enlarging document width.
5. Manual preview scrolling updates the global playhead.
6. Dragging a selected object changes layout without panning the entire canvas.
7. Empty-space vertical gestures scroll the website.
8. Touch handling does not disable native vertical scrolling globally.
9. Editor display scaling does not alter project coordinates.
10. Pointer hit testing remains accurate when the preview is fit-scaled.
11. Selecting a timeline bar does not automatically navigate the preview.
12. An explicit Focus Layer action may navigate to a selected object.
13. The preview contains editor-only selection controls that are not exported.
14. Scroll chaining into the surrounding editor is contained.
15. Export uses the visitor's actual scroll root and viewport height.
16. `panX`, `panY`, and the infinite canvas are no longer the primary navigation model.
17. Pan & Zoom inspection remains a backlog feature and is not partially mixed into the initial implementation.

---

## 23. Final Architecture Statement

> NowAction uses a fixed mobile preview frame containing a vertically scrollable website document. The frame itself is not navigated like an infinite canvas. Website scroll, project layout, and editor display scaling are independent systems. Empty-space gestures scroll the document, object gestures edit layers, horizontal overflow is clipped, and manual scroll drives playback. A dedicated inspection-only Pan & Zoom mode is deferred to the backlog.
