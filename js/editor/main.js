/* =====================================================================
 * GameForge Studio — main.js
 * Topbar, file ops (new/open/save/import/export), run/stop,
 * shortcut keyboard, boot.
 * ===================================================================== */
'use strict';

window.MAIN = {};

MAIN.boot = function () {
  UI.mountIcons();

  /* global error hook -> console panel */
  window.addEventListener('error', (e) => {
    if (window.BP && BP.log) BP.log('Error: ' + e.message, 'error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (window.BP && BP.log) BP.log('Error: ' + (e.reason && e.reason.message ? e.reason.message : e.reason), 'error');
  });

  MAIN.wireTopbar();
  VP.init(UI.$('#viewport-wrap'), UI.$('#viewport'));
  MAIN.wireViewportToolbar();
  HIER.init();
  ASSETS.init();
  INSP.init();
  BP.init();

  VP.onStatus = (cursor, zoom) => {
    if (cursor) UI.$('#st-cursor').textContent = cursor.x + ', ' + cursor.y;
    if (zoom != null) UI.$('#zoom-label').textContent = zoom + '%';
  };

  MAIN.wireShortcuts();

  /* restore session atau project baru */
  let restored = false;
  try {
    const auto = JSON.parse(localStorage.getItem('ge_studio_autosave') || 'null');
    if (auto && auto.project && auto.project.scenes) {
      ED.project = auto.project;
      ED.sceneIndex = Math.min(auto.sceneIndex || 0, ED.project.scenes.length - 1);
      ED.currentScene().entities.forEach((e) => { e.id = e.id || GE.uid('e'); });
      restored = true;
    }
  } catch (e) { /* noop */ }

  if (restored) {
    ED.events.emit('project');
    ED.events.emit('selection');
    ED.events.emit('history');
    UI.toast('Session terakhir dipulihkan. Mau mulai fresh? File → Project Baru.', 'info');
  } else {
    ED.newProject({ name: 'Game Pertamaku' });
  }

  VP.fit();
  MAIN.updateHistoryButtons();

  if (!localStorage.getItem('ge_seen_welcome')) {
    localStorage.setItem('ge_seen_welcome', '1');
    MAIN.showWelcome();
  }
};

/* ----------------------------- topbar ------------------------------ */

MAIN.wireTopbar = function () {
  const nameInput = UI.$('#project-name');
  nameInput.addEventListener('change', () => {
    if (!ED.project) return;
    ED.mutate('Rename project', () => { ED.project.name = nameInput.value.trim() || 'Game Tanpa Nama'; });
    nameInput.value = ED.project.name;
  });
  ED.events.on('project', () => { nameInput.value = ED.project.name; });

  UI.$('#btn-file').addEventListener('click', (e) => {
    e.stopPropagation();
    UI.menu(UI.$('#btn-file'), [
      { label: 'Project Baru…', icon: 'file', onClick: MAIN.showNewModal },
      { label: 'Buka…', icon: 'folder', onClick: MAIN.showOpenModal },
      { divider: true },
      { label: 'Simpan ke Browser', icon: 'save', onClick: MAIN.saveToBrowser },
      { label: 'Simpan sebagai…', icon: 'copy', onClick: MAIN.saveAsToBrowser },
      { divider: true },
      { label: 'Export ke file .json', icon: 'download', onClick: MAIN.exportFile },
      { label: 'Import file .json…', icon: 'upload', onClick: MAIN.importFile },
      { divider: true },
      { label: 'Jalankan fullscreen', icon: 'external', onClick: MAIN.playFullscreen }
    ]);
  });

  UI.$('#btn-undo').addEventListener('click', () => ED.undo());
  UI.$('#btn-redo').addEventListener('click', () => ED.redo());
  UI.$('#btn-docs').addEventListener('click', () => MAIN.showDocs());

  UI.$('#btn-run').addEventListener('click', () => MAIN.togglePlay());
  UI.$('#btn-stop').addEventListener('click', () => MAIN.stopPlay());
  UI.$('#btn-fullscreen').addEventListener('click', () => MAIN.playFullscreen());

  ED.events.on('history', MAIN.updateHistoryButtons);
  ED.events.on('playing', MAIN.updatePlayButtons);
  MAIN.updatePlayButtons();
};

MAIN.updateHistoryButtons = function () {
  UI.$('#btn-undo').disabled = !ED._undo.length;
  UI.$('#btn-redo').disabled = !ED._redo.length;
};

MAIN.updatePlayButtons = function () {
  UI.$('#btn-run').disabled = ED.playing;
  UI.$('#btn-stop').disabled = !ED.playing;
  UI.$('#play-badge').hidden = !ED.playing;
  UI.$('#play-banner').hidden = !ED.playing;
};

/* ------------------------ viewport toolbar ------------------------- */

MAIN.wireViewportToolbar = function () {
  const gridBtn = UI.$('#btn-grid');
  const snapBtn = UI.$('#btn-snap');
  const paint = () => {
    gridBtn.classList.toggle('on', VP.showGrid);
    snapBtn.classList.toggle('on', VP.snap);
    UI.$('#st-grid').textContent = 'Grid ' + VP.GRID + 'px • Snap ' + (VP.snap ? 'ON' : 'OFF');
  };
  gridBtn.addEventListener('click', () => {
    VP.showGrid = !VP.showGrid;
    try { localStorage.setItem('ge_vp_grid', VP.showGrid ? '1' : '0'); } catch (e) {}
    paint();
  });
  snapBtn.addEventListener('click', () => {
    VP.snap = !VP.snap;
    try { localStorage.setItem('ge_vp_snap', VP.snap ? '1' : '0'); } catch (e) {}
    paint();
  });
  UI.$('#btn-zoom-in').addEventListener('click', () => VP.zoomStep(1));
  UI.$('#btn-zoom-out').addEventListener('click', () => VP.zoomStep(-1));
  UI.$('#btn-fit').addEventListener('click', () => VP.fit());
  paint();
  ED.events.on('project', () => {
    UI.$('#res-label').textContent = ED.project.settings.width + ' × ' + ED.project.settings.height;
  });
};

/* ----------------------------- file ops ---------------------------- */

MAIN.saveToBrowser = function () {
  if (BP.currentScriptId && ED._drafts[BP.currentScriptId] != null) BP.saveCurrent();
  if (ED.saveProject()) UI.toast('Project "' + ED.project.name + '" tersimpan di browser', 'ok');
  else UI.toast('Gagal simpan (storage penuh?)', 'err');
};

MAIN.saveAsToBrowser = async function () {
  const name = await UI.prompt('Simpan Sebagai', { value: ED.project.name, label: 'Nama project:' });
  if (!name || !name.trim()) return;
  if (ED.saveProject(name.trim())) UI.toast('Tersimpan sebagai "' + name.trim() + '"', 'ok');
};

MAIN.exportFile = function () {
  const data = JSON.stringify(ED.project, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ED.project.name.replace(/[^a-z0-9\-_ ]/gi, '') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  UI.toast('Project diekspor ke file .json', 'ok');
};

MAIN.importFile = function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        if (!p.scenes || !p.settings) throw new Error('Bukan format project GameForge (butuh scenes & settings).');
        ED.loadProjectData(p);
        VP.fit();
        UI.toast('Project "' + p.name + '" diimport', 'ok');
      } catch (err) {
        UI.toast('Import gagal: ' + err.message, 'err');
      }
    };
    reader.readAsText(f);
  });
  input.click();
};

