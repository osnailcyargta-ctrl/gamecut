/* =====================================================================
 * GameForge Studio — inspector.js
 * Panel kanan: properti entity / prefab / settings project.
 * Input nyaman: label jelas, row lega, live-update saat diketik,
 * commit (undo point) saat selesai.
 * ===================================================================== */
'use strict';

window.INSP = {};

INSP.init = function () {
  ED.events.on('project', () => INSP.render(true));
  ED.events.on('selection', () => INSP.render());
};

INSP.targetLabel = function () {
  if (!ED.selection) return 'Project';
  if (ED.selection.type === 'entity') {
    const e = ED.selectedEntity();
    return e ? e.name : '';
  }
  if (ED.selection.type === 'prefab') return 'Prefab: ' + ED.selection.name;
  return 'Project';
};

INSP.render = function (keepScroll) {
  if (!ED.project) return;
  const root = UI.$('#inspector-body');
  const prevScroll = keepScroll ? root.scrollTop : 0;
  root.innerHTML = '';
  UI.$('#insp-target').textContent = INSP.targetLabel();

  if (!ED.selection) INSP.renderSettings(root);
  else if (ED.selection.type === 'entity') {
    const e = ED.selectedEntity();
    if (!e) { ED.selection = null; INSP.renderSettings(root); return; }
    INSP.renderEntity(root, e);
  } else if (ED.selection.type === 'prefab') {
    const p = ED.selectedPrefab();
    if (!p) { ED.selection = null; INSP.renderSettings(root); return; }
    INSP.renderPrefab(root, p);
  }

  if (keepScroll) root.scrollTop = prevScroll;
};

/* ------------------------- field builders -------------------------- */

INSP.section = function (root, title, open) {
  const body = UI.el('div', { class: 'insp-sec-body' });
  const chev = UI.el('span', { class: 'sec-chev', html: UI.icon(open === false ? 'chevron-right' : 'chevron-down', 14) });
  const head = UI.el('div', { class: 'insp-sec-head' }, [
    chev,
    UI.el('span', { class: 'sec-title', text: title })
  ]);
  const sec = UI.el('div', { class: 'insp-section' }, [head, body]);
  head.addEventListener('click', () => {
    const closed = body.classList.toggle('collapsed');
    chev.innerHTML = UI.icon(closed ? 'chevron-right' : 'chevron-down', 14);
  });
  root.appendChild(sec);
  return body;
};

INSP.row = function (container, label, ctrl) {
  const r = UI.el('div', { class: 'insp-row' }, [
    UI.el('label', { class: 'insp-label', text: label }),
    ctrl
  ]);
  container.appendChild(r);
  return r;
};

INSP.numField = function (get, set, opts) {
  opts = opts || {};
  const input = UI.el('input', {
    class: 'text-input num',
    type: 'number',
    value: String(get()),
    step: opts.step != null ? String(opts.step) : '1'
  });
  if (opts.min != null) input.min = String(opts.min);
  if (opts.max != null) input.max = String(opts.max);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    if (!isNaN(v)) set(v);
    ED.soft();
  });
  input.addEventListener('change', () => {
    let v = parseFloat(input.value);
    if (isNaN(v)) v = opts.min != null ? opts.min : 0;
    if (opts.min != null) v = Math.max(opts.min, v);
    if (opts.max != null) v = Math.min(opts.max, v);
    input.value = String(v);
    set(v);
    ED.commit();
  });
  return input;
};

INSP.textField = function (get, set, opts) {
  opts = opts || {};
  const input = UI.el('input', { class: 'text-input' + (opts.wide ? ' wide' : ''), value: get(), spellcheck: 'false' });
  input.addEventListener('input', () => { set(input.value); ED.soft(); });
  input.addEventListener('change', () => { set(input.value); ED.commit(); });
  return input;
};

