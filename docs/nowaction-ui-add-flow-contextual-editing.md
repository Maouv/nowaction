# NowAction UI Architecture — Add Flow and Contextual Editing

**Status:** Draft approved direction  
**Product:** NowAction  
**Reference viewport:** `390 × 844 CSS px`  
**Core UX direction:** Motion-editor-style progressive disclosure inspired by Alight Motion  
**Meaning of “lazy UI”:** Only the current context and its controls are shown and mounted.

---

# 1. Core UI Principle

NowAction must not display all tools and all properties at once.

The user follows a contextual path:

```text
Main Editor
→ Add
→ Choose layer type
→ Layer selected
→ Choose property category
→ Edit one property context
→ Add keyframe or edit easing when needed
```

Only the active panel is mounted.

Example:

```text
Move mode active
→ Position controls are mounted
→ Scale and Rotation controls are not mounted

Scale selected
→ Position controls are unmounted
→ Scale controls are mounted
```

This is different from hiding a large desktop inspector with CSS.

The unused screen must not remain:

- interactive;
- focusable;
- subscribed to project state;
- performing calculations;
- rendering controls in the DOM.

---

# 2. Main Screen Reference Layout

Reference screen:

```text
390 × 844 CSS px
```

Use safe-area insets and `100dvh`.

```css
:root {
  --na-top-bar-h: 52px;
  --na-transport-h: 48px;
  --na-ruler-h: 28px;
  --na-layer-row-h: 48px;
  --na-context-h: 220px;
  --na-touch-target: 48px;
  --na-fab-size: 56px;
}
```

Main structure:

```text
┌──────────────────────────────────────┐
│ Project       Project Name   ◉   ⇧   │  52
├──────────────────────────────────────┤
│                                      │
│          FIXED WEB VIEWPORT          │  flexible
│                                      │
├──────────────────────────────────────┤
│            CONTEXT AREA              │  220
└──────────────────────────────────────┘
```

The bottom context area changes screen without destroying:

- the project;
- the timeline model;
- selection state;
- playhead;
- viewport state.

---

# 3. Top App Bar

Height:

```text
52 px
```

Normal state:

```text
[Project]     Project Name     [Preview] [Export]
```

Existing functions and IDs should remain wired:

```text
Preview → #btn-preview-top
Export  → #btn-export-top
```

There is no Undo or Redo control.

The project name may use text because it is status information, not a menu option.

Every action uses:

```text
touch target: 48 × 48 px
visual icon:  24 × 24 px
```

---

# 4. Multi-Selection Top Bar

Long-pressing a layer bar enters multi-selection mode.

Normal right actions:

```text
[Preview] [Export]
```

are temporarily replaced with:

```text
[Group] [Duplicate] [Delete]
```

Selection state:

```text
[X]          3 selected       [Group] [Duplicate] [Delete]
```

The count may be displayed as text because it is status information.

Rules:

- `Group` is available for two or more selected sibling bars.
- `Duplicate` is available for one or more selected bars.
- `Delete` is available for one or more selected bars.
- Preview and Export return when selection mode closes.
- Group never appears in the Add menu.

Existing functions should be reused initially:

```js
window.groupSelectedShapes();
window.duplicateSelected();
window.deleteSelected();
```

The UI architecture may later call renamed command-layer adapters, but existing behavior should remain operational during migration.

---

# 5. Add Button

The Add button is a circular floating action button.

```text
size: 56 × 56 px
right: 16 px
bottom: safe-area-bottom + 12 px
icon: plus
```

It remains in the lower-right corner of the timeline context.

The timeline track area reserves approximately `80px` right padding so that the FAB does not cover important controls.

Tap behavior:

```text
tap +
→ open Add Root
→ keep preview visible
→ preserve timeline and playhead state
→ replace bottom contextual content
```

The timeline may remain mounted in the background only if it is inert and does not perform unnecessary rendering. The preferred implementation mounts only the active contextual screen.

