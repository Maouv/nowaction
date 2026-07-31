(function (global) {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const clamp01 = (value) => clamp(value, 0, 1);
  const TRACK_PROPS = [
    'x', 'y', 'w', 'h', 'scaleX', 'scaleY', 'rotation', 'opacity',
    'fillOpacity', 'strokeWidth', 'blur', 'brightness', 'contrast', 'saturation'
  ];
  const easeCache = new Map();

  function normalizeEase(value) {
    if (Array.isArray(value) && value.length === 4) {
      return { x1: +value[0], y1: +value[1], x2: +value[2], y2: +value[3] };
    }
    if (value && typeof value === 'object' && Number.isFinite(+value.x1)) {
      return { x1: +value.x1, y1: +value.y1, x2: +value.x2, y2: +value.y2 };
    }
    const preset = {
      linear: [0, 0, 1, 1],
      ease: [.25, .1, .25, 1],
      'ease-in': [.42, 0, 1, 1],
      'ease-out': [0, 0, .58, 1],
      'ease-in-out': [.42, 0, .58, 1]
    }[value] || [0, 0, 1, 1];
    return { x1: preset[0], y1: preset[1], x2: preset[2], y2: preset[3] };
  }

  function easingFunction(value) {
    const easing = normalizeEase(value);
    const key = `${easing.x1},${easing.y1},${easing.x2},${easing.y2}`;
    if (easeCache.has(key)) return easeCache.get(key);
    const sample = (a1, a2, t) => ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
    const derivative = (a1, a2, t) => 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
    const fn = (input) => {
      let guess = clamp01(input);
      for (let index = 0; index < 5; index += 1) {
        const d = derivative(easing.x1, easing.x2, guess);
        if (Math.abs(d) < 1e-6) break;
        guess = clamp01(guess - (sample(easing.x1, easing.x2, guess) - input) / d);
      }
      return sample(easing.y1, easing.y2, guess);
    };
    easeCache.set(key, fn);
    return fn;
  }

  function progressOf(keyframe) {
    return clamp01(Number.isFinite(+keyframe.at) ? +keyframe.at : (+keyframe.p || 0) / 100);
  }

  function compileNumberTrack(keyframes, property, fallback) {
    const points = [];
    for (const keyframe of keyframes) {
      if (!Number.isFinite(+keyframe[property])) continue;
      points.push({
        at: progressOf(keyframe),
        value: +keyframe[property],
        ease: easingFunction(keyframe.easingToNext || keyframe.ease || 'linear')
      });
    }
    points.sort((a, b) => a.at - b.at);
    if (!points.length) return { fallback: +fallback || 0, points: null };
    return { fallback: +fallback || 0, points };
  }

  function hexRgb(hex) {
    const raw = String(hex || '#000000').replace('#', '');
    const value = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw.padEnd(6, '0').slice(0, 6);
    return {
      r: parseInt(value.slice(0, 2), 16) || 0,
      g: parseInt(value.slice(2, 4), 16) || 0,
      b: parseInt(value.slice(4, 6), 16) || 0
    };
  }

  function rgbHex(color) {
    const part = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
    return `#${part(color.r)}${part(color.g)}${part(color.b)}`;
  }

  function compileColorTrack(keyframes, property, fallback) {
    const points = [];
    for (const keyframe of keyframes) {
      if (typeof keyframe[property] !== 'string') continue;
      points.push({
        at: progressOf(keyframe),
        value: keyframe[property],
        rgb: hexRgb(keyframe[property]),
        ease: easingFunction(keyframe.easingToNext || keyframe.ease || 'linear')
      });
    }
    points.sort((a, b) => a.at - b.at);
    return { fallback: fallback || '#000000', points: points.length ? points : null };
  }

  function evaluateNumber(track, progress) {
    const points = track.points;
    if (!points) return track.fallback;
    if (progress <= points[0].at) return points[0].value;
    if (progress >= points[points.length - 1].at) return points[points.length - 1].value;
    let low = 0;
    let high = points.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (points[middle].at <= progress) low = middle;
      else high = middle;
    }
    const start = points[low];
    const end = points[high];
    const span = end.at - start.at;
    const local = span <= 0 ? 1 : (progress - start.at) / span;
    const eased = start.ease(local);
    return start.value + (end.value - start.value) * eased;
  }

  function evaluateColor(track, progress) {
    const points = track.points;
    if (!points) return track.fallback;
    if (progress <= points[0].at) return points[0].value;
    if (progress >= points[points.length - 1].at) return points[points.length - 1].value;
    let low = 0;
    let high = points.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (points[middle].at <= progress) low = middle;
      else high = middle;
    }
    const start = points[low];
    const end = points[high];
    const span = end.at - start.at;
    const local = span <= 0 ? 1 : (progress - start.at) / span;
    const eased = start.ease(local);
    return rgbHex({
      r: start.rgb.r + (end.rgb.r - start.rgb.r) * eased,
      g: start.rgb.g + (end.rgb.g - start.rgb.g) * eased,
      b: start.rgb.b + (end.rgb.b - start.rgb.b) * eased
    });
  }

  function scrollAdapter(scrollRoot) {
    const isWindow = !scrollRoot || scrollRoot === window;
    const element = isWindow ? (document.scrollingElement || document.documentElement) : scrollRoot;
    const eventTarget = isWindow ? window : element;
    return {
      element,
      top: () => isWindow ? window.scrollY : element.scrollTop,
      max: () => Math.max(0, element.scrollHeight - (isWindow ? window.innerHeight : element.clientHeight)),
      on: (handler) => eventTarget.addEventListener('scroll', handler, { passive: true }),
      off: (handler) => eventTarget.removeEventListener('scroll', handler)
    };
  }

  function compileEntry(layer, element) {
    const base = layer.base || {};
    const keyframes = Array.isArray(layer.keyframes) ? layer.keyframes : [];
    const range = Array.isArray(layer.activeRange) ? layer.activeRange : [0, 1];
    const tracks = {};
    for (const property of TRACK_PROPS) tracks[property] = compileNumberTrack(keyframes, property, base[property]);
    tracks.fill = compileColorTrack(keyframes, 'fill', base.fill || '#000000');
    const effects = (layer.effects || []).filter((effect) => effect.enabled !== false).map((effect) => ({
      id: effect.id,
      type: effect.type,
      track: compileNumberTrack(keyframes, `fx__${effect.id}`, effect.amount || 0)
    }));
    return {
      layer,
      element,
      base,
      tracks,
      effects,
      start: Math.min(clamp01(+range[0] || 0), clamp01(+range[1] || 0)),
      end: Math.max(clamp01(+range[0] || 0), clamp01(+range[1] || 0)),
      last: Object.create(null)
    };
  }

  function makeBuckets(entries, count = 128) {
    const buckets = Array.from({ length: count }, () => []);
    entries.forEach((entry, index) => {
      const start = clamp(Math.floor(entry.start * (count - 1)), 0, count - 1);
      const end = clamp(Math.ceil(entry.end * (count - 1)), 0, count - 1);
      for (let bucket = start; bucket <= end; bucket += 1) buckets[bucket].push(index);
    });
    return buckets;
  }

  function writeIfChanged(entry, key, next, writer) {
    if (entry.last[key] === next) return;
    writer(next);
    entry.last[key] = next;
  }

  const Runtime = {
    init(manifest, options = {}) {
      if (!manifest || !Array.isArray(manifest.layers)) return null;
      const root = options.root || document;
      const adapter = scrollAdapter(options.scrollRoot || window);
      const documentElement = root.querySelector?.('[data-na-document]') || root.documentElement || root;
      const entries = manifest.layers.map((layer) => {
        const element = root.getElementById?.(`na-${layer.id}`) || root.querySelector?.(`[data-na-layer-id="${String(layer.id).replaceAll('"', '\\"')}"]`);
        return element ? compileEntry(layer, element) : null;
      }).filter(Boolean);
      const buckets = makeBuckets(entries);
      const activeIndices = new Set();
      const motionQuery = global.matchMedia?.('(prefers-reduced-motion: reduce)');
      let reducedMotion = Boolean(motionQuery?.matches);
      let frameId = 0;
      let destroyed = false;
      let paused = false;

      function setActive(entry, active) {
        writeIfChanged(entry, 'active', active, (value) => {
          entry.element.dataset.naActive = value ? 'true' : 'false';
        });
      }

      function renderEntry(entry, progress, horizontalScale) {
        const t = entry.tracks;
        const base = entry.base;
        const x = evaluateNumber(t.x, progress);
        const y = evaluateNumber(t.y, progress);
        const width = Math.max(1, evaluateNumber(t.w, progress));
        const height = Math.max(1, evaluateNumber(t.h, progress));
        const scaleX = evaluateNumber(t.scaleX, progress) * (width / (base.w || width));
        const scaleY = evaluateNumber(t.scaleY, progress) * (height / (base.h || height));
        const rotation = evaluateNumber(t.rotation, progress);
        const opacity = clamp(evaluateNumber(t.opacity, progress), 0, 100) / 100;
        const tx = (x - (base.x || 0)) * horizontalScale;
        const ty = y - (base.y || 0);
        const transform = `translate3d(${tx.toFixed(3)}px,${ty.toFixed(3)}px,0) rotate(${rotation.toFixed(3)}deg) scale(${scaleX.toFixed(5)},${scaleY.toFixed(5)})`;
        writeIfChanged(entry, 'transform', transform, (value) => { entry.element.style.transform = value; });
        writeIfChanged(entry, 'opacity', opacity, (value) => { entry.element.style.opacity = String(value); });

        const fill = evaluateColor(t.fill, progress);
        const fillOpacity = clamp(evaluateNumber(t.fillOpacity, progress), 0, 100) / 100;
        const strokeWidth = Math.max(0, evaluateNumber(t.strokeWidth, progress));
        writeIfChanged(entry, 'fill', fill, (value) => entry.element.style.setProperty('--na-fill', value));
        writeIfChanged(entry, 'fillOpacity', fillOpacity, (value) => entry.element.style.setProperty('--na-fill-opacity', String(value)));
        writeIfChanged(entry, 'strokeWidth', strokeWidth, (value) => entry.element.style.setProperty('--na-stroke-width', String(value)));

        const filters = [
          `blur(${Math.max(0, evaluateNumber(t.blur, progress)).toFixed(2)}px)`,
          `brightness(${Math.max(0, evaluateNumber(t.brightness, progress)).toFixed(2)}%)`,
          `contrast(${Math.max(0, evaluateNumber(t.contrast, progress)).toFixed(2)}%)`,
          `saturate(${Math.max(0, evaluateNumber(t.saturation, progress)).toFixed(2)}%)`
        ];
        for (const effect of entry.effects) {
          const amount = evaluateNumber(effect.track, progress);
          if (effect.type === 'blur') filters.push(`blur(${Math.max(0, amount).toFixed(2)}px)`);
          if (effect.type === 'brightness') filters.push(`brightness(${Math.max(0, amount).toFixed(2)}%)`);
          if (effect.type === 'contrast') filters.push(`contrast(${Math.max(0, amount).toFixed(2)}%)`);
          if (effect.type === 'saturation') filters.push(`saturate(${Math.max(0, amount).toFixed(2)}%)`);
        }
        const filter = filters.join(' ');
        writeIfChanged(entry, 'filter', filter, (value) => { entry.element.style.filter = value; });
      }

      function update() {
        frameId = 0;
        if (destroyed || paused) return;
        const maxScroll = adapter.max();
        const progress = maxScroll <= 0 ? 0 : clamp01(adapter.top() / maxScroll);
        const width = documentElement.clientWidth || global.innerWidth || manifest.designWidth || 390;
        const horizontalScale = width / (manifest.designWidth || 390);
        const bucketIndex = clamp(Math.floor(progress * (buckets.length - 1)), 0, buckets.length - 1);
        const nextActive = new Set();
        for (const index of buckets[bucketIndex]) {
          const entry = entries[index];
          const rangeEpsilon = maxScroll > 0 ? Math.max(.0001, 1 / maxScroll) : .001;
          if (progress < entry.start - rangeEpsilon || progress > entry.end + rangeEpsilon) continue;
          nextActive.add(index);
          setActive(entry, true);
          renderEntry(entry, reducedMotion ? entry.start : progress, horizontalScale);
        }
        for (const index of activeIndices) {
          if (!nextActive.has(index)) setActive(entries[index], false);
        }
        activeIndices.clear();
        for (const index of nextActive) activeIndices.add(index);
      }

      function schedule() {
        if (!destroyed && !paused && !frameId) frameId = requestAnimationFrame(update);
      }

      function onVisibilityChange() {
        if (document.hidden) {
          if (frameId) cancelAnimationFrame(frameId);
          frameId = 0;
        } else schedule();
      }

      function onMotionChange(event) {
        reducedMotion = Boolean(event.matches);
        schedule();
      }

      adapter.on(schedule);
      global.addEventListener('resize', schedule, { passive: true });
      document.addEventListener('visibilitychange', onVisibilityChange);
      motionQuery?.addEventListener?.('change', onMotionChange);
      schedule();

      return {
        update: schedule,
        resize: schedule,
        pause() {
          paused = true;
          if (frameId) cancelAnimationFrame(frameId);
          frameId = 0;
        },
        resume() {
          paused = false;
          schedule();
        },
        destroy() {
          destroyed = true;
          adapter.off(schedule);
          global.removeEventListener('resize', schedule);
          document.removeEventListener('visibilitychange', onVisibilityChange);
          motionQuery?.removeEventListener?.('change', onMotionChange);
          if (frameId) cancelAnimationFrame(frameId);
          frameId = 0;
          activeIndices.clear();
        }
      };
    }
  };

  global.NowActionRuntime = Runtime;
})(window);