INSP.selectField = function (get, set, options) {
  const sel = UI.el('select', { class: 'text-input select' });
  options.forEach((o) => {
    const opt = UI.el('option', { value: o.value, text: o.label });
    if (get() === o.value) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => { set(sel.value); ED.commit(); });
  return sel;
};

INSP.colorField = function (get, set) {
  const wrap = UI.el('div', { class: 'color-field' });
  const picker = UI.el('input', { type: 'color', value: get() || '#5468ff' });
  const hex = UI.el('input', { class: 'text-input hex', value: get(), spellcheck: 'false' });
  picker.addEventListener('input', () => { set(picker.value); hex.value = picker.value; ED.soft(); });
  picker.addEventListener('change', () => { set(picker.value); ED.commit(); });
  hex.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) { set(hex.value); picker.value = hex.value; ED.soft(); }
  });
  hex.addEventListener('change', () => { set(hex.value); ED.commit(); });
  wrap.appendChild(picker);
  wrap.appendChild(hex);
  return wrap;
};

INSP.sliderField = function (get, set, min, max) {
  const wrap = UI.el('div', { class: 'slider-field' });
  const range = UI.el('input', { type: 'range', min: String(min), max: String(max), step: '0.05', value: String(get()) });
  const num = UI.el('span', { class: 'slider-val', text: String(get()) });
  range.addEventListener('input', () => { set(parseFloat(range.value)); num.textContent = range.value; ED.soft(); });
  range.addEventListener('change', () => { set(parseFloat(range.value)); ED.commit(); });
  wrap.appendChild(range);
  wrap.appendChild(num);
  return wrap;
};

INSP.checkbox = function (get, set) {
  const cb = UI.el('input', { type: 'checkbox', class: 'chk-input' });
  cb.checked = !!get();
  cb.addEventListener('change', () => { set(cb.checked); ED.commit(); });
  return cb;
};

INSP.vec2 = function (container, owner, commitLabel) {
  const pair = UI.el('div', { class: 'vec2' });
  pair.appendChild(UI.el('span', { class: 'vec2-l', text: 'X' }));
  pair.appendChild(INSP.numField(() => owner.x, (v) => { owner.x = v; }));
  pair.appendChild(UI.el('span', { class: 'vec2-l', text: 'Y' }));
  pair.appendChild(INSP.numField(() => owner.y, (v) => { owner.y = v; }));
  container.appendChild(pair);
};

/* --------------------------- settings ------------------------------ */

INSP.renderSettings = function (root) {
  const s = ED.project.settings;

  const secG = INSP.section(root, 'PROJECT');
  INSP.row(secG, 'Nama', INSP.textField(() => ED.project.name, (v) => { ED.project.name = v; }));
  INSP.row(secG, 'Lebar', INSP.numField(() => s.width, (v) => { s.width = Math.max(200, Math.min(1920, Math.round(v))); }, { min: 200, max: 1920 }));
  INSP.row(secG, 'Tinggi', INSP.numField(() => s.height, (v) => { s.height = Math.max(200, Math.min(1920, Math.round(v))); }, { min: 200, max: 1920 }));
  INSP.row(secG, 'Latar', INSP.colorField(() => s.background, (v) => { s.background = v; }));

  const secS = INSP.section(root, 'STATISTIK');
  const nEnt = ED.currentScene().entities.length;
  const nScr = Object.keys(ED.project.scripts).length;
  const nPre = Object.keys(ED.project.prefabs).length;
  const stat = (k, v) => {
    const r = UI.el('div', { class: 'stat-row' }, [
      UI.el('span', { class: 'dim', text: k }),
      UI.el('b', { text: String(v) })
    ]);
    secS.appendChild(r);
  };
  stat('Entity di scene ini', nEnt);
  stat('Script di project', nScr);
  stat('Prefab', nPre);
  secS.appendChild(UI.el('div', { class: 'empty-hint slim', html:
    'Tidak ada yang dipilih — ini settings project.<br>Klik entity di viewport atau Hierarchy untuk edit propertinya.' }));
};

/* ---------------------------- entity ------------------------------- */

