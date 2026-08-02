(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const clamp01 = (value) => clamp(value, 0, 1);
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const escapeAttr = escapeHtml;
  const round = (value, precision = 3) => Number(Number(value).toFixed(precision));
  const formatPct = (value) => `${(value * 100).toFixed(value > 0 && value < 1 ? 1 : 0)}%`;
  const isFiniteNumber = (value) => Number.isFinite(Number(value));

  const ICONS = {
    project: '<path d="M3.5 6.5h6l2 2H20.5v9.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"/><path d="M3 6.5V5a2 2 0 0 1 2-2h4l2 2h5"/>',
    preview: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/>',
    export: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6h14v-6"/>',
    group: '<rect x="4" y="5" width="10" height="10" rx="2"/><rect x="10" y="9" width="10" height="10" rx="2"/>',
    duplicate: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    delete: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/><path d="M10 11v5M14 11v5"/>',
    previous: '<path d="M7 5v14"/><path d="m18 6-8 6 8 6Z"/>',
    next: '<path d="M17 5v14"/><path d="m6 6 8 6-8 6Z"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    rectangle: '<rect x="4" y="6" width="16" height="12" rx="2"/>',
    circle: '<circle cx="12" cy="12" r="7"/>',
    shape: '<rect x="3.5" y="7" width="11" height="10" rx="2"/><circle cx="16" cy="9" r="5"/>',
    text: '<path d="M5 5h14M12 5v14M8 19h8"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
    edit: '<path d="m4 16-.5 4.5L8 20l10-10-4-4L4 16Z"/><path d="m12.5 7.5 4 4"/>',
    fill: '<path d="m7 3 10 10-6 6a3 3 0 0 1-4 0l-2-2a3 3 0 0 1 0-4l6-6"/><path d="M3 21h18"/>',
    border: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M10 10h10v10H10"/>',
    blend: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
    transform: '<path d="M12 2v20M2 12h20"/><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
    effects: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z"/><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    grip: '<circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/>',
    enter: '<path d="M9 18 15 12 9 6"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2"/>',
    width: '<path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    height: '<path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3"/>',
    radius: '<path d="M5 19V9a4 4 0 0 1 4-4h10"/><path d="M5 13h4a4 4 0 0 0 4-4V5"/>',
    opacity: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z"/>',
    shadow: '<rect x="4" y="4" width="11" height="11" rx="2"/><path d="M9 15v2a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3h-2"/>',
    scale: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/><path d="m3 8 6-6M21 8l-6-6M3 16l6 6M21 16l-6 6"/>',
    rotation: '<path d="M20 11a8 8 0 1 0-2 5"/><path d="M20 4v7h-7"/>',
    position: '<path d="M12 2v20M2 12h20"/><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
    keyframePrev: '<path d="M5 5v14"/><path d="m16 7-5 5 5 5"/><path d="m11 9 3 3-3 3"/>',
    keyframeNext: '<path d="M19 5v14"/><path d="m8 7 5 5-5 5"/><path d="m13 9-3 3 3 3"/>',
    curve: '<path d="M3 19C8 19 8 5 21 5"/><circle cx="3" cy="19" r="1.5"/><circle cx="21" cy="5" r="1.5"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    expand: '<path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    zip: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h5M10 3h3M10 6h3M10 9h3M10 12h3M10 15h3"/>',
    color: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
    blur: '<path d="M4 8h8M4 12h12M4 16h16"/>',
    brightness: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    contrast: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z"/>',
    saturation: '<path d="M12 3s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12Z"/><path d="M8 16c1 1.7 2.3 2.5 4 2.5"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.8M6.2 6.2A15.4 15.4 0 0 0 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-.9"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>',
    addProject: '<path d="M12 5v14M5 12h14"/>',
    warning: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/>'
  };

  function icon(name, className = '') {
    const body = ICONS[name] || ICONS.warning;
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function setButtonIcon(element, name) {
    if (element) element.innerHTML = icon(name);
  }

  const dom = {};
  const state = {
    projects: [],
    project: null,
    selectedIds: new Set(),
    primaryId: null,
    multiSelectMode: false,
    selectedKeyframeId: null,
    progress: 0,
    playing: false,
    playRaf: 0,
    playLastTs: 0,
    previewSpeedPxPerSecond: 450,
    scrollControlSource: 'website-scroll',
    displayScale: 1,
    uiStack: [{ screen: 'timeline' }],
    activeTransformMode: 'position',
    activeProperty: null,
    timeline: {
      zoom: 1,
      visibleStart: 0,
      scrollTop: 0,
      pointers: new Map(),
      activeGesture: null
    },
    sceneNodes: new Map(),
    mountedIds: new Set(),
    projectRevision: 0,
    saveTimer: 0,
    saveInFlight: false,
    lastSavedRevision: -1,
    toastTimer: 0,
    activeScopeGroupId: null,
    confirmResolver: null
  };

  const DEFAULT_VIEWPORT = { width: 390, height: 844 };
  const DEFAULT_CANVAS = {
    preset: 'mobile',
    width: 390,
    height: 2400,
    gridSnap: 1,
    showFrame: true,
    heightMode: 'auto',
    customHeight: 2400,
    bottomPadding: 160
  };

  function defaultAnimation(start = 0, end = 1) {
    return {
      enabled: true,
      mode: 'global',
      rangeStart: round(start * 100, 4),
      rangeEnd: round(end * 100, 4),
      keyframes: []
    };
  }

  function defaultShape(type, x, y, progress = state.progress) {
    const counters = state.project.shapeCounter;
    counters[type] = (counters[type] || 0) + 1;
    const common = {
      id: uid('sh'),
      type,
      name: `${type[0].toUpperCase()}${type.slice(1)} ${counters[type]}`,
      x,
      y,
      w: type === 'text' ? 240 : type === 'circle' ? 120 : 140,
      h: type === 'text' ? 64 : type === 'circle' ? 120 : 90,
      fill: type === 'text' ? 'transparent' : '#3b82f6',
      fillOpacity: 100,
      strokeWidth: 0,
      strokeColor: '#111827',
      strokeOpacity: 100,
      borderRadius: type === 'rectangle' ? 12 : 0,
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      blendMode: 'normal',
      shadow: {
        enabled: false,
        color: '#000000',
        opacity: 35,
        offsetX: 0,
        offsetY: 8,
        blur: 24,
        spread: 0
      },
      effects: [],
      locked: false,
      groupId: null,
      animation: defaultAnimation(progress, 1)
    };
    if (type === 'text') {
      common.text = 'Text';
      common.textColor = '#111827';
      common.fontSize = 28;
      common.fontFamily = 'Inter, sans-serif';
      common.fontWeight = 600;
    }
    return common;
  }

  function ensureAnimation(shape) {
    if (!shape.animation) shape.animation = defaultAnimation(0, 1);
    shape.animation.enabled = shape.animation.enabled !== false;
    shape.animation.mode = 'global';
    shape.animation.rangeStart = isFiniteNumber(shape.animation.rangeStart) ? Number(shape.animation.rangeStart) : 0;
    shape.animation.rangeEnd = isFiniteNumber(shape.animation.rangeEnd) ? Number(shape.animation.rangeEnd) : 100;
    shape.animation.keyframes = Array.isArray(shape.animation.keyframes) ? shape.animation.keyframes : [];
    shape.animation.keyframes.forEach((kf) => {
      if (!kf.id) kf.id = uid('kf');
      if (!isFiniteNumber(kf.at)) {
        if (isFiniteNumber(kf.p)) kf.at = Number(kf.p) / 100;
        else kf.at = 0;
      }
      kf.at = clamp01(Number(kf.at));
      if (!kf.easingToNext && kf.ease) kf.easingToNext = normalizeEase(kf.ease);
    });
    shape.animation.keyframes.sort((a, b) => a.at - b.at);
    return shape.animation;
  }

  function normalizeEase(value) {
    if (Array.isArray(value) && value.length === 4) return { type: 'cubic-bezier', x1: +value[0], y1: +value[1], x2: +value[2], y2: +value[3] };
    if (value && typeof value === 'object' && isFiniteNumber(value.x1)) return value;
    const presets = {
      linear: [0, 0, 1, 1],
      ease: [.25, .1, .25, 1],
      'ease-in': [.42, 0, 1, 1],
      'ease-out': [0, 0, .58, 1],
      'ease-in-out': [.42, 0, .58, 1]
    };
    const p = presets[value] || presets.linear;
    return { type: 'cubic-bezier', x1: p[0], y1: p[1], x2: p[2], y2: p[3] };
  }

  function migrateProject(raw) {
    const project = raw || {};
    project.schemaVersion = Math.max(3, Number(project.schemaVersion || 0));
    project.name = project.name || 'Untitled Project';
    project.shapes = Array.isArray(project.shapes) ? project.shapes : [];
    project.groups = project.groups && typeof project.groups === 'object' ? project.groups : {};
    project.shapeCounter = project.shapeCounter || { rectangle: 0, circle: 0, text: 0, image: 0 };
    project.viewport = { ...DEFAULT_VIEWPORT, ...(project.viewport || {}) };
    project.canvasConfig = { ...DEFAULT_CANVAS, ...(project.canvasConfig || {}) };
    project.background = { color: '#ffffff', transparent: false, ...(project.background || {}) };

    const looksLegacy = project.shapes.some((s) => Number(s.y) < -20) && !raw.schemaVersion;
    if (looksLegacy) {
      const minY = Math.min(...project.shapes.map((s) => Number(s.y || 0)));
      const shiftY = 80 - minY;
      project.shapes.forEach((s) => { s.y = Number(s.y || 0) + shiftY; });
    }

    project.shapes.forEach((shape, index) => {
      shape.id = shape.id || uid('sh');
      shape.type = ['rectangle', 'circle', 'text', 'image'].includes(shape.type) ? shape.type : 'rectangle';
      shape.name = shape.name || `${shape.type} ${index + 1}`;
      shape.x = Number(shape.x || 0);
      shape.y = Number(shape.y || 0);
      shape.w = Math.max(10, Number(shape.w || 100));
      shape.h = Math.max(10, Number(shape.h || 100));
      shape.fill = shape.fill ?? (shape.type === 'text' ? 'transparent' : '#3b82f6');
      shape.fillOpacity = isFiniteNumber(shape.fillOpacity) ? Number(shape.fillOpacity) : 100;
      shape.strokeWidth = isFiniteNumber(shape.strokeWidth) ? Number(shape.strokeWidth) : 0;
      shape.strokeColor = shape.strokeColor || '#111827';
      shape.strokeOpacity = isFiniteNumber(shape.strokeOpacity) ? Number(shape.strokeOpacity) : 100;
      shape.borderRadius = isFiniteNumber(shape.borderRadius) ? Number(shape.borderRadius) : 0;
      shape.blur = isFiniteNumber(shape.blur) ? Number(shape.blur) : 0;
      shape.brightness = isFiniteNumber(shape.brightness) ? Number(shape.brightness) : 100;
      shape.contrast = isFiniteNumber(shape.contrast) ? Number(shape.contrast) : 100;
      shape.saturation = isFiniteNumber(shape.saturation) ? Number(shape.saturation) : 100;
      shape.opacity = isFiniteNumber(shape.opacity) ? Number(shape.opacity) : 100;
      shape.rotation = isFiniteNumber(shape.rotation) ? Number(shape.rotation) : 0;
      shape.scaleX = isFiniteNumber(shape.scaleX) ? Number(shape.scaleX) : 1;
      shape.scaleY = isFiniteNumber(shape.scaleY) ? Number(shape.scaleY) : 1;
      shape.blendMode = shape.blendMode || 'normal';
      shape.shadow = { enabled: false, color: '#000000', opacity: 35, offsetX: 0, offsetY: 8, blur: 24, spread: 0, ...(shape.shadow || {}) };
      shape.effects = Array.isArray(shape.effects) ? shape.effects : [];
      shape.locked = Boolean(shape.locked);
      if (shape.type === 'text') {
        shape.text = shape.text ?? 'Text';
        shape.textColor = shape.textColor || '#111827';
        shape.fontSize = Number(shape.fontSize || 28);
        shape.fontFamily = shape.fontFamily || 'Inter, sans-serif';
        shape.fontWeight = Number(shape.fontWeight || 600);
      }
      ensureAnimation(shape);
    });
    return project;
  }

  function getPrimaryShape() {
    return state.project?.shapes.find((shape) => shape.id === state.primaryId) || null;
  }

  function getShapeById(id) {
    return state.project?.shapes.find((shape) => shape.id === id) || null;
  }

  function getRootShapesFrontToBack() {
    return [...(state.project?.shapes || [])].reverse();
  }

  function currentScreen() {
    return state.uiStack[state.uiStack.length - 1] || { screen: 'timeline' };
  }

  function pushScreen(screen) {
    state.uiStack.push(screen);
    renderContext();
  }

  function resetContextWorkspaceSize() {
    if (!dom.bottomWorkspace) return;
    dom.bottomWorkspace.style.height = '';
    dom.bottomWorkspace.style.minHeight = '';
  }

  function popScreen() {
    resetContextWorkspaceSize();
    if (state.uiStack.length > 1) state.uiStack.pop();
    else state.uiStack = [{ screen: 'timeline' }];
    renderContext();
  }

  function closeContext() {
    resetContextWorkspaceSize();
    state.uiStack = [{ screen: 'timeline' }];
    renderContext();
  }

  function toast(message, duration = 1800) {
    clearTimeout(state.toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    state.toastTimer = setTimeout(() => dom.toast.classList.remove('show'), duration);
  }

  function markDirty() {
    state.projectRevision += 1;
    renderSaveStatus();
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveProject, 550);
  }

  function renderSaveStatus() {
    if (!dom.topStatus) return;
    if (state.saveInFlight) dom.topStatus.textContent = 'Saving…';
    else if (state.lastSavedRevision === state.projectRevision) dom.topStatus.textContent = 'Saved';
    else dom.topStatus.textContent = 'Edited';
  }

  async function saveProject() {
    if (!state.project?.id || state.saveInFlight || state.lastSavedRevision === state.projectRevision) return;
    state.saveInFlight = true;
    renderSaveStatus();
    const revision = state.projectRevision;
    try {
      const payload = {
        name: state.project.name,
        shapes: state.project.shapes,
        shapeCounter: state.project.shapeCounter,
        groups: state.project.groups,
        aiSettings: state.project.aiSettings || {},
        activeSessionId: state.project.activeSessionId || null,
        canvasConfig: state.project.canvasConfig,
        viewport: state.project.viewport,
        background: state.project.background,
        schemaVersion: state.project.schemaVersion
      };
      const response = await fetch(`/api/projects/${encodeURIComponent(state.project.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Save failed');
      state.lastSavedRevision = revision;
      localStorage.setItem('nowaction_motion_backup', JSON.stringify({ id: state.project.id, payload }));
    } catch (error) {
      console.warn(error);
      toast('Server save failed. Local backup kept.');
    } finally {
      state.saveInFlight = false;
      renderSaveStatus();
      if (state.lastSavedRevision !== state.projectRevision) {
        clearTimeout(state.saveTimer);
        state.saveTimer = setTimeout(saveProject, 700);
      }
    }
  }

  async function loadProjects() {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Unable to list projects');
    const json = await response.json();
    state.projects = json.data || [];
  }

  async function resolveInitialProjectId() {
    const remembered = localStorage.getItem('nowaction_last_project_id');
    if (remembered) {
      const exists = state.projects.some((p) => p.id === remembered);
      if (exists) return remembered;
    }
    if (state.projects.length) return [...state.projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0].id;
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My First Project' })
    });
    if (!response.ok) throw new Error('Unable to create project');
    const created = await response.json();
    await loadProjects();
    return created.id;
  }

  async function loadProject(id) {
    state.playing = false;
    cancelAnimationFrame(state.playRaf);
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Unable to load project');
    const json = await response.json();
    state.project = migrateProject(json.data);
    state.selectedIds.clear();
    state.primaryId = null;
    state.selectedKeyframeId = null;
    state.progress = 0;
    state.uiStack = [{ screen: 'timeline' }];
    state.projectRevision = 0;
    state.lastSavedRevision = 0;
    localStorage.setItem('nowaction_last_project_id', state.project.id);
    dom.projectTitle.textContent = state.project.name;
    updateProjectDialog();
    renderAll();
    requestAnimationFrame(() => setProgress(0, 'timeline-scrub'));
  }

  async function createProject() {
    const name = prompt('Project name', 'Untitled Project');
    if (name === null) return;
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || 'Untitled Project' })
    });
    if (!response.ok) return toast('Could not create project');
    const created = await response.json();
    await loadProjects();
    await loadProject(created.id);
    dom.projectDialog.close();
  }

  function cubicBezierValue(t, easing) {
    const e = normalizeEase(easing || 'linear');
    const x1 = clamp(Number(e.x1), 0, 1);
    const y1 = Number(e.y1);
    const x2 = clamp(Number(e.x2), 0, 1);
    const y2 = Number(e.y2);
    const sample = (a1, a2, tt) => ((1 - 3 * a2 + 3 * a1) * tt + (3 * a2 - 6 * a1)) * tt * tt + 3 * a1 * tt;
    const derivative = (a1, a2, tt) => 3 * (1 - 3 * a2 + 3 * a1) * tt * tt + 2 * (3 * a2 - 6 * a1) * tt + 3 * a1;
    let guess = t;
    for (let i = 0; i < 5; i += 1) {
      const x = sample(x1, x2, guess) - t;
      const d = derivative(x1, x2, guess);
      if (Math.abs(d) < 1e-6) break;
      guess = clamp01(guess - x / d);
    }
    return sample(y1, y2, guess);
  }

  function getKeyframeProgress(kf) {
    return clamp01(Number(isFiniteNumber(kf.at) ? kf.at : Number(kf.p || 0) / 100));
  }

  function interpolateNumberKeyframes(keyframes, property, progress, fallback) {
    const list = keyframes
      .filter((kf) => isFiniteNumber(kf[property]))
      .sort((a, b) => getKeyframeProgress(a) - getKeyframeProgress(b));
    if (!list.length) return fallback;
    if (progress <= getKeyframeProgress(list[0])) return Number(list[0][property]);
    if (progress >= getKeyframeProgress(list[list.length - 1])) return Number(list[list.length - 1][property]);
    for (let i = 0; i < list.length - 1; i += 1) {
      const a = list[i];
      const b = list[i + 1];
      const pa = getKeyframeProgress(a);
      const pb = getKeyframeProgress(b);
      if (progress >= pa && progress <= pb) {
        const local = pb === pa ? 1 : (progress - pa) / (pb - pa);
        const eased = cubicBezierValue(local, a.easingToNext || a.ease || 'linear');
        return Number(a[property]) + (Number(b[property]) - Number(a[property])) * eased;
      }
    }
    return fallback;
  }

  function hexToRgb(hex) {
    const cleaned = String(hex || '#000000').replace('#', '').trim();
    const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned.padEnd(6, '0').slice(0, 6);
    return {
      r: parseInt(full.slice(0, 2), 16) || 0,
      g: parseInt(full.slice(2, 4), 16) || 0,
      b: parseInt(full.slice(4, 6), 16) || 0
    };
  }

  function rgbToHex({ r, g, b }) {
    const part = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`;
  }

  function interpolateColorKeyframes(keyframes, property, progress, fallback) {
    const list = keyframes
      .filter((kf) => typeof kf[property] === 'string')
      .sort((a, b) => getKeyframeProgress(a) - getKeyframeProgress(b));
    if (!list.length) return fallback;
    if (progress <= getKeyframeProgress(list[0])) return list[0][property];
    if (progress >= getKeyframeProgress(list[list.length - 1])) return list[list.length - 1][property];
    for (let i = 0; i < list.length - 1; i += 1) {
      const a = list[i];
      const b = list[i + 1];
      const pa = getKeyframeProgress(a);
      const pb = getKeyframeProgress(b);
      if (progress >= pa && progress <= pb) {
        const local = pb === pa ? 1 : (progress - pa) / (pb - pa);
        const eased = cubicBezierValue(local, a.easingToNext || a.ease || 'linear');
        const ca = hexToRgb(a[property]);
        const cb = hexToRgb(b[property]);
        return rgbToHex({
          r: ca.r + (cb.r - ca.r) * eased,
          g: ca.g + (cb.g - ca.g) * eased,
          b: ca.b + (cb.b - ca.b) * eased
        });
      }
    }
    return fallback;
  }

  function evaluateShape(shape, progress = state.progress) {
    const anim = ensureAnimation(shape);
    const keyframes = anim.keyframes;
    const rangeStart = clamp01(Number(anim.rangeStart) / 100);
    const rangeEnd = clamp01(Number(anim.rangeEnd) / 100);
    const rangeEpsilon = 0.001;
    const active = progress >= Math.min(rangeStart, rangeEnd) - rangeEpsilon && progress <= Math.max(rangeStart, rangeEnd) + rangeEpsilon;
    const evaluated = {
      x: interpolateNumberKeyframes(keyframes, 'x', progress, shape.x),
      y: interpolateNumberKeyframes(keyframes, 'y', progress, shape.y),
      w: Math.max(1, interpolateNumberKeyframes(keyframes, 'w', progress, shape.w)),
      h: Math.max(1, interpolateNumberKeyframes(keyframes, 'h', progress, shape.h)),
      scaleX: interpolateNumberKeyframes(keyframes, 'scaleX', progress, shape.scaleX ?? 1),
      scaleY: interpolateNumberKeyframes(keyframes, 'scaleY', progress, shape.scaleY ?? 1),
      rotation: interpolateNumberKeyframes(keyframes, 'rotation', progress, shape.rotation),
      opacity: clamp(interpolateNumberKeyframes(keyframes, 'opacity', progress, shape.opacity), 0, 100),
      fillOpacity: clamp(interpolateNumberKeyframes(keyframes, 'fillOpacity', progress, shape.fillOpacity), 0, 100),
      strokeWidth: Math.max(0, interpolateNumberKeyframes(keyframes, 'strokeWidth', progress, shape.strokeWidth)),
      blur: Math.max(0, interpolateNumberKeyframes(keyframes, 'blur', progress, shape.blur)),
      brightness: Math.max(0, interpolateNumberKeyframes(keyframes, 'brightness', progress, shape.brightness)),
      contrast: Math.max(0, interpolateNumberKeyframes(keyframes, 'contrast', progress, shape.contrast)),
      saturation: Math.max(0, interpolateNumberKeyframes(keyframes, 'saturation', progress, shape.saturation)),
      fill: interpolateColorKeyframes(keyframes, 'fill', progress, shape.fill),
      active
    };
    return evaluated;
  }

  function documentHeightLogical() {
    if (!state.project) return DEFAULT_CANVAS.customHeight || 2400;
    const config = state.project.canvasConfig;
    if (config.heightMode === 'custom') return Math.max(state.project.viewport.height, Number(config.customHeight || config.height || 2400));
    let bottom = state.project.viewport.height;
    state.project.shapes.forEach((shape) => {
      bottom = Math.max(bottom, Number(shape.y || 0) + Number(shape.h || 0));
    });
    return Math.max(state.project.viewport.height, Math.ceil(bottom + Number(config.bottomPadding || 0)));
  }

  function updateDisplayScale() {
    if (!dom.previewFrame || !state.project) return;
    const width = dom.previewFrame.clientWidth;
    state.displayScale = width > 0 ? width / state.project.viewport.width : 1;
    dom.previewBadge.textContent = `${state.project.viewport.width} × ${state.project.viewport.height}`;
  }

  function updateDocumentGeometry() {
    updateDisplayScale();
    const height = documentHeightLogical();
    const physicalHeight = Math.max(dom.previewFrame.clientHeight, height * state.displayScale);
    dom.websiteDocument.style.height = `${physicalHeight}px`;
    dom.projectBackground.style.background = state.project.background.transparent ? 'transparent' : state.project.background.color;
  }

  function logicalViewportBounds() {
    const scale = state.displayScale || 1;
    const top = dom.websiteScrollRoot.scrollTop / scale;
    const height = dom.websiteScrollRoot.clientHeight / scale;
    return { top, bottom: top + height, height };
  }

  function shapeRenderEnvelope(shape) {
    const keyframes = ensureAnimation(shape).keyframes;
    let minX = shape.x;
    let maxX = shape.x + shape.w;
    let minY = shape.y;
    let maxY = shape.y + shape.h;
    keyframes.forEach((kf) => {
      const x = isFiniteNumber(kf.x) ? Number(kf.x) : shape.x;
      const y = isFiniteNumber(kf.y) ? Number(kf.y) : shape.y;
      const w = isFiniteNumber(kf.w) ? Number(kf.w) : shape.w;
      const h = isFiniteNumber(kf.h) ? Number(kf.h) : shape.h;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    const shadow = shape.shadow?.enabled ? Math.max(0, Number(shape.shadow.blur || 0) + Math.abs(Number(shape.shadow.offsetY || 0)) + Math.abs(Number(shape.shadow.spread || 0))) : 0;
    const blur = Math.max(Number(shape.blur || 0), ...keyframes.map((kf) => Number(kf.blur || 0)));
    const extra = shadow + blur * 2 + Math.max(4, Number(shape.strokeWidth || 0));
    return { minX: minX - extra, maxX: maxX + extra, minY: minY - extra, maxY: maxY + extra };
  }

  function shouldMountShape(shape) {
    if (state.selectedIds.has(shape.id)) return true;
    const bounds = logicalViewportBounds();
    const envelope = shapeRenderEnvelope(shape);
    const overscan = bounds.height * 1.75;
    const nearViewport = envelope.maxY >= bounds.top - overscan && envelope.minY <= bounds.bottom + overscan;
    const anim = ensureAnimation(shape);
    const rangeStart = Number(anim.rangeStart) / 100;
    const rangeEnd = Number(anim.rangeEnd) / 100;
    const timelineOverscan = 0.08;
    const nearRange = state.progress >= rangeStart - timelineOverscan && state.progress <= rangeEnd + timelineOverscan;
    return nearViewport && nearRange;
  }

  function createLayerNode(shape) {
    const node = document.createElement('div');
    node.className = 'na-layer-node';
    node.dataset.layerId = shape.id;
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    node.addEventListener('pointerdown', onScenePointerDown);
    node.addEventListener('dblclick', () => {
      if (shape.type === 'text') openTextEditor(shape);
    });
    state.sceneNodes.set(shape.id, node);
    dom.sceneRoot.appendChild(node);
    return node;
  }

  function ensureLayerVisual(node, shape) {
    if (node.dataset.visualType === shape.type && node.querySelector('[data-na-visual]')) return;
    node.dataset.visualType = shape.type;
    node.replaceChildren();
    if (shape.type === 'text') {
      const text = document.createElement('div');
      text.className = 'na-text-node';
      text.dataset.naVisual = 'text';
      node.appendChild(text);
      return;
    }
    if (shape.type === 'image') {
      const image = document.createElement('img');
      image.className = 'na-image-node';
      image.dataset.naVisual = 'image';
      image.alt = '';
      image.draggable = false;
      image.loading = 'lazy';
      node.appendChild(image);
      return;
    }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('na-shape-svg');
    svg.dataset.naVisual = 'shape';
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const geometry = document.createElementNS(ns, shape.type === 'circle' ? 'ellipse' : 'rect');
    geometry.dataset.naGeometry = 'true';
    geometry.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(geometry);
    node.appendChild(svg);
  }

  function updateLayerVisual(node, shape, evaluated) {
    ensureLayerVisual(node, shape);
    if (shape.type === 'text') {
      const text = node.querySelector('[data-na-visual="text"]');
      if (text.textContent !== String(shape.text ?? '')) text.textContent = String(shape.text ?? '');
      text.style.color = shape.textColor;
      text.style.fontSize = `${Number(shape.fontSize)}px`;
      text.style.fontFamily = shape.fontFamily;
      text.style.fontWeight = String(Number(shape.fontWeight || 600));
      return;
    }
    if (shape.type === 'image') {
      const image = node.querySelector('[data-na-visual="image"]');
      if (image.getAttribute('src') !== String(shape.src || '')) image.setAttribute('src', shape.src || '');
      return;
    }
    const svg = node.querySelector('[data-na-visual="shape"]');
    const geometry = svg.querySelector('[data-na-geometry]');
    const stroke = evaluated.strokeWidth > 0 ? shape.strokeColor : 'none';
    const strokeOpacity = clamp(Number(shape.strokeOpacity || 100) / 100, 0, 1);
    geometry.setAttribute('fill', evaluated.fill);
    geometry.setAttribute('fill-opacity', String(evaluated.fillOpacity / 100));
    geometry.setAttribute('stroke', stroke);
    geometry.setAttribute('stroke-opacity', String(strokeOpacity));
    geometry.setAttribute('stroke-width', String(evaluated.strokeWidth));
    if (shape.type === 'circle') {
      svg.setAttribute('viewBox', '0 0 100 100');
      geometry.setAttribute('cx', '50');
      geometry.setAttribute('cy', '50');
      geometry.setAttribute('rx', String(Math.max(0, 50 - evaluated.strokeWidth / 2)));
      geometry.setAttribute('ry', String(Math.max(0, 50 - evaluated.strokeWidth / 2)));
    } else {
      svg.setAttribute('viewBox', `0 0 ${evaluated.w} ${evaluated.h}`);
      const half = evaluated.strokeWidth / 2;
      const radius = clamp(Number(shape.borderRadius || 0), 0, Math.min(evaluated.w, evaluated.h) / 2);
      geometry.setAttribute('x', String(half));
      geometry.setAttribute('y', String(half));
      geometry.setAttribute('width', String(Math.max(0, evaluated.w - evaluated.strokeWidth)));
      geometry.setAttribute('height', String(Math.max(0, evaluated.h - evaluated.strokeWidth)));
      geometry.setAttribute('rx', String(radius));
    }
  }

  function syncLayerEditorChrome(node, shape) {
    let handle = node.querySelector('.na-resize-handle');
    const needHandle = state.primaryId === shape.id && !shape.locked;
    if (needHandle && !handle) {
      handle = document.createElement('div');
      handle.className = 'na-resize-handle';
      handle.dataset.resizeId = shape.id;
      handle.setAttribute('aria-label', 'Resize layer');
      node.appendChild(handle);
    } else if (!needHandle && handle) handle.remove();

    let badge = node.querySelector('.na-layer-badge');
    if (shape.groupId && !badge) {
      badge = document.createElement('div');
      badge.className = 'na-layer-badge';
      badge.textContent = 'GRP';
      node.appendChild(badge);
    } else if (!shape.groupId && badge) badge.remove();
  }

  function updateLayerNode(node, shape, evaluated, frontIndex) {
    const scale = state.displayScale || 1;
    node.style.left = `${evaluated.x * scale}px`;
    node.style.top = `${evaluated.y * scale}px`;
    node.style.width = `${evaluated.w * scale}px`;
    node.style.height = `${evaluated.h * scale}px`;
    node.style.transform = `rotate(${evaluated.rotation}deg) scale(${evaluated.scaleX}, ${evaluated.scaleY})`;
    node.style.opacity = `${evaluated.opacity / 100}`;
    node.style.mixBlendMode = shape.blendMode || 'normal';
    node.style.zIndex = `${frontIndex}`;
    const filters = [`blur(${evaluated.blur * scale}px)`, `brightness(${evaluated.brightness}%)`, `contrast(${evaluated.contrast}%)`, `saturate(${evaluated.saturation}%)`];
    (shape.effects || []).filter((effect) => effect.enabled !== false).forEach((effect) => {
      const amount = interpolateNumberKeyframes(ensureAnimation(shape).keyframes, `fx__${effect.id}`, state.progress, Number(effect.amount ?? effect.parameters?.amount ?? 0));
      if (effect.type === 'blur') filters.push(`blur(${amount * scale}px)`);
      if (effect.type === 'brightness') filters.push(`brightness(${amount}%)`);
      if (effect.type === 'contrast') filters.push(`contrast(${amount}%)`);
      if (effect.type === 'saturation') filters.push(`saturate(${amount}%)`);
    });
    node.style.filter = filters.join(' ');
    if (shape.shadow?.enabled) {
      const color = hexToRgb(shape.shadow.color);
      const alpha = clamp(Number(shape.shadow.opacity || 0) / 100, 0, 1);
      node.style.boxShadow = `${Number(shape.shadow.offsetX || 0) * scale}px ${Number(shape.shadow.offsetY || 0) * scale}px ${Number(shape.shadow.blur || 0) * scale}px ${Number(shape.shadow.spread || 0) * scale}px rgba(${color.r},${color.g},${color.b},${alpha})`;
    } else node.style.boxShadow = 'none';
    node.classList.toggle('na-inactive', !evaluated.active);
    node.classList.toggle('na-selected', state.primaryId === shape.id);
    node.classList.toggle('na-secondary-selected', state.selectedIds.has(shape.id) && state.primaryId !== shape.id);
    node.classList.toggle('na-locked', shape.locked);
    updateLayerVisual(node, shape, evaluated);
    syncLayerEditorChrome(node, shape);
  }

  function renderScene() {
    if (!state.project) return;
    updateDocumentGeometry();
    const shapesBackToFront = state.project.shapes;
    const required = new Set();
    shapesBackToFront.forEach((shape) => {
      if (shouldMountShape(shape)) required.add(shape.id);
    });
    for (const [id, node] of state.sceneNodes) {
      if (!required.has(id)) {
        node.remove();
        state.sceneNodes.delete(id);
      }
    }
    shapesBackToFront.forEach((shape, index) => {
      if (!required.has(shape.id)) return;
      const node = state.sceneNodes.get(shape.id) || createLayerNode(shape);
      updateLayerNode(node, shape, evaluateShape(shape), index + 1);
    });
    state.mountedIds = required;
  }

  function setProgress(progress, source = 'timeline-scrub') {
    state.progress = clamp01(progress);
    state.scrollControlSource = source;
    if (source !== 'website-scroll') {
      const maxScroll = Math.max(0, dom.websiteScrollRoot.scrollHeight - dom.websiteScrollRoot.clientHeight);
      const desired = maxScroll * state.progress;
      if (Math.abs(dom.websiteScrollRoot.scrollTop - desired) > 0.5) dom.websiteScrollRoot.scrollTop = desired;
    }
    dom.progressButton.textContent = formatPct(state.progress);
    updateTimelinePlayhead();
    renderScene();
    requestAnimationFrame(() => { state.scrollControlSource = 'website-scroll'; });
  }

  function onWebsiteScroll() {
    if (state.scrollControlSource !== 'website-scroll') return;
    const maxScroll = Math.max(0, dom.websiteScrollRoot.scrollHeight - dom.websiteScrollRoot.clientHeight);
    state.progress = maxScroll <= 0 ? 0 : clamp01(dom.websiteScrollRoot.scrollTop / maxScroll);
    recenterTimelineWindow(state.progress);
    dom.progressButton.textContent = formatPct(state.progress);
    updateTimelinePlayhead();
    renderTimelineRuler();
    renderTimelineRows();
    renderScene();
  }

  function togglePlayback() {
    if (state.playing) stopPlayback();
    else startPlayback();
  }

  function startPlayback() {
    if (state.progress >= 0.999) setProgress(0, 'editor-play');
    state.playing = true;
    state.playLastTs = performance.now();
    setButtonIcon(dom.playButton, 'pause');
    dom.playButton.setAttribute('aria-label', 'Pause');
    const step = (ts) => {
      if (!state.playing) return;
      const delta = Math.min(0.05, (ts - state.playLastTs) / 1000);
      state.playLastTs = ts;
      const maxScroll = Math.max(1, dom.websiteScrollRoot.scrollHeight - dom.websiteScrollRoot.clientHeight);
      const deltaProgress = (state.previewSpeedPxPerSecond * delta) / maxScroll;
      const next = Math.min(1, state.progress + deltaProgress);
      setProgress(next, 'editor-play');
      recenterTimelineWindow(next);
      renderTimelineRuler();
      renderTimelineRows();
      if (next >= 1) stopPlayback();
      else state.playRaf = requestAnimationFrame(step);
    };
    state.playRaf = requestAnimationFrame(step);
  }

  function stopPlayback() {
    state.playing = false;
    cancelAnimationFrame(state.playRaf);
    setButtonIcon(dom.playButton, 'play');
    dom.playButton.setAttribute('aria-label', 'Play');
  }

  function selectShape(id, { extend = false, openDock = true } = {}) {
    if (!id) {
      state.selectedIds.clear();
      state.primaryId = null;
      state.multiSelectMode = false;
      state.selectedKeyframeId = null;
      if (openDock) state.uiStack = [{ screen: 'timeline' }];
      renderAll();
      return;
    }
    const shape = getShapeById(id);
    if (!shape) return;
    if (extend) {
      state.multiSelectMode = true;
      if (state.selectedIds.has(id)) state.selectedIds.delete(id);
      else state.selectedIds.add(id);
      state.primaryId = state.selectedIds.has(id) ? id : [...state.selectedIds].at(-1) || null;
    } else {
      state.multiSelectMode = false;
      if (shape.groupId && !state.selectedIds.has(id)) {
        const members = state.project.shapes.filter((s) => s.groupId === shape.groupId);
        state.selectedIds = new Set(members.map((s) => s.id));
      } else {
        state.selectedIds = new Set([id]);
      }
      state.primaryId = id;
    }
    state.selectedKeyframeId = null;
    if (openDock) state.uiStack = [{ screen: 'timeline' }];
    renderAll();
  }

  function enterMultiSelection(id) {
    state.multiSelectMode = true;
    state.selectedIds = new Set([id]);
    state.primaryId = id;
    state.uiStack = [{ screen: 'timeline' }];
    renderAll();
    if (navigator.vibrate) navigator.vibrate(18);
  }

  function createShape(type) {
    const bounds = logicalViewportBounds();
    const width = type === 'text' ? 240 : type === 'circle' ? 120 : 140;
    const height = type === 'text' ? 64 : type === 'circle' ? 120 : 90;
    const x = (state.project.viewport.width - width) / 2;
    const y = bounds.top + (bounds.height - height) / 2;
    const shape = defaultShape(type, round(x, 2), round(y, 2));
    state.project.shapes.push(shape);
    state.selectedIds = new Set([shape.id]);
    state.primaryId = shape.id;
    markDirty();
    closeContext();
    renderAll();
    if (type === 'text') openTextEditor(shape, true);
  }

  function openTextEditor(shape = getPrimaryShape(), isNew = false) {
    if (!shape || shape.type !== 'text') return;
    pushScreen({ screen: 'edit-text-content', layerId: shape.id, isNew });
  }

  function chooseImage() {
    dom.imageInput.value = '';
    dom.imageInput.click();
  }

  function onImageChosen(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const bounds = logicalViewportBounds();
        const maxW = state.project.viewport.width * .7;
        const maxH = state.project.viewport.height * .6;
        const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight, 1);
        const w = Math.max(40, image.naturalWidth * scale);
        const h = Math.max(40, image.naturalHeight * scale);
        const shape = defaultShape('image', (state.project.viewport.width - w) / 2, bounds.top + (bounds.height - h) / 2);
        shape.w = round(w, 2);
        shape.h = round(h, 2);
        shape.src = reader.result;
        shape.fill = 'transparent';
        state.project.shapes.push(shape);
        state.selectedIds = new Set([shape.id]);
        state.primaryId = shape.id;
        markDirty();
        closeContext();
        renderAll();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function duplicateSelected() {
    const selected = state.project.shapes.filter((shape) => state.selectedIds.has(shape.id));
    if (!selected.length) return;
    const newIds = [];
    const groupMap = new Map();
    selected.forEach((shape) => {
      const copy = deepClone(shape);
      copy.id = uid('sh');
      copy.name = `${shape.name} copy`;
      copy.x += 16;
      copy.y += 16;
      ensureAnimation(copy).keyframes.forEach((kf) => { kf.id = uid('kf'); });
      if (shape.groupId) {
        if (!groupMap.has(shape.groupId)) groupMap.set(shape.groupId, uid('grp'));
        copy.groupId = groupMap.get(shape.groupId);
        state.project.groups[copy.groupId] = { name: `${state.project.groups[shape.groupId]?.name || 'Group'} copy` };
      }
      state.project.shapes.push(copy);
      newIds.push(copy.id);
    });
    state.selectedIds = new Set(newIds);
    state.primaryId = newIds.at(-1) || null;
    markDirty();
    renderAll();
    toast('Duplicated');
  }

  async function groupSelected() {
    if (state.selectedIds.size < 2) return;
    const selected = state.project.shapes.filter((shape) => state.selectedIds.has(shape.id));
    const indices = selected.map((shape) => state.project.shapes.indexOf(shape)).sort((a, b) => a - b);
    const adjacent = indices.every((value, i) => i === 0 || value === indices[i - 1] + 1);
    if (!adjacent) {
      const ok = await confirmAction('Stacking may change', 'Grouping non-adjacent layers makes them one stacking unit. Continue?');
      if (!ok) return;
    }
    const groupId = uid('grp');
    state.project.groups[groupId] = { name: `Group ${Object.keys(state.project.groups).length + 1}` };
    selected.forEach((shape) => { shape.groupId = groupId; });
    state.multiSelectMode = false;
    markDirty();
    renderAll();
    toast('Grouped');
  }

  async function deleteSelected() {
    if (!state.selectedIds.size) return;
    const ok = await confirmAction('Delete layers', `Delete ${state.selectedIds.size} selected layer${state.selectedIds.size > 1 ? 's' : ''}?`);
    if (!ok) return;
    const removedGroups = new Set();
    state.project.shapes.forEach((shape) => {
      if (state.selectedIds.has(shape.id) && shape.groupId) removedGroups.add(shape.groupId);
    });
    state.project.shapes = state.project.shapes.filter((shape) => !state.selectedIds.has(shape.id));
    removedGroups.forEach((groupId) => {
      if (!state.project.shapes.some((shape) => shape.groupId === groupId)) delete state.project.groups[groupId];
    });
    state.selectedIds.clear();
    state.primaryId = null;
    state.multiSelectMode = false;
    closeContext();
    markDirty();
    renderAll();
  }

  function toggleLock(shape) {
    shape.locked = !shape.locked;
    markDirty();
    renderAll();
  }

  function reorderShape(shapeId, targetFrontIndex) {
    const front = getRootShapesFrontToBack();
    const current = front.findIndex((shape) => shape.id === shapeId);
    if (current < 0) return;
    const [shape] = front.splice(current, 1);
    front.splice(clamp(targetFrontIndex, 0, front.length), 0, shape);
    state.project.shapes = front.reverse();
    markDirty();
    renderAll();
  }

  function pointerLogicalPosition(event) {
    const rect = dom.websiteScrollRoot.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / state.displayScale,
      y: (event.clientY - rect.top + dom.websiteScrollRoot.scrollTop) / state.displayScale
    };
  }

  let sceneGesture = null;
  function onScenePointerDown(event) {
    const node = event.currentTarget;
    const shape = getShapeById(node.dataset.layerId);
    if (!shape) return;
    event.stopPropagation();
    if (shape.locked) {
      selectShape(shape.id);
      return;
    }
    const isResize = Boolean(event.target.closest('.na-resize-handle'));
    selectShape(shape.id, { openDock: false });
    node.setPointerCapture(event.pointerId);
    const start = pointerLogicalPosition(event);
    const selected = state.project.shapes.filter((s) => state.selectedIds.has(s.id));
    sceneGesture = {
      type: isResize ? 'resize' : 'move',
      pointerId: event.pointerId,
      start,
      last: start,
      originals: selected.map((s) => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h })),
      moved: false,
      shapeId: shape.id
    };
    const move = (ev) => onScenePointerMove(ev);
    const end = (ev) => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', end);
      node.removeEventListener('pointercancel', cancel);
      if (sceneGesture?.moved) markDirty();
      sceneGesture = null;
      renderAll();
    };
    const cancel = () => {
      sceneGesture?.originals.forEach((original) => Object.assign(getShapeById(original.id), original));
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', end);
      node.removeEventListener('pointercancel', cancel);
      sceneGesture = null;
      renderAll();
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', cancel);
  }

  function hasAnimatedProperty(shape, properties) {
    const keys = Array.isArray(properties) ? properties : [properties];
    return ensureAnimation(shape).keyframes.some((kf) => keys.some((key) => kf[key] !== undefined));
  }

  function findOrCreateKeyframe(shape, at = state.progress) {
    const anim = ensureAnimation(shape);
    let keyframe = anim.keyframes.find((kf) => Math.abs(getKeyframeProgress(kf) - at) <= .0025);
    if (!keyframe) {
      keyframe = { id: uid('kf'), at: clamp01(at), easingToNext: normalizeEase('linear') };
      anim.keyframes.push(keyframe);
      anim.keyframes.sort((a, b) => a.at - b.at);
    }
    return keyframe;
  }

  function updatePositionAtPlayhead(shape, x, y) {
    if (hasAnimatedProperty(shape, ['x', 'y'])) {
      const kf = findOrCreateKeyframe(shape);
      kf.x = x;
      kf.y = y;
    } else {
      shape.x = x;
      shape.y = y;
    }
  }

  function onScenePointerMove(event) {
    if (!sceneGesture || event.pointerId !== sceneGesture.pointerId) return;
    const current = pointerLogicalPosition(event);
    const dx = current.x - sceneGesture.start.x;
    const dy = current.y - sceneGesture.start.y;
    if (Math.hypot(dx, dy) > 3) sceneGesture.moved = true;
    if (!sceneGesture.moved) return;
    if (sceneGesture.type === 'move') {
      sceneGesture.originals.forEach((original) => {
        const shape = getShapeById(original.id);
        if (!shape || shape.locked) return;
        updatePositionAtPlayhead(shape, round(original.x + dx, 2), round(original.y + dy, 2));
      });
    } else {
      const original = sceneGesture.originals.find((item) => item.id === sceneGesture.shapeId);
      const shape = getShapeById(sceneGesture.shapeId);
      if (shape && original) {
        if (shape.type === 'circle') {
          const size = Math.max(10, original.w + Math.max(dx, dy));
          shape.w = size;
          shape.h = size;
        } else {
          shape.w = Math.max(10, original.w + dx);
          shape.h = Math.max(10, original.h + dy);
        }
      }
    }
    renderScene();
    refreshActiveContextValues();
  }

  function timelineVisibleEnd() {
    return state.timeline.visibleStart + 1 / state.timeline.zoom;
  }

  function timelineProgressToPercent(progress) {
    const start = state.timeline.visibleStart;
    const end = timelineVisibleEnd();
    return ((progress - start) / Math.max(.000001, end - start)) * 100;
  }

  function timelineClientXToProgress(clientX, element) {
    const rect = element.getBoundingClientRect();
    const ratio = clamp01((clientX - rect.left) / Math.max(1, rect.width));
    return clamp01(state.timeline.visibleStart + ratio * (timelineVisibleEnd() - state.timeline.visibleStart));
  }

  function setTimelineZoom(nextZoom, anchorProgress = state.progress, anchorRatio = .5) {
    const zoom = clamp(nextZoom, 1, 16);
    const span = 1 / zoom;
    state.timeline.zoom = zoom;
    state.timeline.visibleStart = anchorProgress - anchorRatio * span;
    renderContext(false);
  }

  function recenterTimelineWindow(progress) {
    const span = 1 / state.timeline.zoom;
    state.timeline.visibleStart = progress - span / 2;
  }

  function layerTypeIconName(shape) {
    return shape.type === 'rectangle' ? 'rectangle' : shape.type === 'circle' ? 'circle' : shape.type === 'text' ? 'text' : 'image';
  }

  function keyframeHasVisualProperties(kf) {
    return ['x', 'y', 'w', 'h', 'scaleX', 'scaleY', 'rotation', 'opacity', 'fillOpacity', 'fill', 'strokeWidth', 'blur', 'brightness', 'contrast', 'saturation']
      .some((property) => kf[property] !== undefined);
  }

  function renderTimeline() {
    const selectedCount = state.selectedIds.size;
    const dock = selectedCount === 1 && !state.multiSelectMode ? renderPropertyDock() : '';
    dom.contextRoot.innerHTML = `
      <div class="na-timeline-shell">
        <div class="na-timeline-ruler-row">
          <div class="na-ruler-spacer"></div>
          <div id="timeline-ruler" class="na-ruler-track" aria-label="Scroll timeline ruler"></div>
        </div>
        <div id="timeline-list" class="na-timeline-list">
          <div id="timeline-spacer" class="na-timeline-spacer"></div>
        </div>
        ${dock}
        ${selectedCount === 0 ? `<button id="add-fab" class="na-add-fab" aria-label="Add layer" title="Add layer">${icon('plus')}</button>` : ''}
      </div>
    `;
    dom.timelineRuler = $('#timeline-ruler');
    dom.timelineList = $('#timeline-list');
    dom.timelineSpacer = $('#timeline-spacer');
    dom.timelineList.scrollTop = state.timeline.scrollTop;
    dom.timelineList.addEventListener('scroll', () => {
      state.timeline.scrollTop = dom.timelineList.scrollTop;
      renderTimelineRows();
    }, { passive: true });
    $('#add-fab')?.addEventListener('click', () => pushScreen({ screen: 'add-root' }));
    bindPropertyDock();
    renderTimelineRuler();
    bindRulerGestures();
    renderTimelineRows();
  }

  function renderTimelineRuler() {
    if (!dom.timelineRuler) return;
    const start = state.timeline.visibleStart;
    const end = timelineVisibleEnd();
    const ticks = [];
    for (let i = 0; i <= 4; i += 1) {
      const progress = start + (end - start) * (i / 4);
      if (progress < 0 || progress > 1) continue;
      ticks.push(`<div class="na-ruler-tick" style="left:${i * 25}%"></div><div class="na-ruler-label" style="left:${i * 25}%">${formatPct(progress)}</div>`);
    }
    dom.timelineRuler.innerHTML = `${ticks.join('')}<div id="ruler-playhead" class="na-playhead-line"></div><div id="ruler-playhead-head" class="na-playhead-head"></div>`;
    updateTimelinePlayhead();
  }

  function renderTimelineRows() {
    if (!dom.timelineList || !dom.timelineSpacer) return;
    const rows = getRootShapesFrontToBack();
    const rowHeight = 48;
    const viewportHeight = dom.timelineList.clientHeight;
    const overscan = 6;
    const first = Math.max(0, Math.floor(dom.timelineList.scrollTop / rowHeight) - overscan);
    const last = Math.min(rows.length, Math.ceil((dom.timelineList.scrollTop + viewportHeight) / rowHeight) + overscan);
    dom.timelineSpacer.style.height = `${rows.length * rowHeight}px`;
    const html = [];
    for (let index = first; index < last; index += 1) {
      const shape = rows[index];
      const selected = state.selectedIds.has(shape.id);
      const anim = ensureAnimation(shape);
      const start = clamp01(Number(anim.rangeStart) / 100);
      const end = clamp01(Number(anim.rangeEnd) / 100);
      const left = timelineProgressToPercent(Math.min(start, end));
      const right = timelineProgressToPercent(Math.max(start, end));
      if (right < -5 || left > 105) continue;
      const visibleLeft = clamp(left, -10, 110);
      const visibleRight = clamp(right, -10, 110);
      const barWidth = Math.max(0.5, visibleRight - visibleLeft);
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      const keyframes = anim.keyframes.filter(keyframeHasVisualProperties).map((kf) => {
        const at = getKeyframeProgress(kf);
        const relPct = hi > lo ? ((at - lo) / (hi - lo)) * 100 : 50;
        const active = state.selectedKeyframeId === kf.id ? 'na-kf-selected' : '';
        return `<button class="na-keyframe ${active}" data-kf-id="${escapeAttr(kf.id)}" data-layer-id="${escapeAttr(shape.id)}" style="left:clamp(14px, ${relPct}%, calc(100% - 14px))" aria-label="Keyframe at ${formatPct(at)}"></button>`;
      }).join('');
      html.push(`
        <div class="na-timeline-row" data-layer-id="${escapeAttr(shape.id)}" data-row-index="${index}" style="top:${index * rowHeight}px">
          <div class="na-layer-cell ${selected ? 'na-row-selected' : ''}">
            <button class="na-reorder-grip" data-reorder-id="${escapeAttr(shape.id)}" aria-label="Reorder ${escapeAttr(shape.name)}">${icon('grip')}</button>
            <span class="na-layer-type-icon">${icon(layerTypeIconName(shape))}</span>
            <span class="na-layer-name">${escapeHtml(shape.name)}</span>
            <button class="na-row-action" data-lock-id="${escapeAttr(shape.id)}" aria-label="${shape.locked ? 'Unlock' : 'Lock'} ${escapeAttr(shape.name)}">${icon(shape.locked ? 'lock' : 'unlock')}</button>
          </div>
          <div class="na-track-cell" data-track-layer-id="${escapeAttr(shape.id)}">
            <div class="na-bar ${selected ? 'na-bar-selected' : ''}" data-bar-id="${escapeAttr(shape.id)}" style="left:${visibleLeft}%;width:${barWidth}%">
              ${selected ? `<span class="na-bar-handle start" data-trim="start" data-layer-id="${escapeAttr(shape.id)}"></span><span class="na-bar-handle end" data-trim="end" data-layer-id="${escapeAttr(shape.id)}"></span>` : ''}
              ${keyframes}
            </div>
            <div class="na-playhead-line na-row-playhead"></div>
          </div>
        </div>
      `);
    }
    dom.timelineSpacer.innerHTML = html.join('');
    bindTimelineRowEvents();
    updateTimelinePlayhead();
  }

  function patchTimelineGeometryForLayer(layerId) {
    if (!dom.timelineSpacer) return;
    const shape = getShapeById(layerId);
    const row = dom.timelineSpacer.querySelector(`.na-timeline-row[data-layer-id="${CSS.escape(layerId)}"]`);
    if (!shape || !row) return;
    const anim = ensureAnimation(shape);
    const start = clamp01(Number(anim.rangeStart) / 100);
    const end = clamp01(Number(anim.rangeEnd) / 100);
    const left = clamp(timelineProgressToPercent(Math.min(start, end)), -10, 110);
    const right = clamp(timelineProgressToPercent(Math.max(start, end)), -10, 110);
    const bar = row.querySelector('[data-bar-id]');
    if (bar) {
      bar.style.left = `${left}%`;
      bar.style.width = `${Math.max(.5, right - left)}%`;
    }
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    row.querySelectorAll('.na-keyframe').forEach((button) => {
      const keyframe = anim.keyframes.find((kf) => kf.id === button.dataset.kfId);
      if (!keyframe) return;
      const at = getKeyframeProgress(keyframe);
      const relPct = hi > lo ? ((at - lo) / (hi - lo)) * 100 : 50;
      button.style.left = `clamp(14px, ${relPct}%, calc(100% - 14px))`;
    });
  }

  function refreshActiveContextValues() {
    const screen = currentScreen();
    const shape = getShapeById(screen.layerId);
    if (!shape) return;
    if (screen.screen === 'transform') {
      const values = currentPropertyValues(shape, state.activeTransformMode);
      const container = $('.na-transform-values', dom.contextRoot);
      if (!container) return;
      if (state.activeTransformMode === 'position') container.innerHTML = `<span>↔ ${round(values.x,1)}px</span><span>↕ ${round(values.y,1)}px</span>`;
      if (state.activeTransformMode === 'scale') container.innerHTML = `<span>↔ ${round(values.scaleX*100,1)}%</span><span>↕ ${round(values.scaleY*100,1)}%</span>`;
      if (state.activeTransformMode === 'rotation') container.innerHTML = `<span>↻ ${round(values.rotation,1)}°</span>`;
    }
    if (screen.screen === 'effect-detail') {
      const effect = shape.effects.find((item) => item.id === screen.effectId);
      const meta = effect ? EFFECTS[effect.type] : null;
      if (!effect || !meta) return;
      const property = `fx__${effect.id}`;
      const value = currentPropertyValues(shape, property)[property];
      const slider = $('#effect-amount', dom.contextRoot);
      const display = $('#effect-amount-value', dom.contextRoot);
      if (slider && document.activeElement !== slider) slider.value = value;
      if (display) display.textContent = `${round(value,1)}${meta.unit}`;
    }
  }

  function updateTimelinePlayhead() {
    // ponytail: playhead fixed di CSS left:50%, tidak perlu JS override
  }

  function bindRulerGestures() {
    const ruler = dom.timelineRuler;
    if (!ruler) return;
    const pointers = new Map();
    let gesture = null;
    let pending = null;
    let pendingTimer = 0;
    const commitScrub = () => {
      gesture = { type: 'scrub', lastX: [...pointers.values()][0].x };
    };
    const commitPinch = () => {
      const pair = [...pointers.values()];
      const rect = ruler.getBoundingClientRect();
      const mid = (pair[0].x + pair[1].x) / 2;
      const dist = Math.abs(pair[0].x - pair[1].x);
      gesture = {
        type: 'pinch',
        startDistance: Math.max(1, dist),
        startZoom: state.timeline.zoom,
        anchorProgress: timelineClientXToProgress(mid, ruler),
        anchorRatio: clamp01((mid - rect.left) / rect.width)
      };
    };
    ruler.addEventListener('pointerdown', (event) => {
      ruler.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        stopPlayback();
        pending = { x: event.clientX };
        pendingTimer = setTimeout(() => { if (pending && pointers.size === 1) { pending = null; commitScrub(); } }, 100);
      } else if (pointers.size === 2 && pending) {
        clearTimeout(pendingTimer); pending = null; commitPinch();
      }
    });
    ruler.addEventListener('pointermove', (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pending && pointers.size === 1 && Math.abs(event.clientX - pending.x) > 8) { clearTimeout(pendingTimer); pending = null; commitScrub(); }
      if (gesture?.type === 'pinch' && pointers.size >= 2) {
        const pair = [...pointers.values()];
        const zoom = gesture.startZoom * (Math.abs(pair[0].x - pair[1].x) / gesture.startDistance);
        setTimelineZoom(zoom, gesture.anchorProgress, gesture.anchorRatio);
      } else if (gesture?.type === 'scrub' && pointers.size === 1) {
        const rect = ruler.getBoundingClientRect();
        const span = 1 / state.timeline.zoom;
        const dx = event.clientX - gesture.lastX;
        gesture.lastX = event.clientX;
        state.timeline.visibleStart -= (dx / rect.width) * span;
        const derivedProgress = clamp01(state.timeline.visibleStart + span / 2);
        setProgress(derivedProgress, 'timeline-scrub');
        renderTimelineRuler();
        renderTimelineRows();
      }
    });
    const end = (event) => {
      pointers.delete(event.pointerId);
      if (pointers.size === 0) { clearTimeout(pendingTimer); pending = null; gesture = null; }
    };
    ruler.addEventListener('pointerup', end);
    ruler.addEventListener('pointercancel', end);
    ruler.addEventListener('dblclick', () => setTimelineZoom(1, state.progress, .5));
  }

  function bindTimelineRowEvents() {
    $$('.na-layer-cell', dom.timelineSpacer).forEach((cell) => {
      const row = cell.closest('.na-timeline-row');
      const layerId = row.dataset.layerId;
      let timer = 0;
      let down = null;
      cell.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.na-reorder-grip,.na-row-action')) return;
        down = { x: event.clientX, y: event.clientY };
        timer = setTimeout(() => {
          timer = 0;
          enterMultiSelection(layerId);
        }, 450);
      });
      cell.addEventListener('pointermove', (event) => {
        if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) {
          clearTimeout(timer);
          timer = 0;
        }
      });
      cell.addEventListener('pointerup', (event) => {
        if (timer) {
          clearTimeout(timer);
          timer = 0;
          if (state.multiSelectMode) selectShape(layerId, { extend: true });
          else selectShape(layerId);
        }
        down = null;
      });
      cell.addEventListener('pointercancel', () => { clearTimeout(timer); timer = 0; down = null; });
    });

    $$('[data-lock-id]', dom.timelineSpacer).forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      const shape = getShapeById(button.dataset.lockId);
      if (shape) toggleLock(shape);
    }));

    $$('[data-reorder-id]', dom.timelineSpacer).forEach((button) => button.addEventListener('pointerdown', beginReorderGesture));
    $$('[data-bar-id]', dom.timelineSpacer).forEach((bar) => bar.addEventListener('pointerdown', beginBarGesture));
    $$('[data-trim]', dom.timelineSpacer).forEach((handle) => handle.addEventListener('pointerdown', beginTrimGesture));
    $$('.na-keyframe', dom.timelineSpacer).forEach((keyframe) => keyframe.addEventListener('pointerdown', beginKeyframeGesture));
  }

  function beginReorderGesture(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const layerId = button.dataset.reorderId;
    const rows = getRootShapesFrontToBack();
    const startIndex = rows.findIndex((shape) => shape.id === layerId);
    if (startIndex < 0) return;
    button.setPointerCapture(event.pointerId);
    let targetIndex = startIndex;
    const startY = event.clientY;
    const startScroll = dom.timelineList.scrollTop;
    const move = (ev) => {
      const deltaRows = Math.round((ev.clientY - startY + dom.timelineList.scrollTop - startScroll) / 48);
      targetIndex = clamp(startIndex + deltaRows, 0, rows.length - 1);
      $$('.na-timeline-row', dom.timelineSpacer).forEach((row) => row.style.opacity = row.dataset.layerId === layerId ? '.55' : '1');
    };
    const end = () => {
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerup', end);
      button.removeEventListener('pointercancel', cancel);
      if (targetIndex !== startIndex) reorderShape(layerId, targetIndex);
      else renderTimelineRows();
    };
    const cancel = () => {
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerup', end);
      button.removeEventListener('pointercancel', cancel);
      renderTimelineRows();
    };
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', cancel);
  }

  function timelineSnapTargets({ excludeLayerId = null, excludeKeyframeId = null } = {}) {
    const targets = [0, 1, state.progress];
    for (const item of state.project?.shapes || []) {
      if (item.id !== excludeLayerId) {
        const animation = ensureAnimation(item);
        targets.push(Number(animation.rangeStart) / 100, Number(animation.rangeEnd) / 100);
      }
      for (const keyframe of ensureAnimation(item).keyframes) {
        if (keyframe.id !== excludeKeyframeId && item.id !== excludeLayerId) targets.push(getKeyframeProgress(keyframe));
      }
    }
    return [...new Set(targets.map((value) => round(clamp01(value), 6)))];
  }

  function timelineSnapThreshold(track) {
    const width = Math.max(1, track?.getBoundingClientRect().width || 1);
    return (6 / width) * (timelineVisibleEnd() - state.timeline.visibleStart);
  }

  function snapTimelineProgress(value, track, options = {}) {
    const threshold = timelineSnapThreshold(track);
    let result = clamp01(value);
    let distance = threshold;
    for (const target of timelineSnapTargets(options)) {
      const nextDistance = Math.abs(target - value);
      if (nextDistance <= distance) {
        distance = nextDistance;
        result = target;
      }
    }
    return result;
  }

  function snapTimelineDelta(points, delta, track, options = {}) {
    const threshold = timelineSnapThreshold(track);
    const targets = timelineSnapTargets(options);
    let bestAdjustment = 0;
    let bestDistance = threshold;
    for (const point of points) {
      const moved = point + delta;
      for (const target of targets) {
        const adjustment = target - moved;
        const distance = Math.abs(adjustment);
        if (distance <= bestDistance) {
          bestDistance = distance;
          bestAdjustment = adjustment;
        }
      }
    }
    return delta + bestAdjustment;
  }

  function beginBarGesture(event) {
    if (event.target.closest('[data-trim]') || event.target.closest('.na-keyframe')) return;
    event.stopPropagation();
    const bar = event.currentTarget;
    const shape = getShapeById(bar.dataset.barId);
    if (!shape) return;
    if (!state.selectedIds.has(shape.id)) selectShape(shape.id);
    if (state.selectedIds.size > 1) return;
    bar.setPointerCapture(event.pointerId);
    const anim = ensureAnimation(shape);
    const original = {
      start: Number(anim.rangeStart) / 100,
      end: Number(anim.rangeEnd) / 100,
      keyframes: anim.keyframes.map((kf) => ({ id: kf.id, at: getKeyframeProgress(kf) }))
    };
    const startProgress = timelineClientXToProgress(event.clientX, bar.parentElement);
    const allPoints = [original.start, original.end, ...original.keyframes.map((kf) => kf.at)];
    const minPoint = Math.min(...allPoints);
    const maxPoint = Math.max(...allPoints);
    let changed = false;
    const move = (ev) => {
      let delta = timelineClientXToProgress(ev.clientX, bar.parentElement) - startProgress;
      delta = snapTimelineDelta(allPoints, delta, bar.parentElement, { excludeLayerId: shape.id });
      delta = clamp(delta, -minPoint, 1 - maxPoint);
      anim.rangeStart = round((original.start + delta) * 100, 4);
      anim.rangeEnd = round((original.end + delta) * 100, 4);
      anim.keyframes.forEach((kf) => {
        const ref = original.keyframes.find((item) => item.id === kf.id);
        if (ref) kf.at = clamp01(ref.at + delta);
      });
      changed = Math.abs(delta) > .00001;
      patchTimelineGeometryForLayer(shape.id);
      renderScene();
    };
    const finish = (commit) => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', end);
      bar.removeEventListener('pointercancel', cancel);
      if (!commit) {
        anim.rangeStart = original.start * 100;
        anim.rangeEnd = original.end * 100;
        anim.keyframes.forEach((kf) => {
          const ref = original.keyframes.find((item) => item.id === kf.id);
          if (ref) kf.at = ref.at;
        });
      } else if (changed) markDirty();
      renderAll();
    };
    const end = () => finish(true);
    const cancel = () => finish(false);
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', cancel);
  }

  function beginTrimGesture(event) {
    event.stopPropagation();
    const handle = event.currentTarget;
    const shape = getShapeById(handle.dataset.layerId);
    if (!shape || state.selectedIds.size > 1) return;
    const anim = ensureAnimation(shape);
    const edge = handle.dataset.trim;
    const originalStart = Number(anim.rangeStart) / 100;
    const originalEnd = Number(anim.rangeEnd) / 100;
    const minRange = .01;
    handle.setPointerCapture(event.pointerId);
    let changed = false;
    const move = (ev) => {
      const track = handle.closest('.na-track-cell');
      const p = snapTimelineProgress(timelineClientXToProgress(ev.clientX, track), track, { excludeLayerId: shape.id });
      if (edge === 'start') anim.rangeStart = round(clamp(p, 0, originalEnd - minRange) * 100, 4);
      else anim.rangeEnd = round(clamp(p, originalStart + minRange, 1) * 100, 4);
      changed = true;
      patchTimelineGeometryForLayer(shape.id);
      renderScene();
    };
    const finish = (commit) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', cancel);
      if (!commit) {
        anim.rangeStart = originalStart * 100;
        anim.rangeEnd = originalEnd * 100;
      } else if (changed) markDirty();
      renderAll();
    };
    const end = () => finish(true);
    const cancel = () => finish(false);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', cancel);
  }

  function beginKeyframeGesture(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const shape = getShapeById(button.dataset.layerId);
    const keyframe = ensureAnimation(shape).keyframes.find((kf) => kf.id === button.dataset.kfId);
    if (!shape || !keyframe) return;
    button.setPointerCapture(event.pointerId);
    const original = getKeyframeProgress(keyframe);
    let changed = false;
    let moved = false;
    const startX = event.clientX;
    const move = (ev) => {
      if (Math.abs(ev.clientX - startX) > 4) moved = true;
      if (!moved) return;
      const track = button.closest('.na-track-cell');
      keyframe.at = snapTimelineProgress(timelineClientXToProgress(ev.clientX, track), track, { excludeKeyframeId: keyframe.id });
      ensureAnimation(shape).keyframes.sort((a, b) => a.at - b.at);
      state.selectedKeyframeId = keyframe.id;
      changed = true;
      patchTimelineGeometryForLayer(shape.id);
      renderScene();
    };
    const finish = (commit) => {
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerup', end);
      button.removeEventListener('pointercancel', cancel);
      if (!commit) keyframe.at = original;
      else if (!moved) {
        state.selectedKeyframeId = keyframe.id;
        selectShape(shape.id, { openDock: false });
        recenterTimelineWindow(keyframe.at);
        setProgress(keyframe.at, 'timeline-scrub');
      } else if (changed) markDirty();
      renderAll();
    };
    const end = () => finish(true);
    const cancel = () => finish(false);
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', cancel);
  }

  function getRelevantMarkers() {
    const shape = getPrimaryShape();
    const markers = [0, 1];
    if (shape) {
      const anim = ensureAnimation(shape);
      markers.push(Number(anim.rangeStart) / 100, Number(anim.rangeEnd) / 100);
      anim.keyframes.forEach((kf) => markers.push(getKeyframeProgress(kf)));
    } else {
      state.project.shapes.forEach((item) => {
        const anim = ensureAnimation(item);
        markers.push(Number(anim.rangeStart) / 100, Number(anim.rangeEnd) / 100);
      });
    }
    return [...new Set(markers.map((value) => round(clamp01(value), 5)))].sort((a, b) => a - b);
  }

  function jumpMarker(direction) {
    const markers = getRelevantMarkers();
    const epsilon = .001;
    let next = direction < 0 ? markers.filter((p) => p < state.progress - epsilon).at(-1) : markers.find((p) => p > state.progress + epsilon);
    if (next === undefined) next = direction < 0 ? 0 : 1;
    recenterTimelineWindow(next);
    setProgress(next, 'timeline-scrub');
    renderContext();
  }

  const PROPERTY_FIELDS = {
    position: ['x', 'y'],
    scale: ['scaleX', 'scaleY'],
    rotation: ['rotation'],
    opacity: ['opacity'],
    fill: ['fill'],
    fillOpacity: ['fillOpacity'],
    strokeWidth: ['strokeWidth'],
    blur: ['blur'],
    brightness: ['brightness'],
    contrast: ['contrast'],
    saturation: ['saturation']
  };

  function fieldsForProperty(property) {
    if (property?.startsWith('fx__')) return [property];
    return PROPERTY_FIELDS[property] || [property];
  }

  function propertyHasTrack(shape, property) {
    const fields = fieldsForProperty(property);
    return ensureAnimation(shape).keyframes.some((kf) => fields.some((field) => kf[field] !== undefined));
  }

  function keyframeAtPlayhead(shape, property) {
    const fields = fieldsForProperty(property);
    return ensureAnimation(shape).keyframes.find((kf) => Math.abs(getKeyframeProgress(kf) - state.progress) <= .0025 && fields.some((field) => kf[field] !== undefined));
  }

  function currentPropertyValues(shape, property) {
    const evaluated = evaluateShape(shape);
    if (property === 'position') return { x: evaluated.x, y: evaluated.y };
    if (property === 'scale') return { scaleX: evaluated.scaleX, scaleY: evaluated.scaleY };
    if (property.startsWith('fx__')) {
      const effectId = property.slice(4);
      const effect = shape.effects.find((item) => item.id === effectId);
      const fallback = Number(effect?.amount || 0);
      return { [property]: interpolateNumberKeyframes(ensureAnimation(shape).keyframes, property, state.progress, fallback) };
    }
    const field = fieldsForProperty(property)[0];
    return { [field]: evaluated[field] ?? shape[field] };
  }

  function applyPropertyValues(shape, property, values, { commit = false } = {}) {
    const fields = fieldsForProperty(property);
    if (propertyHasTrack(shape, property)) {
      const kf = findOrCreateKeyframe(shape);
      fields.forEach((field) => {
        if (values[field] !== undefined) kf[field] = values[field];
      });
      state.selectedKeyframeId = kf.id;
    } else if (property.startsWith('fx__')) {
      const effect = shape.effects.find((item) => item.id === property.slice(4));
      if (effect) effect.amount = Number(values[property]);
    } else {
      fields.forEach((field) => {
        if (values[field] !== undefined) shape[field] = values[field];
      });
    }
    if (commit) markDirty();
    renderScene();
    renderTimelineRows();
  }

  function togglePropertyKeyframe(shape, property) {
    const fields = fieldsForProperty(property);
    const existing = keyframeAtPlayhead(shape, property);
    const anim = ensureAnimation(shape);
    if (existing) {
      fields.forEach((field) => delete existing[field]);
      if (!keyframeHasVisualProperties(existing) && !Object.keys(existing).some((key) => key.startsWith('fx__'))) {
        anim.keyframes = anim.keyframes.filter((kf) => kf.id !== existing.id);
      }
      state.selectedKeyframeId = null;
    } else {
      const kf = findOrCreateKeyframe(shape);
      Object.assign(kf, currentPropertyValues(shape, property));
      state.selectedKeyframeId = kf.id;
    }
    markDirty();
    renderAll();
  }

  function jumpPropertyKeyframe(shape, property, direction) {
    const fields = fieldsForProperty(property);
    const positions = ensureAnimation(shape).keyframes
      .filter((kf) => fields.some((field) => kf[field] !== undefined))
      .map(getKeyframeProgress)
      .sort((a, b) => a - b);
    const next = direction < 0
      ? positions.filter((p) => p < state.progress - .001).at(-1)
      : positions.find((p) => p > state.progress + .001);
    if (next === undefined) return toast('No more keyframes');
    recenterTimelineWindow(next);
    setProgress(next, 'timeline-scrub');
    renderContext();
  }

  function getCurveSegment(shape, property) {
    const fields = fieldsForProperty(property);
    const list = ensureAnimation(shape).keyframes
      .filter((kf) => fields.some((field) => kf[field] !== undefined))
      .sort((a, b) => a.at - b.at);
    if (list.length < 2) return null;
    for (let i = 0; i < list.length - 1; i += 1) {
      if (state.progress >= list[i].at - .002 && state.progress <= list[i + 1].at + .002) return { start: list[i], end: list[i + 1] };
    }
    return { start: list[0], end: list[1] };
  }

  function renderPropertyDock() {
    const shape = getPrimaryShape();
    if (!shape) return '';
    const actions = [];
    actions.push(['edit', 'edit']);
    if (shape.type !== 'image') actions.push(['fill', 'fill']);
    actions.push(['border', 'border-shadow']);
    actions.push(['blend', 'blend-root']);
    actions.push(['transform', 'transform']);
    actions.push(['effects', 'effects']);
    actions.push(['code', 'code']);
    return `<div id="property-dock" class="na-context-dock">${actions.map(([iconName, screen]) => `<button class="na-icon-btn" data-property-screen="${screen}" aria-label="${screen}" title="${screen}">${icon(iconName)}</button>`).join('')}</div>`;
  }

  function bindPropertyDock() {
    $$('[data-property-screen]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => {
      const screen = button.dataset.propertyScreen;
      const shape = getPrimaryShape();
      if (!shape) return;
      if (screen === 'edit') {
        if (shape.type === 'text') pushScreen({ screen: 'edit-text', layerId: shape.id });
        else if (shape.type === 'image') pushScreen({ screen: 'edit-image', layerId: shape.id });
        else pushScreen({ screen: 'edit-shape', layerId: shape.id });
      } else pushScreen({ screen, layerId: shape.id });
    }));
  }

  function screenShell(contextIcon, body, extraClass = '') {
    return `<div class="na-context-screen ${extraClass}">
      <div class="na-context-header">
        <button class="na-icon-btn" data-context-back aria-label="Back">${icon('back')}</button>
        <div class="na-context-icon">${icon(contextIcon)}</div>
        <button class="na-icon-btn" data-context-close aria-label="Close">${icon('close')}</button>
      </div>
      <div class="na-context-body">${body}</div>
    </div>`;
  }

  function bindScreenNavigation() {
    $('[data-context-back]', dom.contextRoot)?.addEventListener('click', popScreen);
    $('[data-context-close]', dom.contextRoot)?.addEventListener('click', closeContext);
  }

  function renderContext(replace = true) {
    if (!state.project) return;
    const screen = currentScreen();
    if (screen.screen === 'timeline') {
      if (replace || !dom.timelineList) renderTimeline();
      else {
        renderTimelineRows();
        renderTimelineRuler();
      }
      return;
    }
    dom.timelineRuler = null;
    dom.timelineList = null;
    dom.timelineSpacer = null;
    switch (screen.screen) {
      case 'add-root': renderAddRoot(); break;
      case 'shape-picker': renderShapePicker(); break;
      case 'edit-shape': renderEditShape(screen); break;
      case 'edit-text': renderEditText(screen); break;
      case 'edit-text-content': renderEditTextContent(screen); break;
      case 'edit-image': renderEditImage(screen); break;
      case 'fill': renderFill(screen); break;
      case 'border-shadow': renderBorderShadowRoot(screen); break;
      case 'border-detail': renderBorderDetail(screen); break;
      case 'shadow-detail': renderShadowDetail(screen); break;
      case 'blend-root': renderBlendRoot(screen); break;
      case 'opacity-detail': renderOpacityDetail(screen); break;
      case 'blend-detail': renderBlendDetail(screen); break;
      case 'transform': renderTransform(screen); break;
      case 'curve': renderCurve(screen); break;
      case 'effects': renderEffects(screen); break;
      case 'effect-browser': renderEffectBrowser(screen); break;
      case 'effect-detail': renderEffectDetail(screen); break;
      case 'code': renderCodeScreen(screen); break;
      default: closeContext();
    }
  }

  function renderAddRoot() {
    dom.contextRoot.innerHTML = screenShell('plus', `<div class="na-icon-grid">
      <button class="na-large-icon-option" data-add-choice="shape" aria-label="Add shape">${icon('shape')}</button>
      <button class="na-large-icon-option" data-add-choice="text" aria-label="Add text">${icon('text')}</button>
      <button class="na-large-icon-option" data-add-choice="image" aria-label="Add image">${icon('image')}</button>
    </div>`);
    bindScreenNavigation();
    $('[data-add-choice="shape"]').addEventListener('click', () => pushScreen({ screen: 'shape-picker' }));
    $('[data-add-choice="text"]').addEventListener('click', () => createShape('text'));
    $('[data-add-choice="image"]').addEventListener('click', chooseImage);
  }

  function renderShapePicker() {
    dom.contextRoot.innerHTML = screenShell('shape', `<div class="na-icon-grid">
      <button class="na-large-icon-option" data-shape-type="rectangle" aria-label="Add rectangle">${icon('rectangle')}</button>
      <button class="na-large-icon-option" data-shape-type="circle" aria-label="Add circle">${icon('circle')}</button>
    </div>`);
    bindScreenNavigation();
    $$('[data-shape-type]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => createShape(button.dataset.shapeType)));
  }

  function renderEditShape(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const body = `
      <div class="na-control-row"><span class="na-control-icon">${icon('width')}</span><input id="shape-width" class="na-value-input" type="number" min="10" step="1" value="${round(shape.w, 2)}"><span class="na-value-display">px</span><span></span></div>
      <div class="na-control-row"><span class="na-control-icon">${icon('height')}</span><input id="shape-height" class="na-value-input" type="number" min="10" step="1" value="${round(shape.h, 2)}"><span class="na-value-display">px</span><span></span></div>
      ${shape.type === 'rectangle' ? `<div class="na-control-row"><span class="na-control-icon">${icon('radius')}</span><input id="shape-radius" class="na-slider" type="range" min="0" max="${Math.max(0, Math.min(shape.w, shape.h) / 2)}" value="${shape.borderRadius}"><span id="shape-radius-value" class="na-value-display">${round(shape.borderRadius, 1)} px</span><span></span></div>` : ''}
    `;
    dom.contextRoot.innerHTML = screenShell('edit', body);
    bindScreenNavigation();
    $('#shape-width').addEventListener('change', (e) => { shape.w = Math.max(10, Number(e.target.value)); markDirty(); renderAll(); });
    $('#shape-height').addEventListener('change', (e) => { shape.h = Math.max(10, Number(e.target.value)); markDirty(); renderAll(); });
    $('#shape-radius')?.addEventListener('input', (e) => { shape.borderRadius = Number(e.target.value); $('#shape-radius-value').textContent = `${round(shape.borderRadius, 1)} px`; renderScene(); });
    $('#shape-radius')?.addEventListener('change', () => { markDirty(); renderAll(); });
  }

  function renderEditText(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const body = `<div class="na-icon-grid">
      <button class="na-large-icon-option" data-text-edit="content" aria-label="Edit text content">${icon('text')}</button>
      <button class="na-large-icon-option" data-text-edit="size" aria-label="Text size">${icon('height')}</button>
      <button class="na-large-icon-option" data-text-edit="font" aria-label="Font">${icon('edit')}</button>
    </div>`;
    dom.contextRoot.innerHTML = screenShell('edit', body);
    bindScreenNavigation();
    $('[data-text-edit="content"]').addEventListener('click', () => pushScreen({ screen: 'edit-text-content', layerId: shape.id }));
    $('[data-text-edit="size"]').addEventListener('click', () => {
      dom.contextRoot.innerHTML = screenShell('height', `<div class="na-control-row"><span class="na-control-icon">${icon('height')}</span><input id="text-size" class="na-slider" type="range" min="6" max="180" value="${shape.fontSize}"><span id="text-size-value" class="na-value-display">${shape.fontSize}px</span><span></span></div>`);
      bindScreenNavigation();
      $('#text-size').addEventListener('input', (e) => { shape.fontSize = Number(e.target.value); $('#text-size-value').textContent = `${shape.fontSize}px`; renderScene(); });
      $('#text-size').addEventListener('change', () => { markDirty(); renderAll(); });
    });
    $('[data-text-edit="font"]').addEventListener('click', () => {
      dom.contextRoot.innerHTML = screenShell('edit', `<div class="na-control-row"><span class="na-control-icon">${icon('text')}</span><select id="font-family" class="na-select-input"><option>Inter, sans-serif</option><option>Space Grotesk, sans-serif</option><option>JetBrains Mono, monospace</option><option>serif</option></select><span></span><span></span></div><div class="na-control-row"><span class="na-control-icon">${icon('contrast')}</span><input id="font-weight" class="na-slider" type="range" min="100" max="900" step="100" value="${shape.fontWeight}"><span id="font-weight-value" class="na-value-display">${shape.fontWeight}</span><span></span></div>`);
      bindScreenNavigation();
      $('#font-family').value = shape.fontFamily;
      $('#font-family').addEventListener('change', (e) => { shape.fontFamily = e.target.value; markDirty(); renderAll(); });
      $('#font-weight').addEventListener('input', (e) => { shape.fontWeight = Number(e.target.value); $('#font-weight-value').textContent = shape.fontWeight; renderScene(); });
      $('#font-weight').addEventListener('change', () => markDirty());
    });
  }

  function renderEditTextContent(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    dom.contextRoot.innerHTML = screenShell('text', `<textarea id="text-content-input" class="na-code-area" style="font-family:Inter,sans-serif;font-size:16px;color:var(--text)" aria-label="Text content">${escapeHtml(shape.text)}</textarea>`);
    bindScreenNavigation();
    const input = $('#text-content-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('input', () => { shape.text = input.value; renderScene(); });
    input.addEventListener('change', () => { if (!shape.text.trim()) shape.text = 'Text'; markDirty(); renderAll(); });
  }

  function renderEditImage(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    dom.contextRoot.innerHTML = screenShell('image', `<div class="na-control-row"><span class="na-control-icon">${icon('width')}</span><input id="image-width" class="na-value-input" type="number" min="10" value="${round(shape.w, 2)}"><span class="na-value-display">px</span><span></span></div><div class="na-control-row"><span class="na-control-icon">${icon('height')}</span><input id="image-height" class="na-value-input" type="number" min="10" value="${round(shape.h, 2)}"><span class="na-value-display">px</span><span></span></div>`);
    bindScreenNavigation();
    $('#image-width').addEventListener('change', (e) => { shape.w = Math.max(10, Number(e.target.value)); markDirty(); renderAll(); });
    $('#image-height').addEventListener('change', (e) => { shape.h = Math.max(10, Number(e.target.value)); markDirty(); renderAll(); });
  }

  function renderFill(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const active = Boolean(keyframeAtPlayhead(shape, 'fill'));
    const opacityActive = Boolean(keyframeAtPlayhead(shape, 'fillOpacity'));
    const evaluated = evaluateShape(shape);
    dom.contextRoot.innerHTML = screenShell('fill', `
      <button id="fill-swatch" class="na-color-swatch" style="background:${escapeAttr(evaluated.fill)}" aria-label="Fill color"></button>
      <input id="fill-color" type="color" value="${escapeAttr(evaluated.fill)}" hidden>
      <div class="na-control-row"><span class="na-control-icon">${icon('color')}</span><input id="fill-hex" class="na-text-input" value="${escapeAttr(evaluated.fill)}" maxlength="7"><span></span><button id="fill-kf" class="na-diamond-button ${active ? 'active' : ''}" aria-label="Toggle fill keyframe"></button></div>
      <div class="na-control-row"><span class="na-control-icon">${icon('opacity')}</span><input id="fill-opacity" class="na-slider" type="range" min="0" max="100" value="${evaluated.fillOpacity}"><span id="fill-opacity-value" class="na-value-display">${round(evaluated.fillOpacity, 1)}%</span><button id="fill-opacity-kf" class="na-diamond-button ${opacityActive ? 'active' : ''}" aria-label="Toggle fill opacity keyframe"></button></div>
    `);
    bindScreenNavigation();
    $('#fill-swatch').addEventListener('click', () => $('#fill-color').click());
    $('#fill-color').addEventListener('input', (e) => {
      applyPropertyValues(shape, 'fill', { fill: e.target.value });
      $('#fill-swatch').style.background = e.target.value;
      $('#fill-hex').value = e.target.value;
    });
    $('#fill-color').addEventListener('change', () => markDirty());
    $('#fill-hex').addEventListener('change', (e) => {
      const value = /^#[0-9a-f]{6}$/i.test(e.target.value) ? e.target.value : shape.fill;
      applyPropertyValues(shape, 'fill', { fill: value }, { commit: true });
      renderContext();
    });
    $('#fill-opacity').addEventListener('input', (e) => {
      const value = Number(e.target.value);
      applyPropertyValues(shape, 'fillOpacity', { fillOpacity: value });
      $('#fill-opacity-value').textContent = `${round(value, 1)}%`;
    });
    $('#fill-opacity').addEventListener('change', () => markDirty());
    $('#fill-kf').addEventListener('click', () => togglePropertyKeyframe(shape, 'fill'));
    $('#fill-opacity-kf').addEventListener('click', () => togglePropertyKeyframe(shape, 'fillOpacity'));
  }

  function renderBorderShadowRoot(screen) {
    dom.contextRoot.innerHTML = screenShell('border', `<div class="na-icon-grid"><button class="na-large-icon-option" data-border-choice="border" aria-label="Border">${icon('rectangle')}</button><button class="na-large-icon-option" data-border-choice="shadow" aria-label="Shadow">${icon('shadow')}</button></div>`);
    bindScreenNavigation();
    $('[data-border-choice="border"]').addEventListener('click', () => pushScreen({ screen: 'border-detail', layerId: screen.layerId }));
    $('[data-border-choice="shadow"]').addEventListener('click', () => pushScreen({ screen: 'shadow-detail', layerId: screen.layerId }));
  }

  function renderBorderDetail(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const evaluated = evaluateShape(shape);
    const active = Boolean(keyframeAtPlayhead(shape, 'strokeWidth'));
    dom.contextRoot.innerHTML = screenShell('border', `
      <div class="na-two-column"><div><button id="stroke-swatch" class="na-color-swatch" style="height:44px;background:${escapeAttr(shape.strokeColor)}" aria-label="Stroke color"></button><input id="stroke-color" type="color" value="${escapeAttr(shape.strokeColor)}" hidden></div><div class="na-control-row compact"><span class="na-control-icon">${icon('opacity')}</span><input id="stroke-opacity" class="na-slider" type="range" min="0" max="100" value="${shape.strokeOpacity}"><span id="stroke-opacity-value" class="na-value-display">${shape.strokeOpacity}%</span></div></div>
      <div class="na-control-row"><span class="na-control-icon">${icon('width')}</span><input id="stroke-width" class="na-slider" type="range" min="0" max="40" step=".5" value="${evaluated.strokeWidth}"><span id="stroke-width-value" class="na-value-display">${round(evaluated.strokeWidth, 1)}px</span><button id="stroke-width-kf" class="na-diamond-button ${active ? 'active' : ''}" aria-label="Toggle stroke width keyframe"></button></div>
    `);
    bindScreenNavigation();
    $('#stroke-swatch').addEventListener('click', () => $('#stroke-color').click());
    $('#stroke-color').addEventListener('input', (e) => { shape.strokeColor = e.target.value; $('#stroke-swatch').style.background = e.target.value; renderScene(); });
    $('#stroke-color').addEventListener('change', () => markDirty());
    $('#stroke-opacity').addEventListener('input', (e) => { shape.strokeOpacity = Number(e.target.value); $('#stroke-opacity-value').textContent = `${shape.strokeOpacity}%`; renderScene(); });
    $('#stroke-opacity').addEventListener('change', () => markDirty());
    $('#stroke-width').addEventListener('input', (e) => { const value = Number(e.target.value); applyPropertyValues(shape, 'strokeWidth', { strokeWidth: value }); $('#stroke-width-value').textContent = `${round(value, 1)}px`; });
    $('#stroke-width').addEventListener('change', () => markDirty());
    $('#stroke-width-kf').addEventListener('click', () => togglePropertyKeyframe(shape, 'strokeWidth'));
  }

  function renderShadowDetail(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const shadow = shape.shadow;
    dom.contextRoot.innerHTML = screenShell('shadow', `
      <div class="na-two-column"><button id="shadow-toggle" class="na-icon-btn na-toggle-large ${shadow.enabled ? 'active' : ''}" type="button" aria-pressed="${shadow.enabled}" aria-label="${shadow.enabled ? 'Disable' : 'Enable'} shadow">${icon(shadow.enabled ? 'eye' : 'eyeOff')}</button><button id="shadow-swatch" class="na-color-swatch" style="height:42px;background:${escapeAttr(shadow.color)}" aria-label="Shadow color"></button><input id="shadow-color" type="color" value="${escapeAttr(shadow.color)}" hidden></div>
      <div class="na-two-column"><div class="na-control-row compact"><span class="na-control-icon">${icon('width')}</span><input id="shadow-x" class="na-value-input" type="number" value="${shadow.offsetX}"><span class="na-value-display">px</span></div><div class="na-control-row compact"><span class="na-control-icon">${icon('height')}</span><input id="shadow-y" class="na-value-input" type="number" value="${shadow.offsetY}"><span class="na-value-display">px</span></div></div>
      <div class="na-control-row compact"><span class="na-control-icon">${icon('blur')}</span><input id="shadow-blur" class="na-slider" type="range" min="0" max="100" value="${shadow.blur}"><span id="shadow-blur-value" class="na-value-display">${shadow.blur}px</span></div>
      <div class="na-control-row compact"><span class="na-control-icon">${icon('opacity')}</span><input id="shadow-opacity" class="na-slider" type="range" min="0" max="100" value="${shadow.opacity}"><span id="shadow-opacity-value" class="na-value-display">${shadow.opacity}%</span></div>
    `);
    bindScreenNavigation();
    $('#shadow-toggle').addEventListener('click', () => { shadow.enabled = !shadow.enabled; markDirty(); renderScene(); renderContext(); });
    $('#shadow-swatch').addEventListener('click', () => $('#shadow-color').click());
    $('#shadow-color').addEventListener('input', (e) => { shadow.color = e.target.value; $('#shadow-swatch').style.background = e.target.value; renderScene(); });
    $('#shadow-color').addEventListener('change', () => markDirty());
    const bindNum = (id, field) => $(id).addEventListener('change', (e) => { shadow[field] = Number(e.target.value); markDirty(); renderAll(); });
    bindNum('#shadow-x', 'offsetX');
    bindNum('#shadow-y', 'offsetY');
    $('#shadow-blur').addEventListener('input', (e) => { shadow.blur = Number(e.target.value); $('#shadow-blur-value').textContent = `${shadow.blur}px`; renderScene(); });
    $('#shadow-blur').addEventListener('change', () => markDirty());
    $('#shadow-opacity').addEventListener('input', (e) => { shadow.opacity = Number(e.target.value); $('#shadow-opacity-value').textContent = `${shadow.opacity}%`; renderScene(); });
    $('#shadow-opacity').addEventListener('change', () => markDirty());
  }

  function renderBlendRoot(screen) {
    dom.contextRoot.innerHTML = screenShell('blend', `<div class="na-icon-grid"><button class="na-large-icon-option" data-blend-choice="opacity" aria-label="Layer opacity">${icon('opacity')}</button><button class="na-large-icon-option" data-blend-choice="mode" aria-label="Blend mode">${icon('blend')}</button></div>`);
    bindScreenNavigation();
    $('[data-blend-choice="opacity"]').addEventListener('click', () => pushScreen({ screen: 'opacity-detail', layerId: screen.layerId }));
    $('[data-blend-choice="mode"]').addEventListener('click', () => pushScreen({ screen: 'blend-detail', layerId: screen.layerId }));
  }

  function renderOpacityDetail(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const evaluated = evaluateShape(shape);
    const active = Boolean(keyframeAtPlayhead(shape, 'opacity'));
    dom.contextRoot.innerHTML = screenShell('opacity', `<div class="na-control-row"><span class="na-control-icon">${icon('opacity')}</span><input id="layer-opacity" class="na-slider" type="range" min="0" max="100" value="${evaluated.opacity}"><span id="layer-opacity-value" class="na-value-display">${round(evaluated.opacity, 1)}%</span><button id="layer-opacity-kf" class="na-diamond-button ${active ? 'active' : ''}" aria-label="Toggle opacity keyframe"></button></div>`);
    bindScreenNavigation();
    $('#layer-opacity').addEventListener('input', (e) => { const value = Number(e.target.value); applyPropertyValues(shape, 'opacity', { opacity: value }); $('#layer-opacity-value').textContent = `${round(value, 1)}%`; });
    $('#layer-opacity').addEventListener('change', () => markDirty());
    $('#layer-opacity-kf').addEventListener('click', () => togglePropertyKeyframe(shape, 'opacity'));
  }

  function renderBlendDetail(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const modes = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];
    dom.contextRoot.innerHTML = screenShell('blend', `<div class="na-chip-grid">${modes.map((mode) => `<button class="na-preview-chip ${shape.blendMode === mode ? 'active' : ''}" data-blend-mode="${mode}" aria-label="${mode}" title="${mode}" style="background:linear-gradient(135deg,#f97316 0 48%,#3b82f6 52%);mix-blend-mode:${mode}"><span style="position:absolute;inset:12px;border-radius:50%;background:#f8fafc;opacity:.72"></span></button>`).join('')}</div>`);
    bindScreenNavigation();
    $$('[data-blend-mode]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => { shape.blendMode = button.dataset.blendMode; markDirty(); renderAll(); toast(button.dataset.blendMode); }));
  }

  function renderTransform(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const mode = state.activeTransformMode;
    const values = currentPropertyValues(shape, mode);
    const active = Boolean(keyframeAtPlayhead(shape, mode));
    let display = '';
    if (mode === 'position') display = `<span>↔ ${round(values.x, 1)}px</span><span>↕ ${round(values.y, 1)}px</span>`;
    if (mode === 'scale') display = `<span>↔ ${round(values.scaleX * 100, 1)}%</span><span>↕ ${round(values.scaleY * 100, 1)}%</span>`;
    if (mode === 'rotation') display = `<span>↻ ${round(values.rotation, 1)}°</span>`;
    dom.contextRoot.innerHTML = `<div class="na-context-screen"><div class="na-context-header"><button class="na-icon-btn" data-context-back aria-label="Back">${icon('back')}</button><div class="na-context-icon">${icon('transform')}</div><button class="na-icon-btn" data-context-close aria-label="Close">${icon('close')}</button></div><div class="na-transform-layout"><div class="na-transform-main"><div id="gesture-pad" class="na-gesture-pad" aria-label="Transform gesture pad"><div class="na-gesture-pad-center">${icon(mode === 'position' ? 'position' : mode === 'scale' ? 'scale' : 'rotation')}</div><div class="na-transform-values">${display}</div></div><div class="na-tool-rail"><button class="na-icon-btn ${mode === 'position' ? 'active' : ''}" data-transform-mode="position" aria-label="Position">${icon('position')}</button><button class="na-icon-btn ${mode === 'scale' ? 'active' : ''}" data-transform-mode="scale" aria-label="Scale">${icon('scale')}</button><button class="na-icon-btn ${mode === 'rotation' ? 'active' : ''}" data-transform-mode="rotation" aria-label="Rotation">${icon('rotation')}</button></div></div><div class="na-keyframe-rail"><button class="na-icon-btn" id="property-prev-kf" aria-label="Previous keyframe">${icon('keyframePrev')}</button><button id="property-toggle-kf" class="na-diamond-button ${active ? 'active' : ''}" aria-label="Toggle keyframe"></button><button class="na-icon-btn" id="property-next-kf" aria-label="Next keyframe">${icon('keyframeNext')}</button><button class="na-icon-btn" id="property-curve" aria-label="Curve editor">${icon('curve')}</button></div></div></div>`;
    bindScreenNavigation();
    $$('[data-transform-mode]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => { state.activeTransformMode = button.dataset.transformMode; renderContext(); }));
    bindTransformPad(shape, mode);
    $('#property-toggle-kf').addEventListener('click', () => togglePropertyKeyframe(shape, mode));
    $('#property-prev-kf').addEventListener('click', () => jumpPropertyKeyframe(shape, mode, -1));
    $('#property-next-kf').addEventListener('click', () => jumpPropertyKeyframe(shape, mode, 1));
    $('#property-curve').disabled = !getCurveSegment(shape, mode);
    $('#property-curve').addEventListener('click', () => {
      if (!getCurveSegment(shape, mode)) return toast('Add at least two keyframes');
      pushScreen({ screen: 'curve', layerId: shape.id, property: mode });
    });
  }

  function bindTransformPad(shape, mode) {
    const pad = $('#gesture-pad');
    if (!pad) return;
    pad.addEventListener('pointerdown', (event) => {
      pad.setPointerCapture(event.pointerId);
      const initial = currentPropertyValues(shape, mode);
      const startX = event.clientX;
      const startY = event.clientY;
      let changed = false;
      const move = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.hypot(dx, dy) < 2) return;
        changed = true;
        if (mode === 'position') applyPropertyValues(shape, mode, { x: round(initial.x + dx / state.displayScale, 2), y: round(initial.y + dy / state.displayScale, 2) });
        if (mode === 'scale') applyPropertyValues(shape, mode, { scaleX: Math.max(.01, initial.scaleX + dx * .005), scaleY: Math.max(.01, initial.scaleY - dy * .005) });
        if (mode === 'rotation') applyPropertyValues(shape, mode, { rotation: round(initial.rotation + dx * .6, 2) });
        refreshActiveContextValues();
      };
      const end = () => {
        pad.removeEventListener('pointermove', move);
        pad.removeEventListener('pointerup', end);
        pad.removeEventListener('pointercancel', cancel);
        if (changed) markDirty();
      };
      const cancel = () => {
        applyPropertyValues(shape, mode, initial);
        pad.removeEventListener('pointermove', move);
        pad.removeEventListener('pointerup', end);
        pad.removeEventListener('pointercancel', cancel);
        renderContext();
      };
      pad.addEventListener('pointermove', move);
      pad.addEventListener('pointerup', end);
      pad.addEventListener('pointercancel', cancel);
    });
  }

  const EFFECTS = {
    blur: { icon: 'blur', defaultAmount: 12, min: 0, max: 80, unit: 'px' },
    brightness: { icon: 'brightness', defaultAmount: 110, min: 0, max: 250, unit: '%' },
    contrast: { icon: 'contrast', defaultAmount: 110, min: 0, max: 250, unit: '%' },
    saturation: { icon: 'saturation', defaultAmount: 120, min: 0, max: 250, unit: '%' }
  };

  function renderEffects(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    const rows = shape.effects.map((effect) => {
      const meta = EFFECTS[effect.type] || EFFECTS.blur;
      return `<div class="na-effect-row" data-effect-row="${escapeAttr(effect.id)}"><button class="na-effect-open" data-effect-open="${escapeAttr(effect.id)}" aria-label="Edit ${escapeAttr(effect.type)} effect" title="${escapeAttr(effect.type)}"><span class="na-effect-preview">${icon(meta.icon)}</span><span class="na-effect-value">${round(effect.amount, 1)}${meta.unit}</span></button><button class="na-icon-btn" data-effect-toggle="${escapeAttr(effect.id)}" aria-label="Toggle effect">${icon(effect.enabled === false ? 'eyeOff' : 'eye')}</button><button class="na-icon-btn na-danger" data-effect-remove="${escapeAttr(effect.id)}" aria-label="Remove effect">${icon('close')}</button></div>`;
    }).join('');
    dom.contextRoot.innerHTML = screenShell('effects', `<div class="na-effects-list">${rows || '<div style="height:48px"></div>'}<button id="add-effect" class="na-effect-add" aria-label="Add effect">${icon('plus')}</button></div>`);
    bindScreenNavigation();
    $('#add-effect').addEventListener('click', () => pushScreen({ screen: 'effect-browser', layerId: shape.id }));
    $$('[data-effect-open]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => pushScreen({ screen: 'effect-detail', layerId: shape.id, effectId: button.dataset.effectOpen })));
    $$('[data-effect-toggle]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => {
      const effect = shape.effects.find((item) => item.id === button.dataset.effectToggle);
      if (effect) { effect.enabled = effect.enabled === false; markDirty(); renderAll(); }
    }));
    $$('[data-effect-remove]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => {
      shape.effects = shape.effects.filter((item) => item.id !== button.dataset.effectRemove);
      markDirty(); renderAll();
    }));
  }

  function renderEffectBrowser(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    dom.contextRoot.innerHTML = screenShell('effects', `<div class="na-icon-grid">${Object.entries(EFFECTS).map(([type, meta]) => `<button class="na-large-icon-option" data-add-effect="${type}" aria-label="${type}" title="${type}">${icon(meta.icon)}</button>`).join('')}</div>`);
    bindScreenNavigation();
    $$('[data-add-effect]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.addEffect;
      const meta = EFFECTS[type];
      const effect = { id: uid('fx'), type, enabled: true, amount: meta.defaultAmount };
      shape.effects.push(effect);
      markDirty();
      state.uiStack[state.uiStack.length - 1] = { screen: 'effect-detail', layerId: shape.id, effectId: effect.id };
      renderContext();
    }));
  }

  function renderEffectDetail(screen) {
    const shape = getShapeById(screen.layerId);
    const effect = shape?.effects.find((item) => item.id === screen.effectId);
    if (!shape || !effect) return popScreen();
    const meta = EFFECTS[effect.type] || EFFECTS.blur;
    const property = `fx__${effect.id}`;
    const evaluated = interpolateNumberKeyframes(ensureAnimation(shape).keyframes, property, state.progress, effect.amount);
    const active = Boolean(keyframeAtPlayhead(shape, property));
    dom.contextRoot.innerHTML = screenShell(meta.icon, `<div class="na-control-row"><span class="na-control-icon">${icon(meta.icon)}</span><input id="effect-amount" class="na-slider" type="range" min="${meta.min}" max="${meta.max}" step=".5" value="${evaluated}"><span id="effect-amount-value" class="na-value-display">${round(evaluated, 1)}${meta.unit}</span><button id="effect-amount-kf" class="na-diamond-button ${active ? 'active' : ''}" aria-label="Toggle effect keyframe"></button></div><div class="na-keyframe-rail"><button class="na-icon-btn" id="effect-prev-kf" aria-label="Previous keyframe">${icon('keyframePrev')}</button><button class="na-icon-btn" id="effect-next-kf" aria-label="Next keyframe">${icon('keyframeNext')}</button><button class="na-icon-btn" id="effect-curve" aria-label="Curve editor">${icon('curve')}</button></div>`);
    bindScreenNavigation();
    $('#effect-amount').addEventListener('input', (e) => { const value = Number(e.target.value); applyPropertyValues(shape, property, { [property]: value }); $('#effect-amount-value').textContent = `${round(value, 1)}${meta.unit}`; });
    $('#effect-amount').addEventListener('change', () => markDirty());
    $('#effect-amount-kf').addEventListener('click', () => togglePropertyKeyframe(shape, property));
    $('#effect-prev-kf').addEventListener('click', () => jumpPropertyKeyframe(shape, property, -1));
    $('#effect-next-kf').addEventListener('click', () => jumpPropertyKeyframe(shape, property, 1));
    $('#effect-curve').disabled = !getCurveSegment(shape, property);
    $('#effect-curve').addEventListener('click', () => {
      if (!getCurveSegment(shape, property)) return toast('Add at least two keyframes');
      pushScreen({ screen: 'curve', layerId: shape.id, property });
    });
  }

  function renderCurve(screen) {
    const shape = getShapeById(screen.layerId);
    const segment = shape ? getCurveSegment(shape, screen.property) : null;
    if (!shape || !segment) return popScreen();
    const easing = normalizeEase(segment.start.easingToNext || 'linear');
    dom.contextRoot.innerHTML = `<div class="na-context-screen"><div class="na-context-header"><button class="na-icon-btn" data-context-back aria-label="Back">${icon('back')}</button><div class="na-context-icon">${icon('curve')}</div><button class="na-icon-btn" data-context-close aria-label="Close">${icon('close')}</button></div><div class="na-curve-editor"><div id="curve-graph" class="na-curve-graph"><svg viewBox="0 0 300 150" preserveAspectRatio="none"><path d="M20 130H280M20 20V130" stroke="rgba(255,255,255,.18)"/><path id="curve-path" fill="none" stroke="#60a5fa" stroke-width="3"/><path id="curve-handles" fill="none" stroke="rgba(255,255,255,.38)" stroke-dasharray="4 4"/><circle id="curve-handle-1" r="8" fill="#f8fafc" stroke="#111827" stroke-width="2"/><circle id="curve-handle-2" r="8" fill="#f8fafc" stroke="#111827" stroke-width="2"/></svg></div><div class="na-curve-presets">${[['linear',[0,0,1,1]],['ease-in',[.42,0,1,1]],['ease-out',[0,0,.58,1]],['ease-in-out',[.42,0,.58,1]]].map(([name, p]) => `<button class="na-preview-chip na-curve-thumb" data-curve-preset="${p.join(',')}" aria-label="${name}" title="${name}"><svg viewBox="0 0 100 50"><path d="M8 42 C ${8+p[0]*84} ${42-p[1]*34}, ${8+p[2]*84} ${42-p[3]*34}, 92 8" fill="none" stroke="currentColor" stroke-width="3"/></svg></button>`).join('')}</div></div></div>`;
    bindScreenNavigation();
    bindCurveGraph(segment.start, easing);
    $$('[data-curve-preset]', dom.contextRoot).forEach((button) => button.addEventListener('click', () => {
      const [x1,y1,x2,y2] = button.dataset.curvePreset.split(',').map(Number);
      segment.start.easingToNext = { type: 'cubic-bezier', x1, y1, x2, y2 };
      markDirty();
      renderContext();
    }));
  }

  function bindCurveGraph(keyframe, easing) {
    const graph = $('#curve-graph');
    const path = $('#curve-path');
    const handles = $('#curve-handles');
    const h1 = $('#curve-handle-1');
    const h2 = $('#curve-handle-2');
    const toPoint = (x, y) => ({ x: 20 + x * 260, y: 130 - ((y + 1) / 3) * 110 });
    const fromPoint = (x, y) => ({ x: clamp((x - 20) / 260, 0, 1), y: clamp(((130 - y) / 110) * 3 - 1, -2, 3) });
    const draw = () => {
      const e = normalizeEase(keyframe.easingToNext || easing);
      const start = toPoint(0, 0);
      const end = toPoint(1, 1);
      const p1 = toPoint(e.x1, e.y1);
      const p2 = toPoint(e.x2, e.y2);
      path.setAttribute('d', `M${start.x} ${start.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${end.x} ${end.y}`);
      handles.setAttribute('d', `M${start.x} ${start.y} L${p1.x} ${p1.y} M${end.x} ${end.y} L${p2.x} ${p2.y}`);
      h1.setAttribute('cx', p1.x); h1.setAttribute('cy', p1.y);
      h2.setAttribute('cx', p2.x); h2.setAttribute('cy', p2.y);
    };
    const bindHandle = (element, index) => element.addEventListener('pointerdown', (event) => {
      element.setPointerCapture(event.pointerId);
      const original = deepClone(keyframe.easingToNext || easing);
      let changed = false;
      const move = (ev) => {
        const rect = graph.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) / rect.width) * 300;
        const y = ((ev.clientY - rect.top) / rect.height) * 150;
        const p = fromPoint(x, y);
        const current = normalizeEase(keyframe.easingToNext || easing);
        if (index === 1) { current.x1 = p.x; current.y1 = p.y; }
        else { current.x2 = p.x; current.y2 = p.y; }
        keyframe.easingToNext = current;
        changed = true;
        draw();
        renderScene();
      };
      const end = () => {
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerup', end);
        element.removeEventListener('pointercancel', cancel);
        if (changed) markDirty();
      };
      const cancel = () => {
        keyframe.easingToNext = original;
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerup', end);
        element.removeEventListener('pointercancel', cancel);
        draw();
      };
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', end);
      element.addEventListener('pointercancel', cancel);
    });
    bindHandle(h1, 1);
    bindHandle(h2, 2);
    draw();
  }

  function shapeHasAnimation(shape) {
    const anim = ensureAnimation(shape);
    const rangeDriven = Number(anim.rangeStart) > 0.0001 || Number(anim.rangeEnd) < 99.9999;
    return rangeDriven || anim.keyframes.some(keyframeHasVisualProperties) || anim.keyframes.some((kf) => Object.keys(kf).some((key) => key.startsWith('fx__')));
  }

  function compileManifestEntry(shape) {
    return {
      id: shape.id,
      type: shape.type,
      base: {
        x: shape.x, y: shape.y, w: shape.w, h: shape.h,
        scaleX: shape.scaleX, scaleY: shape.scaleY,
        rotation: shape.rotation, opacity: shape.opacity,
        fill: shape.fill, fillOpacity: shape.fillOpacity,
        strokeWidth: shape.strokeWidth,
        blur: shape.blur, brightness: shape.brightness,
        contrast: shape.contrast, saturation: shape.saturation
      },
      activeRange: [Number(ensureAnimation(shape).rangeStart) / 100, Number(ensureAnimation(shape).rangeEnd) / 100],
      keyframes: ensureAnimation(shape).keyframes.map((kf) => ({ ...kf, at: getKeyframeProgress(kf), p: undefined })),
      effects: (shape.effects || []).map((effect) => ({ id: effect.id, type: effect.type, enabled: effect.enabled !== false, amount: effect.amount }))
    };
  }

  function exportLayerHtml(shape, designWidth, zIndex) {
    const left = (shape.x / designWidth) * 100;
    const width = (shape.w / designWidth) * 100;
    const rgb = hexToRgb(shape.shadow?.color || '#000000');
    const shadow = shape.shadow?.enabled
      ? `${shape.shadow.offsetX}px ${shape.shadow.offsetY}px ${shape.shadow.blur}px ${shape.shadow.spread}px rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(shape.shadow.opacity / 100,0,1)})`
      : 'none';
    const filters = [`blur(${shape.blur}px)`, `brightness(${shape.brightness}%)`, `contrast(${shape.contrast}%)`, `saturate(${shape.saturation}%)`];
    (shape.effects || []).filter((effect) => effect.enabled !== false).forEach((effect) => {
      if (effect.type === 'blur') filters.push(`blur(${effect.amount}px)`);
      if (effect.type === 'brightness') filters.push(`brightness(${effect.amount}%)`);
      if (effect.type === 'contrast') filters.push(`contrast(${effect.amount}%)`);
      if (effect.type === 'saturation') filters.push(`saturate(${effect.amount}%)`);
    });
    const style = `--na-left:${left}%;--na-top:${shape.y}px;--na-width:${width}%;--na-height:${shape.h}px;--na-base-w:${shape.w};--na-base-h:${shape.h};--na-fill:${shape.fill};--na-fill-opacity:${shape.fillOpacity / 100};--na-stroke-width:${shape.strokeWidth};left:var(--na-left);top:var(--na-top);width:var(--na-width);height:var(--na-height);opacity:${shape.opacity / 100};mix-blend-mode:${shape.blendMode || 'normal'};transform:rotate(${shape.rotation}deg) scale(${shape.scaleX},${shape.scaleY});filter:${filters.join(' ')};box-shadow:${shadow};z-index:${zIndex};`;
    let content = '';
    if (shape.type === 'text') {
      content = `<div class="na-export-text" style="color:${escapeAttr(shape.textColor)};font-size:${shape.fontSize}px;font-family:${escapeAttr(shape.fontFamily)};font-weight:${shape.fontWeight || 600}">${escapeHtml(shape.text)}</div>`;
    } else if (shape.type === 'image') {
      content = `<img class="na-export-image" src="${escapeAttr(shape.src || '')}" width="${Math.round(shape.w)}" height="${Math.round(shape.h)}" alt="" loading="lazy">`;
    } else if (shape.type === 'circle') {
      content = `<svg class="na-export-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse class="na-export-geometry" cx="50" cy="50" rx="50" ry="50" fill="var(--na-fill)" fill-opacity="var(--na-fill-opacity)" stroke="${shape.strokeWidth > 0 ? escapeAttr(shape.strokeColor) : 'none'}" stroke-opacity="${shape.strokeOpacity / 100}" stroke-width="var(--na-stroke-width)" vector-effect="non-scaling-stroke"/></svg>`;
    } else {
      content = `<svg class="na-export-svg" viewBox="0 0 ${shape.w} ${shape.h}" preserveAspectRatio="none" aria-hidden="true"><rect class="na-export-geometry" x="0" y="0" width="${shape.w}" height="${shape.h}" rx="${shape.borderRadius}" fill="var(--na-fill)" fill-opacity="var(--na-fill-opacity)" stroke="${shape.strokeWidth > 0 ? escapeAttr(shape.strokeColor) : 'none'}" stroke-opacity="${shape.strokeOpacity / 100}" stroke-width="var(--na-stroke-width)" vector-effect="non-scaling-stroke"/></svg>`;
    }
    const initialStart = Number(ensureAnimation(shape).rangeStart) / 100;
    const initialEnd = Number(ensureAnimation(shape).rangeEnd) / 100;
    const initialActive = 0 >= Math.min(initialStart, initialEnd) - .001 && 0 <= Math.max(initialStart, initialEnd) + .001;
    return `<div id="na-${escapeAttr(shape.id)}" class="na-export-layer" data-na-layer-id="${escapeAttr(shape.id)}" data-na-active="${initialActive ? 'true' : 'false'}" style="${style}">${content}</div>`;
  }

  function exportSharedCss(documentHeight, background, designWidth) {
    return `
html,body{margin:0;min-height:100%;background:${background};}
*{box-sizing:border-box;}
.na-export-document{position:relative;width:100%;min-height:${documentHeight}px;overflow-x:hidden;background:${background};isolation:isolate;--na-design-width:${designWidth};}
.na-export-layer{position:absolute;transform-origin:50% 50%;box-sizing:border-box;visibility:visible;}
.na-export-layer[data-na-active="false"]{visibility:hidden;pointer-events:none;}
.na-export-svg,.na-export-image{display:block;width:100%;height:100%;overflow:visible;object-fit:cover;}
.na-export-text{width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-wrap;word-break:break-word;overflow:hidden;padding:6px;}
@media(prefers-reduced-motion:reduce){.na-export-layer{transition:none!important;}}
`;
  }

  let runtimeSourceCache = null;
  async function getExportRuntimeSource() {
    if (runtimeSourceCache) return runtimeSourceCache;
    const response = await fetch('/js/motion-export-runtime.js');
    if (!response.ok) throw new Error('Runtime source unavailable');
    runtimeSourceCache = await response.text();
    return runtimeSourceCache;
  }

  async function generateExportDocument({ onlyIds = null, inlineRuntime = true, includeDocument = true } = {}) {
    const project = state.project;
    let shapes = onlyIds ? project.shapes.filter((shape) => onlyIds.has(shape.id)) : project.shapes;
    const documentHeight = documentHeightLogical();
    const designWidth = project.viewport.width;
    const background = project.background.transparent ? 'transparent' : project.background.color;
    const htmlLayers = shapes.map((shape) => exportLayerHtml(shape, designWidth, project.shapes.indexOf(shape) + 1)).join('\n');
    const animated = shapes.filter(shapeHasAnimation);
    const manifest = {
      designWidth,
      layers: animated.map(compileManifestEntry)
    };
    const css = exportSharedCss(documentHeight, background, designWidth);
    let runtime = '';
    if (animated.length) {
      if (inlineRuntime) runtime = `<script>\n${await getExportRuntimeSource()}\n<\/script>\n<script>NowActionRuntime.init(${JSON.stringify(manifest)});<\/script>`;
      else runtime = `<script src="./motion-export-runtime.js" defer><\/script><script>window.addEventListener('DOMContentLoaded',()=>NowActionRuntime.init(${JSON.stringify(manifest)}));<\/script>`;
    }
    const fragment = `<div class="na-export-document" data-na-document>${htmlLayers}</div>\n<style>${css}</style>\n${runtime}`;
    if (!includeDocument) return fragment;
    return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(project.name)}</title></head><body>${fragment}</body></html>`;
  }

  function selectedCodeIds(shape) {
    if (!shape) return new Set();
    if (shape.groupId) return new Set(state.project.shapes.filter((item) => item.groupId === shape.groupId).map((item) => item.id));
    return new Set([shape.id]);
  }

  async function renderCodeScreen(screen) {
    const shape = getShapeById(screen.layerId);
    if (!shape) return closeContext();
    dom.contextRoot.innerHTML = `<div class="na-code-screen"><div class="na-code-toolbar"><button class="na-icon-btn" data-context-back aria-label="Back">${icon('back')}</button><div class="na-context-icon">${icon('code')}</div><button id="expand-code" class="na-icon-btn" aria-label="Expand code">${icon('expand')}</button><button id="copy-layer-code" class="na-icon-btn" aria-label="Copy code">${icon('copy')}</button></div><textarea id="layer-code" class="na-code-area" readonly>Generating…</textarea></div>`;
    $('[data-context-back]').addEventListener('click', popScreen);
    const code = await generateExportDocument({ onlyIds: selectedCodeIds(shape), includeDocument: false, inlineRuntime: true });
    const area = $('#layer-code');
    if (area) area.value = code;
    $('#copy-layer-code')?.addEventListener('click', async () => {
      await copyToClipboard(area.value);
      toast('Code copied');
    });
    $('#expand-code')?.addEventListener('click', () => {
      dom.bottomWorkspace.style.height = dom.bottomWorkspace.style.height ? '' : '60dvh';
      dom.bottomWorkspace.style.minHeight = dom.bottomWorkspace.style.height || '';
      updateDisplayScale();
      renderScene();
    });
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

  async function openPreview() {
    const html = await generateExportDocument();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function estimateDataUrlBytes(source) {
    if (typeof source !== 'string' || !source.startsWith('data:')) return 0;
    const comma = source.indexOf(',');
    if (comma < 0) return 0;
    const header = source.slice(0, comma);
    const body = source.slice(comma + 1);
    if (header.includes(';base64')) {
      const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
      return Math.max(0, Math.floor(body.length * 3 / 4) - padding);
    }
    try { return new TextEncoder().encode(decodeURIComponent(body)).length; }
    catch { return body.length; }
  }

  function buildPerformanceReport() {
    const shapes = state.project?.shapes || [];
    const trackProperties = new Set(['x','y','w','h','scaleX','scaleY','rotation','opacity','fillOpacity','fill','strokeWidth','blur','brightness','contrast','saturation']);
    let totalKeyframes = 0;
    let totalTracks = 0;
    let animatedLayers = 0;
    let blurLayers = 0;
    let shadowLayers = 0;
    let blendLayers = 0;
    let imageBytes = 0;
    const events = [];

    for (const shape of shapes) {
      const anim = ensureAnimation(shape);
      const properties = new Set();
      for (const keyframe of anim.keyframes) {
        totalKeyframes += 1;
        for (const key of Object.keys(keyframe)) {
          if (trackProperties.has(key) || key.startsWith('fx__')) properties.add(key);
        }
      }
      totalTracks += properties.size;
      if (shapeHasAnimation(shape)) animatedLayers += 1;
      const start = clamp01(Number(anim.rangeStart) / 100);
      const end = clamp01(Number(anim.rangeEnd) / 100);
      if (shapeHasAnimation(shape)) {
        events.push({ at: Math.min(start, end), delta: 1 });
        events.push({ at: Math.max(start, end), delta: -1 });
      }
      const hasBlur = Number(shape.blur || 0) > 0 || (shape.effects || []).some((effect) => effect.enabled !== false && effect.type === 'blur' && Number(effect.amount || 0) > 0);
      if (hasBlur) blurLayers += 1;
      if (shape.shadow?.enabled) shadowLayers += 1;
      if (shape.blendMode && shape.blendMode !== 'normal') blendLayers += 1;
      if (shape.type === 'image') imageBytes += estimateDataUrlBytes(shape.src);
    }

    events.sort((a, b) => a.at - b.at || b.delta - a.delta);
    let active = 0;
    let maxActive = 0;
    for (const event of events) {
      active += event.delta;
      maxActive = Math.max(maxActive, active);
    }

    let score = 0;
    score += Math.max(0, shapes.length - 80) / 18;
    score += Math.max(0, animatedLayers - 30) / 7;
    score += Math.max(0, maxActive - 20) / 4;
    score += Math.max(0, totalTracks - 100) / 24;
    score += Math.max(0, totalKeyframes - 500) / 130;
    score += blurLayers * 1.6 + shadowLayers * .45 + blendLayers * .8;
    score += imageBytes / (4 * 1024 * 1024);
    const tier = score >= 14 ? 'heavy' : score >= 6 ? 'moderate' : 'light';
    return { totalLayers: shapes.length, animatedLayers, totalTracks, totalKeyframes, maxActive, blurLayers, shadowLayers, blendLayers, imageBytes, tier };
  }

  function renderPerformanceReport(report) {
    if (!dom.exportPerformance) return;
    const assetMb = report.imageBytes / (1024 * 1024);
    const iconName = report.tier === 'light' ? 'check' : 'warning';
    const summary = report.tier === 'light' ? 'Light export' : report.tier === 'moderate' ? 'Moderate export' : 'Heavy export';
    const expensive = [report.blurLayers ? `${report.blurLayers} blur` : '', report.shadowLayers ? `${report.shadowLayers} shadow` : '', report.blendLayers ? `${report.blendLayers} blend` : ''].filter(Boolean).join(' · ');
    dom.exportPerformance.dataset.tier = report.tier;
    dom.exportPerformance.innerHTML = `${icon(iconName)}<div><strong>${summary}</strong><br>${report.totalLayers} layers · ${report.animatedLayers} animated · max ${report.maxActive} active · ${report.totalTracks} tracks · ${report.totalKeyframes} keyframes${assetMb ? ` · ${assetMb.toFixed(1)} MB embedded images` : ''}${expensive ? `<br>${expensive}` : ''}</div>`;
  }

  async function openExportDialog() {
    dom.exportDialog.showModal();
    renderPerformanceReport(buildPerformanceReport());
    dom.exportCode.value = 'Generating…';
    dom.exportCode.value = await generateExportDocument();
  }

  function downloadTextFile(name, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadHtml() {
    downloadTextFile('nowaction-export.html', await generateExportDocument(), 'text/html');
  }

  async function downloadZip() {
    if (!window.JSZip) return toast('ZIP library is unavailable');
    const zip = new JSZip();
    zip.file('index.html', await generateExportDocument({ inlineRuntime: false }));
    if (state.project.shapes.some(shapeHasAnimation)) zip.file('motion-export-runtime.js', await getExportRuntimeSource());
    zip.file('project.json', JSON.stringify({ name: state.project.name, viewport: state.project.viewport, canvasConfig: state.project.canvasConfig, background: state.project.background, shapes: state.project.shapes }, null, 2));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nowaction-export.zip';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function updateTopActions() {
    const multi = state.multiSelectMode;
    dom.normalTopActions.classList.toggle('na-hidden', multi);
    dom.selectionTopActions.classList.toggle('na-hidden', !multi);
    dom.groupButton.disabled = state.selectedIds.size < 2;
    dom.duplicateButton.disabled = state.selectedIds.size < 1;
    dom.deleteButton.disabled = state.selectedIds.size < 1;
    setButtonIcon(dom.projectButton, multi ? 'close' : 'project');
    dom.projectButton.setAttribute('aria-label', multi ? 'Exit selection' : 'Projects and document settings');
    dom.projectTitle.textContent = multi ? `${state.selectedIds.size} selected` : state.project.name;
  }

  function renderAll() {
    if (!state.project) return;
    dom.projectTitle.textContent = state.project.name;
    updateTopActions();
    updateDocumentGeometry();
    renderScene();
    renderContext();
    renderSaveStatus();
  }

  function updateProjectDialog() {
    if (!state.project) return;
    dom.projectSelect.innerHTML = state.projects.map((project) => `<option value="${escapeAttr(project.id)}">${escapeHtml(project.name)}</option>`).join('');
    dom.projectSelect.value = state.project.id;
    dom.projectNameInput.value = state.project.name;
    dom.backgroundColorInput.value = state.project.background.color || '#ffffff';
    dom.heightModeSelect.value = state.project.canvasConfig.heightMode || 'auto';
    dom.customHeightInput.value = state.project.canvasConfig.customHeight || documentHeightLogical();
    dom.bottomPaddingInput.value = state.project.canvasConfig.bottomPadding || 0;
    dom.customHeightRow.classList.toggle('na-hidden', dom.heightModeSelect.value !== 'custom');
  }

  function openProjectDialog() {
    updateProjectDialog();
    dom.projectDialog.showModal();
  }

  async function applyProjectSettings() {
    state.project.name = dom.projectNameInput.value.trim() || 'Untitled Project';
    state.project.background.color = dom.backgroundColorInput.value;
    state.project.canvasConfig.heightMode = dom.heightModeSelect.value;
    state.project.canvasConfig.customHeight = Math.max(state.project.viewport.height, Number(dom.customHeightInput.value || state.project.viewport.height));
    state.project.canvasConfig.bottomPadding = Math.max(0, Number(dom.bottomPaddingInput.value || 0));
    markDirty();
    renderAll();
    dom.projectDialog.close();
    await saveProject();
  }

  function renameProjectInline() {
    const value = prompt('Project name', state.project.name);
    if (value === null) return;
    state.project.name = value.trim() || 'Untitled Project';
    markDirty();
    renderAll();
  }

  function confirmAction(title, message) {
    dom.confirmTitle.textContent = title;
    dom.confirmMessage.textContent = message;
    dom.confirmDialog.showModal();
    return new Promise((resolve) => {
      const onClose = () => {
        dom.confirmDialog.removeEventListener('close', onClose);
        resolve(dom.confirmDialog.returnValue === 'default');
      };
      dom.confirmDialog.addEventListener('close', onClose);
    });
  }

  function bindGlobalEvents() {
    dom.projectButton.addEventListener('click', () => { if (state.multiSelectMode) { state.multiSelectMode = false; state.selectedIds.clear(); state.primaryId = null; renderAll(); } else openProjectDialog(); });
    dom.projectTitle.addEventListener('click', () => { if (!state.multiSelectMode) renameProjectInline(); });
    dom.previewButton.addEventListener('click', openPreview);
    dom.exportButton.addEventListener('click', openExportDialog);
    dom.groupButton.addEventListener('click', groupSelected);
    dom.duplicateButton.addEventListener('click', duplicateSelected);
    dom.deleteButton.addEventListener('click', deleteSelected);
    dom.playButton.addEventListener('click', togglePlayback);
    dom.previousMarkerButton.addEventListener('click', () => jumpMarker(-1));
    dom.nextMarkerButton.addEventListener('click', () => jumpMarker(1));
    dom.progressButton.addEventListener('click', () => {
      state.timeline.zoom = 1;
      state.timeline.visibleStart = 0;
      renderContext();
    });
    dom.websiteScrollRoot.addEventListener('scroll', onWebsiteScroll, { passive: true });
    dom.websiteScrollRoot.addEventListener('pointerdown', (event) => {
      if (event.target === dom.websiteScrollRoot || event.target === dom.websiteDocument || event.target === dom.sceneRoot || event.target === dom.projectBackground) {
        const start = { x: event.clientX, y: event.clientY };
        const onUp = (upEvent) => {
          dom.websiteScrollRoot.removeEventListener('pointerup', onUp);
          if (Math.hypot(upEvent.clientX - start.x, upEvent.clientY - start.y) < 6) selectShape(null);
        };
        dom.websiteScrollRoot.addEventListener('pointerup', onUp, { once: true });
      }
    });
    dom.imageInput.addEventListener('change', onImageChosen);
    dom.newProjectButton.addEventListener('click', createProject);
    dom.projectSelect.addEventListener('change', async () => {
      await saveProject();
      await loadProject(dom.projectSelect.value);
      dom.projectDialog.close();
    });
    dom.heightModeSelect.addEventListener('change', () => dom.customHeightRow.classList.toggle('na-hidden', dom.heightModeSelect.value !== 'custom'));
    dom.saveProjectSettingsButton.addEventListener('click', applyProjectSettings);
    dom.copyExportButton.addEventListener('click', async () => { await copyToClipboard(dom.exportCode.value); toast('Export code copied'); });
    dom.downloadHtmlButton.addEventListener('click', downloadHtml);
    dom.downloadZipButton.addEventListener('click', downloadZip);
    window.addEventListener('resize', () => { if (!state.project) return; updateDisplayScale(); updateDocumentGeometry(); renderScene(); });
    window.visualViewport?.addEventListener('resize', () => { if (!state.project) return; updateDisplayScale(); renderScene(); });
    window.addEventListener('keydown', (event) => {
      if (event.target.matches('input,textarea,select')) return;
      if (event.key === 'Escape') {
        if (currentScreen().screen !== 'timeline') popScreen();
        else if (state.selectedIds.size) selectShape(null);
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedIds.size) deleteSelected();
      if (event.code === 'Space') { event.preventDefault(); togglePlayback(); }
    });
    window.addEventListener('beforeunload', () => {
      if (state.lastSavedRevision !== state.projectRevision) {
        localStorage.setItem('nowaction_motion_backup', JSON.stringify({ id: state.project.id, payload: state.project }));
      }
    });
  }

  function cacheDom() {
    Object.assign(dom, {
      app: $('#app'),
      projectButton: $('#project-button'),
      projectTitle: $('#project-title'),
      topStatus: $('#top-status'),
      normalTopActions: $('#normal-top-actions'),
      selectionTopActions: $('#selection-top-actions'),
      previewButton: $('#preview-button'),
      exportButton: $('#export-button'),
      groupButton: $('#group-button'),
      duplicateButton: $('#duplicate-button'),
      deleteButton: $('#delete-button'),
      previewStage: $('#preview-stage'),
      previewFrame: $('#preview-frame'),
      websiteScrollRoot: $('#website-scroll-root'),
      websiteDocument: $('#website-document'),
      projectBackground: $('#project-background'),
      sceneRoot: $('#scene-root'),
      previewBadge: $('#preview-badge'),
      bottomWorkspace: $('#bottom-workspace'),
      contextRoot: $('#context-root'),
      playButton: $('#play-button'),
      previousMarkerButton: $('#previous-marker-button'),
      nextMarkerButton: $('#next-marker-button'),
      progressButton: $('#progress-button'),
      imageInput: $('#image-file-input'),
      toast: $('#toast'),
      projectDialog: $('#project-dialog'),
      projectSelect: $('#project-select'),
      newProjectButton: $('#new-project-button'),
      projectNameInput: $('#project-name-input'),
      backgroundColorInput: $('#background-color-input'),
      heightModeSelect: $('#height-mode-select'),
      customHeightRow: $('#custom-height-row'),
      customHeightInput: $('#custom-height-input'),
      bottomPaddingInput: $('#bottom-padding-input'),
      saveProjectSettingsButton: $('#save-project-settings-button'),
      exportDialog: $('#export-dialog'),
      exportPerformance: $('#export-performance'),
      exportCode: $('#export-code'),
      copyExportButton: $('#copy-export-button'),
      downloadHtmlButton: $('#download-html-button'),
      downloadZipButton: $('#download-zip-button'),
      confirmDialog: $('#confirm-dialog'),
      confirmTitle: $('#confirm-title'),
      confirmMessage: $('#confirm-message')
    });
    setButtonIcon(dom.projectButton, 'project');
    setButtonIcon(dom.previewButton, 'preview');
    setButtonIcon(dom.exportButton, 'export');
    setButtonIcon(dom.groupButton, 'group');
    setButtonIcon(dom.duplicateButton, 'duplicate');
    setButtonIcon(dom.deleteButton, 'delete');
    setButtonIcon(dom.previousMarkerButton, 'previous');
    setButtonIcon(dom.playButton, 'play');
    setButtonIcon(dom.nextMarkerButton, 'next');
    setButtonIcon(dom.newProjectButton, 'addProject');
    setButtonIcon(dom.copyExportButton, 'copy');
    setButtonIcon(dom.downloadHtmlButton, 'download');
    setButtonIcon(dom.downloadZipButton, 'zip');
    $$('[data-icon="close"]').forEach((button) => setButtonIcon(button, 'close'));
  }

  async function init() {
    cacheDom();
    bindGlobalEvents();
    try {
      await loadProjects();
      const id = await resolveInitialProjectId();
      await loadProject(id);
      dom.app.setAttribute('aria-busy', 'false');
    } catch (error) {
      console.error(error);
      const backup = JSON.parse(localStorage.getItem('nowaction_motion_backup') || 'null');
      if (backup?.payload) {
        state.project = migrateProject({ id: backup.id || 'offline', name: 'Offline project', ...backup.payload });
      } else {
        state.project = migrateProject({ id: 'offline', name: 'Offline project', shapes: [], groups: {}, shapeCounter: { rectangle: 0, circle: 0, text: 0, image: 0 } });
      }
      state.lastSavedRevision = 0;
      state.projectRevision = 0;
      renderAll();
      toast('Offline mode');
      dom.app.setAttribute('aria-busy', 'false');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
