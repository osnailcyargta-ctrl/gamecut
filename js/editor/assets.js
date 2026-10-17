/* =====================================================================
 * GameForge Studio — assets.js
 * Panel kiri bawah: template entity, prefabs, dan preview suara.
 * Template = titik awal generik (bukan game jadi).
 * ===================================================================== */
'use strict';

window.ASSETS = {};

/* Template entity generik. Kalau butuh script, dipasang dari pustaka
 * snippet (dicopy ke project sekali, dipakai bersama). */
ASSETS.TEMPLATES = [
  { id: 'box',    label: 'Kotak',    icon: 'box',      props: { name: 'Kotak', width: 80, height: 80, color: '#5468ff' } },
  { id: 'circle', label: 'Bola',     icon: 'circle',   props: { name: 'Bola', shape: 'circle', width: 70, height: 70, color: '#4ade80' } },
  { id: 'tri',    label: 'Segitiga', icon: 'triangle', props: { name: 'Segitiga', shape: 'triangle', width: 80, height: 70, color: '#fbbf24' } },
  { id: 'star',   label: 'Bintang',  icon: 'star',     props: { name: 'Bintang', shape: 'star', width: 80, height: 80, color: '#facc15' } },
  { id: 'text',   label: 'Teks',     icon: 'type',     props: { name: 'Teks', shape: 'text', width: 240, height: 40, text: 'Halo dunia', fontSize: 28, color: '#e8e8ee' } },
  { id: 'player', label: 'Player',   icon: 'gamepad',  props: { name: 'Player', tag: 'player', shape: 'circle', width: 48, height: 48, color: '#4ade80', scripts: ['sn_move-arrows'] }, snippet: 'move-arrows' },
  { id: 'coin',   label: 'Koin',     icon: 'dice',     props: { name: 'Koin', tag: 'coin', shape: 'circle', width: 28, height: 28, color: '#facc15', points: 10, scripts: ['sn_collect-score'] }, snippet: 'collect-score' },
  { id: 'obsta',  label: 'Musuh',    icon: 'triangle', props: { name: 'Musuh', tag: 'enemy', shape: 'triangle', width: 56, height: 48, color: '#f87171' } }
];

ASSETS.init = function () {
  ED.events.on('project', ASSETS.render);
  ED.events.on('selection', ASSETS.render);
};

/* Pastikan script dari snippet tersedia di project (reuse). */
ASSETS.ensureSnippet = function (snippetId) {
  const sid = 'sn_' + snippetId;
  if (!ED.project.scripts[sid]) {
    const sn = SNIPPETS.byId(snippetId);
    if (!sn) return null;
    ED.pushUndo('Tambah snippet ' + sn.name);
    ED.project.scripts[sid] = { name: sn.name, code: sn.code };
  }
  return sid;
};

ASSETS.addTemplate = function (tpl) {
  const props = GE.clone(tpl.props);
  if (tpl.snippet) {
    const sid = ASSETS.ensureSnippet(tpl.snippet);
    if (sid) props.scripts = (props.scripts || []);
  }
  const e = ED.addEntity(props, 'Tambah ' + tpl.label);
  if (e) UI.toast('Entity "' + e.name + '" ditambahkan', 'ok');
};

ASSETS.showAddMenu = function (anchor) {
  UI.menu(anchor, [
    { label: '── Template ──', disabled: true },
    ...ASSETS.TEMPLATES.map((t) => ({
      label: t.label,
      icon: t.icon,
      onClick: () => ASSETS.addTemplate(t)
    })),
    { divider: true },
    { label: 'Entity kosong', icon: 'plus', onClick: () => ED.addEntity({ name: 'Entity' }, 'Tambah entity') },
    { label: 'Prefab ke scene…', icon: 'layers', onClick: () => ASSETS.instancePrefabMenu(anchor) }
  ]);
};

ASSETS.instancePrefabMenu = function (anchor) {
  const names = Object.keys(ED.project.prefabs);
  if (!names.length) {
    UI.toast('Belum ada prefab. Bikin dulu di bagian Prefabs.', 'info');
    return;
  }
  UI.menu(anchor, names.map((n) => ({
    label: n,
    icon: 'box',
    onClick: () => {
      const p = ED.project.prefabs[n];
      ED.addEntity(Object.assign({}, GE.clone(p), { name: n, z: ED.currentScene().entities.length }), 'Instance prefab ' + n);
    }
  })));
};

