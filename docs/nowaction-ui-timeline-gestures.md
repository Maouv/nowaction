# NowAction UI Architecture — Timeline Gestures and Mobile Interaction

**Status:** Draft approved direction  
**Product:** NowAction  
**Reference viewport:** `390 × 844 CSS px`  
**Scope:** Timeline selection, scrubbing, zooming, panning, layer reorder, bar movement, trimming, keyframe movement, grouping selection, and touch-conflict prevention

---

# 1. Core Interaction Model

The NowAction timeline has two independent axes:

```text
vertical axis   = layer stacking and layer-list navigation
horizontal axis = normalized website scroll progress
```

The global horizontal domain is always:

```text
0.0 → 1.0
0%  → 100%
top of website → bottom of website
```

The top sibling row renders visually in front of lower sibling rows.

The timeline is not a video-time editor. Horizontal positions represent website scroll progress.

---

# 2. Timeline Anatomy

Reference layout:

```text
┌──────────────────────────────────────┐
│ ◀          ▶/❚❚          ▶     42% │  48 transport
├────────────┬─────────────────────────┤
│            │ 0%       50%       100%│  28 ruler
├────────────┼─────────────────────────┤
│ grip ○ A   │      █████████          │  48 row
│ grip □ B   │ █████████████████       │  48 row
│ grip T C   │          █████████      │  48 row
└────────────┴─────────────────────────┘
```

Reference measurements:

```css
--transport-height: 48px;
--timeline-ruler-height: 28px;
--timeline-row-height: 48px;
--layer-column-width: clamp(104px, 30vw, 120px);
--bar-visual-height: 30px;
--minimum-touch-target: 48px;
```

The left layer column remains fixed while the timeline track can be horizontally panned when zoomed.

Vertical scrolling of the layer list keeps the left column and track rows synchronized.

---

# 3. Authoritative Data Model

Layer timeline ranges and keyframes use global normalized positions.

```js
layer.timeline = {
  start: 0.20,
  end: 0.70
};

layer.tracks = {
  "transform.x": {
    keyframes: [
      {
        id: "kf-a",
        at: 0.25,
        value: 20,
        easingToNext: {
          type: "cubic-bezier",
          x1: 0.22,
          y1: 1,
          x2: 0.36,
          y2: 1
        }
      },

      {
        id: "kf-b",
        at: 0.55,
        value: 240
      }
    ]
  }
};
```

Keyframe positions are global, not relative to the current layer bar.

This allows:

- non-destructive trimming;
- stable keyframe positions;
- explicit bar movement;
- consistent global playhead calculations;
- predictable easing segments.

Do not store keyframes only as:

```js
p: 0..100 relative to rangeStart/rangeEnd
```

because trimming the range would implicitly move or retime every keyframe.

---

# 4. Timeline View State

Timeline display state is editor-only.

```js
timelineView = {
  zoom: 1,
  visibleStart: 0,
  visibleEnd: 1,
  verticalScrollTop: 0,

  selectedLayerIds: new Set(),
  primaryLayerId: null,

  selectedKeyframeIds: new Set(),
  primaryKeyframeId: null,

  activeGesture: null
};
```

Do not persist timeline zoom or scroll position as project content unless a future workspace-restoration feature explicitly needs it.

Project data remains independent from UI navigation state.

---

# 5. Horizontal Coordinate Conversion

Every horizontal timeline interaction must use one conversion function.

```js
function clientXToProgress(clientX, trackRect, view) {
  const ratio =
    (clientX - trackRect.left) /
    trackRect.width;

  return clamp01(
    view.visibleStart +
    ratio * (view.visibleEnd - view.visibleStart)
  );
}
```

Reverse conversion:

```js
function progressToClientX(progress, trackRect, view) {
  const local =
    (progress - view.visibleStart) /
    (view.visibleEnd - view.visibleStart);

  return trackRect.left +
    local * trackRect.width;
}
```

Do not copy independent coordinate calculations into ruler, bars, handles, keyframes, and playhead code.

---

# 6. Gesture Priority

When gesture regions overlap, use this priority:

```text
1. Keyframe diamond
2. Bar trim handle
3. Bar body
4. Reorder grip
5. Playhead handle
6. Timeline ruler
7. Empty timeline track
8. Layer-list background
```

A pointer interaction is owned by the highest-priority eligible target beneath the pointer.

