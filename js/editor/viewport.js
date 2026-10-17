/* =====================================================================
 * GameForge Studio — viewport.js
 * Canvas editor: grid, snap, select, drag, resize handle, zoom, pan.
 * Saat mode Play, canvas diserahkan ke GE.Runtime.
 * ===================================================================== */
'use strict';

window.VP = {
  canvas: null,
  wrap: null,
  ctx: null,
  cam: { x: 0, y: 0, zoom: 1 },   /* cam.x/y = offset layar; zoom = px layar per px game */
  showGrid: true,
  snap: true,
  GRID: 20,
  hoverId: null,
  playing: false,
  runtime: null,
  _drag: null,     /* {mode:'move'|'resize'|'pan', ...} */
  _spaceDown: false,
  onStatus: null   /* callback(cursor, zoomPct) */
};

VP.init = function (wrap, canvas) {
  VP.wrap = wrap;
  VP.canvas = canvas;
  VP.ctx = canvas.getContext('2d');

  try {
    VP.showGrid = localStorage.getItem('ge_vp_grid') !== '0';
    VP.snap = localStorage.getItem('ge_vp_snap') !== '0';
  } catch (e) { /* noop */ }

  const ro = new ResizeObserver(() => VP._resize());
  ro.observe(wrap);
  VP._resize();

  canvas.addEventListener('mousedown', VP._down);
  window.addEventListener('mousemove', VP._move);
  window.addEventListener('mouseup', VP._up);
  canvas.addEventListener('wheel', VP._wheel, { passive: false });
  canvas.addEventListener('dblclick', VP._dbl);
  canvas.addEventListener('mousemove', VP._hover);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !VP._isTyping(e)) {
      VP._spaceDown = true;
      if (!VP.playing) e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ') VP._spaceDown = false; });

  ED.events.on('project', () => { if (!VP.playing && VP.cam.zoom === 1) VP.fit(); });

  /* loop render editor selalu jalan (murah), play mode ditangani runtime */
  const loop = new GE.Loop(() => { if (!VP.playing) VP._draw(); });
  loop.start();
};

VP._isTyping = function (e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
};

VP._resize = function () {
  if (!VP.wrap || VP.playing) return;
  const dpr = window.devicePixelRatio || 1;
  VP.canvas.width = Math.max(10, Math.floor(VP.wrap.clientWidth * dpr));
  VP.canvas.height = Math.max(10, Math.floor(VP.wrap.clientHeight * dpr));
  VP.canvas.style.width = VP.wrap.clientWidth + 'px';
  VP.canvas.style.height = VP.wrap.clientHeight + 'px';
  VP.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

VP.fit = function () {
  if (!VP.projectSize) return;
  const { w, h } = VP.projectSize();
  const dpr = window.devicePixelRatio || 1;
  const vw = VP.wrap.clientWidth, vh = VP.wrap.clientHeight;
  VP.cam.zoom = Math.min((vw - 60) / w, (vh - 60) / h, 2);
  VP.cam.x = (vw - w * VP.cam.zoom) / 2;
  VP.cam.y = (vh - h * VP.cam.zoom) / 2;
  VP._notifyZoom();
};

VP.projectSize = function () {
  if (!ED.project) return { w: 800, h: 600 };
  return { w: ED.project.settings.width, h: ED.project.settings.height };
};

VP._notifyZoom = function () {
  if (VP.onStatus) VP.onStatus(null, Math.round(VP.cam.zoom * 100));
};

/* ------------------- coordinate conversions ------------------------ */

VP.screenToWorld = function (sx, sy) {
  return { x: (sx - VP.cam.x) / VP.cam.zoom, y: (sy - VP.cam.y) / VP.cam.zoom };
};

VP._evPos = function (e) {
  const r = VP.canvas.getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top };
};

/* --------------------------- hit testing --------------------------- */