/* ---------------------------- modals ------------------------------- */

MAIN.showNewModal = function () {
  UI.modal({
    title: 'Project Baru',
    width: 480,
    content: (body) => {
      const s = ED.project ? ED.project.settings : { width: 800, height: 600 };
      body.appendChild(UI.el('div', { class: 'form-grid' }, [
        UI.el('label', { class: 'form-label', text: 'Nama game' }),
        UI.el('input', { class: 'text-input', id: 'np-name', value: 'Game Baru', spellcheck: 'false' }),
        UI.el('label', { class: 'form-label', text: 'Lebar (px)' }),
        UI.el('input', { class: 'text-input', id: 'np-w', type: 'number', value: String(s.width), min: '200', max: '1920' }),
        UI.el('label', { class: 'form-label', text: 'Tinggi (px)' }),
        UI.el('input', { class: 'text-input', id: 'np-h', type: 'number', value: String(s.height), min: '200', max: '1920' }),
        UI.el('label', { class: 'form-label', text: 'Warna latar' }),
        UI.el('input', { class: 'text-input', id: 'np-bg', type: 'color', value: '#101014' }),
        UI.el('label', { class: 'form-label', text: 'Mulai dari' }),
        (() => {
          const sel = UI.el('select', { class: 'text-input select', id: 'np-tpl' });
          sel.appendChild(UI.el('option', { value: '', text: '— Kosong (dari nol) —' }));
          GameDemos.list.forEach((d) => {
            sel.appendChild(UI.el('option', { value: d.id, text: 'Demo: ' + d.name + ' — ' + d.tagline }));
          });
          return sel;
        })()
      ]));
      body.appendChild(UI.el('p', { class: 'dim small', text: 'Project yang sekarang akan otomatis di-autosave; kalau belum disimpan manual, tetap bisa di-restore.' }));
    },
    actions: [
      { label: 'Batal', onClick: (close) => close() },
      {
        label: 'Buat Project', primary: true, icon: 'plus',
        onClick: (close) => {
          const name = UI.$('#np-name').value.trim() || 'Game Baru';
          const w = +UI.$('#np-w').value || 800;
          const h = +UI.$('#np-h').value || 600;
          const bg = UI.$('#np-bg').value;
          const tpl = UI.$('#np-tpl').value;
          close();
          if (tpl) {
            ED.openDemo(tpl);
            ED.project.name = name;
            ED.commit();
          } else {
            ED.newProject({ name: name, width: w, height: h, background: bg });
          }
          VP.fit();
          UI.toast('Project "' + name + '" siap. Selamat bikin!', 'ok');
        }
      }
    ]
  });
};