Once a drag begins, ownership does not switch to another operation.

---

# 7. Gesture Recognition Thresholds

Recommended initial thresholds:

```js
gestureThresholds = {
  tapMaxDurationMs: 250,
  tapMaxMovementPx: 6,

  longPressMs: 450,
  longPressMaxMovementPx: 8,

  dragStartPx: 6,
  axisLockPx: 8
};
```

Rules:

- movement beyond the long-press tolerance cancels long press;
- a drag must not emit a click afterward;
- once axis-locked, minor movement on the other axis is ignored;
- `pointercancel` must safely end or roll back the operation.

Optional haptic feedback:

```text
long-press selection: short pulse
snap event: very short pulse
bar boundary reached: short pulse
```

Use haptics only when supported and never require them for understanding the UI.

---

# 8. Pointer Capture and Gesture Transactions

Every editable drag uses pointer capture.

```js
target.setPointerCapture(event.pointerId);
```

A drag transaction stores:

```js
activeGesture = {
  type: "move-bar",
  pointerId,
  layerId,
  startClientX,
  originalTimeline,
  originalKeyframes,
  previewTimeline,
  didMove: false
};
```

During pointer movement:

- update in-memory preview state;
- patch only affected DOM elements;
- do not rebuild the complete timeline;
- do not write to local storage;
- do not make a server request.

On `pointerup`:

- validate and commit one project mutation;
- save once;
- clear the transaction.

On `pointercancel`:

- restore the original values;
- clear the transaction.

This applies even though NowAction has no visible Undo/Redo controls.

---

# 9. Scrubbing the Global Playhead

The ruler is the dedicated scrub surface.

```text
tap ruler
→ move playhead to tapped progress
→ scroll preview website to matching position
```

```text
drag ruler/playhead
→ continuously update playhead
→ continuously update preview scroll
→ evaluate all active animation tracks
```

Ruler behavior must not move bars or keyframes.

The playhead has:

```text
visual line: 2 px
invisible horizontal hit target: 24 px
ruler touch height: full 28 px
```

While scrubbing:

- auto-play stops;
- the website scroll position follows the playhead;
- programmatic scroll must not feed back into a second scrub transaction;
- the progress text updates without rebuilding timeline rows.

---

# 10. Website Scroll and Timeline Synchronization

Outside an active ruler scrub:

```text
manual website scroll
→ updates playhead
```

During an active ruler scrub:

```text
playhead
→ controls website scroll
```

Use an explicit synchronization source:

```js
playbackState.controlSource =
  "website-scroll" |
  "timeline-scrub" |
  "editor-play";
```

This prevents feedback loops.

Bar edits, keyframe edits, and layer reordering must not change website scroll position.

---

# 11. Transport Controls

Transport row remains simple:

```text
[previous marker] [play/pause] [next marker] [progress value]
```

### Previous marker

Moves the playhead to the previous relevant keyframe or layer boundary.

### Next marker

Moves the playhead to the next relevant keyframe or layer boundary.

Priority for relevant markers:

1. keyframes in the active property editor;
2. keyframes of the primary selected layer;
3. bar start/end of the primary selected layer;
4. project boundaries.

### Play

Editor-only auto-scroll from current progress toward `100%`.

Playback speed is based on preview scroll speed, not project duration.

---

# 12. Timeline Zoom

The timeline supports horizontal zoom.

```text
zoom = 1
→ full 0–100% is visible

zoom > 1
→ a smaller progress interval is visible
```

Recommended range:

```js
minZoom = 1;
maxZoom = 16;
```

Visible span:

```js
visibleSpan = 1 / zoom;
```

At `zoom = 4`, approximately 25% of the timeline is visible.

---

# 13. Pinch-to-Zoom

Pinch within the ruler or timeline-track area changes horizontal zoom.

The progress beneath the pinch midpoint remains anchored.

Conceptual calculation:

```js
anchorProgress =
  clientXToProgress(
    pinchMidpointX,
    trackRect,
    oldView
  );
```

After applying the new zoom:

```text
anchorProgress remains beneath the same midpoint
```

Pinch zoom must not:

- resize layer rows;
- zoom the website preview;
- move bars;
- change project data;
- change playhead progress.

The left layer-name column remains fixed.

---

# 14. Timeline Horizontal Pan

Horizontal panning is available only when:

```text
zoom > 1
```