VP._entityAt = function (wx, wy) {
  const scene = ED.currentScene();
  if (!scene) return null;
  const list = scene.entities.filter((e) => e.visible);
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (wx >= e.x && wx <= e.x + e.width && wy >= e.y && wy <= e.y + e.height) return e;
  }
  return null;
};

VP._selectedEntity = function () {
  return ED.selectedEntity();
};

VP._handleAt = function (e) {
  const sel = VP._selectedEntity();
  if (!sel) return null;
  const { sx, sy } = VP._evPos(e);
  const corners = [
    ['nw', sel.x, sel.y], ['ne', sel.x + sel.width, sel.y],
    ['sw', sel.x, sel.y + sel.height], ['se', sel.x + sel.width, sel.y + sel.height]
  ];
  for (const [dir, wx, wy] of corners) {
    const px = wx * VP.cam.zoom + VP.cam.x;
    const py = wy * VP.cam.zoom + VP.cam.y;
    if (Math.abs(sx - px) <= 7 && Math.abs(sy - py) <= 7) return { dir: dir, corner: [wx, wy] };
  }
  return null;
};

/* ---------------------------- mouse ops ---------------------------- */

VP._down = function (e) {
  if (VP.playing || !ED.project) return;
  if (e.button === 1 || VP._spaceDown || e.button === 2) {
    VP._drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, camx: VP.cam.x, camy: VP.cam.y };
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;

  const { sx, sy } = VP._evPos(e);
  const world = VP.screenToWorld(sx, sy);

  const h = VP._handleAt(e);
  if (h) {
    const sel = VP._selectedEntity();
    ED.pushUndo('Resize ' + sel.name);
    VP._drag = { mode: 'resize', dir: h.dir, ox: sel.x, oy: sel.y, ow: sel.width, oh: sel.height, wx: world.x, wy: world.y };
    return;
  }

  const ent = VP._entityAt(world.x, world.y);
  if (ent) {
    if (!ED.selection || ED.selection.type !== 'entity' || ED.selection.id !== ent.id) {
      ED.selection = { type: 'entity', id: ent.id };
      ED.events.emit('selection');
    }
    ED.pushUndo('Pindah ' + ent.name);
    VP._drag = { mode: 'move', id: ent.id, grabX: world.x - ent.x, grabY: world.y - ent.y, moved: false };
  } else {
    if (ED.selection) {
      ED.selection = null;
      ED.events.emit('selection');
    }
    VP._drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, camx: VP.cam.x, camy: VP.cam.y, maybeClick: true };
  }
};

VP._move = function (e) {
  const d = VP._drag;
  if (!d || VP.playing) return;

  if (d.mode === 'pan') {
    VP.cam.x = d.camx + (e.clientX - d.sx);
    VP.cam.y = d.camy + (e.clientY - d.sy);
    return;
  }

  const { sx, sy } = VP._evPos(e);
  const world = VP.screenToWorld(sx, sy);
  const ent = d.mode === 'move' ? ED.findEntity(d.id) : ED._dragEnt || ED.selectedEntity();

  if (d.mode === 'move' && ent) {
    let nx = world.x - d.grabX;
    let ny = world.y - d.grabY;
    if (VP.snap) {
      nx = Math.round(nx / VP.GRID) * VP.GRID;
      ny = Math.round(ny / VP.GRID) * VP.GRID;
    }
    ent.x = Math.round(nx);
    ent.y = Math.round(ny);
    d.moved = true;
  } else if (d.mode === 'resize' && ent) {
    const anchor = d.dir === 'nw' ? [d.ox + d.ow, d.oy + d.oh]
      : d.dir === 'ne' ? [d.ox, d.oy + d.oh]
      : d.dir === 'sw' ? [d.ox + d.ow, d.oy]
      : [d.ox, d.oy];
    let x1 = Math.min(anchor[0], world.x), y1 = Math.min(anchor[1], world.y);
    let x2 = Math.max(anchor[0], world.x), y2 = Math.max(anchor[1], world.y);
    if (VP.snap) {
      x1 = Math.round(x1 / VP.GRID) * VP.GRID; y1 = Math.round(y1 / VP.GRID) * VP.GRID;
      x2 = Math.round(x2 / VP.GRID) * VP.GRID; y2 = Math.round(y2 / VP.GRID) * VP.GRID;
    }
    ent.x = Math.round(x1); ent.y = Math.round(y1);
    ent.width = Math.max(8, Math.round(x2 - x1));
    ent.height = Math.max(8, Math.round(y2 - y1));
  }
};