MAIN.showOpenModal = function () {
  UI.modal({
    title: 'Buka Project',
    width: 560,
    content: (body, close) => {
      /* saved */
      body.appendChild(UI.el('div', { class: 'open-sec-title', text: 'TERSIMPAN DI BROWSER' }));
      const saved = ED.listSaved();
      const wrap = UI.el('div', { class: 'open-list' });
      if (!saved.length) {
        wrap.appendChild(UI.el('div', { class: 'empty-hint slim', text: 'Belum ada project tersimpan. Gunakan File → Simpan ke Browser.' }));
      }
      saved.forEach((s) => {
        const row = UI.el('div', { class: 'open-row' });
        row.appendChild(UI.el('span', { class: 'ent-dot', style: { background: (s.project.settings || {}).background || '#333' } }));
        const info = UI.el('div', { class: 'open-info' }, [
          UI.el('div', { class: 'open-name', text: s.name }),
          UI.el('div', { class: 'dim small', text: new Date(s.savedAt).toLocaleString('id-ID') })
        ]);
        row.appendChild(info);
        const bOpen = UI.btn({ label: 'Buka', cls: 'btn-primary sm2' });
        bOpen.addEventListener('click', () => {
          ED.loadProjectData(s.project);
          VP.fit();
          close();
          UI.toast('Project "' + s.name + '" dibuka', 'ok');
        });
        const bDel = UI.btn({ icon: 'trash', cls: 'icon-btn' });
        bDel.addEventListener('click', async () => {
          const ok = await UI.confirm('Hapus', 'Hapus project "' + s.name + '" dari browser?', { danger: true, okLabel: 'Hapus' });
          if (ok) { ED.deleteSaved(s.name); close(); MAIN.showOpenModal(); }
        });
        row.appendChild(bOpen);
        row.appendChild(bDel);
        wrap.appendChild(row);
      });
      body.appendChild(wrap);

      /* demos */
      body.appendChild(UI.el('div', { class: 'open-sec-title', text: 'DEMO PROJECT — BEDAH & MODIFIKASI' }));
      const dwrap = UI.el('div', { class: 'demo-grid' });
      GameDemos.list.forEach((d) => {
        const card = UI.el('button', { class: 'demo-card', title: d.description });
        card.appendChild(UI.el('div', { class: 'demo-emoji', text: d.emoji }));
        card.appendChild(UI.el('div', { class: 'demo-name', text: d.name }));
        card.appendChild(UI.el('div', { class: 'dim small', text: d.tagline }));
        card.addEventListener('click', () => {
          ED.openDemo(d.id);
          VP.fit();
          close();
          UI.toast('Demo "' + d.name + '" dibuka sebagai project — bebas diedit.', 'ok');
        });
        dwrap.appendChild(card);
      });
      body.appendChild(dwrap);
      body.appendChild(UI.el('p', { class: 'dim small', text: 'Demo ini 100% project data + script — bukan kode yang ditanam di engine. Bedah isinya untuk belajar cara bikin game sendiri.' }));
    },
    actions: [
      { label: 'Import file .json…', icon: 'upload', onClick: (close) => { close(); MAIN.importFile(); } },
      { label: 'Tutup', primary: true, onClick: (close) => close() }
    ]
  });
};

