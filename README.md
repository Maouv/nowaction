# NOWACTION — Motion Website Builder

NOWACTION is a mobile-first website experience builder with a motion-editor workflow. The main editor now uses a fixed mobile website viewport, a scroll-progress timeline, contextual icon-only tools, layer bars, keyframes, easing curves, effects, and layer-code export.

## Run locally

Requirements:

- Node.js 18 or newer
- npm

```bash
npm install
npm run dev
```

Open the URL printed by the server, normally `http://localhost:3000`.

Optional AI Copilot configuration remains available through the legacy editor. Copy `.env.example` to `.env` and fill the supported provider keys when needed.

## Main editor

The default `/` route contains the redesigned motion editor:

- fixed `390 × 844` mobile preview frame;
- website document scrolling inside the frame;
- scroll position as the global playhead;
- editor-only auto-scroll playback;
- one object represented by one timeline bar;
- top timeline row rendered in front;
- vertical layer reorder;
- bar move and non-destructive trim;
- global keyframe positions;
- timeline zoom and pan gestures;
- progressive Add flow for Shape, Text, and Image;
- multi-selection Group, Duplicate, and Delete actions;
- Fill, Border, Shadow, Blend, Opacity, Transform, Effects, Curve, and Code contexts;
- SVG-based rectangle and circle rendering;
- contextual `</>` layer-code generator;
- complete HTML and ZIP export;
- project background and auto/custom document height;
- timeline and scene virtualization.

The previous editor and AI Copilot remain available at:

```text
/legacy.html
```

## Project persistence

The server stores additional project-level fields:

```json
{
  "schemaVersion": 3,
  "viewport": { "width": 390, "height": 844 },
  "canvasConfig": {
    "heightMode": "auto",
    "customHeight": 2400,
    "bottomPadding": 160
  },
  "background": {
    "color": "#ffffff",
    "transparent": false
  }
}
```

Existing projects are migrated in the browser when loaded. Legacy keyframes using `p` are converted to normalized global `at` positions.

## Export behavior

The export compiler generates:

- stable full-document background;
- responsive horizontal layout based on the 390 px design width;
- SVG shapes;
- lightweight animation manifest;
- a shared scroll runtime only when a bar range or keyframe requires it;
- safe escaped text;
- lazy image loading;
- active-range visibility without collapsing document height.

The selected-layer Code action uses the same export path as full export, rather than copying editor DOM.

## Validation

```bash
npm run check
```

The redesign was smoke-tested at a `390 × 844` mobile viewport for:

- initial load;
- shape creation;
- layer selection;
- property dock navigation;
- transform keyframe creation;
- effects and effect keyframes;
- layer-code generation;
- complete export runtime playback.

## Architecture documents

The `/docs` directory contains the architecture and UI decisions used for this implementation. See `IMPLEMENTATION_NOTES.md` for implemented scope and explicit backlog items.