VP._up = function () {
  const d = VP._drag;
  if (!d) return;
  if ((d.mode === 'move' && d.moved) || d.mode === 'resize') {
    ED.commit();
    INSP.render(true);
  }
  VP._drag = null;
};

VP._hover = function (e) {
  if (VP.playing || !ED.project) return;
  const { sx, sy } = VP._evPos(e);
  const world = VP.screenToWorld(sx, sy);
  const ent = VP._entityAt(world.x, world.y);
  VP.hoverId = ent ? ent.id : null;
  VP.canvas.style.cursor = VP._handleAt(e) ? 'nwse-resize'
    : ent ? 'move'
    : VP._spaceDown ? 'grab' : 'default';
  if (VP.onStatus) VP.onStatus({ x: Math.round(world.x), y: Math.round(world.y) }, null);
};

VP._wheel = function (e) {
  if (VP.playing) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  VP._zoomAt(e.clientX, e.clientY, factor);
};

VP._zoomAt = function (clientX, clientY, factor) {
  const r = VP.canvas.getBoundingClientRect();
  const sx = clientX - r.left, sy = clientY - r.top;
  const wx = (sx - VP.cam.x) / VP.cam.zoom;
  const wy = (sy - VP.cam.y) / VP.cam.zoom;
  VP.cam.zoom = GE.clamp(VP.cam.zoom * factor, 0.15, 5);
  VP.cam.x = sx - wx * VP.cam.zoom;
  VP.cam.y = sy - wy * VP.cam.zoom;
  VP._notifyZoom();
};

VP.zoomStep = function (dir) {
  const r = VP.canvas.getBoundingClientRect();
  VP._zoomAt(r.left + r.width / 2, r.top + r.height / 2, dir > 0 ? 1.2 : 0.83);
};

VP._dbl = function (e) {
  if (VP.playing) return;
  const { sx, sy } = VP._evPos(e);
  const world = VP.screenToWorld(sx, sy);
  const ent = VP._entityAt(world.x, world.y);
  if (ent && ent.scripts && ent.scripts.length) {
    BP.showScript(ent.scripts[0]);
  } else if (ent) {
    ED.selection = { type: 'entity', id: ent.id };
    ED.events.emit('selection');
    UI.toast('Entity ini belum punya script. Pasang lewat Inspector → Script.', 'info');
  }
};

/* --------------------------- play mode ----------------------------- */

VP.enterPlay = function () {
  VP.playing = true;
  VP._drag = null;
  const dpr = window.devicePixelRatio || 1;
  /* canvas di-resize oleh Runtime constructor; atur CSS biar fit */
  VP._stylePlayCanvas(dpr);
  VP._ro = new ResizeObserver(() => VP._stylePlayCanvas());
  VP._ro.observe(VP.wrap);
};

VP._stylePlayCanvas = function () {
  const canvas = VP.canvas;
  const vw = VP.wrap.clientWidth, vh = VP.wrap.clientHeight;
  const scale = Math.min(vw / canvas.width, vh / canvas.height, 1.6);
  canvas.style.width = Math.floor(canvas.width * scale) + 'px';
  canvas.style.height = Math.floor(canvas.height * scale) + 'px';
  canvas.style.left = Math.floor((vw - canvas.width * scale) / 2) + 'px';
  canvas.style.top = Math.floor((vh - canvas.height * scale) / 2) + 'px';
  canvas.style.position = 'absolute';
};

