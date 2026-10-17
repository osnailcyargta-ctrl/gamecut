/* =====================================================================
 * GameForge Engine — entity.js
 * Entity runtime: punya transform, tampilan, fisika ringan,
 * dan daftar hook script yang terkompilasi.
 * ===================================================================== */
'use strict';

GE.Entity = class {
  constructor(data) {
    data = data || {};
    this.id = data.id || GE.uid('e');
    this.name = data.name || 'Entity';
    this.tag = data.tag || '';
    this.x = +(data.x || 0);
    this.y = +(data.y || 0);
    this.width = data.width != null ? +data.width : 80;
    this.height = data.height != null ? +data.height : 80;
    this.rotation = +(data.rotation || 0);
    this.scale = data.scale != null ? +data.scale : 1;
    this.shape = data.shape || 'rect';
    this.color = data.color || '#5468ff';
    this.opacity = data.opacity != null ? +data.opacity : 1;
    this.visible = data.visible !== false;
    this.z = +(data.z || 0);
    this.text = data.text || '';
    this.fontSize = +(data.fontSize || 24);
    this.fontFamily = data.fontFamily || 'sans';
    this.textBold = !!data.textBold;
    this.align = data.align || 'center';
    this.borderRadius = +(data.borderRadius || 0);
    this.borderWidth = +(data.borderWidth || 0);
    this.borderColor = data.borderColor || '#ffffff';
    this.src = data.src || '';

    const p = data.physics || {};
    this.vx = +(p.vx || 0);
    this.vy = +(p.vy || 0);
    this.gravity = +(p.gravity || 0);
    this.bounce = +(p.bounce || 0);
    this.collider = p.collider || 'none';

    this.scripts = (data.scripts || []).slice();
    this.prefab = data.prefab || '';

    /* Properti custom tambahan (mis. points, slot) ikut disalin */
    for (const k in data) {
      if (!(k in this) && k !== 'physics') this[k] = data[k];
    }

    /* Flag runtime */
    this._dead = false;
    this._started = false;
    this._hooks = [];
    this._order = 0;
  }

  get destroyed() { return this._dead; }
  get cx() { return this.x + this.width / 2; }
  get cy() { return this.y + this.height / 2; }
  set cx(v) { this.x = v - this.width / 2; }
  set cy(v) { this.y = v - this.height / 2; }

  destroy() { this._dead = true; }

  bounds() {
    const w = this.width * this.scale, h = this.height * this.scale;
    return { left: this.x, top: this.y, right: this.x + w, bottom: this.y + h };
  }

  center() { return { x: this.cx, y: this.cy }; }

  overlaps(other) {
    const a = this.bounds(), b = other.bounds();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  distanceTo(other) {
    const dx = this.cx - other.cx, dy = this.cy - other.cy;
    return Math.hypot(dx, dy);
  }

  /* Bounds kanvas game */
  static worldBounds(width, height) {
    return { w: width, h: height };
  }
};