Gesture:

```text
horizontal drag on empty track area
→ pan the visible timeline interval
```

Panning does not change:

- playhead progress;
- website scroll;
- layer bars;
- keyframes;
- project data.

Clamp:

```text
visibleStart ≥ 0
visibleEnd ≤ 1
```

When zoom is `1`, horizontal panning is disabled because the complete timeline is already visible.

---

# 15. Direction Lock on Empty Timeline Areas

The track supports both vertical row scrolling and horizontal timeline panning.

Use direction locking:

```text
mostly vertical movement
→ vertical layer-list scroll

mostly horizontal movement
→ horizontal timeline pan
```

Suggested rule after `8px` movement:

```js
if (abs(dx) > abs(dy) * 1.2) {
  lock = "horizontal";
} else if (abs(dy) > abs(dx) * 1.2) {
  lock = "vertical";
}
```

Until direction is clear, do not commit either navigation.

The left layer-name column always treats vertical dragging as layer-list scroll unless the dedicated reorder grip owns the gesture.

---

# 16. Tap Selection

Tap any part of a normal layer row:

```text
select that layer
exit multi-selection if appropriate
show single-layer contextual property dock
```

Tap a group row:

```text
select group
```

A dedicated group-enter icon in the layer column opens its child scope.

Single tap must not enter a group automatically, because selection and navigation are different actions.

---

# 17. Multi-Selection

Long press a row:

```text
enter multi-selection
select pressed layer
replace Preview/Export with Group/Duplicate/Delete
```

While multi-selection is active:

```text
tap row → toggle its selected state
tap empty layer-list area → preserve selection
tap X in top bar → exit selection mode
```

Initial implementation restrictions:

- bar movement is disabled;
- trimming is disabled;
- keyframe editing is disabled;
- layer reorder is disabled;
- property dock is hidden.

Multi-selection exists primarily for:

- Group;
- Duplicate;
- Delete.

This preserves the current NowAction interaction concept without adding ambiguous batch-edit behavior.

---

# 18. Layer Reordering

A dedicated grip inside the left layer column controls vertical reorder.

Recommended row anatomy:

```text
[grip][type icon][truncated name]
```

The grip receives the full row height:

```text
touch region: approximately 32 × 48 px
visual icon: six dots or two horizontal grip lines
```

Gesture:

```text
drag grip upward
→ bring layer forward

drag grip downward
→ send layer backward
```

Only siblings in the active scope can be reordered.

The dragged row appears elevated while a clear insertion line shows the target position.

Reordering changes only sibling array order.

It must not modify:

- bar start/end;
- keyframes;
- object position;
- playhead;
- website scroll.

---

# 19. Vertical Auto-Scroll During Reorder

When a reordered row approaches the top or bottom edge of the visible layer list, the list may auto-scroll vertically.

Recommended edge zone:

```text
40 px from top or bottom
```

Speed increases as the pointer approaches the edge.

This auto-scroll affects only the layer-list viewport.

It does not scroll the website preview.

---

# 20. Bar Selection and Visual Handles

A bar is selected when its layer is selected.

Selected bar appearance:

- stronger outline;
- visible start handle;
- visible end handle;
- active fill;
- selected keyframes emphasized.

Unselected bars do not show trim handles.

Recommended visual bar height:

```text
30 px
```

The actual hit region occupies most of the `48px` row height.

---

# 21. Moving a Bar

Drag the center body of a selected bar horizontally.

Behavior:

```text
start and end move by the same delta
all keyframes owned by that layer move by the same delta
relative distances remain unchanged
```

Example:

```text
before:
bar       20% ───────── 60%
keyframes 25%   40% 55%

move +10%:

bar       30% ───────── 70%
keyframes 35%   50% 65%
```

The bar cannot move beyond `0%` or `100%`.

When reaching a project boundary, preserve the bar length and stop further movement.

Moving the bar does not retime the animation.

---

# 22. Moving Bars with Keyframes Outside the Active Range

Trimming is non-destructive, so a layer may contain hidden keyframes outside its current bar.

When moving the complete bar:

```text
move all keyframes by the same delta,
including keyframes currently outside the active range
```

This keeps the complete layer animation package together.

Clamp the movement using the outermost of:

- bar start;
- bar end;
- earliest keyframe;
- latest keyframe.

No keyframe may silently be discarded at a project boundary.

