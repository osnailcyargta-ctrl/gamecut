/* =====================================================================
 * GameForge Engine — runtime.js
 * Runtime: mengubah project data (JSON) menjadi game yang jalan.
 * - kompilasi script per entity (sandbox ringan via Function)
 * - loop update/render, integrasi fisika ringan, deteksi tabrakan
 * - API `game` yang dipakai script
 *
 * ATURAN ENGINE: runtime tidak tahu aturan game apapun. Semua perilaku
 * game datang dari project data + script yang dibuat user di editor.
 * ===================================================================== */
'use strict';

GE.Runtime = class {
  constructor(canvas, project, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.opts = opts;
    this.project = GE.clone(project);
    this.input = new GE.Input();
    this.sound = new GE.AudioSynth();

    this.state = {};
    this.time = 0;
    this.dt = 0;
    this.entities = [];
    this._order = 0;
    this._errors = 0;
    this._sceneIndex = 0;

    const s = this.project.settings || {};
    canvas.width = +s.width || 800;
    canvas.height = +s.height || 600;

    this.game = this._makeAPI();
    this.loop = new GE.Loop((dt) => this._tick(dt));

    this.loadScene(opts.sceneIndex || 0);
  }

  /* ------------------------- scene management ---------------------- */

  loadScene(i) {
    this._sceneIndex = i;
    this.state = {};
    this.time = 0;
    this.entities = [];
    this._order = 0;
    const scene = this.project.scenes[i];
    if (!scene) return;
    for (const data of scene.entities || []) {
      this.entities.push(this._makeEntity(data));
    }
  }

  restart() {
    this.loadScene(this._sceneIndex);
    if (this.opts.onRestart) this.opts.onRestart();
  }

  /* --------------------------- entities ---------------------------- */

  _makeEntity(data) {
    const e = new GE.Entity(GE.clone(data));
    e._order = this._order++;
    e._hooks = this._compileAll(e);
    return e;
  }

  _compileAll(e) {
    const hooks = [];
    for (const sid of e.scripts || []) {
      const def = this.project.scripts && this.project.scripts[sid];
      if (!def) {
        this._err('Script "' + sid + '" tidak ditemukan (entity: ' + e.name + ')');
        continue;
      }
      const res = GE.compileScript(def.code);
      if (!res.ok) {
        this._err('Script "' + sid + '" (' + e.name + '): ' + res.error);
        continue;
      }
      try {
        const h = res.factory(this.game);
        if (h && typeof h === 'object') hooks.push({ sid: sid, h: h });
        else this._err('Script "' + sid + '" harus return object literal ({...})');
      } catch (err) {
        this._err('Script "' + sid + '" (' + e.name + '): ' + err.message);
      }
    }
    return hooks;
  }

  spawn(props) {
    const e = new GE.Entity(GE.clone(props || {}));
    e._order = this._order++;
    e._hooks = this._compileAll(e);
    this.entities.push(e);
    return e;
  }

  spawnFrom(prefabName, overrides) {
    const base = this.project.prefabs && this.project.prefabs[prefabName];
    if (!base) {
      this._err('Prefab "' + prefabName + '" tidak ditemukan');
      return null;
    }
    const merged = Object.assign({}, GE.clone(base), GE.clone(overrides || {}));
    merged.name = merged.name || prefabName;
    merged.prefab = prefabName;
    return this.spawn(merged);
  }

  find(name) {
    return this.entities.find((e) => e.name === name && !e._dead) || null;
  }

  findAll(tag) {
    return this.entities.filter((e) => e.tag === tag && !e._dead);
  }

  each(tag, fn) {
    this.findAll(tag).forEach(fn);
  }

  bounds() {
    return { w: this.canvas.width, h: this.canvas.height };
  }

  /* ------------------------------ API ------------------------------ */

  _makeAPI() {
    const rt = this;
    const api = {
      get state() { return rt.state; },
      get dt() { return rt.dt; },
      get time() { return rt.time; },
      input: rt.input,
      random: GE.Random,
      sound: {
        play: (n) => rt.sound.play(n),
        tone: (f, d, t, v, s) => rt.sound.tone(f, d, t, v, s),
        get muted() { return rt.sound.muted; },
        set muted(m) { rt.sound.muted = !!m; }
      },
      bounds: () => rt.bounds(),
      spawn: (props) => rt.spawn(props),
      spawnFrom: (name, over) => rt.spawnFrom(name, over),
      destroy: (e) => { if (e) e.destroy(); },
      find: (n) => rt.find(n),
      findAll: (t) => rt.findAll(t),
      each: (t, fn) => rt.each(t, fn),
      send: (topic, data) => rt._dispatch('onMessage', topic, data),
      log: (...a) => { if (rt.opts.onLog) rt.opts.onLog(a.map(String).join(' '), 'info'); },
      warn: (...a) => { if (rt.opts.onLog) rt.opts.onLog(a.map(String).join(' '), 'warn'); },
      restart: () => rt.restart(),
      switchScene: (name) => {
        const i = rt.project.scenes.findIndex((s) => s.name === name);
        if (i >= 0) {
          rt.loadScene(i);
          if (rt.opts.onScene) rt.opts.onScene(name);
        } else rt._err('Scene "' + name + '" tidak ditemukan');
      },
      scene: () => (rt.project.scenes[rt._sceneIndex] || {}).name || '',
      best: (k, v) => {
        try {
          if (v == null) return;
          const key = 'ge_best_' + rt.project.name + '_' + k;
          const cur = +localStorage.getItem(key) || 0;
          if (+v > cur) localStorage.setItem(key, String(+v));
        } catch (e) { /* noop */ }
      },
      getBest: (k) => {
        try { return +localStorage.getItem('ge_best_' + rt.project.name + '_' + k) || 0; }
        catch (e) { return 0; }
      }
    };
    return api;
  }

  /* --------------------------- lifecycle --------------------------- */

  start() {
    this.input.attach(this.canvas);
    /* dispatch onKeyDown/onKeyUp ke semua script */
    this._kd = (e) => {
      if (this.input._isTyping(e)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      this._dispatch('onKeyDown', GE.normalizeKey(e));
    };
    this._ku = (e) => {
      if (this.input._isTyping(e)) return;
      this._dispatch('onKeyUp', GE.normalizeKey(e));
    };
    window.addEventListener('keydown', this._kd, true);
    window.addEventListener('keyup', this._ku, true);
    this.loop.start();
  }

  stop() {
    this.loop.stop();
    this.input.detach();
    if (this._kd) window.removeEventListener('keydown', this._kd, true);
    if (this._ku) window.removeEventListener('keyup', this._ku, true);
  }

  destroy() {
    this.stop();
  }

  _err(msg) {
    this._errors++;
    if (this.opts.onLog) this.opts.onLog(msg, 'error');
    if (this._errors === 60) {
      if (this.opts.onLog) this.opts.onLog('Runtime dihentikan: terlalu banyak error script.', 'error');
      this.stop();
    }
  }

  _hookCall(e, hookName, args) {
    for (const hk of e._hooks) {
      const fn = hk.h[hookName];
      if (typeof fn === 'function') {
        try {
          fn.call(hk.h, e, ...args);
        } catch (err) {
          this._err('[' + e.name + ' \u2192 ' + hk.sid + '] ' + err.message);
        }
      }
    }
  }

  _dispatch(hookName, ...args) {
    for (const e of this.entities) {
      if (e._dead) continue;
      this._hookCall(e, hookName, args);
    }
  }

  _hasHook(e, hookName) {
    return e._hooks.some((hk) => typeof hk.h[hookName] === 'function');
  }

  _tick(dt) {
    this.dt = dt;
    this.time += dt;

    /* 1. onStart untuk entity baru */
    for (const e of this.entities) {
      if (!e._started && !e._dead) {
        e._started = true;
        this._hookCall(e, 'onStart', []);
      }
    }

    /* 2. fisika ringan: velocity + gravity + bounce di tepi kanvas */
    const W = this.canvas.width, H = this.canvas.height;
    for (const e of this.entities) {
      if (e._dead) continue;
      if (e.gravity) e.vy += e.gravity * dt;
      if (e.vx || e.vy) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.bounce > 0) {
          if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx) * e.bounce; }
          if (e.x + e.width > W) { e.x = W - e.width; e.vx = -Math.abs(e.vx) * e.bounce; }
          if (e.y < 0) { e.y = 0; e.vy = Math.abs(e.vy) * e.bounce; }
          if (e.y + e.height > H) { e.y = H - e.height; e.vy = -Math.abs(e.vy) * e.bounce; }
        }
      }
    }

    /* 3. tabrakan */
    this._collisions();

    /* 4. onUpdate semua entity */
    this._dispatch('onUpdate', dt);

    /* 5. klik mouse -> onClick entity teratas */
    if (this.input.mouse.clicked) {
      const mx = this.input.mouse.x, my = this.input.mouse.y;
      const list = this.entities
        .filter((e) => e.visible && !e._dead)
        .sort((a, b) => (b.z - a.z) || (b._order - a._order));
      for (const e of list) {
        const b = e.bounds();
        if (mx >= b.left && mx <= b.right && my >= b.top && my <= b.bottom) {
          if (this._hasHook(e, 'onClick')) {
            this._hookCall(e, 'onClick', []);
            break;
          }
        }
      }
    }

    /* 6. buang entity mati */
    if (this.entities.some((e) => e._dead)) {
      this.entities = this.entities.filter((e) => !e._dead);
    }

    this.input.endFrame();
    this._render();

    if (this.opts.onFPS) this.opts.onFPS(this.loop.fps);
  }

  _collisions() {
    const list = this.entities.filter((e) => !e._dead && e.collider !== 'none' && e.visible !== false);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a._dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b._dead) continue;
        if (!this._overlap(a, b)) continue;
        if (a._dead || b._dead) break;
        if (this._hasHook(a, 'onCollide')) this._hookCall(a, 'onCollide', [b]);
        if (this._hasHook(b, 'onCollide')) this._hookCall(b, 'onCollide', [a]);
      }
    }
  }

  _overlap(a, b) {
    const ca = a.collider === 'circle' || a.shape === 'circle';
    const cb = b.collider === 'circle' || b.shape === 'circle';
    if (ca && cb) {
      const ra = Math.min(a.width, a.height) / 2, rb = Math.min(b.width, b.height) / 2;
      return Math.hypot(a.cx - b.cx, a.cy - b.cy) < ra + rb;
    }
    if (!ca && !cb) {
      return a.overlaps(b);
    }
    /* campuran: pakai AABB (cukup baik untuk kasus umum) */
    return a.overlaps(b);
  }

  /* ---------------------------- render ----------------------------- */

  _render() {
    const ctx = this.canvas.getContext('2d');
    const s = this.project.settings || {};
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.background || '#101014';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const list = this.entities
      .filter((e) => e.visible)
      .sort((a, b) => (a.z - b.z) || (a._order - b._order));

    for (const e of list) this._drawEntity(ctx, e);
  }

  _drawEntity(ctx, e) {
    /* bentuk bawaan (di-transform) */
    if (e.shape !== 'custom') {
      ctx.save();
      ctx.globalAlpha = e.opacity;
      ctx.translate(e.cx, e.cy);
      if (e.rotation) ctx.rotate((e.rotation * Math.PI) / 180);
      if (e.scale !== 1) ctx.scale(e.scale, e.scale);
      GE.drawShape(ctx, e);
      ctx.restore();
    }
    /* hook onDraw script: gambar di koordinat dunia (self.x, self.y) */
    if (e._hooks.length) {
      for (const hk of e._hooks) {
        if (typeof hk.h.onDraw === 'function') {
          try {
            ctx.save();
            hk.h.onDraw.call(hk.h, e, ctx, this.time);
            ctx.restore();
          } catch (err) {
            this._err('[' + e.name + ' \u2192 ' + hk.sid + '.onDraw] ' + err.message);
          }
        }
      }
    }
  }
};