INSP.renderEntity = function (root, e) {
  const isPrefabCtx = false;

  const secI = INSP.section(root, 'IDENTITY');
  INSP.row(secI, 'Nama', INSP.textField(() => e.name, (v) => { e.name = v; }));
  INSP.row(secI, 'Tag', INSP.textField(() => e.tag, (v) => { e.tag = v; }, { wide: false }));

  const secT = INSP.section(root, 'TRANSFORM');
  INSP.vec2(secT, e);
  const pairWH = UI.el('div', { class: 'vec2' });
  pairWH.appendChild(UI.el('span', { class: 'vec2-l', text: 'W' }));
  pairWH.appendChild(INSP.numField(() => e.width, (v) => { e.width = Math.max(4, v); }, { min: 4 }));
  pairWH.appendChild(UI.el('span', { class: 'vec2-l', text: 'H' }));
  pairWH.appendChild(INSP.numField(() => e.height, (v) => { e.height = Math.max(4, v); }, { min: 4 }));
  secT.appendChild(pairWH);
  INSP.row(secT, 'Rotasi°', INSP.numField(() => e.rotation, (v) => { e.rotation = v; }, { step: 5 }));
  INSP.row(secT, 'Skala', INSP.numField(() => e.scale, (v) => { e.scale = Math.max(0.1, v); }, { step: 0.1, min: 0.1 }));
  INSP.row(secT, 'Urutan (Z)', INSP.numField(() => e.z, (v) => { e.z = Math.round(v); }, { step: 1 }));

  const secA = INSP.section(root, 'TAMPILAN');
  INSP.row(secA, 'Bentuk', INSP.selectField(() => e.shape, (v) => { e.shape = v; }, [
    { value: 'rect', label: 'Kotak' },
    { value: 'circle', label: 'Bola' },
    { value: 'triangle', label: 'Segitiga' },
    { value: 'star', label: 'Bintang' },
    { value: 'text', label: 'Teks' },
    { value: 'custom', label: 'Custom (script onDraw)' }
  ]));
  INSP.row(secA, 'Warna', INSP.colorField(() => e.color, (v) => { e.color = v; }));
  INSP.row(secA, 'Opasitas', INSP.sliderField(() => e.opacity, (v) => { e.opacity = v; }, 0, 1));
  INSP.row(secA, 'Terlihat', INSP.checkbox(() => e.visible, (v) => { e.visible = v; }));

  INSP.row(secA, 'Radius sudut', INSP.numField(() => e.borderRadius, (v) => { e.borderRadius = Math.max(0, v); }, { min: 0 }));
  INSP.row(secA, 'Garis tepi', INSP.numField(() => e.borderWidth, (v) => { e.borderWidth = Math.max(0, v); }, { min: 0 }));

  if (e.shape === 'text') {
    INSP.row(secA, 'Isi teks', INSP.textField(() => e.text, (v) => { e.text = v; }));
    INSP.row(secA, 'Ukuran font', INSP.numField(() => e.fontSize, (v) => { e.fontSize = Math.max(6, v); }, { min: 6 }));
    INSP.row(secA, 'Font', INSP.selectField(() => e.fontFamily, (v) => { e.fontFamily = v; }, [
      { value: 'sans', label: 'Sans' },
      { value: 'serif', label: 'Serif' },
      { value: 'mono', label: 'Mono' }
    ]));
    INSP.row(secA, 'Perataan', INSP.selectField(() => e.align, (v) => { e.align = v; }, [
      { value: 'center', label: 'Tengah' },
      { value: 'left', label: 'Kiri' },
      { value: 'right', label: 'Kanan' }
    ]));
    INSP.row(secA, 'Tebal', INSP.checkbox(() => e.textBold, (v) => { e.textBold = v; }));
  }

  const secP = INSP.section(root, 'FISIKA', false);
  const pv = e.physics = e.physics || { vx: 0, vy: 0, gravity: 0, bounce: 0, collider: 'none' };
  INSP.row(secP, 'Vel X (px/s)', INSP.numField(() => pv.vx, (v) => { pv.vx = v; }, { step: 10 }));
  INSP.row(secP, 'Vel Y (px/s)', INSP.numField(() => pv.vy, (v) => { pv.vy = v; }, { step: 10 }));
  INSP.row(secP, 'Gravitasi', INSP.numField(() => pv.gravity, (v) => { pv.gravity = v; }, { step: 100 }));
  INSP.row(secP, 'Pantulan', INSP.numField(() => pv.bounce, (v) => { pv.bounce = Math.max(0, Math.min(1.2, v)); }, { step: 0.1, min: 0, max: 1.2 }));
  INSP.row(secP, 'Collider', INSP.selectField(() => pv.collider, (v) => { pv.collider = v; }, [
    { value: 'none', label: 'Tidak ada' },
    { value: 'aabb', label: 'Kotak (AABB)' },
    { value: 'circle', label: 'Bulat' }
  ]));

  /* scripts */
  const secS = INSP.section(root, 'SCRIPT');
  e.scripts = e.scripts || [];
  if (!e.scripts.length) {
    secS.appendChild(UI.el('div', { class: 'empty-hint slim', text: 'Belum ada script — entity ini masih diam.' }));
  }
  e.scripts.forEach((sid) => {
    const def = ED.project.scripts[sid];
    const chip = UI.el('div', { class: 'script-chip' });
    chip.appendChild(UI.el('span', { class: 'script-chip-name', text: def ? def.name : sid + ' (hilang)' }));
    const acts = UI.el('span', { class: 'ent-actions' });
    const bEdit = UI.el('button', { class: 'icon-btn sm', title: 'Edit script', html: UI.icon('code', 13) });
    bEdit.addEventListener('click', () => BP.showScript(sid));
    const bDel = UI.el('button', { class: 'icon-btn sm', title: 'Lepas dari entity', html: UI.icon('x', 13) });
    bDel.addEventListener('click', () => ED.detachScript(e, sid));
    acts.appendChild(bEdit);
    acts.appendChild(bDel);
    chip.appendChild(acts);
    secS.appendChild(chip);
  });

  const bAttach = UI.btn({ label: 'Pasang Script', icon: 'plus', cls: 'btn-ghost block' });
  bAttach.addEventListener('click', () => INSP.attachMenu(bAttach, e));
  secS.appendChild(bAttach);

  const secD = INSP.section(root, 'AKSI', false);
  const bDup = UI.btn({ label: 'Duplikat', icon: 'copy', cls: 'btn-ghost block' });
  bDup.addEventListener('click', () => ED.duplicateEntity(e.id));
  const bDel = UI.btn({ label: 'Hapus Entity', icon: 'trash', cls: 'btn-ghost danger block' });
  bDel.addEventListener('click', () => ED.deleteEntity(e.id));
  secD.appendChild(bDup);
  secD.appendChild(bDel);
};