---

# 23. Trimming a Bar

Drag the left or right handle.

### Left handle

Changes:

```js
layer.timeline.start
```

### Right handle

Changes:

```js
layer.timeline.end
```

Trim does not move, stretch, compress, or delete keyframes.

Keyframes outside the resulting range remain stored but are not evaluated while outside the active bar.

If the bar is extended again, those keyframes become available again.

This makes trimming non-destructive.

---

# 24. Minimum Bar Range

Recommended logical minimum:

```text
1% of the project timeline
```

However, a 1% bar can be visually tiny at full-fit zoom.

Therefore:

- the row remains selectable through the layer-name column;
- the selected bar receives enlarged invisible handle hit regions;
- the user may pinch-zoom for precise trim;
- the bar is not visually falsified to represent a different range.

If start and end handle hit regions overlap, center drag receives priority until the timeline is zoomed enough to separate them.

A temporary magnified interaction overlay may be added later as backlog.

---

# 25. Bar Edge Handles

Each selected endpoint has:

```text
visual handle width: 4–6 px
invisible hit width: 24 px
hit height: full row
```

The start and end handles must not use an 8px total touch target.

The handle's pointer region extends inward and outward from the logical endpoint without changing the displayed bar range.

---

# 26. Keyframe Display

Keyframes are drawn as diamonds.

```text
visual size: 10 × 10 px
touch region: 28 × 28 px
```

Selected keyframe:

- stronger outline;
- larger visual diamond;
- property-context highlight.

Keyframes may be displayed:

1. merged on the layer bar when multiple properties share nearly the same progress;
2. individually in an expanded property track when the user opens a property editor.

The initial compact row may display merged keyframe markers.

---

# 27. Keyframe Identity

Every keyframe has a stable ID.

```js
{
  id: "kf-7fc",
  at: 0.42,
  value: 120
}
```

Never use only the keyframe's array index as selection identity.

Dragging or sorting changes array indices.

UI selection must survive:

- sorting;
- insertion;
- deletion of another keyframe;
- track recompilation;
- virtualization.

---

# 28. Selecting a Keyframe

Tap a keyframe diamond:

```text
select keyframe
move playhead to keyframe position
scroll preview website to corresponding progress
open the relevant property context when known
```

If a merged diamond represents multiple properties:

```text
tap once → select marker cluster
show property icons in contextual area
tap property icon → open that keyframe/property
```

No permanent text label is required.

---

# 29. Moving a Keyframe

Drag a keyframe horizontally.

Behavior:

```text
change only keyframe.at
do not move bar
do not move other keyframes
do not change keyframe value
do not change easing values
```

Keyframes must remain within:

```text
0%–100%
```

Whether a keyframe may move outside the layer's active bar:

```text
yes
```

It remains stored but inactive until the bar includes it.

This supports non-destructive trimming and rearrangement.

---

# 30. Preventing Keyframe Reordering Ambiguity

Keyframes in a property track are sorted by `at`.

During drag, a keyframe may cross another keyframe.

Approved behavior:

```text
crossing is allowed
the array is resorted after each preview update or commit
identity remains stable by ID
```

Easing is attached to a keyframe's outgoing segment.

When keyframe order changes, the easing stays attached to that keyframe as its `easingToNext`.

The curve editor must reflect the newly formed segments.

---

# 31. Snapping

Apply lightweight snapping while moving:

- bar;
- bar start;
- bar end;
- keyframe;
- playhead.

Initial snap targets:

```text
0%
100%
current playhead
selected layer bar edges
selected layer keyframes
nearby sibling bar edges
nearby visible keyframes
```

Screen-space threshold:

```text
6 px
```

The threshold is converted through the current zoom.

A target snaps only once until the pointer moves outside a release threshold.

Optional short haptic feedback indicates a snap.

Do not show a permanent magnet toolbar in the initial version.

---

# 32. Precision

Do not round timeline values to integer percentages.

Store enough precision:

```js
at: 0.4237
```

Recommended UI precision:

```text
normal display: 42.4%
fine display when zoomed: 42.37%
```

Pointer values may be quantized to a small normalized step if necessary:

```text
0.01% or finer
```

Do not use the current behavior of rounding every keyframe drag to a whole percentage.

---

# 33. Edge Auto-Pan During Horizontal Editing

