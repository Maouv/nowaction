# NowAction Architecture Decision — Point 2
## Layer Bars, Visual Depth, Grouping, and Scoped Stacking

**Status:** Approved for implementation planning  
**Product:** NowAction  
**Core direction:** A mobile-first website builder whose primary editing experience follows a motion-editor mental model rather than a Figma-style document tree.

---

## 1. Core Product Rule

Every user-created object is represented by exactly one layer bar.

```text
one object = one layer = one bar
```

Examples:

```text
Rectangle 1    █████████████████
Circle 1           █████████████
Text 1         ██████████████████
```

NowAction must not assign semantic meaning to an object.

A rectangle is not automatically a:

- background;
- section;
- card;
- hero;
- container.

A text object is not automatically a:

- title;
- heading;
- paragraph;
- button label.

Names are user-controlled labels only.

```js
{
  id: "layer_f83k2",
  type: "rectangle",
  name: "Rectangle 1"
}
```

The `id` determines identity. The name does not affect behavior, and duplicate names are allowed.

---

## 2. Vertical Bar Order Defines Visual Depth

The vertical order of bars is the source of truth for visual stacking.

```text
top bar    = visually in front
bottom bar = visually behind
```

Example:

```text
Circle 1       █████████████████   ← front
Rectangle 1    █████████████████   ← behind
```

When the circle overlaps the rectangle, the circle must be visible above the rectangle.

If the order is reversed:

```text
Rectangle 1    █████████████████   ← front
Circle 1       █████████████████   ← behind
```

the rectangle may cover the circle.

This rule must remain identical in:

- the editor viewport;
- timeline scrubbing;
- preview playback;
- saved projects;
- reopened projects;
- exported websites.

---

## 3. Canonical Ordering Model

Store sibling layer IDs in **front-to-back order**.

```js
rootLayerIds = [
  "circle-1",       // frontmost
  "rectangle-1",    // behind circle
  "background-1"    // backmost
];
```

For a group:

```js
group.childIds = [
  "text-1",         // frontmost inside group
  "rectangle-2"     // behind text
];
```

The UI renders this array from top to bottom without reversing its meaning.

The renderer derives DOM order or CSS `z-index` from this array.

Do not maintain a second independently editable `zIndex` property. Two independent order sources will eventually disagree.

Preferred rule:

```text
layer arrays are authoritative
z-index is derived
```

---

## 4. Reordering Bars

Dragging a bar vertically changes its stacking order within the current scope.

```text
drag upward   = bring forward
drag downward = send backward
```

Convenience commands may also exist:

- Bring Forward;
- Send Backward;
- Bring to Front;
- Send to Back.

These commands must only operate among siblings in the currently opened scope.

For example, while editing `Group 1`, “Bring to Front” means frontmost **inside Group 1**, not frontmost in the entire project.

---

## 5. Vertical Order and Horizontal Timeline Position Are Independent

A layer bar has two different meanings:

```text
vertical position   = visual depth
horizontal position = scroll timeline range
```

Changing one must not change the other.

### Vertical reorder

```text
changes stacking
does not change start/end progress
does not move keyframes
```

### Horizontal trim or movement

```text
changes timeline range
does not change visual depth
```

### Keyframe movement

```text
changes animation progress
does not change layer order
```

This distinction is critical for the mobile interaction design.

Recommended touch behavior:

- drag the row handle vertically to reorder;
- drag the left/right bar handles to trim;
- drag the center of a bar horizontally only when timeline movement is supported;
- drag keyframe markers horizontally;
- use long press to begin multi-selection.

The same gesture region must not ambiguously perform reorder and timeline editing.

---

## 6. Group Is a Real Layer

A group is not merely a label attached to several objects.

A group is a real layer node with its own identity:

```text
one group = one layer = one bar
```

Recommended model:

```js
{
  id: "group-1",
  type: "group",
  name: "Group 1",
  parentId: null,
  childIds: [
    "circle-1",
    "rectangle-1"
  ]
}
```

When the project scope is shown:

```text
Group 1       █████████████████
Image 1       █████████████████
```

When `Group 1` is opened:

```text
Circle 1      █████████████████
Rectangle 1   █████████████████
```

Each child remains an independent layer with one independent bar.

---

## 7. Drill-Down Instead of a Deep Figma-Style Tree

The main mobile timeline must not permanently display a deeply indented tree.

Use scope-based drill-down.

### Root scope

```text
Project

Group 1       █████████████████
Image 1       █████████████████
```

### Opened group scope

