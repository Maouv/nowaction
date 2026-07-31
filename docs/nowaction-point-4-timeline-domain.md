# NowAction Architecture Decision — Point 4
## Global Timeline Domain and Layer Bar Ranges

**Status:** Implemented baseline

## Decision

The global timeline always represents the complete normalized website-scroll journey:

```text
0%   = top of the website
100% = bottom of the website
```

It is not extended or shortened by the longest layer bar.

## Independent values

- **Document height** determines the available scroll distance in pixels.
- **Global timeline** always remains `0..1`.
- **Layer bar** determines the scroll-progress range in which that layer is visible and interactive.
- **Group summary range** may be derived from its members.

## Layer range

```js
animation: {
  rangeStart: 20,
  rangeEnd: 70,
  keyframes: []
}
```

Outside this range, exported output uses stable visibility rather than collapsing layout with `display: none`.

## Editing behavior

- Moving the bar moves the range and all of that layer's keyframes by the same delta.
- Trimming changes only `rangeStart` or `rangeEnd`.
- Trimming does not delete, move, or retime keyframes.
- A keyframe may remain stored outside the active bar.
- Retime/stretch remains a separate future feature.
- Bars and keyframes are clamped to `0..1`.

## New-layer default

A newly created layer starts at the current playhead and ends at `100%`. Near the timeline end, the editor preserves a minimum editable bar range.

## Final statement

> The website height defines pixel scroll distance, while the global timeline remains a stable normalized `0..1` domain. Layer bars describe active ranges within that domain and never define the end of the project.