MAIN.showDocs = function () {
  UI.modal({
    title: 'Panduan & API',
    width: 680,
    content: (body) => {
      const tabs = UI.el('div', { class: 'docs-tabs' });
      const bGuide = UI.el('button', { class: 'tab-btn active', text: 'Cara Pakai (2 menit)' });
      const bApi = UI.el('button', { class: 'tab-btn', text: 'Referensi API Script' });
      tabs.appendChild(bGuide); tabs.appendChild(bApi);
      const content = UI.el('div', { class: 'docs-content' });
      content.innerHTML = SNIPPETS.guideHTML();
      bGuide.addEventListener('click', () => {
        bGuide.classList.add('active'); bApi.classList.remove('active');
        content.innerHTML = SNIPPETS.guideHTML();
      });
      bApi.addEventListener('click', () => {
        bApi.classList.add('active'); bGuide.classList.remove('active');
        content.innerHTML = SNIPPETS.docsHTML();
      });
      body.appendChild(tabs);
      body.appendChild(content);
    },
    actions: [{ label: 'Mengerti', primary: true, onClick: (close) => close() }]
  });
};

MAIN.showWelcome = function () {
  UI.modal({
    title: 'Selamat datang di GameForge Studio',
    width: 560,
    content: (body) => {
      body.appendChild(UI.el('div', { class: 'welcome-hero', html:
        '<div class="welcome-logo">' + UI.icon('gamepad', 34) + '</div>' +
        '<p><b>Ini engine beneran</b> — ala Scratch, Godot, dan Unity: kamu yang bikin game dari nol lewat editor, bukan main game jadi.</p>' +
        '<p class="dim">Entity → properti → script → Play. Semua game (termasuk 4 demo) hanyalah <b>project data</b> — tidak ada yang hardcoded di engine.</p>' }));
    },
    actions: [
      { label: 'Baca cara pakai (2 mnt)', icon: 'book', onClick: (close) => { close(); MAIN.showDocs(); } },
      { label: 'Lihat demo projects', icon: 'folder', onClick: (close) => { close(); MAIN.showOpenModal(); } },
      { label: 'Mulai dari nol', primary: true, icon: 'zap', onClick: (close) => { close(); MAIN.showNewModal(); } }
    ]
  });
};