---

# 6. Add Root Screen

The Add Root contains exactly three primary choices:

```text
Shape
Text
Image
```

No visible names are displayed.

Visual arrangement:

```text
┌──────────────────────────────────────┐
│ [‹]                              [×] │  48
├──────────────────────────────────────┤
│                                      │
│       ◇           T           ▧      │  112
│                                      │
└──────────────────────────────────────┘
```

Total screen height:

```text
160 px + safe-area-bottom
```

The remaining lower context area may retain spacing or a subtle background.

Icons:

| Internal action | Visual icon |
|---|---|
| Shape | overlapping rectangle and circle |
| Text | capital `T` |
| Image | landscape/image frame |

Each root choice:

```text
touch target: 88 × 80 px minimum
icon size:    32 × 32 px
```

Not allowed:

- Group;
- More;
- Vector Drawing as a root choice;
- Freehand as a root choice;
- unfinished disabled placeholders.

`Vector Drawing` and `Freehand` belong inside Shape when implemented.

---

# 7. Icon-Only Navigation Rules

All menu choices use icons without permanent visible labels.

To remain usable:

1. Each icon button has an `aria-label`.
2. Each icon button has a `title` or accessible description.
3. Long press may show a temporary tooltip.
4. The active choice receives a clear background and indicator.
5. The same icon must always mean the same action.
6. A single consistent SVG style is used throughout the editor.
7. Do not mix Codicons, emoji, arbitrary Unicode symbols, and unrelated icon families in the final UI.

Recommended implementation:

```text
curated inline SVG icon set
```

rather than a large icon font.

Inline SVG makes it possible to:

- load only icons actually used;
- keep stroke weight consistent;
- recolor active states;
- avoid font-loading delay.

Visible names are absent, but internal semantic names remain required in code.

---

# 8. Add Shape Flow

Tap Shape:

```text
Add Root
→ Shape Picker
```

The root panel is replaced, not stacked beneath a new drawer.

Initial Shape Picker:

```text
┌──────────────────────────────────────┐
│ [‹]                              [×] │
├──────────────────────────────────────┤
│                                      │
│          □               ○           │
│                                      │
└──────────────────────────────────────┘
```

Initially supported:

- Rectangle;
- Circle/Ellipse.

Future additions inside this same picker:

- Polygon;
- Star;
- Line;
- Arrow;
- Vector Drawing;
- Freehand Drawing.

Do not render future icons until the corresponding creation behavior works.

Shape icon touch target:

```text
88 × 80 px
```

---

# 9. New Object Placement

A newly created object appears in the center of the **currently visible website viewport**, not at the center of the complete document and not at an arbitrary canvas origin.

Conceptual position:

```js
const visibleCenterX =
  project.viewport.designWidth / 2;

const visibleCenterY =
  scrollRoot.scrollTop +
  scrollRoot.clientHeight / 2;
```

The object is centered around that point.

Recommended initial dimensions for a `390px` logical viewport:

### Rectangle

```js
{
  width: 140,
  height: 90
}
```

### Circle

```js
{
  width: 120,
  height: 120
}
```

### Text

```js
{
  width: 240,
  height: 64
}
```

Image dimensions are calculated from the asset aspect ratio.

After creation:

```text
object is selected
→ Add screen closes
→ single-layer property dock appears
→ viewport displays selection handles
```

---

# 10. Default Bar for a New Layer

To match the motion-editor mental model, the recommended default is:

```text
bar starts at the current playhead
bar ends at 100%
```

Example:

```text
playhead = 35%

new layer bar:
35% ─────────────────────────── 100%
```

Data:

```js
layer.timeline = {
  start: currentProgress,
  end: 1
};
```

Minimum default bar width:

```text
5% of the global timeline
```

If the playhead is above `95%`, use:

```js
start = 0.95;
end = 1;
```

This ensures the bar remains editable.

The user can later move or trim the bar.

---