```text
Project / Group 1

Circle 1      █████████████████
Rectangle 1   █████████████████
```

The user returns through a breadcrumb or back control:

```text
‹ Project
```

This prevents nested indentation from consuming the limited horizontal space needed for names and timeline bars.

---

## 8. Viewport Behavior While a Group Is Open

The viewport continues to display the complete website for positional context.

However:

- layers outside the opened group are visually dimmed;
- layers outside the opened group cannot be selected from the viewport;
- layers inside the opened group remain fully visible and editable;
- the opened group may receive a subtle scope outline;
- the breadcrumb clearly identifies the active scope.

This prevents accidental editing outside the current group without hiding the surrounding design context.

---

## 9. Scoped Stacking

Every scope has its own independent stacking order.

### Root scope

```js
rootLayerIds = [
  "external-text",
  "group-1",
  "background"
];
```

### Inside Group 1

```js
group1.childIds = [
  "circle",
  "rectangle"
];
```

The circle is in front of the rectangle **inside Group 1**.

The complete group is behind `external-text` because `external-text` is above the group in the root scope.

```text
external-text
    ↓ in front of the entire group

group-1
    circle
    rectangle
```

---

## 10. A Group Is One External Stacking Unit

Children cannot interleave with layers outside their parent group.

Assume:

```text
External Layer X
Group 1
  Circle
  Rectangle
```

It is impossible to produce this stacking relationship while Circle and Rectangle remain in the same group:

```text
Circle
External Layer X
Rectangle
```

The group must be either:

```text
entirely in front of External Layer X
```

or:

```text
entirely behind External Layer X
```

To place Circle above the external layer while Rectangle stays below it, the user must:

- move Circle out of the group;
- move the external layer into the group;
- or restructure the groups.

This limitation is intentional and is required for predictable compositing and export.

---

## 11. CSS Stacking Context Rules

The exported group wrapper should establish a predictable local stacking context.

Recommended structure:

```html
<div
  data-na-layer-id="group-1"
  data-na-layer-type="group"
  class="na-group"
>
  <!-- child layers -->
</div>
```

Recommended baseline behavior:

```css
.na-group {
  position: absolute;
  isolation: isolate;
  overflow: visible;
}
```

Each child receives a z-order derived only from `group.childIds`.

A child must not receive a project-global z-index.

```text
root z-order  → applied to group wrapper
child z-order → applied inside group wrapper
```

Avoid mixing:

- global child z-index;
- local group z-index;
- DOM order;
- independently saved z-index values.

One ordering model must remain authoritative.

---

## 12. Grouping Must Preserve the Visual Result

When a group is created, the selected objects must not visually jump.

Before grouping:

```js
rectangle.layout = {
  x: 40,
  y: 500,
  width: 300,
  height: 200
};

circle.layout = {
  x: 120,
  y: 540,
  width: 80,
  height: 80
};
```

The group receives a base layout bounding box:

```js
group.layout = {
  x: 40,
  y: 500,
  width: 300,
  height: 200
};
```

Child coordinates become local:

```js
rectangle.layout = {
  x: 0,
  y: 0,
  width: 300,
  height: 200
};

circle.layout = {
  x: 80,
  y: 40,
  width: 80,
  height: 80
};
```

The viewport result before and after grouping must remain pixel-equivalent, excluding selection outlines.

---

## 13. Ungrouping Must Preserve the Visual Result

Ungrouping converts each child's local coordinates back into its parent scope.

For simple translation:

```js
childDocumentX = group.x + child.localX;
childDocumentY = group.y + child.localY;
```

When group rotation or scale is introduced later, ungrouping must use complete matrix composition and decomposition rather than simple addition.

The architecture should therefore prepare for transforms as matrices even if the first version uses translation only.

```text
grouping   must not cause a visual jump
ungrouping must not cause a visual jump
```

---

## 14. Grouping Non-Adjacent Layers

Selected sibling layers may be separated by unselected layers.

Example:

```text
Text A          ← selected
Image X         ← not selected
Rectangle B     ← selected
```

After Text A and Rectangle B become one group, preserving every previous stacking relationship is impossible.

Before grouping:

```text
Text A is in front of Image X
Rectangle B is behind Image X
```

After grouping, Text A and Rectangle B become one external stacking unit.

### Approved behavior

NowAction may allow grouping non-adjacent sibling layers, but it must show an explicit warning:

```text
Grouping these layers will change their stacking relative to unselected layers.
```

On confirmation:

1. preserve the selected layers' internal front-to-back order;
2. insert the new group at the position of the frontmost selected layer;
3. move all selected layers into the group;
4. keep unselected sibling order unchanged.

Grouping adjacent sibling layers does not require this warning when the visual result can be preserved.

---

## 15. Group Is Not a Mask

Grouping a circle above a rectangle means:

```text
the circle is rendered in front of the rectangle
```

It does **not** mean:

```text
the circle is clipped by the rectangle
```

Default group behavior:

```css
overflow: visible;
```

Masking and clipping are separate features.

Possible future features:

- Clip Content;
- Mask with Layer;
- Alpha Mask;
- Luma Mask;
- Track Matte.

NowAction must not silently infer masking from grouping, overlap, names, or object types.

---

## 16. Selecting Overlapping Objects

When multiple objects overlap, a normal viewport tap selects the frontmost eligible object under the pointer.

Because this makes covered objects difficult to access, NowAction needs at least one explicit alternative:

- long press to show “Select Layer”;
- repeated tap to cycle through overlapping layers;
- a “Select Behind” command;
- selection from the active timeline scope.

Recommended mobile behavior:

```text
tap       = select frontmost
long press = open list of layers under pointer
```

Locked or out-of-scope layers should be shown in the list but must not be selected unless their lock or scope state is changed.

---

## 17. Group Bounds and Document Height

Group bounds are calculated from the children's base layout bounds.

```js
groupBounds = union(childBaseLayoutBounds);
```

Document height may use static group layout bounds.

It must not continuously use animated visual bounds.

```text
base layout bounds     → may affect document height
animated visual bounds → do not redefine document height every frame
```

This preserves the stable scroll architecture defined in Point 1.

Default clipping remains disabled, so visual animation may temporarily extend outside the base group bounds without changing the scroll domain.

---

## 18. Group Bar Range in the Initial Version

Group keyframes and independently editable group timing are not required in this decision.

For the initial implementation, the group bar may display a derived range:

```js
group.timeline.start = Math.min(
  ...children.map(child => child.timeline.start)
);

group.timeline.end = Math.max(
  ...children.map(child => child.timeline.end)
);
```

The group bar is therefore a summary of its child bars.

Initial limitations:

- the group bar is not independently trimmed;
- the group has no required animation tracks;
- changing a child range updates the displayed group range;
- opening the group exposes the editable child bars.

This model can later be extended with group-level keyframes without replacing the layer hierarchy.

---

## 19. Group Does Not Imply Website Semantics

A group is a visual composition container.

It does not automatically create a semantic:

```html
<section>
<header>
<footer>
<nav>
<article>
```

Export may use a technical `<div>` wrapper to implement:

- local coordinates;
- scoped stacking;
- future group transforms;
- future group opacity;
- future clipping.

The wrapper must not infer layout behavior such as:

- flex;
- grid;
- normal document flow;
- responsive section logic.

Those must be explicit features or properties.

---

## 20. Difference Between Grouping and Future Parenting

Grouping and parenting are separate concepts.

### Grouping

- changes structural membership;
- creates a local coordinate system;
- creates one external stacking unit;
- supports drill-down;
- owns a child order.

### Parenting

- allows one layer's transform to influence another;
- does not necessarily change structural membership;
- does not determine visual stacking;
- is a separate future feature.

NowAction must not use bar order to infer transform parenting.

Official Alight Motion guidance also treats layer order and parenting relationships as independent concepts.

---

## 21. Current Repository Architecture Problem

The current NowAction code uses:

```js
shapes = [ ... ];
groups = {
  groupId: { name: "Group" }
};
```

A shape receives:

```js
shape.groupId = groupId;
```

This means the current group is metadata attached to flat shapes rather than a real layer node.

Current consequences include:

- no group-local coordinate system;
- no group-local stacking scope;
- no nested group architecture;
- no group wrapper in export;
- selecting one member can select all members;
- bring-to-front and send-to-back move flat members together;
- group structure is not represented in exported HTML;
- group membership and global array order are tightly coupled.

The current canvas renderer derives z-order from each shape's index in the flat `shapes` array, while the layer list displays the array in reverse. This currently approximates “top row = front” for flat objects, but it cannot support proper scoped grouping.

---

## 22. Recommended Project Model

