/*!
 * ScrollAnim — lightweight scroll-driven keyframe animation runtime.
 * Used both live inside the NOWACTION editor (for the timeline preview)
 * and injected into exported static sites (IntersectionObserver + rAF).
 * No dependencies. Exposes a single global: window.ScrollAnim
 */
(function (global) {
  'use strict';

  var EASING_PRESETS = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    easeInBack: [0.36, 0, 0.66, -0.56],
    easeOutBack: [0.34, 1.56, 0.64, 1]
  };

  // Cubic bezier solver (x1,y1,x2,y2 with implicit P0=(0,0) P3=(1,1)).
  // Standard Newton-Raphson + bisection fallback approach, own implementation.
  function makeCubicBezier(x1, y1, x2, y2) {
    if (x1 === y1 && x2 === y2) {
      // Not exactly linear unless (0,0,1,1), but treat symmetrical simple cases fast.
    }
    function A(a1, a2) { return 1.0 - 3.0 * a2 + 3.0 * a1; }
    function B(a1, a2) { return 3.0 * a2 - 6.0 * a1; }
    function C(a1) { return 3.0 * a1; }

    function sampleX(t) { return ((A(x1, x2) * t + B(x1, x2)) * t + C(x1)) * t; }
    function sampleY(t) { return ((A(y1, y2) * t + B(y1, y2)) * t + C(y1)) * t; }
    function sampleDerivX(t) { return (3.0 * A(x1, x2) * t + 2.0 * B(x1, x2)) * t + C(x1); }

    function solveT(x) {
      var t = x;
      // Newton-Raphson (a handful of iterations converges for typical bezier easings)
      for (var i = 0; i < 8; i++) {
        var dx = sampleX(t) - x;
        var d = sampleDerivX(t);
        if (Math.abs(dx) < 1e-6) return t;
        if (Math.abs(d) < 1e-6) break;
        t -= dx / d;
      }
      // Bisection fallback
      var lo = 0, hi = 1;
      t = x;
      for (var j = 0; j < 20; j++) {
        var xEst = sampleX(t);
        if (Math.abs(xEst - x) < 1e-6) return t;
        if (xEst < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return t;
    }

    return function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return sampleY(solveT(t));
    };
  }

  var easingFnCache = {};
  function getEasingFn(ease) {
    var key = Array.isArray(ease) ? ease.join(',') : ease;
    if (easingFnCache[key]) return easingFnCache[key];
    var pts;
    if (Array.isArray(ease) && ease.length === 4) {
      pts = ease;
    } else if (typeof ease === 'string' && EASING_PRESETS[ease]) {
      pts = EASING_PRESETS[ease];
    } else {
      pts = EASING_PRESETS.linear;
    }
    var fn = makeCubicBezier(pts[0], pts[1], pts[2], pts[3]);
    easingFnCache[key] = fn;
    return fn;
  }

  // Interpolate a single property track at a given progress (0-100).
  // track = [{ p: 0-100, v: number, ease: 'linear' | [x1,y1,x2,y2] }, ...]
  // `ease` on keyframe i describes the curve used for the segment i -> i+1.
  function interpolateTrack(track, progress) {
    if (!track || track.length === 0) return undefined;
    if (track.length === 1) return track[0].v;
    var sorted = track; // caller is expected to keep tracks pre-sorted by p
    if (progress <= sorted[0].p) return sorted[0].v;
    if (progress >= sorted[sorted.length - 1].p) return sorted[sorted.length - 1].v;

    for (var i = 0; i < sorted.length - 1; i++) {
      var a = sorted[i], b = sorted[i + 1];
      if (progress >= a.p && progress <= b.p) {
        var span = b.p - a.p;
        var t = span <= 0 ? 1 : (progress - a.p) / span;
        var eased = getEasingFn(a.ease || 'linear')(t);
        return a.v + (b.v - a.v) * eased;
      }
    }
    return sorted[sorted.length - 1].v;
  }

  // progress 0-100 for "element" trigger mode: element's own entrance/exit window.
  // trigger = { startVH: 0-100 (viewport % from top where progress=0), endVH: 0-100 (where progress=100) }
  function computeElementProgress(el, trigger) {
    var startVH = (trigger && typeof trigger.startVH === 'number') ? trigger.startVH : 100;
    var endVH = (trigger && typeof trigger.endVH === 'number') ? trigger.endVH : 0;
    var vh = global.innerHeight || document.documentElement.clientHeight;
    var startPx = vh * (startVH / 100);
    var endPx = vh * (endVH / 100);
    var rectTop = el.getBoundingClientRect().top;
    var denom = (startPx - endPx);
    if (denom === 0) return rectTop <= endPx ? 100 : 0;
    var raw = (startPx - rectTop) / denom;
    return Math.min(100, Math.max(0, raw * 100));
  }

  // progress 0-100 for "global" mode: whole-document scroll position.
  function computeGlobalProgress() {
    var doc = document.documentElement;
    var max = (doc.scrollHeight - global.innerHeight);
    if (max <= 0) return 0;
    var y = global.scrollY || doc.scrollTop || 0;
    return Math.min(100, Math.max(0, (y / max) * 100));
  }

  function computeProgress(cfg, el) {
    if (cfg.mode === 'global') return computeGlobalProgress();
    return computeElementProgress(el, cfg.trigger || {});
  }

  // Apply interpolated values from cfg.tracks at `progress` directly onto el.style.
  // Only properties that actually have a track are touched, so any base styling
  // for other properties (set by the exporter) is left alone.
  function applyToElement(el, cfg, progress) {
    var tracks = cfg.tracks || {};
    var patch = {};
    if (tracks.x && tracks.x.length) patch.left = interpolateTrack(tracks.x, progress) + 'px';
    if (tracks.y && tracks.y.length) patch.top = interpolateTrack(tracks.y, progress) + 'px';
    if (tracks.w && tracks.w.length) patch.width = interpolateTrack(tracks.w, progress) + 'px';
    if (tracks.h && tracks.h.length) patch.height = interpolateTrack(tracks.h, progress) + 'px';
    if (tracks.opacity && tracks.opacity.length) patch.opacity = (interpolateTrack(tracks.opacity, progress) / 100).toFixed(3);
    var hasRotation = tracks.rotation && tracks.rotation.length;
    var hasBlur = tracks.blur && tracks.blur.length;
    if (hasRotation || hasBlur) {
      var rot = hasRotation ? interpolateTrack(tracks.rotation, progress) : (cfg._baseRotation || 0);
      var blur = hasBlur ? interpolateTrack(tracks.blur, progress) : null;
      var transformParts = [];
      if (hasRotation) transformParts.push('rotate(' + rot + 'deg)');
      if (transformParts.length) patch.transform = transformParts.join(' ');
      if (hasBlur) patch.filter = blur > 0 ? ('blur(' + blur + 'px)') : 'none';
    }
    for (var k in patch) { el.style[k] = patch[k]; }
  }

  // ---- Runtime for exported static sites ----
  function init(manifest, opts) {
    opts = opts || {};
    var scopeRoot = opts.root || document;
    var entries = (manifest || []).map(function (cfg) {
      var el = scopeRoot.querySelector('[data-anim-id="' + cfg.id + '"]');
      return el ? { cfg: cfg, el: el, active: cfg.mode === 'global' } : null;
    }).filter(Boolean);

    if (!entries.length) return { update: function () {}, destroy: function () {} };

    var ticking = false;
    function update() {
      ticking = false;
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.active) continue;
        var progress = computeProgress(entry.cfg, entry.el);
        applyToElement(entry.el, entry.cfg, progress);
      }
    }
    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        global.requestAnimationFrame(update);
      }
    }

    // IntersectionObserver only gates "element" mode entries so we don't
    // waste cycles on elements nowhere near the viewport. "global" mode
    // entries are always active since they depend on whole-page scroll.
    if ('IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (records) {
        records.forEach(function (rec) {
          var match = entries.find(function (e) { return e.el === rec.target; });
          if (match && match.cfg.mode !== 'global') match.active = rec.isIntersecting;
        });
        requestUpdate();
      }, { root: null, rootMargin: '50% 0px 50% 0px', threshold: 0 });

      entries.forEach(function (entry) {
        if (entry.cfg.mode !== 'global') io.observe(entry.el);
      });
    } else {
      // Fallback: no IO support, just always run every entry.
      entries.forEach(function (entry) { entry.active = true; });
    }

    global.addEventListener('scroll', requestUpdate, { passive: true });
    global.addEventListener('resize', requestUpdate);
    requestUpdate();

    return {
      update: requestUpdate,
      destroy: function () {
        global.removeEventListener('scroll', requestUpdate);
        global.removeEventListener('resize', requestUpdate);
      }
    };
  }

  global.ScrollAnim = {
    EASING_PRESETS: EASING_PRESETS,
    getEasingFn: getEasingFn,
    interpolateTrack: interpolateTrack,
    computeElementProgress: computeElementProgress,
    computeGlobalProgress: computeGlobalProgress,
    computeProgress: computeProgress,
    applyToElement: applyToElement,
    init: init
  };
})(window);