# 11. Add Rectangle and Circle Compatibility

The current code uses:

```js
activeTool
addShapeAt(worldX, worldY)
```

and then resets to Select.

The new UI may initially use an adapter:

```js
function createShapeAtViewportCenter(type) {
  const point = getCurrentViewportCenterInDocument();

  activeTool = type;
  addShapeAt(point.x, point.y);
}
```

This preserves existing creation behavior while removing the requirement that the user first choose a tool and then tap the canvas.

The long-term command should be independent of global `activeTool`:

```js
dispatch({
  type: "CREATE_LAYER",
  layerType: "rectangle",
  documentPoint: point,
  timelineStart: currentProgress,
  timelineEnd: 1
});
```

---

# 12. Add Text Flow

Tap Text:

```text
Add Root
→ create Text layer at viewport center
→ select Text layer
→ enter text-content editing immediately
```

Recommended flow:

```text
preview remains visible
keyboard opens
small editing bar appears above the contextual area
```

Editing bar:

```text
[×]   editable text field                     [✓]
```

Buttons are icon-only:

- `×` cancels new text creation;
- check commits the text.

The text content field naturally displays text because it is user content, not a menu label.

Rules:

- empty commit defaults to `Text`;
- cancel removes the newly created text layer;
- keyboard closing does not automatically delete the layer;
- after commit, open the selected-layer property dock;
- double-tapping an existing text layer may reopen this text-content editor.

The current inline text editing behavior may be reused behind a new mobile-friendly surface.

---

# 13. Add Image Flow

Tap Image:

```text
Add Root
→ open existing native file input
```

Reuse the existing image upload path where possible.

Recommended flow:

1. User chooses an image.
2. A placeholder layer is created at viewport center.
3. The image is decoded.
4. Its dimensions are calculated from aspect ratio.
5. The image is fitted inside the logical viewport.
6. The layer becomes selected.
7. The property dock appears.

Recommended maximum initial size:

```text
70% of logical viewport width
60% of logical viewport height
```

Preserve aspect ratio.

Example:

```js
const scale = Math.min(
  maxWidth / sourceWidth,
  maxHeight / sourceHeight,
  1
);
```

If the user cancels the native picker:

```text
return to Add Root
```

or close Add if the platform cannot reliably detect cancel. Do not leave Image as a persistent active placement tool.

---

# 14. Main Timeline State

When no layer is selected:

```text
Transport                     48 px
Timeline ruler                28 px
Three visible layer rows     144 px
──────────────────────────────────
Total                         220 px
```

Example:

```text
┌──────────────────────────────────────┐
│ ◀          ▶/❚❚          ▶     42% │
├────────────┬─────────────────────────┤
│            │ 0%       50%       100%│
├────────────┼─────────────────────────┤
│ Circle     │       █████████         │
│ Rectangle  │ █████████████████       │
│ Text       │          █████████      │
│            │                       + │
└────────────┴─────────────────────────┘
```

Timeline row virtualization from the performance design should be applied when the layer count exceeds the visible window.

---

# 15. Single-Layer Selection Dock

Selecting one layer changes the bottom portion of the timeline into a property category dock.

The preview size must not jump.

Recommended composition:

```text
Transport                     48 px
Timeline ruler                28 px
Two visible layer rows        96 px
Property category dock        48 px
──────────────────────────────────
Total                         220 px
```

Property dock:

```text
[Edit] [Fill] [Border/Shadow] [Blend/Opacity] [Transform] [Effects]
```

No names are displayed.

Recommended icon mapping:

| Internal screen | Visual metaphor |
|---|---|
| Edit Layer | shape with editable nodes or pencil |
| Fill | droplet |
| Border & Shadow | outlined square with offset shadow |
| Blend & Opacity | overlapping circles |
| Move & Transform | four-direction arrows |
| Effects | sparkle |

Each item:

```text
touch target: 56 × 48 px
visual icon:  24 × 24 px
```