INSP.attachMenu = function (anchor, owner) {
  const items = [];
  const ownIds = owner.scripts || [];
  const projScripts = Object.entries(ED.project.scripts);
  if (projScripts.length) {
    items.push({ label: '── Script project ──', disabled: true });
    projScripts.forEach(([sid, def]) => {
      if (ownIds.includes(sid)) return;
      items.push({
        label: def.name + '  (' + ED.scriptUsage(sid) + ' terpasang)',
        icon: 'code',
        onClick: () => ED.attachScript(owner, sid)
      });
    });
  }
  items.push({ label: '── Dari pustaka snippet ──', disabled: true });
  SNIPPETS.list.forEach((sn) => {
    items.push({
      label: sn.name,
      icon: 'zap',
      onClick: () => {
        const sid = ASSETS.ensureSnippet(sn.id);
        if (sid) ED.attachScript(owner, sid);
      }
    });
  });
  items.push({ divider: true });
  items.push({
    label: 'Script kosong baru…',
    icon: 'file',
    onClick: async () => {
      const name = await UI.prompt('Script Baru', { value: 'perilaku-baru', label: 'Nama script:' });
      if (!name) return;
      const sid = ED.createScript(name.trim());
      ED.attachScript(owner, sid);
      BP.showScript(sid);
    }
  });
  UI.menu(anchor, items);
};

/* ---------------------------- prefab ------------------------------- */

