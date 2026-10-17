/* =====================================================================
 * GameForge Studio — hierarchy.js
 * Panel kiri atas: daftar scene + daftar entity di scene aktif.
 * ===================================================================== */
'use strict';

window.HIER = {};

HIER.init = function () {
  ED.events.on('project', HIER.render);
  ED.events.on('selection', HIER.render);

  UI.$('#btn-add-entity').addEventListener('click', (e) => {
    e.stopPropagation();
    ASSETS.showAddMenu(UI.$('#btn-add-entity'));
  });

  UI.$('#btn-add-scene').addEventListener('click', async () => {
    const name = await UI.prompt('Scene Baru', { label: 'Nama scene:', value: 'Scene ' + (ED.project.scenes.length + 1) });
    if (name && name.trim()) ED.addScene(name.trim());
  });

  UI.$('#scene-select').addEventListener('change', (e) => {
    ED.setScene(+e.target.value);
  });
};

HIER.render = function () {
  if (!ED.project) return;
  const listEl = UI.$('#hierarchy-list');
  const sceneSel = UI.$('#scene-select');

  /* scene selector */
  sceneSel.innerHTML = '';
  ED.project.scenes.forEach((sc, i) => {
    const o = UI.el('option', { value: String(i), text: sc.name });
    if (i === ED.sceneIndex) o.selected = true;
    sceneSel.appendChild(o);
  });

  /* entity list */
  const scene = ED.currentScene();
  listEl.innerHTML = '';
  if (!scene.entities.length) {
    listEl.appendChild(UI.el('div', { class: 'empty-hint' },
      [UI.el('div', { text: 'Belum ada entity.' }),
       UI.el('div', { class: 'dim', text: 'Tambah lewat tombol di bawah atau panel Assets.' })]));
    return;
  }

  scene.entities.forEach((e, idx) => {
    const selected = ED.selection && ED.selection.type === 'entity' && ED.selection.id === e.id;
    const row = UI.el('div', { class: 'hier-row' + (selected ? ' selected' : '') });

    const dot = UI.el('span', { class: 'ent-dot', style: { background: e.shape === 'text' ? 'transparent' : e.color } });
    if (e.shape === 'text') {
      dot.style.border = '1px solid #6b6b76';
      dot.textContent = 'T';
      dot.classList.add('txt');
    }
    row.appendChild(dot);

    const name = UI.el('span', { class: 'ent-name', text: e.name });
    name.addEventListener('dblclick', async () => {
      const nn = await UI.prompt('Rename Entity', { value: e.name, label: 'Nama baru:' });
      if (nn && nn.trim()) {
        ED.mutate('Rename entity', () => { e.name = nn.trim(); });
        INSP.render();
      }
    });
    row.appendChild(name);

    if (e.scripts && e.scripts.length) {
      row.appendChild(UI.el('span', { class: 'ent-badge', title: e.scripts.join(', '), text: String(e.scripts.length) }));
    }

    const actions = UI.el('span', { class: 'ent-actions' });

    const mkBtn = (icon, title, fn) => {
      const b = UI.el('button', { class: 'icon-btn sm', title: title, html: UI.icon(icon, 13) });
      b.addEventListener('click', (ev) => { ev.stopPropagation(); fn(); });
      return b;
    };
    actions.appendChild(mkBtn('arrowup', 'Naikkan urutan', () => ED.moveEntityOrder(e.id, -1)));
    actions.appendChild(mkBtn('arrowdown', 'Turunkan urutan', () => ED.moveEntityOrder(e.id, 1)));
    actions.appendChild(mkBtn('copy', 'Duplikat (Ctrl+D)', () => ED.duplicateEntity(e.id)));
    actions.appendChild(mkBtn(e.visible ? 'eye' : 'eye-off', 'Tampil/sembunyi', () => {
      ED.mutate('Toggle visible', () => { e.visible = !e.visible; });
      INSP.render();
    }));
    actions.appendChild(mkBtn('trash', 'Hapus (Del)', () => ED.deleteEntity(e.id)));

    row.appendChild(actions);
    row.addEventListener('click', (ev) => {
      if (ev.target.closest('button')) return;
      ED.selection = { type: 'entity', id: e.id };
      ED.events.emit('selection');
    });
    listEl.appendChild(row);
  });
};