Six items fit within:

```text
6 × 56 = 336 px
```

plus side padding.

The dock is horizontally scrollable only if a future layer type has more categories. The initial design should fit without horizontal scrolling.

---

# 16. Type-Specific Property Categories

Not every layer type must display identical category icons.

### Rectangle/Circle

```text
Edit Shape
Fill
Border & Shadow
Blend & Opacity
Move & Transform
Effects
```

### Text

```text
Edit Text
Fill/Text Color
Border & Shadow
Blend & Opacity
Move & Transform
Effects
```

### Image

```text
Edit Image/Crop
Border & Shadow
Blend & Opacity
Move & Transform
Effects
```

Irrelevant categories are omitted rather than shown as permanently disabled.

The remaining icons keep their relative order whenever practical so that muscle memory is retained.

---

# 17. Context Navigation

Contextual screens use one navigation stack.

Example:

```js
navigationStack = [
  { screen: "editor" },
  { screen: "layer-properties", layerId: "layer-1" },
  { screen: "border-shadow", layerId: "layer-1" },
  { screen: "shadow-detail", layerId: "layer-1" }
];
```

Controls:

```text
[‹] = pop one screen
[×] = return to main timeline
```

Android/system Back:

```text
if context stack has a child screen:
  pop one contextual screen
else:
  use normal app navigation
```

Do not close the complete project when the user only intends to exit a property screen.

---

# 18. Edit Shape Screen

Tap the Edit Shape icon.

The category dock is replaced with an object-type editor.

Rectangle example:

```text
┌──────────────────────────────────────┐
│ [‹]                              [×] │
├──────────────────────────────────────┤
│                                      │
│      □            ◜            ⛶     │
│                                      │
└──────────────────────────────────────┘
```

The icons represent:

- shape type;
- corner radius;
- size.

No names are permanently displayed.

Tap Size opens a numeric control screen:

```text
┌──────────────────────────────────────┐
│ [‹]                              [×] │
├──────────────────────────────────────┤
│        ↔  140 px        ↕  90 px    │
│                [link]                │
└──────────────────────────────────────┘
```

Textual numeric values are permitted because they are values, not menu labels.

The link icon controls aspect locking.

Circle/Ellipse may use width and height independently.

---

# 19. Edit Text Screen

Tap the Edit Text icon.

First-level icon categories:

```text
[Content] [Font] [Size] [Alignment] [Spacing]
```

Visual metaphors:

| Internal action | Icon |
|---|---|
| Content | `T` with cursor |
| Font | `Aa` |
| Size | `T` with vertical arrows |
| Alignment | horizontal alignment lines |
| Spacing | opposing horizontal arrows |

No permanent names.

### Text content

Opens the text-content editing bar and mobile keyboard.

### Font

Displays font previews rather than text-only menu labels where possible.

The font family name may appear inside each preview because it is the content being chosen, not a navigation label.

Only loaded or recently used fonts should be mounted initially.

### Alignment

Use recognizable alignment icons:

- left;
- center;
- right;
- justify.

### Spacing

Second-level icons:

- line height;
- letter spacing.

---

# 20. Fill Screen

Tap the Fill icon.

Recommended control surface:

```text
┌──────────────────────────────────────┐
│ [‹]                              [×] │
├──────────────────────────────────────┤
│  [large color swatch]    [eyedropper]│
│                                      │
│  checker/half icon ────────●  100% ◆│
│                                      │
│  #3B82F6                            │
└──────────────────────────────────────┘
```

Controls:

- large current-color swatch;
- color picker;
- eyedropper when supported;
- opacity slider;
- numeric opacity;
- hexadecimal input;
- keyframe diamond for animatable fill opacity or color when supported.

No text label such as “Opacity” is required; use the half-filled/checker icon.

The visible hexadecimal value is allowed because it is data.

The color picker itself is mounted only when the swatch is tapped.

---

# 21. Border and Shadow Root