```js
project = {
  rootLayerIds: [
    "external-text",
    "group-1",
    "background-object"
  ],

  layersById: {
    "external-text": {
      id: "external-text",
      type: "text",
      name: "Text 1",
      parentId: null,
      childIds: []
    },

    "group-1": {
      id: "group-1",
      type: "group",
      name: "Group 1",
      parentId: null,
      childIds: [
        "circle-1",
        "rectangle-1"
      ],
      timelineMode: "derived",
      clipContent: false
    },

    "circle-1": {
      id: "circle-1",
      type: "circle",
      name: "Circle 1",
      parentId: "group-1",
      childIds: []
    },

    "rectangle-1": {
      id: "rectangle-1",
      type: "rectangle",
      name: "Rectangle 1",
      parentId: "group-1",
      childIds: []
    },

    "background-object": {
      id: "background-object",
      type: "rectangle",
      name: "Rectangle 2",
      parentId: null,
      childIds: []
    }
  }
};
```

Invariant:

```text
rootLayerIds and every childIds array are ordered front-to-back.
```

---

## 23. Data Invariants

The implementation must enforce:

1. Every layer ID exists once in `layersById`.
2. Every non-root layer has exactly one structural parent.
3. Root layers appear exactly once in `rootLayerIds`.
4. Child layers appear exactly once in their parent's `childIds`.
5. A layer cannot contain itself.
6. Group nesting cannot create cycles.
7. Sibling order is front-to-back.
8. A normal object cannot own `childIds`.
9. Group membership does not imply masking.
10. Names are not unique identifiers.
11. A child cannot have a global stacking position outside its parent scope.
12. Deleting a group requires an explicit policy for its children.

Recommended delete-group prompt:

```text
Delete group only and keep its contents
Delete group and all contents
Cancel
```

---

## 24. Migration from the Current Model

A migration should:

1. Read the existing flat `shapes` array.
2. Treat the current array as back-to-front because the renderer assigns increasing z-index by index.
3. Reverse it to create front-to-back root order.
4. Convert every legacy `groupId` into a real group layer.
5. Preserve each legacy group's member order.
6. Insert each new group into the root order at the visual position previously occupied by its frontmost member.
7. Convert child coordinates into group-local coordinates without changing the viewport result.
8. Remove legacy `shape.groupId`.
9. Replace the separate `groups` dictionary with group layers in `layersById`.
10. Persist the new schema version.

Recommended project versioning:

```js
project.schemaVersion = 2;
```

Never migrate only in memory without saving the migrated schema, or every load will repeat the conversion.

---

## 25. Export Requirements

The exporter must recursively render scopes.

Pseudocode:

```js
function renderScope(layerIds, parentElement) {
  for (const layerId of [...layerIds].reverse()) {
    const layer = layersById[layerId];

    if (layer.type === "group") {
      const groupElement = renderGroupWrapper(layer);
      renderScope(layer.childIds, groupElement);
      parentElement.append(groupElement);
    } else {
      parentElement.append(renderObject(layer));
    }
  }
}
```

If explicit z-index values are used instead of reversed DOM order, derive them from the canonical sibling arrays.

Export must preserve:

- root order;
- every group's child order;
- group-local coordinates;
- `overflow: visible` unless clipping is enabled;
- group wrappers;
- timeline ranges;
- object identity.

---

## 26. Acceptance Criteria

Point 2 is correctly implemented when:

1. Every object has one visible layer bar.
2. The top bar is always visually in front of lower sibling bars.
3. Vertical reorder updates the viewport immediately.
4. Vertical reorder does not move bars horizontally or modify keyframes.
5. A group is a real layer node with its own bar.
6. Opening a group replaces the timeline scope instead of showing a deep permanent tree.
7. Layers outside the active group remain visible but dimmed and unselectable.
8. Child stacking is local to its group.
9. A group behaves as one stacking unit against external siblings.
10. Grouping and ungrouping do not visually move objects.
11. Grouping does not automatically clip children.
12. Overlapping covered objects remain selectable through an explicit alternate selection flow.
13. Grouping non-adjacent layers warns that stacking may change.
14. Save, reload, preview, and export preserve identical layer order.
15. Export creates recursive group wrappers rather than flattening all objects.
16. Group nesting cannot create cycles.
17. Object and group names have no semantic or behavioral effect.
18. The legacy flat `groupId` architecture is migrated to structural group nodes.

---

## 27. Final Architecture Statement

> NowAction uses the vertical order of layer bars as the authoritative visual-depth model: the top sibling bar renders in front of lower sibling bars. Every object has one bar, and every group is also a real layer with one bar. Stacking is scoped, so children are ordered only inside their group, while the group behaves as one unit relative to external layers. Grouping does not imply masking, website semantics, or transform parenting. The mobile UI uses drill-down scopes rather than a permanently expanded Figma-style tree.
