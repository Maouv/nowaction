/*!
 * ScrollAnimUI — timeline drawer for authoring scroll-driven keyframes
 * inside the NOWACTION editor. Relies on globals defined in the main
 * app script: `shapes`, `selectedShapeId`, `render()`, `saveToLocalStorage()`.
 */
(function () {
  'use strict';

  var TRACK_DEFS = [
    { key: 'x', label: 'Position X', unit: 'px' },
    { key: 'y', label: 'Position Y', unit: 'px' },
    { key: 'w', label: 'Width', unit: 'px' },
    { key: 'h', label: 'Height', unit: 'px' },
    { key: 'opacity', label: 'Opacity', unit: '%' },
    { key: 'rotation', label: 'Rotation', unit: 'deg' },
    { key: 'blur', label: 'Blur', unit: 'px' }
  ];

  var EASING_OPTIONS = [
    ['linear', 'Linear'],
    ['ease', 'Ease'],
    ['easeIn', 'Ease In'],
    ['easeOut', 'Ease Out'],
    ['easeInOut', 'Ease In Out'],
    ['easeInBack', 'Ease In Back'],
    ['easeOutBack', 'Ease Out Back'],
    ['custom', 'Custom Bezier…']
  ];

  var state = {
    open: false,
    shapeId: null,
    activeProp: 'x',
    selectedKeyframe: null, // { prop, index }
    scrub: 0,
    playing: false
  };

  var dragCtx = null; // { prop, point, containerEl, dotEl }

  function getShape() {
    return (typeof shapes !== 'undefined') ? shapes.find(function (s) { return s.id === state.shapeId; }) : null;
  }

  function ensureAnimation(shape) {
    if (!shape.animation) {
      shape.animation = {
        enabled: false,
        mode: 'element',
        trigger: { startVH: 100, endVH: 0 },
        tracks: {}
      };
    }
    if (!shape.animation.trigger) shape.animation.trigger = { startVH: 100, endVH: 0 };
    if (!shape.animation.tracks) shape.animation.tracks = {};
    return shape.animation;
  }

  window.openAnimationTimeline = function (shapeId) {
    var id = shapeId || (typeof selectedShapeId !== 'undefined' ? selectedShapeId : null);
    if (!id) { alert('Select an element on the canvas first.'); return; }
    var shape = shapes.find(function (s) { return s.id === id; });
    if (!shape) return;
    ensureAnimation(shape);
    state.open = true;
    state.shapeId = id;
    state.activeProp = 'x';
    state.selectedKeyframe = null;
    state.scrub = 0;
    renderDrawer();
    document.getElementById('anim-timeline-drawer').classList.remove('hidden');
  };

  window.closeAnimationTimeline = function () {
    state.open = false;
    stopPreview();
    resetPreviewStyles();
    var drawer = document.getElementById('anim-timeline-drawer');
    if (drawer) drawer.classList.add('hidden');
  };

  function resetPreviewStyles() {
    var shape = getShape();
    if (!shape) return;
    var el = document.querySelector('[data-id="' + shape.id + '"]');
    if (el) { el.style.transform = ''; el.style.filter = ''; }
    if (typeof render === 'function') render();
  }

  function esc(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  function fmtEase(ease) {
    if (Array.isArray(ease)) return 'cubic-bezier(' + ease.join(',') + ')';
    return ease || 'linear';
  }

  // Tiny inline SVG preview of the easing curve for a given keyframe.
  function easingCurveSvg(ease) {
    var pts = Array.isArray(ease) ? ease : (window.ScrollAnim.EASING_PRESETS[ease] || [0, 0, 1, 1]);
    var x1 = pts[0], y1 = pts[1], x2 = pts[2], y2 = pts[3];
    // SVG y is flipped (0 at top)
    var p0 = '0,40', p1 = (x1 * 40).toFixed(1) + ',' + (40 - y1 * 40).toFixed(1);
    var p2 = (x2 * 40).toFixed(1) + ',' + (40 - y2 * 40).toFixed(1);
    var p3 = '40,0';
    return '<svg width="40" height="40" viewBox="0 0 40 40" class="bg-[#0a0a0a] border border-border rounded">' +
      '<path d="M ' + p0 + ' C ' + p1 + ' ' + p2 + ' ' + p3 + '" stroke="#0066cc" stroke-width="2" fill="none"/>' +
      '</svg>';
  }

  function renderDrawer() {
    var shape = getShape();
    var drawer = document.getElementById('anim-timeline-drawer');
    if (!shape || !drawer) return;
    var anim = ensureAnimation(shape);

    var modeRow =
      '<div class="flex items-center space-x-2 text-xs font-mono">' +
        '<label class="flex items-center space-x-1 cursor-pointer">' +
          '<input type="radio" name="anim-mode" value="element" ' + (anim.mode === 'element' ? 'checked' : '') + ' onchange="ScrollAnimUI.setMode(\'element\')"/>' +
          '<span>Per-Element (masuk viewport)</span>' +
        '</label>' +
        '<label class="flex items-center space-x-1 cursor-pointer">' +
          '<input type="radio" name="anim-mode" value="global" ' + (anim.mode === 'global' ? 'checked' : '') + ' onchange="ScrollAnimUI.setMode(\'global\')"/>' +
          '<span>Global (scroll 1 halaman)</span>' +
        '</label>' +
      '</div>';

    var triggerRow = anim.mode === 'element' ?
      '<div class="grid grid-cols-2 gap-2 mt-2">' +
        '<div><label class="text-[9px] text-textSec uppercase block mb-1">Start (vh% dari atas viewport)</label>' +
          '<input type="number" min="0" max="100" value="' + anim.trigger.startVH + '" oninput="ScrollAnimUI.setTrigger(\'startVH\', this.value)" class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 w-full"/></div>' +
        '<div><label class="text-[9px] text-textSec uppercase block mb-1">End (vh% dari atas viewport)</label>' +
          '<input type="number" min="0" max="100" value="' + anim.trigger.endVH + '" oninput="ScrollAnimUI.setTrigger(\'endVH\', this.value)" class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 w-full"/></div>' +
      '</div>' +
      '<p class="text-[9px] text-textSec mt-1">Progress 0% saat elemen di posisi Start, 100% saat mencapai posisi End.</p>'
      : '<p class="text-[9px] text-textSec mt-2">Progress mengikuti scroll seluruh halaman (0% di atas, 100% di bawah).</p>';

    var tracksHtml = TRACK_DEFS.map(renderTrackRow).join('');

    var kf = state.selectedKeyframe;
    var editorHtml = '<p class="text-[10px] text-textSec italic">Klik ruler track untuk tambah keyframe, klik titik untuk edit.</p>';
    if (kf) {
      var track = anim.tracks[kf.prop] || [];
      var point = track[kf.index];
      if (point) {
        var def = TRACK_DEFS.find(function (t) { return t.key === kf.prop; });
        var isCustom = Array.isArray(point.ease);
        editorHtml =
          '<div class="border border-border rounded p-3 space-y-2">' +
            '<div class="flex items-center justify-between">' +
              '<span class="text-[10px] font-bold text-textSec uppercase">' + def.label + ' @ ' + point.p.toFixed(0) + '%</span>' +
              '<button onclick="ScrollAnimUI.deleteKeyframe()" class="text-[10px] text-red-400 hover:text-red-300">Hapus</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-2">' +
              '<div><label class="text-[9px] text-textSec uppercase block mb-1">Posisi (%)</label>' +
                '<input type="number" min="0" max="100" value="' + point.p + '" oninput="ScrollAnimUI.updateKeyframe(\'p\', this.value)" class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 w-full"/></div>' +
              '<div><label class="text-[9px] text-textSec uppercase block mb-1">Nilai (' + def.unit + ')</label>' +
                '<input type="number" value="' + point.v + '" oninput="ScrollAnimUI.updateKeyframe(\'v\', this.value)" class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 w-full"/></div>' +
            '</div>' +
            '<div class="flex items-center space-x-2">' +
              '<div class="flex-1">' +
                '<label class="text-[9px] text-textSec uppercase block mb-1">Easing (menuju keyframe berikutnya)</label>' +
                '<select onchange="ScrollAnimUI.setEasing(this.value)" class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 w-full">' +
                  EASING_OPTIONS.map(function (opt) {
                    var sel = (isCustom && opt[0] === 'custom') || (!isCustom && point.ease === opt[0]) ? 'selected' : '';
                    return '<option value="' + opt[0] + '" ' + sel + '>' + opt[1] + '</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
              easingCurveSvg(point.ease) +
            '</div>' +
            (isCustom ?
              '<div class="grid grid-cols-4 gap-1">' +
                point.ease.map(function (v, i) {
                  return '<input type="number" step="0.01" value="' + v + '" oninput="ScrollAnimUI.setCustomBezier(' + i + ', this.value)" class="bg-[#0a0a0a] border border-border text-text text-[10px] rounded px-1 py-1 w-full"/>';
                }).join('') +
              '</div>' : '') +
          '</div>';
      }
    }

    drawer.innerHTML =
      '<div class="bg-panel border-t border-border p-3 space-y-3 max-h-[70vh] overflow-y-auto">' +
        '<div class="flex items-center justify-between">' +
          '<div class="flex items-center space-x-2">' +
            '<i class="codicon codicon-play-circle text-accent"></i>' +
            '<span class="text-xs font-mono font-bold">Animate — ' + esc(shape.name) + '</span>' +
            '<label class="flex items-center space-x-1 text-[10px] text-textSec ml-2">' +
              '<input type="checkbox" ' + (anim.enabled ? 'checked' : '') + ' onchange="ScrollAnimUI.setEnabled(this.checked)"/>' +
              '<span>Aktifkan</span>' +
            '</label>' +
          '</div>' +
          '<button onclick="closeAnimationTimeline()" class="text-textSec hover:text-text"><i class="codicon codicon-close"></i></button>' +
        '</div>' +

        modeRow + triggerRow +

        '<div class="flex items-center space-x-2 pt-1">' +
          '<button onclick="ScrollAnimUI.togglePlay()" class="px-2 py-1 bg-accent hover:bg-accent/90 text-white text-[10px] rounded font-mono" id="anim-play-btn">▶ Preview</button>' +
          '<input type="range" min="0" max="100" value="' + state.scrub + '" oninput="ScrollAnimUI.scrub(this.value)" class="flex-1"/>' +
          '<span class="text-[10px] font-mono text-textSec w-10 text-right">' + Math.round(state.scrub) + '%</span>' +
        '</div>' +

        '<div class="space-y-1">' + tracksHtml + '</div>' +

        editorHtml +
      '</div>';

    applyScrubPreview();
  }

  function renderTrackRow(def) {
    var shape = getShape();
    var anim = shape.animation;
    var track = anim.tracks[def.key] || [];
    var dots = track.map(function (kfPoint, i) {
      var isSel = state.selectedKeyframe && state.selectedKeyframe.prop === def.key && state.selectedKeyframe.index === i;
      return '<div class="anim-kf-dot absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 cursor-grab active:cursor-grabbing select-none ' +
        (isSel ? 'bg-white border-2 border-accent' : 'bg-accent') + '" style="left:' + kfPoint.p + '%; touch-action:none;" ' +
        'data-prop="' + def.key + '" data-idx="' + i + '" ' +
        'onpointerdown="ScrollAnimUI.startDrag(event, \'' + def.key + '\', ' + i + ')" ' +
        'onclick="event.stopPropagation()" ' +
        'title="' + kfPoint.v + def.unit + ' @ ' + kfPoint.p + '%"></div>';
    }).join('');

    return '<div class="flex items-center space-x-2">' +
      '<span class="text-[9px] font-mono text-textSec w-16 shrink-0">' + def.label + '</span>' +
      '<div class="relative flex-1 h-5 bg-[#0a0a0a] border border-border rounded cursor-copy" ' +
        'onclick="ScrollAnimUI.addKeyframeAtClick(event, \'' + def.key + '\')">' +
        dots +
      '</div>' +
    '</div>';
  }

  function applyScrubPreview() {
    var shape = getShape();
    if (!shape) return;
    var el = document.querySelector('[data-id="' + shape.id + '"]');
    if (!el) return;
    var progress = state.scrub;
    var cfg = { tracks: shape.animation.tracks };
    // Apply positional/size/opacity tracks too, directly (not just transform/filter),
    // so the preview reflects x/y/w/h changes live on the canvas.
    var tracks = cfg.tracks;
    if (tracks.x && tracks.x.length) el.style.left = window.ScrollAnim.interpolateTrack(tracks.x, progress) + 'px';
    if (tracks.y && tracks.y.length) el.style.top = window.ScrollAnim.interpolateTrack(tracks.y, progress) + 'px';
    if (tracks.w && tracks.w.length) el.style.width = window.ScrollAnim.interpolateTrack(tracks.w, progress) + 'px';
    if (tracks.h && tracks.h.length) el.style.height = window.ScrollAnim.interpolateTrack(tracks.h, progress) + 'px';
    if (tracks.opacity && tracks.opacity.length) el.style.opacity = (window.ScrollAnim.interpolateTrack(tracks.opacity, progress) / 100).toFixed(3);
    window.ScrollAnim.applyToElement(el, cfg, progress);
  }

  var playRAF = null, playStart = null;
  function stopPreview() {
    if (playRAF) cancelAnimationFrame(playRAF);
    playRAF = null;
    state.playing = false;
  }

  function onDragMove(evt) {
    if (!dragCtx) return;
    var rect = dragCtx.containerEl.getBoundingClientRect();
    var pct = ((evt.clientX - rect.left) / rect.width) * 100;
    pct = Math.min(100, Math.max(0, Math.round(pct)));
    dragCtx.point.p = pct;
    dragCtx.dotEl.style.left = pct + '%';
    dragCtx.dotEl.title = dragCtx.point.v + ' @ ' + pct + '%';
    applyScrubPreview(); // live-scrub-like feedback while dragging, using current scrub value
  }

  function onDragEnd() {
    if (!dragCtx) return;
    var shape = getShape();
    var track = shape.animation.tracks[dragCtx.prop];
    var point = dragCtx.point;
    track.sort(function (a, b) { return a.p - b.p; });
    state.selectedKeyframe = { prop: dragCtx.prop, index: track.indexOf(point) };
    dragCtx = null;
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    persist();
    renderDrawer();
  }

  window.ScrollAnimUI = {
    startDrag: function (evt, prop, index) {
      evt.stopPropagation();
      evt.preventDefault();
      var shape = getShape();
      var track = shape.animation.tracks[prop];
      var point = track[index];
      var containerEl = evt.currentTarget.parentElement;
      dragCtx = { prop: prop, point: point, containerEl: containerEl, dotEl: evt.currentTarget };
      state.selectedKeyframe = { prop: prop, index: index };
      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
      renderDrawer();
    },
    setMode: function (mode) {
      var shape = getShape(); ensureAnimation(shape).mode = mode;
      persist(); renderDrawer();
    },
    setTrigger: function (key, val) {
      var shape = getShape();
      ensureAnimation(shape).trigger[key] = parseInt(val) || 0;
      persist();
    },
    setEnabled: function (checked) {
      var shape = getShape(); ensureAnimation(shape).enabled = checked;
      persist();
    },
    addKeyframeAtClick: function (evt, prop) {
      var rect = evt.currentTarget.getBoundingClientRect();
      var pct = Math.min(100, Math.max(0, ((evt.clientX - rect.left) / rect.width) * 100));
      var shape = getShape();
      var anim = ensureAnimation(shape);
      if (!anim.tracks[prop]) anim.tracks[prop] = [];
      var currentVal = (prop === 'rotation') ? (shape.rotation || 0) : shape[prop];
      anim.tracks[prop].push({ p: Math.round(pct), v: currentVal, ease: 'linear' });
      anim.tracks[prop].sort(function (a, b) { return a.p - b.p; });
      var newIndex = anim.tracks[prop].findIndex(function (k) { return k.p === Math.round(pct); });
      state.selectedKeyframe = { prop: prop, index: newIndex };
      persist(); renderDrawer();
    },
    selectKeyframe: function (prop, index) {
      state.selectedKeyframe = { prop: prop, index: index };
      renderDrawer();
    },
    updateKeyframe: function (field, val) {
      var kf = state.selectedKeyframe; if (!kf) return;
      var shape = getShape();
      var track = shape.animation.tracks[kf.prop];
      var point = track[kf.index];
      if (field === 'p') {
        point.p = Math.min(100, Math.max(0, parseFloat(val) || 0));
        track.sort(function (a, b) { return a.p - b.p; });
        state.selectedKeyframe.index = track.indexOf(point);
      } else {
        point.v = parseFloat(val) || 0;
      }
      persist(); renderDrawer();
    },
    setEasing: function (val) {
      var kf = state.selectedKeyframe; if (!kf) return;
      var shape = getShape();
      var point = shape.animation.tracks[kf.prop][kf.index];
      if (val === 'custom') {
        point.ease = Array.isArray(point.ease) ? point.ease : [0.42, 0, 0.58, 1];
      } else {
        point.ease = val;
      }
      persist(); renderDrawer();
    },
    setCustomBezier: function (i, val) {
      var kf = state.selectedKeyframe; if (!kf) return;
      var shape = getShape();
      var point = shape.animation.tracks[kf.prop][kf.index];
      if (!Array.isArray(point.ease)) point.ease = [0.42, 0, 0.58, 1];
      point.ease[i] = parseFloat(val) || 0;
      persist(); renderDrawer();
    },
    deleteKeyframe: function () {
      var kf = state.selectedKeyframe; if (!kf) return;
      var shape = getShape();
      shape.animation.tracks[kf.prop].splice(kf.index, 1);
      state.selectedKeyframe = null;
      persist(); renderDrawer();
    },
    scrub: function (val) {
      state.scrub = parseFloat(val);
      var el = document.getElementById('anim-play-btn');
      if (el) el.previousSibling; // no-op, kept for potential future label sync
      applyScrubPreview();
      var span = document.querySelector('#anim-timeline-drawer .flex.items-center.space-x-2.pt-1 span');
      if (span) span.textContent = Math.round(state.scrub) + '%';
    },
    togglePlay: function () {
      if (state.playing) { stopPreview(); return; }
      state.playing = true;
      playStart = null;
      var DURATION = 2200; // ms, arbitrary preview speed — not tied to real scroll
      function step(ts) {
        if (!playStart) playStart = ts;
        var elapsed = ts - playStart;
        state.scrub = Math.min(100, (elapsed / DURATION) * 100);
        applyScrubPreview();
        var slider = document.querySelector('#anim-timeline-drawer input[type="range"]');
        if (slider) slider.value = state.scrub;
        if (state.scrub < 100) {
          playRAF = requestAnimationFrame(step);
        } else {
          stopPreview();
        }
      }
      playRAF = requestAnimationFrame(step);
    }
  };

  function persist() {
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
  }
})();

