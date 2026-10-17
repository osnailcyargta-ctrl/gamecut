/* =====================================================================
 * GameForge Engine — core.js
 * Utilitas inti: math, random, input, audio sintetis, game loop,
 * kompilasi script, dan penggambar bentuk.
 *
 * ATURAN ENGINE: file ini TIDAK BOLEH tahu tentang game apapun.
 * Semua game = project data (lihat js/games/*.js).
 * ===================================================================== */
'use strict';

window.GE = { version: '2.0.0' };

/* ------------------------------------------------------------------ */
/* Registry demo project. File game (js/games/*.js) memanggil
 * GameDemos.register('snake', {...}). Engine & editor tidak hardcode
 * daftar game — mereka cuma membaca registry ini.                    */
/* ------------------------------------------------------------------ */
window.GameDemos = {
  list: [],
  register(id, meta) {
    meta.id = id;
    this.list.push(meta);
  }
};

GE.clone = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

GE.uid = function (prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

/* ------------------------------ Math ------------------------------ */
GE.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
GE.lerp = function (a, b, t) { return a + (b - a) * t; };

GE.Random = {
  int(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; },
  float(a, b) { return Math.random() * (b - a) + a; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
};

/* ------------------------------ Input ----------------------------- */
GE.normalizeKey = function (e) {
  let k = e.key;
  if (k === ' ') return 'Space';
  if (k.length === 1) return k.toLowerCase();
  return k;
};

const GAME_PREVENT_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'
]);

GE.Input = class {
  constructor() {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.releasedKeys = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this._bound = false;
    this._canvas = null;
    this._onKD = this._onKD.bind(this);
    this._onKU = this._onKU.bind(this);
    this._onMM = this._onMM.bind(this);
    this._onMD = this._onMD.bind(this);
    this._onMU = this._onMU.bind(this);
  }

  attach(canvas) {
    this.detach();
    this._canvas = canvas;
    window.addEventListener('keydown', this._onKD, true);
    window.addEventListener('keyup', this._onKU, true);
    canvas.addEventListener('mousemove', this._onMM);
    canvas.addEventListener('mousedown', this._onMD);
    window.addEventListener('mouseup', this._onMU);
    this._bound = true;
  }

  detach() {
    if (!this._bound) return;
    window.removeEventListener('keydown', this._onKD, true);
    window.removeEventListener('keyup', this._onKU, true);
    if (this._canvas) {
      this._canvas.removeEventListener('mousemove', this._onMM);
      this._canvas.removeEventListener('mousedown', this._onMD);
    }
    window.removeEventListener('mouseup', this._onMU);
    this._bound = false;
    this._canvas = null;
    this.keys.clear(); this.pressedKeys.clear(); this.releasedKeys.clear();
  }

  _isTyping(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }

  _onKD(e) {
    if (this._isTyping(e)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = GE.normalizeKey(e);
    if (GAME_PREVENT_KEYS.has(k)) e.preventDefault();
    if (!this.keys.has(k)) this.pressedKeys.add(k);
    this.keys.add(k);
  }

  _onKU(e) {
    const k = GE.normalizeKey(e);
    this.keys.delete(k);
    this.releasedKeys.add(k);
  }

  _toCanvas(e) {
    const r = this._canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this._canvas.width / r.width),
      y: (e.clientY - r.top) * (this._canvas.height / r.height)
    };
  }

  _onMM(e) {
    const p = this._toCanvas(e);
    this.mouse.x = p.x; this.mouse.y = p.y;
  }

  _onMD(e) { this.mouse.down = true; this._onMM(e); }
  _onMU() {
    if (this.mouse.down) this.mouse.clicked = true;
    this.mouse.down = false;
  }

  /* API untuk script game */
  down(k) { return this.keys.has(k); }
  pressed(k) { return this.pressedKeys.has(k); }
  released(k) { return this.releasedKeys.has(k); }

  endFrame() {
    this.pressedKeys.clear();
    this.releasedKeys.clear();
    this.mouse.clicked = false;
  }
};

/* ------------------------- Audio sintetis ------------------------- */
/* Tidak butuh file audio eksternal — semua suara dibikin WebAudio.   */
GE.AudioSynth = class {
  constructor() { this.ctx = null; this.muted = false; }

  _ac() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { this.ctx = new AC(); } catch (e) { /* noop */ } }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, dur, type, vol, slideTo, when) {
    const ac = this._ac();
    if (!ac || this.muted) return;
    dur = dur || 0.1; type = type || 'square'; vol = vol == null ? 0.15 : vol; when = when || 0;
    const t0 = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  noise(dur, vol, when) {
    const ac = this._ac();
    if (!ac || this.muted) return;
    dur = dur || 0.25; vol = vol == null ? 0.25 : vol; when = when || 0;
    const t0 = ac.currentTime + when;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g); g.connect(ac.destination);
    src.start(t0);
  }

  play(name) {
    const P = GE.AudioSynth.PRESETS[name];
    if (!P) { this.tone(440, 0.1); return; }
    if (P.noise) { this.noise(P.d, P.v); return; }
    if (P.seq) {
      let t = 0;
      for (const [f, d] of P.seq) { this.tone(f, d, P.type || 'square', P.v || 0.15, null, t); t += d; }
      return;
    }
    this.tone(P.f, P.d, P.type || 'square', P.v == null ? 0.15 : P.v, P.slide || null);
  }
};