INSP.renderPrefab = function (root, p) {
  const secI = INSP.section(root, 'PREFAB');
  INSP.row(secI, 'Nama', INSP.textField(() => p.name, (v) => {
    const old = ED.selection.name;
    const nn = v.trim() || old;
    ED.mutate('Rename prefab', () => {
      delete ED.project.prefabs[old];
      p.name = nn;
      ED.project.prefabs[nn] = p;
    });
    ED.selection = { type: 'prefab', name: nn };
    ED.events.emit('selection');
  }));
  INSP.row(secI, 'Tag', INSP.textField(() => p.tag, (v) => { p.tag = v; }));

  const secT = INSP.section(root, 'BENTUK DEFAULT');
  const pairWH = UI.el('div', { class: 'vec2' });
  pairWH.appendChild(UI.el('span', { class: 'vec2-l', text: 'W' }));
  pairWH.appendChild(INSP.numField(() => p.width, (v) => { p.width = Math.max(4, v); }, { min: 4 }));
  pairWH.appendChild(UI.el('span', { class: 'vec2-l', text: 'H' }));
  pairWH.appendChild(INSP.numField(() => p.height, (v) => { p.height = Math.max(4, v); }, { min: 4 }));
  secT.appendChild(pairWH);
  INSP.row(secT, 'Bentuk', INSP.selectField(() => p.shape, (v) => { p.shape = v; }, [
    { value: 'rect', label: 'Kotak' },
    { value: 'circle', label: 'Bola' },
    { value: 'triangle', label: 'Segitiga' },
    { value: 'star', label: 'Bintang' },
    { value: 'text', label: 'Teks' },
    { value: 'custom', label: 'Custom' }
  ]));
  INSP.row(secT, 'Warna', INSP.colorField(() => p.color, (v) => { p.color = v; }));

  const secP = INSP.section(root, 'FISIKA DEFAULT', false);
  const pv = p.physics = p.physics || { vx: 0, vy: 0, gravity: 0, bounce: 0, collider: 'aabb' };
  INSP.row(secP, 'Vel X', INSP.numField(() => pv.vx, (v) => { pv.vx = v; }, { step: 10 }));
  INSP.row(secP, 'Vel Y', INSP.numField(() => pv.vy, (v) => { pv.vy = v; }, { step: 10 }));
  INSP.row(secP, 'Gravitasi', INSP.numField(() => pv.gravity, (v) => { pv.gravity = v; }, { step: 100 }));
  INSP.row(secP, 'Collider', INSP.selectField(() => pv.collider, (v) => { pv.collider = v; }, [
    { value: 'none', label: 'Tidak ada' },
    { value: 'aabb', label: 'Kotak (AABB)' },
    { value: 'circle', label: 'Bulat' }
  ]));

  const secS = INSP.section(root, 'SCRIPT');
  p.scripts = p.scripts || [];
  p.scripts.forEach((sid) => {
    const def = ED.project.scripts[sid];
    const chip = UI.el('div', { class: 'script-chip' });
    chip.appendChild(UI.el('span', { class: 'script-chip-name', text: def ? def.name : sid + ' (hilang)' }));
    const bDel = UI.el('button', { class: 'icon-btn sm', title: 'Lepas', html: UI.icon('x', 13) });
    bDel.addEventListener('click', () => ED.detachScript(p, sid));
    chip.appendChild(bDel);
    secS.appendChild(chip);
  });
  const bAttach = UI.btn({ label: 'Pasang Script', icon: 'plus', cls: 'btn-ghost block' });
  bAttach.addEventListener('click', () => INSP.attachMenu(bAttach, p));
  secS.appendChild(bAttach);

  const secD = INSP.section(root, 'AKSI', false);
  const bDel = UI.btn({ label: 'Hapus Prefab', icon: 'trash', cls: 'btn-ghost danger block' });
  bDel.addEventListener('click', async () => {
    const ok = await UI.confirm('Hapus Prefab', 'Hapus prefab "' + p.name + '"?', { danger: true, okLabel: 'Hapus' });
    if (ok) ED.deletePrefab(p.name);
  });
  secD.appendChild(bDel);
};