/* ------------------------------ play ------------------------------- */

MAIN.togglePlay = function () {
  if (ED.playing) MAIN.stopPlay();
  else MAIN.startPlay();
};

MAIN.startPlay = function () {
  if (ED.playing) return;
  if (!BP.flushDrafts()) return;

  /* pre-compile semua script, blok play kalau ada error */
  let hasError = false;
  Object.entries(ED.project.scripts).forEach(([sid, def]) => {
    const check = GE.compileScript(def.code);
    if (!check.ok) {
      BP.log('Script "' + sid + '": ' + check.error, 'error');
      hasError = true;
    }
  });
  if (hasError) {
    BP.setTab('console');
    UI.toast('Ada script error — perbaiki dulu (cek Console).', 'err');
    return;
  }

  ED.playing = true;
  ED.events.emit('playing');
  BP.clearConsole();
  BP.log('▶ Play "' + ED.project.name + '" — Ctrl+Enter atau Esc untuk berhenti', 'info');

  const canvas = UI.$('#viewport');
  VP.enterPlay();
  VP.runtime = new GE.Runtime(canvas, ED.project, {
    onLog: (msg, level) => BP.log(msg, level),
    onFPS: (fps) => { const el = UI.$('#fps-label'); el.hidden = false; el.textContent = fps + ' FPS'; }
  });
  VP.runtime.start();
};

MAIN.stopPlay = function () {
  if (!ED.playing) return;
  if (VP.runtime) { VP.runtime.destroy(); VP.runtime = null; }
  VP.exitPlay();
  ED.playing = false;
  ED.events.emit('playing');
  UI.$('#fps-label').hidden = true;
  BP.log('⏹ Stop — kembali ke editor', 'info');
};

MAIN.playFullscreen = function () {
  if (ED.playing) MAIN.stopPlay();
  if (!BP.flushDrafts()) return;
  ED.savePlayNow();
  window.open('./play.html?from=studio', '_blank');
};

/* ---------------------------- shortcuts ---------------------------- */

MAIN.wireShortcuts = function () {
  document.addEventListener('keydown', (e) => {
    const typing = MAIN._isTyping(e);

    /* Ctrl+S — selalu intercept */
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (ED.playing) return;
      if (typing || BP.currentScriptId) {
        if (BP.currentScriptId && (document.activeElement && document.activeElement.id === 'code-area' || ED._drafts[BP.currentScriptId] != null)) {
          BP.saveCurrent();
        } else MAIN.saveToBrowser();
      } else {
        MAIN.saveToBrowser();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (ED.playing) { MAIN.stopPlay(); return; }
    }

    if (ED.playing) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); MAIN.stopPlay(); }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); MAIN.startPlay(); return; }
    if (e.key === 'F5') { e.preventDefault(); MAIN.startPlay(); return; }
    if (typing) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); ED.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); ED.redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (ED.selection && ED.selection.type === 'entity') ED.duplicateEntity(ED.selection.id);
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && ED.selection && ED.selection.type === 'entity') {
      e.preventDefault();
      ED.deleteEntity(ED.selection.id);
      return;
    }

    /* nudge entity dengan panah */
    const ent = ED.selectedEntity();
    if (ent && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      ED.mutate('Geser ' + ent.name, () => {
        if (e.key === 'ArrowLeft') ent.x -= step;
        if (e.key === 'ArrowRight') ent.x += step;
        if (e.key === 'ArrowUp') ent.y -= step;
        if (e.key === 'ArrowDown') ent.y += step;
      });
    }
  });

  /* autosave berkala */
  setInterval(() => { if (ED.project) ED.autosaveNow(); }, 15000);
};

MAIN._isTyping = function (e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
};

document.addEventListener('DOMContentLoaded', MAIN.boot);