/* ------------------------------ render ----------------------------- */

ASSETS.render = function () {
  if (!ED.project) return;
  const root = UI.$('#assets-body');
  root.innerHTML = '';

  /* ---- template ---- */
  const sec1 = UI.el('div', { class: 'asset-section' }, [
    UI.el('div', { class: 'asset-sec-title', text: 'TAMBAH ENTITY' })
  ]);
  const grid = UI.el('div', { class: 'tpl-grid' });
  ASSETS.TEMPLATES.forEach((t) => {
    const card = UI.el('button', {
      class: 'tpl-card',
      title: 'Tambah ' + t.label,
      html: UI.icon(t.icon, 20) + '<span>' + t.label + '</span>'
    });
    card.addEventListener('click', () => ASSETS.addTemplate(t));
    grid.appendChild(card);
  });
  sec1.appendChild(grid);
  root.appendChild(sec1);

  /* ---- prefabs ---- */
  const sec2 = UI.el('div', { class: 'asset-section' }, [
    UI.el('div', { class: 'asset-sec-title' }, [
      UI.el('span', { text: 'PREFABS' }),
      UI.el('span', { class: 'vt-flex' })
    ])
  ]);
  const prefabNames = Object.keys(ED.project.prefabs);
  if (prefabNames.length) {
    prefabNames.forEach((n) => {
      const p = ED.project.prefabs[n];
      const sel = ED.selection && ED.selection.type === 'prefab' && ED.selection.name === n;
      const row = UI.el('div', { class: 'prefab-row' + (sel ? ' selected' : '') });
      row.appendChild(UI.el('span', { class: 'ent-dot', style: { background: p.color } }));
      row.appendChild(UI.el('span', { class: 'ent-name', text: n }));
      const acts = UI.el('span', { class: 'ent-actions' });
      const bAdd = UI.el('button', { class: 'icon-btn sm', title: 'Instance ke scene', html: UI.icon('plus', 13) });
      bAdd.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ED.addEntity(Object.assign({}, GE.clone(p), { name: n, z: ED.currentScene().entities.length }), 'Instance prefab ' + n);
      });
      const bDel = UI.el('button', { class: 'icon-btn sm', title: 'Hapus prefab', html: UI.icon('trash', 13) });
      bDel.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const ok = await UI.confirm('Hapus Prefab', 'Hapus prefab "' + n + '"? Entity yang sudah ada di scene tidak ikut terhapus.', { danger: true, okLabel: 'Hapus' });
        if (ok) ED.deletePrefab(n);
      });
      acts.appendChild(bAdd);
      acts.appendChild(bDel);
      row.appendChild(acts);
      row.addEventListener('click', () => {
        ED.selection = { type: 'prefab', name: n };
        ED.events.emit('selection');
      });
      sec2.appendChild(row);
    });
  } else {
    sec2.appendChild(UI.el('div', { class: 'empty-hint slim', text: 'Prefab = cetakan entity untuk game.spawnFrom().' }));
  }
  const bNewPrefab = UI.btn({ label: 'Prefab Baru', icon: 'plus', cls: 'btn-ghost block' });
  bNewPrefab.addEventListener('click', async () => {
    const name = await UI.prompt('Prefab Baru', { label: 'Nama prefab (dipakai game.spawnFrom):', value: 'Prefab' + (prefabNames.length + 1) });
    if (name && name.trim()) ED.addPrefab(name.trim());
  });
  sec2.appendChild(bNewPrefab);
  root.appendChild(sec2);

  /* ---- sounds ---- */
  const sec3 = UI.el('div', { class: 'asset-section' }, [
    UI.el('div', { class: 'asset-sec-title', text: 'SUARA (SINTETIS)' })
  ]);
  const sndGrid = UI.el('div', { class: 'snd-grid' });
  const previewAudio = new GE.AudioSynth();
  Object.keys(GE.AudioSynth.PRESETS).forEach((name) => {
    const chip = UI.el('button', { class: 'snd-chip', title: 'Preview: game.sound.play("' + name + '")', text: name });
    chip.addEventListener('click', () => previewAudio.play(name));
    sndGrid.appendChild(chip);
  });
  sec3.appendChild(sndGrid);
  root.appendChild(sec3);
};