Tap Border & Shadow.

Display two large icon choices:

```text
┌──────────────────────────────────────┐
│ [‹]                              [×] │
├──────────────────────────────────────┤
│                                      │
│          ▢                ◩          │
│                                      │
└──────────────────────────────────────┘
```

Internal meaning:

- outlined square → Border;
- offset square shadow → Shadow.

No permanent names.

---

# 22. Border Detail

Controls:

```text
color swatch
stroke width
stroke style
corner radius shortcut when relevant
```

Suggested layout:

```text
[swatch]      ↔  2 px   ◆
[solid-style preview picker]
```

Stroke styles can be represented by line previews:

```text
────────
- - - -
········
```

The actual line previews remove the need for visible style names.

---

# 23. Shadow Detail

Controls:

```text
shadow color
offset X
offset Y
blur
spread
opacity
```

Use icon rows:

| Property | Icon |
|---|---|
| X offset | horizontal arrows |
| Y offset | vertical arrows |
| Blur | blurred circle |
| Spread | expanding square |
| Opacity | half-filled circle |

Each animatable property has a diamond.

Because shadow can be paint-heavy, the blur and spread controls may show a small performance indicator when values become expensive.

The indicator should be an icon, not a permanent warning paragraph.

A tap or long press can reveal the explanation.

---

# 24. Blend and Opacity Root

Tap Blend & Opacity.

First-level choices:

```text
[Opacity] [Blend Mode]
```

Icons:

- half-filled circle → Opacity;
- overlapping circles → Blend Mode.

### Opacity detail

```text
half-filled-circle ─────────● 80% ◆
```

### Blend mode picker

Blend modes are difficult to represent reliably with abstract icons.

Use visual sample thumbnails:

```text
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ ◐  │ │ ◐  │ │ ◐  │ │ ◐  │
└────┘ └────┘ └────┘ └────┘
```

Each thumbnail shows the result of two overlapping sample colors.

The blend-mode name is available through:

- accessibility label;
- temporary long-press tooltip;
- optional small transient toast after selection.

No permanent names are displayed in the grid.

Initially support only modes that work reliably in export.

---

# 25. Move & Transform Root

Tap Move & Transform.

The timeline rows are replaced by a transform workspace while the viewport remains visible.

Reference layout:

```text
┌──────────────────────────────────────┐
│ [‹]       mini progress         [×] │  40
├──────────────────────────────┬───────┤
│                              │  ⤢    │
│    gesture control pad       ├───────┤ 132
│                              │  ↻    │
├──────────────────────────────┴───────┤
│  ◀◆          ◇          ◆▶      〽  │  48
└──────────────────────────────────────┘
```

Approximate dimensions for `390px` width:

```text
horizontal padding: 16 + 16
usable width:       358
gesture pad:        294 × 132
gap:                  8
right tool rail:     56 × 132
```

The gesture pad defaults to Position.

Right rail:

```text
Scale
Rotation
```

The active mode is highlighted.

Only one mode controller is mounted at a time.

---

# 26. Position Controller

Position mode:

```text
drag pad horizontally → change X
drag pad vertically   → change Y
```

The pad is not the viewport itself. It is a dedicated fine-control surface.

The viewport may still support direct dragging of the selected object.

Both write to the same property state.

Display current values in a compact overlay:

```text
↔ 120 px       ↕ 840 px
```

A tap on a value opens the numeric keyboard.

Keyframe action for Position controls both X and Y as one transform-position operation initially.

The data model may still store X and Y as separate tracks.

---

# 27. Scale Controller

Tap the Scale icon.

The gesture pad changes into a scale surface.

Recommended gesture:

```text
drag right/up   → scale larger
drag left/down  → scale smaller
```

Display:

```text
↔ 100%       ↕ 100%       [link]
```

The link icon controls uniform scaling.

Pinch directly on the selected object may also change scale later, but the dedicated pad is the stable mobile control.

---

