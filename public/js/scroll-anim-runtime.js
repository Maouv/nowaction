/*!
 * ScrollAnim — lightweight scroll-driven keyframe animation runtime.
 * Used both live inside the NOWACTION editor (for the timeline preview)
 * and injected into exported static sites (IntersectionObserver + rAF).
 * No dependencies. Exposes a single global: window.ScrollAnim
 *
 * Keyframe format (unified):
 *   keyframes: [
 *     { p: 0,   x: 0,   y: 100, opacity: 0,   blur: 10, ease: 'easeOut' },
 *     { p: 50,  x: 100,                        blur: 0,  ease: 'linear'  },
 *     { p: 100, x: 200, y: 0,   opacity: 100              }
 *   ]
 * Each keyframe stores only the props it cares about (sparse is fine).
 * `ease` on keyframe i applies to the segment i → i+1.
 * Supported props: x, y, w, h, opacity, rotation, blur
 */
(function (global) {
  'use strict';

  var EASING_PRESETS = {
    linear:      [0, 0, 1, 1],
    ease:        [0.25, 0.1, 0.25, 1],
    easeIn:      [0.42, 0, 1, 1],
    easeOut:     [0, 0, 0.58, 1],
    easeInOut:   [0.42, 0, 0.58, 1],
    easeInBack:  [0.36, 0, 0.66, -0.56],
    easeOutBack: [0.34, 1.56, 0.64, 1]
  };

  var ANIM_PROPS = ['x', 'y', 'w', 'h', 'opacity', 'rotation', 'blur'];

  // ---------------------------------------------------------------------------
  // Cubic bezier solver
  // ---------------------------------------------------------------------------
  function makeCubicBezier(x1, y1, x2, y2) {
    function A(a1, a2) { return 1.0 - 3.0 * a2 + 3.0 * a1; }
    function B(a1, a2) { return 3.0 * a2 - 6.0 * a1; }
    function C(a1)     { return 3.0 * a1; }
    function sampleX(t) { return ((A(x1, x2) * t + B(x1, x2)) * t + C(x1)) * t; }
    function sampleY(t) { return ((A(y1, y2) * t + B(y1, y2)) * t + C(y1)) * t; }
    function sampleDerivX(t) { return (3.0 * A(x1, x2) * t + 2.0 * B(x1, x2)) * t + C(x1); }
    function solveT(x) {
      var t = x;
      for (var i = 0; i < 8; i++) {
        var dx = sampleX(t) - x;
        var d = sampleDerivX(t);
        if (Math.abs(dx) < 1e-6) return t;
        if (Math.abs(d) < 1e-6) break;
        t -= dx / d;
      }
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
    var key = Array.isArray(ease) ? ease.join(',') : (ease || 'linear');
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

  // ---------------------------------------------------------------------------
  // Migration: old per-prop tracks → unified keyframes
  // ---------------------------------------------------------------------------
  function migrateTracksToKeyframes(tracks) {
    // Collect all unique progress points across all tracks
    var progressSet = {};
    ANIM_PROPS.forEach(function (prop) {
      var track = tracks[prop] || [];
      track.forEach(function (kf) { progressSet[kf.p] = true; });
    });

    var progressPoints = Object.keys(progressSet).map(Number).sort(function (a, b) { return a - b; });

    return progressPoints.map(function (p) {
      var kf = { p: p };
      ANIM_PROPS.forEach(function (prop) {
        var track = tracks[prop] || [];
        // Find exact match at this progress point
        var match = track.find(function (k) { return k.p === p; });
        if (match !== undefined) {
          kf[prop] = match.v;
          // Copy ease from this prop's keyframe (first prop with ease wins if multiple exist)
          if (match.ease !== undefined && kf.ease === undefined) {
            kf.ease = match.ease;
          }
        }
      });
      if (kf.ease === undefined) kf.ease = 'linear';
      return kf;
    });
  }

  // Normalise a cfg object so it always has `keyframes`, `rangeStart`, `rangeEnd`.
  // Mutates cfg in place (for efficiency in the runtime loop).
  function normaliseCfg(cfg) {
    if (!cfg.keyframes) {
      if (cfg.tracks) {
        cfg.keyframes = migrateTracksToKeyframes(cfg.tracks);
        delete cfg.tracks;
      } else {
        cfg.keyframes = [];
      }
    }
    if (cfg.rangeStart === undefined) cfg.rangeStart = 0;
    if (cfg.rangeEnd   === undefined) cfg.rangeEnd   = 100;
  }

  // ---------------------------------------------------------------------------
  // Interpolation against unified keyframes
  // ---------------------------------------------------------------------------

  // Get the value of a single prop at `progress` from a unified keyframes array.
  // Only keyframes that actually define the prop are used (sparse semantics).
  function interpolateProp(keyframes, prop, progress) {
    // Collect only keyframes that define this prop
    var relevant = keyframes.filter(function (kf) { return kf[prop] !== undefined; });
    if (relevant.length === 0) return undefined;
    if (relevant.length === 1) return relevant[0][prop];

    if (progress <= relevant[0].p) return relevant[0][prop];
    if (progress >= relevant[relevant.length - 1].p) return relevant[relevant.length - 1][prop];

    for (var i = 0; i < relevant.length - 1; i++) {
      var a = relevant[i], b = relevant[i + 1];
      if (progress >= a.p && progress <= b.p) {
        var span = b.p - a.p;
        var t = span <= 0 ? 1 : (progress - a.p) / span;
        var eased = getEasingFn(a.ease || 'linear')(t);
        return a[prop] + (b[prop] - a[prop]) * eased;
      }
    }
    return relevant[relevant.length - 1][prop];
  }

  // Legacy compat: interpolate a standalone track array (old format).
  // Kept so existing callers (scroll-anim-ui.js applyScrubPreview) still work
  // until they are migrated too.
  function interpolateTrack(track, progress) {
    if (!track || track.length === 0) return undefined;
    if (track.length === 1) return track[0].v;
    var sorted = track;
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

  // ---------------------------------------------------------------------------
  // Progress computation
  // ---------------------------------------------------------------------------
  function computeElementProgress(el, trigger) {
    var startVH = (trigger && typeof trigger.startVH === 'number') ? trigger.startVH : 100;
    var endVH   = (trigger && typeof trigger.endVH   === 'number') ? trigger.endVH   : 0;
    var vh = global.innerHeight || document.documentElement.clientHeight;
    var startPx = vh * (startVH / 100);
    var endPx   = vh * (endVH   / 100);
    var rectTop = el.getBoundingClientRect().top;
    var denom = (startPx - endPx);
    if (denom === 0) return rectTop <= endPx ? 100 : 0;
    var raw = (startPx - rectTop) / denom;
    return Math.min(100, Math.max(0, raw * 100));
  }

  function computeGlobalProgress() {
    var doc = document.documentElement;
    var max = (doc.scrollHeight - global.innerHeight);
    if (max <= 0) return 0;
    var y = global.scrollY || doc.scrollTop || 0;
    return Math.min(100, Math.max(0, (y / max) * 100));
  }

  // Returns the raw 0-100 progress for the cfg's mode (global scroll or element viewport).
  function computeRawProgress(cfg, el) {
    if (cfg.mode === 'global') return computeGlobalProgress();
    return computeElementProgress(el, cfg.trigger || {});
  }

  // Returns local progress (0-100) within the element's rangeStart/rangeEnd window,
  // or -1 if the element is outside its range (should be hidden).
  function computeProgress(cfg, el) {
    var raw = computeRawProgress(cfg, el);
    var rs  = cfg.rangeStart !== undefined ? cfg.rangeStart : 0;
    var re  = cfg.rangeEnd   !== undefined ? cfg.rangeEnd   : 100;
    if (raw < rs || raw > re) return -1; // outside range
    var span = re - rs;
    if (span <= 0) return 0;
    return Math.min(100, Math.max(0, ((raw - rs) / span) * 100));
  }

  // ---------------------------------------------------------------------------
  // Apply to DOM element
  //
  // x/y are applied as translate() offset on top of the element's natural
  // left/top (which the editor's render() manages). This way render() can
  // re-run freely without wiping the preview — translate lives in `transform`
  // and render() never touches that.
  //
  // Exported static sites pass opts.exportMode = true, which sets left/top
  // directly (no render() loop there to worry about).
  // ---------------------------------------------------------------------------
  function applyToElement(el, cfg, progress, opts) {
    normaliseCfg(cfg);
    var kfs = cfg.keyframes;
    if (!kfs || kfs.length === 0) return;

    var exportMode = opts && opts.exportMode;

    var x        = interpolateProp(kfs, 'x',        progress);
    var y        = interpolateProp(kfs, 'y',        progress);
    var w        = interpolateProp(kfs, 'w',        progress);
    var h        = interpolateProp(kfs, 'h',        progress);
    var opacity  = interpolateProp(kfs, 'opacity',  progress);
    var rotation = interpolateProp(kfs, 'rotation', progress);
    var blur     = interpolateProp(kfs, 'blur',     progress);

    // w / h / opacity / blur — safe to set directly in both modes
    if (w       !== undefined) el.style.width   = w + 'px';
    if (h       !== undefined) el.style.height  = h + 'px';
    if (opacity !== undefined) el.style.opacity = (opacity / 100).toFixed(3);
    if (blur    !== undefined) el.style.filter  = blur > 0 ? ('blur(' + blur + 'px)') : 'none';

    if (exportMode) {
      // Exported site: no render() loop — set left/top absolutely
      if (x !== undefined) el.style.left = x + 'px';
      if (y !== undefined) el.style.top  = y + 'px';
      if (rotation !== undefined) el.style.transform = 'rotate(' + rotation + 'deg)';
    } else {
      // Editor preview: x/y as translate() offset from base left/top so that
      // when render() rewrites innerHTML the preview stays intact on the
      // *next* applyScrubPreview call, and doesn't spawn/snap mid-scrub.
      var translateX = 0, translateY = 0;
      if (x !== undefined) translateX = x - (parseFloat(el.style.left) || 0);
      if (y !== undefined) translateY = y - (parseFloat(el.style.top)  || 0);

      var transformParts = [];
      if (x !== undefined || y !== undefined) {
        transformParts.push('translate(' + translateX + 'px, ' + translateY + 'px)');
      }
      if (rotation !== undefined) {
        transformParts.push('rotate(' + rotation + 'deg)');
      }
      if (transformParts.length) {
        el.style.transform = transformParts.join(' ');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Runtime init (for exported static sites)
  // ---------------------------------------------------------------------------
  function init(manifest, opts) {
    opts = opts || {};
    var scopeRoot = opts.root || document;

    var entries = (manifest || []).map(function (cfg) {
      normaliseCfg(cfg); // ensure new format before we start looping
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
        if (progress < 0) {
          // Outside the element's active scroll range — hide it
          entry.el.style.display = 'none';
        } else {
          entry.el.style.display = '';
          applyToElement(entry.el, entry.cfg, progress, { exportMode: true });
        }
      }
    }
    function requestUpdate() {
      if (!ticking) { ticking = true; global.requestAnimationFrame(update); }
    }

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

  // ---------------------------------------------------------------------------
  global.ScrollAnim = {
    EASING_PRESETS:           EASING_PRESETS,
    ANIM_PROPS:               ANIM_PROPS,
    getEasingFn:              getEasingFn,
    interpolateProp:          interpolateProp,
    interpolateTrack:         interpolateTrack,  // legacy compat
    migrateTracksToKeyframes: migrateTracksToKeyframes,
    normaliseCfg:             normaliseCfg,
    computeElementProgress:   computeElementProgress,
    computeGlobalProgress:    computeGlobalProgress,
    computeRawProgress:       computeRawProgress,
    computeProgress:          computeProgress,
    applyToElement:           applyToElement,
    init:                     init
  };
})(window);