VP.exitPlay = function () {
  VP.playing = false;
  VP.runtime = null;
  if (VP._ro) { VP._ro.disconnect(); VP._ro = null; }
  VP.canvas.style.position = '';
  VP.canvas.style.left = '';
  VP.canvas.style.top = '';
  VP._resize();
  VP.fit();
};

/* ------------------------------ draw ------------------------------- */

VP._draw = function () {
  const ctx = VP.ctx;
  if (!ctx || !VP.wrap) return;
  const dpr = window.devicePixelRatio || 1;
  const vw = VP.wrap.clientWidth, vh = VP.wrap.clientHeight;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#101015';
  ctx.fillRect(0, 0, vw, vh);
  if (!ED.project) return;

  const { w: gw, h: gh } = VP.projectSize();
  ctx.save();
  ctx.translate(VP.cam.x, VP.cam.y);
  ctx.scale(VP.cam.zoom, VP.cam.zoom);

  /* area kanvas game */
  ctx.fillStyle = ED.project.settings.background || '#101014';
  ctx.fillRect(0, 0, gw, gh);

  /* grid */
  if (VP.showGrid && VP.cam.zoom > 0.35) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1 / VP.cam.zoom;
    ctx.beginPath();
    for (let x = VP.GRID; x < gw; x += VP.GRID) { ctx.moveTo(x, 0); ctx.lineTo(x, gh); }
    for (let y = VP.GRID; y < gh; y += VP.GRID) { ctx.moveTo(0, y); ctx.lineTo(gw, y); }
    ctx.stroke();
  }

  /* entity */
  const scene = ED.currentScene();
  const list = scene ? scene.entities.slice().sort((a, b) => (a.z - b.z) || 0) : [];
  for (const e of list) {
    if (!e.visible) continue;
    ctx.save();
    ctx.globalAlpha = e.opacity;
    ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
    if (e.rotation) ctx.rotate((e.rotation * Math.PI) / 180);
    if (e.scale !== 1) ctx.scale(e.scale, e.scale);
    GE.drawShape(ctx, e);
    ctx.restore();
  }

  /* hover outline */
  const hover = VP.hoverId ? scene.entities.find((x) => x.id === VP.hoverId) : null;
  if (hover && (!ED.selection || ED.selection.id !== hover.id)) {
    ctx.strokeStyle = 'rgba(120,140,255,0.45)';
    ctx.lineWidth = 1.5 / VP.cam.zoom;
    ctx.strokeRect(hover.x - 2, hover.y - 2, hover.width + 4, hover.height + 4);
  }

  /* selection outline + handles */
  const sel = ED.selectedEntity();
  if (sel) {
    ctx.strokeStyle = '#5468ff';
    ctx.lineWidth = 2 / VP.cam.zoom;
    ctx.strokeRect(sel.x - 3, sel.y - 3, sel.width + 6, sel.height + 6);
    const hs = 7 / VP.cam.zoom;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#5468ff';
    ctx.lineWidth = 1.5 / VP.cam.zoom;
    [[sel.x, sel.y], [sel.x + sel.width, sel.y], [sel.x, sel.y + sel.height], [sel.x + sel.width, sel.y + sel.height]].forEach(([px, py]) => {
      ctx.fillRect(px - hs, py - hs, hs * 2, hs * 2);
      ctx.strokeRect(px - hs, py - hs, hs * 2, hs * 2);
    });
    /* label nama */
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#5468ff';
    ctx.fillText(sel.name, sel.x - 3, sel.y - 9);
  }

  ctx.restore();

  /* bingkai area game */
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(VP.cam.x - 0.5, VP.cam.y - 0.5, gw * VP.cam.zoom + 1, gh * VP.cam.zoom + 1);
};