GE.AudioSynth.PRESETS = {
  click:     { f: 660,  d: 0.05, type: 'triangle', v: 0.12 },
  blip:      { f: 880,  d: 0.07, type: 'square',   v: 0.12 },
  beep:      { f: 440,  d: 0.12, type: 'square',   v: 0.13 },
  tick:      { f: 1200, d: 0.03, type: 'triangle', v: 0.07 },
  coin:      { seq: [[988, 0.06], [1319, 0.14]], type: 'square', v: 0.12 },
  powerup:   { seq: [[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.18]], v: 0.13 },
  win:       { seq: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]], v: 0.15 },
  lose:      { seq: [[392, 0.15], [330, 0.15], [262, 0.32]], v: 0.15 },
  hit:       { f: 180,  d: 0.16, type: 'sawtooth', v: 0.2, slide: 70 },
  explosion: { noise: true, d: 0.32, v: 0.28 },
  laser:     { f: 1200, d: 0.12, type: 'sawtooth', v: 0.11, slide: 220 },
  bounce:    { f: 520,  d: 0.06, type: 'sine',     v: 0.15 },
  roll:      { f: 300,  d: 0.1,  type: 'triangle', v: 0.18, slide: 520 }
};

/* ---------------------------- Game Loop --------------------------- */
GE.Loop = class {
  constructor(fn) {
    this.fn = fn;
    this.running = false;
    this.fps = 0;
    this._last = 0;
    this._frames = 0;
    this._acc = 0;
    this._raf = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _tick(now) {
    if (!this.running) return;
    let dt = (now - this._last) / 1000;
    this._last = now;
    dt = Math.min(dt, 1 / 20); /* clamp tab switch */
    this._frames++; this._acc += dt;
    if (this._acc >= 0.5) { this.fps = Math.round(this._frames / this._acc); this._frames = 0; this._acc = 0; }
    try { this.fn(dt); } catch (err) { console.error(err); }
    this._raf = requestAnimationFrame(this._tick);
  }
};

/* ------------------------- Script compiler ------------------------ */
/* Script game = object literal dengan hook lifecycle:
 *   ({ onStart(self){}, onUpdate(self, dt){}, onKeyDown(self, key){},
 *      onKeyUp(self, key){}, onCollide(self, other){}, onClick(self){},
 *      onMessage(self, topic, data){}, onDraw(self, ctx, time){} })
 * Variabel `game` tersedia di dalam script.                          */
GE.compileScript = function (code) {
  let c = String(code == null ? '' : code).trim();
  while (c.endsWith(';')) c = c.slice(0, -1).trim();
  if (!c) return { ok: false, error: 'Script kosong' };
  try {
    const factory = new Function('game', '"use strict";\nreturn (' + c + '\n);');
    return { ok: true, factory: factory };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

/* ------------------------- Shape rendering ------------------------ */
/* Dipakai bareng oleh runtime dan editor viewport.                  */
GE.FONT_STACKS = {
  sans:  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono:  'Consolas, Menlo, "Courier New", monospace'
};

GE.roundRectPath = function (ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

GE.starPath = function (ctx, rx, ry) {
  const innerX = rx * 0.45, innerY = ry * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    const mx = (i % 2 === 0) ? rx : innerX;
    const my = (i % 2 === 0) ? ry : innerY;
    const px = Math.cos(ang) * mx, py = Math.sin(ang) * my;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

/* Gambar bentuk entity. KOORDINAT: caller sudah translate ke center
 * entity (dan rotate/scale), jadi gambar dari (-w/2,-h/2).           */
GE.drawShape = function (ctx, e) {
  const w = e.width, h = e.height;
  ctx.fillStyle = e.color;

  const strokeIf = () => {
    if (e.borderWidth > 0) {
      ctx.strokeStyle = e.borderColor || '#ffffff';
      ctx.lineWidth = e.borderWidth;
      ctx.stroke();
    }
  };

  switch (e.shape) {
    case 'rect': {
      if (e.borderRadius > 0) GE.roundRectPath(ctx, -w / 2, -h / 2, w, h, e.borderRadius);
      else ctx.beginPath(), ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill(); strokeIf();
      break;
    }
    case 'circle': {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill(); strokeIf();
      break;
    }
    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill(); strokeIf();
      break;
    }
    case 'star': {
      GE.starPath(ctx, w / 2, h / 2);
      ctx.fill(); strokeIf();
      break;
    }
    case 'text': {
      const stack = GE.FONT_STACKS[e.fontFamily] || GE.FONT_STACKS.sans;
      ctx.font = (e.textBold ? 'bold ' : '') + e.fontSize + 'px ' + stack;
      ctx.textBaseline = 'middle';
      let tx = 0;
      if (e.align === 'left') { ctx.textAlign = 'left'; tx = -w / 2; }
      else if (e.align === 'right') { ctx.textAlign = 'right'; tx = w / 2; }
      else ctx.textAlign = 'center';
      const lines = String(e.text == null ? '' : e.text).split('\n');
      const lh = e.fontSize * 1.3;
      const y0 = -((lines.length - 1) * lh) / 2;
      lines.forEach((ln, i) => ctx.fillText(ln, tx, y0 + i * lh));
      break;
    }
    case 'image': {
      const img = GE.getImage(e.src);
      if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
      else {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.setLineDash([]);
      }
      break;
    }
    case 'custom':
    default:
      /* custom = digambar penuh oleh script onDraw */
      break;
  }
};

/* Image cache sederhana (untuk asset entity shape 'image'). */
GE._imgCache = {};
GE.getImage = function (src) {
  if (!src) return null;
  if (GE._imgCache[src] !== undefined) return GE._imgCache[src];
  const img = new Image();
  img.onload = function () {};
  img.src = src;
  GE._imgCache[src] = img;
  return img;
};