# 28. Rotation Controller

Tap the Rotation icon.

The gesture pad becomes a circular or horizontal rotation control.

Recommended interaction:

```text
horizontal drag → change rotation
```

Display:

```text
↻ 0°
```

The value is editable numerically.

Optional snapping:

```text
0°
45°
90°
180°
270°
```

may occur while holding a future precision modifier. It is not required initially.

---

# 29. Transform Keyframe Rail

Bottom rail:

```text
[previous keyframe] [add/remove diamond] [next keyframe] [curve]
```

No labels.

Behavior depends on active transform mode.

### Position active

Diamond creates/removes Position keyframe(s).

### Scale active

Diamond creates/removes Scale keyframe(s).

### Rotation active

Diamond creates/removes Rotation keyframe.

The previous and next icons jump the playhead to adjacent keyframes in the active property context.

The curve icon is disabled when no valid segment exists.

---

# 30. Property Keyframe Rules

Keyframes belong to properties, not merely to a layer.

Diamond states:

```text
◇ no keyframe at current playhead
◆ keyframe exists at current playhead
```

Tap `◇`:

```text
create property track if absent
create keyframe at current global progress
capture current displayed value
```

Tap `◆`:

```text
remove keyframe at current progress
```

If the track becomes empty:

```text
remove track
preserve current property as static value
```

If the playhead is between existing keyframes:

```text
tap ◇
→ create keyframe using current interpolated value
```

Before the first keyframe:

```text
hold first keyframe value
```

After the last keyframe:

```text
hold last keyframe value
```

Between keyframes:

```text
interpolate according to the segment easing
```

---

# 31. Editing an Animated Property

When a property already has keyframes, changing its value at the playhead follows this rule:

### Keyframe exists at playhead

```text
update that keyframe
```

### No keyframe exists at playhead

Recommended motion-editor behavior:

```text
automatically create a keyframe at playhead
then apply the new value
```

This automatic insertion must be visually clear:

```text
diamond changes from ◇ to ◆
```

Do not silently modify every keyframe or the static base value.

A future preference may allow “edit base value,” but the initial behavior must remain predictable.

---

# 32. Curve Editor

The Curve button is active only when:

- the active property has at least two keyframes;
- the playhead is between two keyframes or a segment is explicitly selected.

Layout:

```text
┌──────────────────────────────────────┐
│ [‹]       property icon         [×] │
├──────────────────────────────────────┤
│                                      │
│          curve graph area            │
│                                      │
├──────────────────────────────────────┤
│ [linear] [ease-in] [ease-out] [S]   │
└──────────────────────────────────────┘
```

Preset controls display curve thumbnails, not names.

Presets:

- linear line;
- ease-in curve;
- ease-out curve;
- ease-in-out S curve.

Custom mode allows dragging Bézier handles.

Easing is stored per segment:

```js
keyframe.easingToNext = {
  type: "cubic-bezier",
  x1: 0.22,
  y1: 1,
  x2: 0.36,
  y2: 1
};
```

It is not stored once for the complete layer.

---

# 33. Effects Root

Tap Effects.

Current effects list:

```text
applied effect cards
+
Add Effect icon
```

An effect card uses:

- effect preview icon;
- enable/disable eye icon;
- reorder handle;
- remove icon.

No permanent effect name is required in the compact list, but the effect's visual icon or preview must be distinctive.

Because some effects are impossible to identify safely by icon alone, a temporary tooltip or a small value title inside the detail screen may be used.

The user's icon-only requirement applies primarily to menu choices. A unique effect identifier may appear transiently when entering its detail screen if necessary for clarity.

---

# 34. Add Effect Browser

Tap Add Effect.

Use category icons first:

```text
[Blur] [Color] [Light] [Shadow] [Distort] [Utility]
```

Only implemented categories appear.

Tap a category to display live preview thumbnails.

Example Blur category:

```text
┌────┐ ┌────┐
│soft│ │dir │
└────┘ └────┘
```

