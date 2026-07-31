# Implementation Notes

This package contains a working core redesign of NowAction based on the architecture discussions in `/docs`.

## Implemented

- Fixed mobile website viewport with an internal vertical scroll root.
- Scroll progress as the global playhead.
- Editor-only auto-scroll preview.
- Auto and custom document height plus a built-in project background.
- One object represented by one timeline bar.
- Top timeline row rendered in front.
- Timeline row virtualization and preview-scene virtualization.
- Layer selection, long-press multi-selection, reorder, Group, Duplicate, and Delete.
- Global bar move, non-destructive trim, keyframe movement, ruler scrubbing, pinch zoom, and horizontal timeline pan.
- Timeline snapping to project boundaries, playhead, nearby bars, and keyframes.
- Progressive Add flow containing Shape, Text, and Image.
- SVG rectangle and circle renderer.
- Icon-only contextual editing for Fill, Border, Shadow, Blend, Opacity, Transform, Effects, Curve, and Code.
- Position, Scale, and Rotation gesture controller.
- Property keyframes and per-segment cubic Bézier curves.
- Blur, Brightness, Contrast, and Saturation effects.
- Selected-layer `</>` code generation.
- Full HTML and ZIP website export.
- Export performance report.
- Compiled export animation tracks, active-range buckets, cached style writes, reduced-motion handling, and complete runtime cleanup.
- Existing legacy editor and AI Copilot preserved at `/legacy.html`.

## Deliberately retained during migration

Grouping currently reuses NowAction's existing flat `groupId` behavior so the current Group/Duplicate/Delete workflow remains operational. The full structural group-node migration described in Point 2 is a larger data-model migration and is not silently forced into existing saved projects.

## Backlog

These items were explicitly deferred or require a separate production phase:

- Structural nested groups with local coordinates and recursive export wrappers.
- Group-level keyframes.
- Vector Drawing and Freehand Drawing tools.
- Masking, matte, clip-content, and parenting systems.
- Dedicated preview Pan & Zoom inspection mode.
- Separate X/Y animation dimensions.
- Gradient fills and multiple fills/shadows.
- More effects and advanced SVG filters.
- Native CSS ScrollTimeline progressive enhancement.
- Framework-specific copied code such as React, Vue, or Svelte.
- Production asset upload/hosting pipeline for copied image code.
- Full automated browser compatibility matrix and device performance lab.

## Validation performed

- Node syntax checks for the server, editor, and export runtime.
- Mobile interaction smoke tests at a `390 × 844` viewport using an API shim.
- Shape creation, selection, transform, keyframe, curve/effect, multi-selection, Group, project settings, and Code-screen flows.
- Generated export loaded as a standalone page and responded to scroll-driven animation without console errors.

## Run

```bash
npm install
npm run dev
```

Then open the URL printed by the server. The original editor remains available at `/legacy.html`.
