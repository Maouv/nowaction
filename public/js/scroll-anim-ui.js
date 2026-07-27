/*!
 * ScrollAnimUI — timeline drawer for authoring scroll-driven keyframe animations
 * inside the NOWACTION editor.
 *
 * Data format:
 *   shape.animation = {
 *     enabled: true,
 *     mode: 'element' | 'global',
 *     trigger: { startVH, endVH },   // only used in 'element' mode
 *     rangeStart: 0,                  // global scroll % where element becomes visible
 *     rangeEnd:   100,                // global scroll % where element is hidden again
 *     keyframes: [
 *       { p: 0,   x: 0,   opacity: 0,  ease: 'easeOut' },
 *       { p: 100, x: 200, opacity: 100, ease: 'linear'  }
 *     ]
 *   }
 *
 * Keyframe `p` is relative to the element's range (0 = rangeStart, 100 = rangeEnd).
 * Outside the range the element is display:none.
 */
(function () {
  'use strict';

  var PROP_DEFS = [
    { key: 'x',        label: 'X',        unit: 'px'  },
    { key: 'y',        label: 'Y',        unit: 'px'  },
    { key: 'w',        label: 'W',        unit: 'px'  },
    { key: 'h',        label: 'H',        unit: 'px'  },
    { key: 'opacity',  label: 'Opacity',  unit: '%'   },
    { key: 'rotation', label: 'Rotation', unit: 'deg' },
    { key: 'blur',     label: 'Blur',     unit: 'px'  }
  ];

  var EASING_OPTIONS = [
    ['linear',      'Linear'],
    ['ease',        'Ease'],
    ['easeIn',      'Ease In'],
    ['easeOut',     'Ease Out'],
    ['easeInOut',   'Ease In Out'],
    ['easeInBack',  'Ease In Back'],
    ['easeOutBack', 'Ease Out Back'],
    ['custom',      'Custom Bezier…']
  ];

  var state = {
    open: false,
    shapeId: null,
    selectedIndex: null,
    scrub: 0,        // 0–100, global scroll %
    playing: false
  };

  // dragCtx types:
  //   { type: 'keyframe', index, keyframe, containerEl, dotEl }
  //   { type: 'range-start' | 'range-end', containerEl }
  var dragCtx = null;

  // ── Shape helpers ──────────────────────────────────────────────────────────
  function getShape() {
    return (typeof shapes !== 'undefined')
      ? shapes.find(function (s) { return s.id === state.shapeId; })
      : null;
  }

  function ensureAnimation(shape) {
    if (!shape.animation) {
      shape.animation = {
        enabled: false,
        mode: 'element',
        trigger: { startVH: 100, endVH: 0 },
        rangeStart: 0,
        rangeEnd: 100,
        keyframes: []
      };
    }
    if (!shape.animation.trigger)    shape.animation.trigger    = { startVH: 100, endVH: 0 };
    if (shape.animation.rangeStart === undefined) shape.animation.rangeStart = 0;
    if (shape.animation.rangeEnd   === undefined) shape.animation.rangeEnd   = 100;
    if (!shape.animation.keyframes) {
      if (shape.animation.tracks) {
        shape.animation.keyframes = window.ScrollAnim.migrateTracksToKeyframes(shape.animation.tracks);
        delete shape.animation.tracks;
      } else {
        shape.animation.keyframes = [];
      }
    }
    return shape.animation;
  }

  function getKeyframes() {
    var shape = getShape();
    return shape ? ensureAnimation(shape).keyframes : [];
  }

  // ── Open / Close ──────────────────────────────────────────────────────────
  window.openAnimationTimeline = function (shapeId) {
    var id = shapeId || (typeof selectedShapeId !== 'undefined' ? selectedShapeId : null);
    if (!id) { alert('Select an element on the canvas first.'); return; }
    var shape = shapes.find(function (s) { return s.id === id; });
    if (!shape) return;
    ensureAnimation(shape);
    state.open          = true;
    state.shapeId       = id;
    state.selectedIndex = null;
    state.scrub         = 0;
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
    if (el) {
      el.style.transform = '';
      el.style.filter    = '';
      el.style.display   = '';
      el.style.opacity   = '';
    }
    if (typeof render === 'function') render();
    if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
  }

  function updateLiveSidebarInputs() {
    var shape = getShape();
    if (!shape) return;
    var anim = shape.animation;
    
    var rs = (anim && anim.rangeStart !== undefined) ? anim.rangeStart : 0;
    var re = (anim && anim.rangeEnd !== undefined) ? anim.rangeEnd : 100;
    
    var inRange = state.scrub >= rs && state.scrub <= re;
    var hasAnim = inRange && anim && anim.enabled && anim.keyframes && anim.keyframes.length > 0;
    var localProgress = globalToLocal(state.scrub, rs, re);

    var inputs = document.querySelectorAll('[data-shape-prop]');
    inputs.forEach(function (input) {
      if (document.activeElement === input) return; // Jangan timpa input yang sedang aktif diedit user
      
      var prop = input.getAttribute('data-shape-prop');
      var val;
      if (hasAnim) {
        val = window.ScrollAnim.interpolateProp(anim.keyframes, prop, localProgress);
      }
      if (val === undefined) {
        val = shape[prop];
      }
      
      if (val !== undefined && val !== null) {
        if (prop === 'opacity') {
          input.value = Math.round(val);
        } else if (prop === 'rotation') {
          input.value = Math.round(val);
        } else if (prop === 'blur') {
          input.value = parseFloat(val.toFixed(1));
        } else {
          input.value = Math.round(val);
        }
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(str) { return String(str).replace(/"/g, '&quot;'); }

  function easingCurveSvg(ease) {
    var pts = Array.isArray(ease) ? ease : (window.ScrollAnim.EASING_PRESETS[ease] || [0, 0, 1, 1]);
    var x1 = pts[0], y1 = pts[1], x2 = pts[2], y2 = pts[3];
    var p0 = '0,40',
        p1 = (x1 * 40).toFixed(1) + ',' + (40 - y1 * 40).toFixed(1),
        p2 = (x2 * 40).toFixed(1) + ',' + (40 - y2 * 40).toFixed(1),
        p3 = '40,0';
    return '<svg width="40" height="40" viewBox="0 0 40 40" class="bg-[#0a0a0a] border border-border rounded">' +
      '<path d="M ' + p0 + ' C ' + p1 + ' ' + p2 + ' ' + p3 + '" stroke="#0066cc" stroke-width="2" fill="none"/>' +
      '</svg>';
  }

  function shapeCurrentVal(shape, prop) {
    if (prop === 'rotation') return shape.rotation || 0;
    return shape[prop] !== undefined ? shape[prop] : 0;
  }

  // Convert global scrub % → local % within the element's range
  function globalToLocal(globalPct, rangeStart, rangeEnd) {
    var span = rangeEnd - rangeStart;
    if (span <= 0) return 0;
    return Math.min(100, Math.max(0, ((globalPct - rangeStart) / span) * 100));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderDrawer() {
    var shape  = getShape();
    var drawer = document.getElementById('anim-timeline-drawer');
    if (!shape || !drawer) return;
    var anim = ensureAnimation(shape);

    var rs = anim.rangeStart;
    var re = anim.rangeEnd;

    // ── Mode row
    var modeRow =
      '<div class="flex items-center space-x-2 text-xs font-mono">' +
        '<label class="flex items-center space-x-1 cursor-pointer">' +
          '<input type="radio" name="anim-mode" value="element" ' + (anim.mode === 'element' ? 'checked' : '') + ' onchange="ScrollAnimUI.setMode(\'element\')"/>' +
          '<span>Per-Element</span>' +
        '</label>' +
        '<label class="flex items-center space-x-1 cursor-pointer">' +
          '<input type="radio" name="anim-mode" value="global" ' + (anim.mode === 'global' ? 'checked' : '') + ' onchange="ScrollAnimUI.setMode(\'global\')"/>' +
          '<span>Global scroll</span>' +
        '</label>' +
      '</div>';

    var triggerRow = anim.mode === 'element'
      ? '<div class="grid grid-cols-2 gap-2 mt-1">' +
          '<div><label class="text-[9px] text-textSec uppercase block mb-1">Start vh%</label>' +
            '<input type="number" min="0" max="100" value="' + anim.trigger.startVH + '" oninput="ScrollAnimUI.setTrigger(\'startVH\', this.value)" class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 w-full"/></div>' +
          '<div><label class="text-[9px] text-textSec uppercase block mb-1">End vh%</label>' +
            '<input type="number" min="0" max="100" value="' + anim.trigger.endVH + '" oninput="ScrollAnimUI.setTrigger(\'endVH\', this.value)" class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 w-full"/></div>' +
        '</div>'
      : '';

    // ── Range + Keyframe ruler
    // The ruler represents global scroll 0–100%.
    // A filled bar shows the element's active range (rangeStart–rangeEnd).
    // Keyframe dots sit inside that bar, positioned relative to the bar width.
    // Two drag handles (◁ ▷) let you resize the range.

    var kfs = anim.keyframes;

    // Keyframe dots — positioned within the active range bar
    var kfDots = kfs.map(function (kf, i) {
      // kf.p is 0–100 relative to range → convert to global ruler %
      var globalPos = rs + (kf.p / 100) * (re - rs);
      var isSel = state.selectedIndex === i;
      var propLabels = PROP_DEFS
        .filter(function (d) { return kf[d.key] !== undefined; })
        .map(function (d) { return d.label; }).join(', ');
      return '<div class="anim-kf-dot absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 cursor-grab active:cursor-grabbing select-none z-20 ' +
        (isSel ? 'bg-white border-2 border-accent' : 'bg-accent') +
        '" style="left:' + globalPos + '%; touch-action:none;" ' +
        'data-idx="' + i + '" ' +
        'onpointerdown="ScrollAnimUI.startKfDrag(event, ' + i + ')" ' +
        'onclick="event.stopPropagation()" ' +
        'title="KF ' + i + ' @ ' + kf.p.toFixed(0) + '% — ' + (propLabels || 'no props') + '"></div>';
    }).join('');

    // Scrub head — vertical line showing current preview position
    var scrubHead =
      '<div class="absolute top-0 bottom-0 w-px bg-white/60 pointer-events-none z-30" ' +
        'style="left:' + state.scrub + '%"></div>';

    var ruler =
      '<div class="flex items-center space-x-2">' +
        '<span class="text-[9px] font-mono text-textSec w-16 shrink-0">Timeline</span>' +
        // outer ruler track (full width = global 0–100%)
        '<div id="anim-ruler" class="relative flex-1 h-6 bg-[#0a0a0a] border border-border rounded select-none">' +
          // active range bar
          '<div class="absolute top-0 bottom-0 bg-accent/20 border-x border-accent/60 z-10 select-none" ' +
            'style="left:' + rs + '%; width:' + (re - rs) + '%">' +
          '</div>' +
          // range start handle
          '<div class="absolute top-0 bottom-0 w-2 flex items-center justify-center cursor-ew-resize z-20 group" ' +
            'style="left:' + rs + '%; transform:translateX(-50%);" ' +
            'onpointerdown="ScrollAnimUI.startRangeDrag(event, \'start\')">' +
            '<div class="w-1 h-4 rounded-sm bg-accent/80 group-hover:bg-accent group-active:bg-white transition-colors"></div>' +
          '</div>' +
          // range end handle
          '<div class="absolute top-0 bottom-0 w-2 flex items-center justify-center cursor-ew-resize z-20 group" ' +
            'style="left:' + re + '%; transform:translateX(-50%);" ' +
            'onpointerdown="ScrollAnimUI.startRangeDrag(event, \'end\')">' +
            '<div class="w-1 h-4 rounded-sm bg-accent/80 group-hover:bg-accent group-active:bg-white transition-colors"></div>' +
          '</div>' +
          kfDots +
          scrubHead +
        '</div>' +
        // + Add button (icon only)
        '<button onclick="ScrollAnimUI.addKeyframeAtScrub()" ' +
          'class="w-6 h-6 flex items-center justify-center bg-accent/20 hover:bg-accent/40 text-accent rounded font-mono text-sm leading-none shrink-0" ' +
          'title="Add keyframe at current position">+</button>' +
      '</div>' +
      // Range labels below ruler
      '<div class="flex justify-between text-[8px] font-mono text-textSec px-[74px]">' +
        '<span>' + rs.toFixed(0) + '%</span>' +
        '<span>' + re.toFixed(0) + '%</span>' +
      '</div>';

    // ── Selected keyframe editor
    var editorHtml = '<p class="text-[10px] text-textSec italic">Drag scrub head ke posisi, lalu + untuk tambah keyframe. Klik diamond untuk edit.</p>';
    if (state.selectedIndex !== null) {
      var kf = kfs[state.selectedIndex];
      if (kf) {
        var propsGrid = PROP_DEFS.map(function (def) {
          var hasProp = kf[def.key] !== undefined;
          var val     = hasProp ? kf[def.key] : shapeCurrentVal(getShape(), def.key);
          
          var html = '<div class="space-y-1.5 border-b border-border/30 pb-2 mb-2">' +
            '<div class="flex items-center space-x-1">' +
              '<input type="checkbox" ' + (hasProp ? 'checked' : '') +
                ' onchange="ScrollAnimUI.toggleProp(\'' + def.key + '\', this.checked, ' + val + ')"' +
                ' class="accent-accent"/>' +
              '<label class="text-[9px] text-textSec w-12 shrink-0">' + def.label + '</label>' +
              '<input type="number" value="' + (hasProp ? kf[def.key] : '') + '" ' +
                (hasProp ? '' : 'disabled ') +
                'oninput="ScrollAnimUI.updateProp(\'' + def.key + '\', this.value)" ' +
                'placeholder="' + def.unit + '" ' +
                'class="bg-[#0a0a0a] border border-border text-text text-xs rounded px-2 py-1 flex-1 disabled:opacity-30"/>' +
              '<span class="text-[9px] text-textSec w-6">' + def.unit + '</span>' +
            '</div>';

          if (hasProp) {
            var easeKey = 'ease' + def.key.charAt(0).toUpperCase() + def.key.slice(1);
            var propEase = kf[easeKey] !== undefined ? kf[easeKey] : (kf.ease || 'linear');
            var isCustom = Array.isArray(propEase);
            var bezierStr = isCustom ? propEase.join(' ') : (window.ScrollAnim.EASING_PRESETS[propEase] || [0, 0, 1, 1]).join(' ');

            html += '<div class="pl-6 flex items-center space-x-2">' +
              '<div class="flex-1">' +
                '<select onchange="ScrollAnimUI.setPropEasing(\'' + def.key + '\', this.value)" class="bg-[#0a0a0a] border border-border text-text text-[10px] rounded px-1.5 py-0.5 w-full">' +
                  EASING_OPTIONS.map(function (opt) {
                    var sel = (isCustom && opt[0] === 'custom') || (!isCustom && propEase === opt[0]) ? 'selected' : '';
                    return '<option value="' + opt[0] + '" ' + sel + '>' + opt[1] + '</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
              '<div data-ease-svg="' + def.key + '">' + easingCurveSvg(propEase) + '</div>' +
            '</div>';

            if (isCustom) {
              html += '<div class="pl-6 grid grid-cols-5 gap-1 items-center">' +
                '<input type="text" value="' + bezierStr + '" oninput="ScrollAnimUI.setPropBezierStr(\'' + def.key + '\', this.value)" placeholder="0.42 0.00 1.00 1.00" class="col-span-3 bg-[#0a0a0a] border border-border text-text text-[10px] font-mono rounded px-1.5 py-0.5 w-full" title="Alight Motion compatible space-separated Bezier points"/>' +
                '<button onclick="ScrollAnimUI.copyPropBezier(\'' + def.key + '\')" class="bg-border hover:bg-border/80 text-text text-[9px] rounded px-1 py-0.5 font-mono truncate" title="Copy Bezier">Copy</button>' +
                '<button onclick="ScrollAnimUI.pastePropBezier(\'' + def.key + '\')" class="bg-border hover:bg-border/80 text-text text-[9px] rounded px-1 py-0.5 font-mono truncate" title="Paste Bezier">Paste</button>' +
              '</div>';
            }
          }
          
          html += '</div>';
          return html;
        }).join('');

        editorHtml =
          '<div class="border border-border rounded p-3 space-y-2">' +
            '<div class="flex items-center justify-between">' +
              '<span class="text-[10px] font-bold text-textSec uppercase">Keyframe @ ' + kf.p.toFixed(0) + '% (dalam range)</span>' +
              '<button onclick="ScrollAnimUI.deleteKeyframe()" class="text-[10px] text-red-400 hover:text-red-300">Hapus</button>' +
            '</div>' +
            '<div class="space-y-1 max-h-[250px] overflow-y-auto pr-1">' + propsGrid + '</div>' +
          '</div>';
      }
    }

    drawer.innerHTML =
      '<div class="bg-panel border-t border-border p-3 space-y-3 max-h-[70vh] overflow-y-auto">' +
        // Header
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

        // Scrub / preview bar
        '<div class="flex items-center space-x-2">' +
          '<button onclick="ScrollAnimUI.togglePlay()" class="px-2 py-1 bg-accent hover:bg-accent/90 text-white text-[10px] rounded font-mono shrink-0" id="anim-play-btn">▶</button>' +
          '<input type="range" min="0" max="100" step="0.5" value="' + state.scrub + '" ' +
            'oninput="ScrollAnimUI.scrub(this.value)" class="flex-1"/>' +
          '<span class="text-[10px] font-mono text-textSec w-8 text-right">' + Math.round(state.scrub) + '%</span>' +
        '</div>' +

        ruler +
        editorHtml +
      '</div>';

    attachRulerScrub();
    applyScrubPreview();
  }

  // Allow clicking on the ruler track itself to move the scrub head
  function attachRulerScrub() {
    var rulerEl = document.getElementById('anim-ruler');
    if (!rulerEl) return;
    rulerEl.addEventListener('click', function (evt) {
      // Only if we didn't click on a handle or dot
      if (evt.target.closest('.anim-kf-dot')) return;
      if (evt.target.closest('[onpointerdown]')) return;
      var rect = rulerEl.getBoundingClientRect();
      var pct  = Math.min(100, Math.max(0, ((evt.clientX - rect.left) / rect.width) * 100));
      state.scrub = pct;
      var slider = document.querySelector('#anim-timeline-drawer input[type="range"]');
      if (slider) slider.value = pct;
      renderDrawer();
    });
  }

  // ── Preview / scrub ────────────────────────────────────────────────────────
  function applyScrubPreview() {
    var shape = getShape();
    if (!shape) return;
    var el = document.querySelector('[data-id="' + shape.id + '"]');
    if (!el) return;
    var anim = shape.animation;
    if (!anim) return;

    var rs = anim.rangeStart !== undefined ? anim.rangeStart : 0;
    var re = anim.rangeEnd   !== undefined ? anim.rangeEnd   : 100;

    // display:none outside range
    if (state.scrub < rs || state.scrub > re) {
      el.style.display = 'none';
      updateLiveSidebarInputs();
      return;
    }
    el.style.display = '';

    if (!anim.keyframes || !anim.keyframes.length) {
      updateLiveSidebarInputs();
      return;
    }

    // Convert global scrub → local progress within range
    var localProgress = globalToLocal(state.scrub, rs, re);
    window.ScrollAnim.applyToElement(el, anim, localProgress);
    updateLiveSidebarInputs();
  }

  var playRAF = null, playStart = null;
  function stopPreview() {
    if (playRAF) cancelAnimationFrame(playRAF);
    playRAF = null;
    state.playing = false;
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function getRulerEl() {
    return document.getElementById('anim-ruler');
  }

  function rulerPct(clientX) {
    var ruler = getRulerEl();
    if (!ruler) return 0;
    var rect = ruler.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }

  // Keyframe dot drag
  function onKfDragMove(evt) {
    if (!dragCtx || dragCtx.type !== 'keyframe') return;
    var anim     = getShape().animation;
    var globalPct = rulerPct(evt.clientX);
    // convert global → local within range
    var localPct = globalToLocal(globalPct, anim.rangeStart, anim.rangeEnd);
    dragCtx.keyframe.p = Math.round(localPct);
    // move the dot visually
    var newGlobal = anim.rangeStart + (dragCtx.keyframe.p / 100) * (anim.rangeEnd - anim.rangeStart);
    dragCtx.dotEl.style.left = newGlobal + '%';
    applyScrubPreview();
  }

  function onKfDragEnd() {
    if (!dragCtx || dragCtx.type !== 'keyframe') return;
    var shape = getShape();
    var kfs   = shape.animation.keyframes;
    var kf    = dragCtx.keyframe;
    kfs.sort(function (a, b) { return a.p - b.p; });
    state.selectedIndex = kfs.indexOf(kf);
    dragCtx = null;
    document.removeEventListener('pointermove', onKfDragMove);
    document.removeEventListener('pointerup',   onKfDragEnd);
    persist();
    renderDrawer();
  }

  // Range handle drag
  function onRangeDragMove(evt) {
    if (!dragCtx || dragCtx.type === 'keyframe') return;
    var shape = getShape();
    var anim  = shape.animation;
    var pct   = Math.round(rulerPct(evt.clientX));

    if (dragCtx.type === 'range-start') {
      anim.rangeStart = Math.min(pct, anim.rangeEnd - 2);
    } else {
      anim.rangeEnd = Math.max(pct, anim.rangeStart + 2);
    }
    persist();
    renderDrawer();
  }

  function onRangeDragEnd() {
    if (!dragCtx) return;
    dragCtx = null;
    document.removeEventListener('pointermove', onRangeDragMove);
    document.removeEventListener('pointerup',   onRangeDragEnd);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.ScrollAnimUI = {

    startKfDrag: function (evt, index) {
      evt.stopPropagation();
      evt.preventDefault();
      var shape = getShape();
      var kf    = shape.animation.keyframes[index];
      dragCtx = { type: 'keyframe', index: index, keyframe: kf, dotEl: evt.currentTarget };
      state.selectedIndex = index;
      document.addEventListener('pointermove', onKfDragMove);
      document.addEventListener('pointerup',   onKfDragEnd);
      renderDrawer();
    },

    startRangeDrag: function (evt, which) {
      evt.stopPropagation();
      evt.preventDefault();
      dragCtx = { type: 'range-' + which };
      document.addEventListener('pointermove', onRangeDragMove);
      document.addEventListener('pointerup',   onRangeDragEnd);
    },

    addKeyframeAtScrub: function () {
      var shape = getShape();
      var anim  = ensureAnimation(shape);
      var rs    = anim.rangeStart;
      var re    = anim.rangeEnd;

      // scrub must be inside the range
      if (state.scrub < rs || state.scrub > re) {
        alert('Pindahkan scrub head ke dalam range elemen dulu.');
        return;
      }

      var localPct = Math.round(globalToLocal(state.scrub, rs, re));

      var existing = anim.keyframes.findIndex(function (k) { return k.p === localPct; });
      if (existing !== -1) {
        state.selectedIndex = existing;
        renderDrawer();
        return;
      }

      var newKf = { p: localPct, ease: 'linear' };
      PROP_DEFS.forEach(function (def) {
        newKf[def.key] = shapeCurrentVal(shape, def.key);
      });
      anim.keyframes.push(newKf);
      anim.keyframes.sort(function (a, b) { return a.p - b.p; });
      state.selectedIndex = anim.keyframes.indexOf(newKf);
      persist();
      renderDrawer();
    },

    toggleProp: function (prop, checked, defaultVal) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf) return;
      if (checked) { kf[prop] = (defaultVal !== undefined) ? defaultVal : 0; }
      else         { delete kf[prop]; }
      persist(); renderDrawer();
    },

    updateProp: function (prop, val) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf || kf[prop] === undefined) return;
      kf[prop] = parseFloat(val) || 0;
      persist(); applyScrubPreview();
    },

    setEasing: function (val) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf) return;
      kf.ease = val === 'custom'
        ? (Array.isArray(kf.ease) ? kf.ease : [0.42, 0, 0.58, 1])
        : val;
      persist(); renderDrawer();
    },

    setCustomBezier: function (i, val) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf) return;
      if (!Array.isArray(kf.ease)) kf.ease = [0.42, 0, 0.58, 1];
      kf.ease[i] = parseFloat(val) || 0;
      persist(); renderDrawer();
    },

    setPropEasing: function (prop, val) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf) return;
      var easeKey = 'ease' + prop.charAt(0).toUpperCase() + prop.slice(1);
      kf[easeKey] = val === 'custom'
        ? (Array.isArray(kf[easeKey]) ? kf[easeKey] : [0.42, 0, 0.58, 1])
        : val;
      persist(); renderDrawer();
    },

    setPropBezierStr: function (prop, str) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf) return;
      var easeKey = 'ease' + prop.charAt(0).toUpperCase() + prop.slice(1);
      
      // Allow spaces or commas as separators
      var pts = str.trim().split(/[\s,]+/).map(Number);
      if (pts.length === 4 && pts.every(function (n) { return !isNaN(n); })) {
        kf[easeKey] = pts;
        persist();
        applyScrubPreview();
        var svgContainer = document.querySelector('[data-ease-svg="' + prop + '"]');
        if (svgContainer) {
          svgContainer.innerHTML = easingCurveSvg(pts);
        }
      }
    },

    copyPropBezier: function (prop) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf) return;
      var easeKey = 'ease' + prop.charAt(0).toUpperCase() + prop.slice(1);
      var propEase = kf[easeKey] !== undefined ? kf[easeKey] : (kf.ease || 'linear');
      var pts = Array.isArray(propEase) ? propEase : (window.ScrollAnim.EASING_PRESETS[propEase] || [0, 0, 1, 1]);
      var str = pts.map(function(num) { return num.toFixed(2); }).join(' ');
      
      navigator.clipboard.writeText(str).then(function () {
        alert('Bezier copied: ' + str);
      }).catch(function (err) {
        alert('Failed to copy: ' + str + ' (Error: ' + err + ')');
      });
    },

    pastePropBezier: function (prop) {
      if (state.selectedIndex === null) return;
      var kf = getKeyframes()[state.selectedIndex];
      if (!kf) return;
      var easeKey = 'ease' + prop.charAt(0).toUpperCase() + prop.slice(1);
      
      navigator.clipboard.readText().then(function (text) {
        var pts = text.trim().split(/[\s,]+/).map(Number);
        if (pts.length === 4 && pts.every(function (n) { return !isNaN(n); })) {
          kf[easeKey] = pts;
          persist();
          renderDrawer();
        } else {
          alert('Format bezier clipboard tidak valid. Pastikan 4 angka dipisah spasi/koma, contoh: 0.42 0.00 1.00 1.00');
        }
      }).catch(function () {
        var text = prompt('Silakan paste string Bezier (contoh: 0.42 0.00 1.00 1.00):');
        if (text) {
          var pts = text.trim().split(/[\s,]+/).map(Number);
          if (pts.length === 4 && pts.every(function (n) { return !isNaN(n); })) {
            kf[easeKey] = pts;
            persist();
            renderDrawer();
          } else {
            alert('Format bezier tidak valid.');
          }
        }
      });
    },

    deleteKeyframe: function () {
      if (state.selectedIndex === null) return;
      var shape = getShape();
      shape.animation.keyframes.splice(state.selectedIndex, 1);
      state.selectedIndex = null;
      persist(); renderDrawer();
    },

    setMode: function (mode) {
      ensureAnimation(getShape()).mode = mode;
      persist(); renderDrawer();
    },

    setTrigger: function (key, val) {
      ensureAnimation(getShape()).trigger[key] = parseInt(val) || 0;
      persist();
    },

    setEnabled: function (checked) {
      ensureAnimation(getShape()).enabled = checked;
      persist();
    },

    scrub: function (val) {
      state.scrub = parseFloat(val);
      applyScrubPreview();
      var span = document.querySelector('#anim-timeline-drawer input[type="range"] + span');
      if (!span) span = document.querySelector('#anim-timeline-drawer .text-right');
      if (span) span.textContent = Math.round(state.scrub) + '%';
      // update scrub head in ruler without full re-render
      var head = document.querySelector('#anim-ruler .bg-white\\/60');
      if (head) head.style.left = state.scrub + '%';
    },

    togglePlay: function () {
      if (state.playing) { stopPreview(); return; }
      state.playing = true;
      playStart     = null;
      var DURATION  = 2200;
      function step(ts) {
        if (!playStart) playStart = ts;
        state.scrub = Math.min(100, ((ts - playStart) / DURATION) * 100);
        applyScrubPreview();
        var slider = document.querySelector('#anim-timeline-drawer input[type="range"]');
        if (slider) slider.value = state.scrub;
        var head = document.querySelector('#anim-ruler .bg-white\\/60');
        if (head) head.style.left = state.scrub + '%';
        if (state.scrub < 100) { playRAF = requestAnimationFrame(step); }
        else { stopPreview(); }
      }
      playRAF = requestAnimationFrame(step);
    }
  };

  function persist() {
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
  }
})();