When moving a bar, handle, or keyframe near the left or right edge of the visible track, the timeline may auto-pan horizontally.

Recommended edge zone:

```text
32 px
```

Auto-pan changes only:

```text
timelineView.visibleStart
timelineView.visibleEnd
```

It must not:

- change website scroll;
- move playhead;
- alter project values beyond the active drag;
- activate editor playback.

This makes long-distance timeline edits possible while zoomed.

---

# 34. Gesture Cancellation

Cancel the active drag when:

- `pointercancel` fires;
- the browser loses pointer capture;
- system gesture interrupts interaction;
- active layer is deleted remotely or by another operation;
- contextual screen closes unexpectedly.

On cancel:

```text
restore transaction snapshot
do not save
remove temporary visual state
```

System Back during a drag should cancel the drag first rather than closing the project.

---

# 35. Timeline Virtualization

Only visible rows plus overscan are mounted.

Recommended overscan:

```text
6 rows above
6 rows below
```

Virtualization must preserve:

- selected layer state;
- active drag row;
- keyboard focus;
- group scope;
- row height;
- timeline alignment.

The row being dragged must remain mounted even when its original index leaves the normal render window.

The left column and timeline track use the same virtual row model.

---

# 36. Keyframe Virtualization

At large project sizes, only draw keyframes that intersect:

```text
visible progress range
+ horizontal overscan
```

Do not iterate and render every keyframe in the complete project on each frame.

Selected keyframes remain represented even near the visible boundary.

Aggregated markers may be used at low zoom when many keyframes occupy the same few pixels.

---

# 37. Group Scope Navigation

A group row includes a dedicated enter-scope icon.

```text
tap row body → select group
tap enter icon → open group scope
```

When inside a group:

```text
breadcrumb/back icon → return to parent scope
```

Only children of the active scope appear as timeline rows.

External layers remain visible but dimmed in the website viewport according to Point 2.

Layer order is always local to the active scope.

---

# 38. Timeline State When Entering a Group

Entering a group preserves:

- global playhead progress;
- timeline zoom;
- visible progress range;
- website scroll position.

Vertical list scroll may reset to the top of the newly opened scope.

Returning to the parent may restore the previous vertical row position for that scope.

Suggested editor-only cache:

```js
scopeViewState[groupId] = {
  verticalScrollTop
};
```

---

# 39. Current Repository Defects

The current `scroll-anim-ui.js` architecture has several conflicts with the approved NowAction direction.

## 39.1 Per-shape drawer instead of a project timeline

The current animation UI opens one selected shape inside a drawer.

Required direction:

```text
one global project timeline
with all sibling layer rows
```

## 39.2 Keyframes are relative to a layer range

Current:

```js
keyframe.p = 0..100 relative to rangeStart/rangeEnd
```

This causes trimming to implicitly reposition keyframes globally.

Required:

```js
keyframe.at = global normalized progress
```

## 39.3 Full drawer rebuild during range drag

The current range drag calls `renderDrawer()` on pointer movement.

This repeatedly rebuilds the complete drawer DOM.

Required:

- patch only bar geometry during drag;
- commit project state once at drag end.

## 39.4 Persistence during pointer movement

The current drag path calls persistence repeatedly.

This may trigger local-storage writes during every pointer move.

Required:

```text
preview in memory during drag
save once on pointerup
```

## 39.5 Touch targets are too small

Current keyframes and handles are approximately `8–10px` visually and effectively too small for reliable mobile editing.

Required:

- small visual controls;
- large invisible hit regions.

## 39.6 Selection is stored by keyframe array index

Current:

```js
selectedIndex
```

Sorting keyframes can invalidate index-based selection.

Required:

```js
selectedKeyframeId
```

## 39.7 Integer-percent keyframe movement

Current dragging rounds keyframe positions to whole percentages.

Required:

- normalized floating-point positions;
- zoom-aware display precision.

## 39.8 No pointer capture or pointer-cancel rollback

Current document-level move/up listeners can leave a drag in an inconsistent state when interrupted.

Required:

- pointer capture;
- pointercancel;
- transaction rollback.

## 39.9 Duplicate scrub controls

The current UI has both a range input scrubber and a timeline ruler scrub position.

Required:

```text
one authoritative playhead/ruler interaction
```

## 39.10 Fixed 2.2-second preview

Current animation preview uses a fixed duration.

Required:

```text
editor auto-scroll based on website scroll distance and preview speed
```

## 39.11 Full DOM state is rebuilt

Inline event handlers and `innerHTML` replacement make fine-grained timeline updates difficult and expensive.

Required:

- stable components;
- event delegation or explicit listeners;
- patch-based rendering;
- row virtualization.

## 39.12 `display:none` outside the bar

This may destabilize document height.

Required:

- stable wrapper;
- visibility and pointer behavior;
- layout space must not collapse unpredictably.

## 39.13 No horizontal zoom or pan

Precise keyframe and trim editing is impossible on long, dense timelines.

Required:

- pinch zoom;
- empty-track pan;
- zoom-aware hit testing.

---

# 40. Recommended Interaction State Machine

```js
timelineInteraction = {
  mode:
    "idle" |
    "scrub-playhead" |
    "scroll-rows" |
    "pan-timeline" |
    "reorder-layer" |
    "move-bar" |
    "trim-bar-start" |
    "trim-bar-end" |
    "move-keyframe" |
    "pinch-zoom" |
    "multi-select",

  pointerIds: [],
  transaction: null
};
```

Only one destructive edit gesture may be active at a time.

Pinch zoom cancels an uncommitted empty-track pan, but must not interrupt an active bar or keyframe edit.

---

# 41. Implementation Phases

## Phase 1 — Global timeline shell

- ruler;
- global playhead;
- visible sibling rows;
- tap selection;
- website-scroll synchronization;
- virtualized vertical list.

## Phase 2 — Bar editing

- selected bar handles;
- move bar;
- trim start/end;
- transaction commit;
- edge snapping;
- edge auto-pan.

## Phase 3 — Multi-selection and reorder

- long-press multi-select;
- Group/Duplicate/Delete top actions;
- dedicated reorder grip;
- vertical auto-scroll.

## Phase 4 — Keyframes

- stable keyframe IDs;
- property-specific tracks;
- compact merged markers;
- keyframe drag;
- previous/next marker actions.

## Phase 5 — Zoom and dense projects

- pinch-to-zoom;
- horizontal pan;
- keyframe aggregation;
- horizontal virtualization;
- precision values.

## Phase 6 — Group scopes

- enter-scope icon;
- breadcrumb;
- scope-specific vertical scroll restoration;
- local stacking reorder.

---

# 42. Acceptance Criteria

The timeline gesture system is correct when:

1. Vertical row order remains the visual stacking source of truth.
2. Ruler drag scrubs the website without modifying bars.
3. Website manual scroll updates the playhead without feedback loops.
4. Empty-track horizontal drag pans only when zoomed.
5. Empty-area vertical drag scrolls layer rows.
6. Pinch zoom preserves the progress beneath the pinch midpoint.
7. Tapping a row selects one layer.
8. Long press enters multi-selection.
9. Multi-selection exposes Group, Duplicate, and Delete using existing behavior.
10. A dedicated grip reorders only sibling layers.
11. Reordering does not change bar or keyframe positions.
12. Dragging a bar moves its range and all layer keyframes together.
13. Trimming changes only the active range.
14. Trim never deletes or retimes keyframes.
15. A keyframe may exist outside the active bar.
16. Keyframes use stable IDs rather than array indices.
17. Keyframes store global normalized progress with sub-percent precision.
18. Only one gesture owns a pointer sequence.
19. Drag edits save once on completion, not on every pointer move.
20. Interrupted gestures restore their starting state.
21. Hit regions are touch-friendly even when visuals are small.
22. Horizontal edge auto-pan does not change website scroll.
23. Vertical reorder auto-scroll affects only the layer list.
24. Timeline rows and keyframes are virtualized for large projects.
25. Group selection and group scope entry remain separate actions.
26. The same gesture results are preserved after save, reload, preview, and export.

---

# 43. Final Interaction Statement

> NowAction uses a global, zoomable scroll-progress timeline. The ruler exclusively controls the playhead, vertical row order controls visual depth, a dedicated grip controls layer reorder, bar bodies control range movement, endpoint handles control non-destructive trimming, and diamonds control property keyframes. Every drag is a cancellable transaction with pointer capture and a single save on completion. The timeline supports direction-locked vertical scrolling, horizontal panning, pinch zoom, snapping, edge auto-pan, virtualization, and group-scoped layer lists without mixing website scrolling with timeline editing.