The thumbnail itself demonstrates the result.

Initial effect set should remain small:

- Blur;
- Brightness;
- Contrast;
- Saturation;
- Drop Shadow;
- Color Overlay.

Effect controls are generated from an effect registry:

```js
effectRegistry = {
  blur: {
    icon: "blur",
    parameters: {
      amount: {
        type: "number",
        animatable: true,
        min: 0,
        max: 100
      }
    }
  }
};
```

Only the selected effect detail component is mounted.

---

# 35. Layer Row Interaction

Normal layer row:

```text
[type icon] name              timeline bar
```

Tap:

```text
select one layer
```

Long press:

```text
enter multi-selection
select the pressed layer
```

While multi-selection is active:

```text
tap rows → toggle selected state
```

Vertical drag handle:

```text
reorder stacking
```

Horizontal bar gestures:

```text
center drag → move bar
left handle → trim start
right handle → trim end
```

The vertical reorder handle and horizontal timeline bar must be separate hit regions.

---

# 36. Group Creation Flow

Grouping is not part of Add.

Flow:

```text
long press one bar
→ multi-selection mode
→ tap additional sibling bars
→ tap Group icon in top-right
```

Existing grouping behavior may be reused initially.

The deeper structural group migration remains governed by Point 2.

After grouping:

```text
selection mode closes
new group becomes selected
property dock appears
```

If the selected layers are non-adjacent and grouping changes stacking:

```text
show icon-based confirmation dialog
```

The dialog may include concise explanatory text because it is a destructive or structural warning, not a regular menu label.

---

# 37. Duplicate Flow

Flow:

```text
select one or more bars
→ tap Duplicate icon in top-right
→ call existing duplicate function
```

Existing function:

```js
window.duplicateSelected();
```

Recommended placement offset for duplicates:

```text
x + 16 px
y + 16 px
```

Timeline bars receive the same ranges and keyframes as their originals.

The newly created copies become selected.

---

# 38. Delete Flow

Tap Delete in multi-selection mode.

For ordinary objects:

```text
delete immediately
```

or show a short undo snackbar only if an undo model is later added. The current design has no Undo control.

For a structural group:

```text
show a confirmation choice:
- remove group and keep children
- delete group and children
- cancel
```

These choices may require concise text because icons alone would be dangerously ambiguous.

Icon-only rules must never reduce safety for destructive operations.

---

# 39. Preview and Export Preservation

Preview and Export remain existing top-level functions.

UI redesign must not rewrite those actions during the first visual migration.

Use adapters:

```js
document
  .querySelector("[data-action='preview']")
  .addEventListener("click", () => {
    document.getElementById("btn-preview-top")?.click();
  });

document
  .querySelector("[data-action='export']")
  .addEventListener("click", () => {
    document.getElementById("btn-export-top")?.click();
  });
```

A cleaner command architecture can replace synthetic clicks later.

The same principle applies to:

```js
window.groupSelectedShapes();
window.duplicateSelected();
window.deleteSelected();
```

---

# 40. Lazy Component Mounting

Required behavior:

```text
Main timeline visible
→ Add, Fill, Transform, Effects screens are not mounted

Add Root visible
→ only Add Root is mounted

Shape Picker visible
→ Add Root choices are unmounted

Transform Position visible
→ Scale and Rotation controllers are unmounted

Curve Editor visible
→ Transform gesture pad is unmounted
```

Persistent state lives in the project and UI store, not inside hidden components.

Example:

```js
uiState = {
  screenStack: [
    { type: "editor" },
    {
      type: "move-transform",
      layerId: "layer-1",
      mode: "position"
    }
  ]
};
```

---

# 41. UI State Must Not Own Project Values

Do not store independent copies such as:

```js
transformPanel.x
viewportLayer.x
timelineKeyframe.x
```

The authoritative value belongs to the project store.

UI emits commands:

```js
dispatch({
  type: "SET_LAYER_PROPERTY",
  layerId,
  propertyPath: "transform.x",
  value,
  progress: currentProgress
});
```

Every visible surface reads the updated value.

This is required even though Undo/Redo controls are absent.

A command model is still needed for:

- consistent viewport updates;
- keyframe insertion;
- saving;
- export;
- AI operations;
- collaborative features later;
- preventing panel desynchronization.

---

# 42. Keyboard Behavior

When a numeric or text input opens the mobile keyboard:

- use `visualViewport` to measure the remaining height;
- keep the active input visible;
- avoid resizing the logical website viewport;
- temporarily reduce the contextual control area when necessary;
- preserve the playhead and selection;
- close with check or keyboard action.

The project preview's logical dimensions must not change because the operating-system keyboard appears.

---

# 43. Motion and Transitions

Context transitions should be fast:

```text
120–180 ms
```

Recommended:

- horizontal slide for deeper navigation;
- reverse horizontal slide for Back;
- short fade/scale for Add FAB;
- no large bouncing motion;
- respect reduced-motion settings.

The viewport must not resize during these transitions.

---

# 44. Current-Code Migration Strategy

The new UI can be introduced without immediately rewriting every editor function.

### Stage 1 — UI adapters

Use existing functions:

```text
Preview
Export
addShapeAt
image file input
groupSelectedShapes
duplicateSelected
deleteSelected
```

### Stage 2 — Context store

Add:

```js
uiState
navigationStack
activeContext
activeTransformMode
```

### Stage 3 — Command adapters

Wrap old mutations:

```js
commands.createLayer(...)
commands.setProperty(...)
commands.groupSelection(...)
commands.duplicateSelection(...)
commands.deleteSelection(...)
```

### Stage 4 — Remove global active-tool placement

Create objects directly at the visible viewport center.

### Stage 5 — Replace full render rebuilds

Patch only affected scene nodes and virtualized timeline rows.

---

# 45. Acceptance Criteria

This UI design is correctly implemented when:

1. The main Add menu contains only Shape, Text, and Image.
2. Group never appears in Add.
3. No More menu exists.
4. Vector and Freehand belong to Shape and remain hidden until implemented.
5. Menu choices are icon-only.
6. All icon-only buttons have accessible names.
7. Add creates objects at the center of the currently visible website viewport.
8. A new layer becomes selected immediately.
9. A new layer bar starts at the playhead and ends at 100%.
10. Text creation immediately enters content editing.
11. Image creation reuses the native file picker and preserves aspect ratio.
12. Selecting one layer displays a contextual property icon dock.
13. Selecting multiple bars replaces Preview/Export with Group, Duplicate, and Delete.
14. Move & Transform displays one active controller at a time.
15. Position, Scale, and Rotation use a gesture pad with numeric values.
16. Keyframes belong to properties.
17. Editing an animated property creates or updates a keyframe at the playhead.
18. Curve easing belongs to a segment between two keyframes.
19. Fill, Border, Shadow, Blend, and Effects use deeper lazy screens.
20. Complex visual choices such as blend modes and effects use thumbnails instead of permanent names.
21. Only the active contextual screen is mounted.
22. The logical website viewport does not resize when changing contextual screens.
23. Existing Preview, Export, Group, Duplicate, and Delete behavior remains connected during migration.
24. Project data remains authoritative across viewport, timeline, properties, save, and export.

---

# 46. Final UI Statement

> NowAction uses an icon-only contextual editing system. The Add FAB opens only Shape, Text, and Image. Shapes open a deeper picker, while Group is created through timeline multi-selection. Selecting a layer reveals only relevant property categories; choosing a category replaces the contextual area with one focused editor. Move & Transform lazily switches between Position, Scale, and Rotation controllers, with property-specific keyframes and per-segment easing. Only the active contextual screen is mounted, while the fixed website viewport, project state, timeline state, Preview, and Export remain stable.
