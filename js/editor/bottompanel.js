/* =====================================================================
 * GameForge Studio — bottompanel.js
 * Panel bawah: tab Script (code editor dengan gutter & snippet) dan
 * tab Console (log runtime).
 * ===================================================================== */
'use strict';

window.BP = {
  currentScriptId: null,
  consoleCount: 0,
  _logEntries: []
};

BP.init = function () {
  ED.events.on('project', () => { BP.refreshScripts(); });
  ED.events.on('selection', () => { BP.refreshScripts(); });

  /* tabs */
  UI.$$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => BP.setTab(btn.dataset.tab));
  });

  /* script toolbar */
  UI.$('#script-select').addEventListener('change', (e) => {
    BP.openScript(e.target.value || null);
  });
  UI.$('#btn-script-new').addEventListener('click', async () => {
    const name = await UI.prompt('Script Baru', { value: 'perilaku-baru', label: 'Nama script:' });
    if (!name || !name.trim()) return;
    const sid = ED.createScript(name.trim());
    BP.showScript(sid);
  });
  UI.$('#btn-script-rename').addEventListener('click', async () => {
    if (!BP.currentScriptId) return;
    const def = ED.project.scripts[BP.currentScriptId];
    if (!def) return;
    const name = await UI.prompt('Rename Script', { value: def.name, label: 'Nama baru:' });
    if (name && name.trim()) {
      ED.renameScript(BP.currentScriptId, name.trim());
      BP._statusSaved();
    }
  });
  UI.$('#btn-script-delete').addEventListener('click', async () => {
    if (!BP.currentScriptId) return;
    const def = ED.project.scripts[BP.currentScriptId];
    if (!def) return;
    const n = ED.scriptUsage(BP.currentScriptId);
    const ok = await UI.confirm('Hapus Script',
      'Hapus script "' + def.name + '"?' + (n ? '\nScript ini terpasang di ' + n + ' entity/prefab dan akan dilepas.' : ''),
      { danger: true, okLabel: 'Hapus' });
    if (ok) {
      const gone = BP.currentScriptId;
      BP.currentScriptId = null;
      ED.deleteScript(gone);
    }
  });
  UI.$('#btn-snippet').addEventListener('click', (e) => {
    e.stopPropagation();
    const items = SNIPPETS.list.map((sn) => ({
      label: sn.name,
      icon: 'zap',
      onClick: () => BP._insertSnippet(sn)
    }));
    items.push({ divider: true });
    items.push({ label: 'Buka dokumentasi API', icon: 'book', onClick: () => MAIN.showDocs() });
    UI.menu(UI.$('#btn-snippet'), items);
  });
  UI.$('#btn-script-save').addEventListener('click', () => BP.saveCurrent());

  const area = UI.$('#code-area');
  area.addEventListener('input', () => {
    ED._drafts[BP.currentScriptId] = area.value;
    BP._statusDirty();
    BP._syncGutter();
  });
  area.addEventListener('scroll', () => {
    UI.$('#code-gutter').scrollTop = area.scrollTop;
  });
  area.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = area.selectionStart, t = area.selectionEnd;
      area.value = area.value.slice(0, s) + '  ' + area.value.slice(t);
      area.selectionStart = area.selectionEnd = s + 2;
      ED._drafts[BP.currentScriptId] = area.value;
      BP._statusDirty();
      BP._syncGutter();
    }
  });

  /* console */
  UI.$('#btn-console-clear').addEventListener('click', () => BP.clearConsole());
};

/* ------------------------------ tabs ------------------------------- */

BP.setTab = function (tab) {
  UI.$$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  UI.$('#script-pane').classList.toggle('active', tab === 'script');
  UI.$('#console-pane').classList.toggle('active', tab === 'console');
};

/* ----------------------------- scripts ----------------------------- */

BP.refreshScripts = function () {
  if (!ED.project) return;
  const sel = UI.$('#script-select');
  const cur = BP.currentScriptId;
  sel.innerHTML = '';

  const ids = Object.keys(ED.project.scripts);
  if (!ids.length) {
    sel.appendChild(UI.el('option', { value: '', text: 'Belum ada script di project ini' }));
    BP.currentScriptId = null;
    BP._loadEditor();
    return;
  }

  /* grup: script milik entity terpilih dulu */
  const ent = ED.selectedEntity();
  const mine = ent ? (ent.scripts || []).filter((s) => ED.project.scripts[s]) : [];
  const rest = ids.filter((s) => !mine.includes(s));

  const addGroup = (label, list) => {
    if (!list.length) return;
    const g = UI.el('optgroup', { label: label });
    list.forEach((sid) => {
      const def = ED.project.scripts[sid];
      const n = ED.scriptUsage(sid);
      const o = UI.el('option', { value: sid, text: def.name + (n ? '  (' + n + ')' : '') });
      g.appendChild(o);
    });
    sel.appendChild(g);
  };
  addGroup('Terpasang di entity terpilih', mine);
  addGroup('Semua script project', rest);

  if (cur && ED.project.scripts[cur]) sel.value = cur;
  else BP.openScript(ids.includes(cur) ? cur : ids[0], true);
};

BP.openScript = function (scriptId, silent) {
  BP.currentScriptId = scriptId;
  UI.$('#script-select').value = scriptId || '';
  BP.setTab('script');
  BP._loadEditor(silent);
};

BP.showScript = function (scriptId) {
  if (scriptId && ED.project.scripts[scriptId]) {
    BP.openScript(scriptId);
  } else {
    BP.setTab('script');
    UI.toast('Script tidak ditemukan.', 'err');
  }
};

BP._loadEditor = function (silent) {
  const area = UI.$('#code-area');
  const head = UI.$('#script-select');
  if (!BP.currentScriptId || !ED.project.scripts[BP.currentScriptId]) {
    area.value = '';
    area.disabled = true;
    area.placeholder = 'Belum ada script dipilih. Buat baru lewat tombol "+ Baru" atau pasang dari Inspector.';
    UI.$('#code-gutter').textContent = '1';
    BP._statusSaved();
    return;
  }
  area.disabled = false;
  area.placeholder = '';
  const draft = ED._drafts[BP.currentScriptId];
  area.value = draft != null ? draft : ED.project.scripts[BP.currentScriptId].code;
  BP._statusDirtyIfDraft();
  BP._syncGutter();
  if (document.activeElement !== area && !silent) area.focus();
};

BP._syncGutter = function () {
  const area = UI.$('#code-area');
  const lines = area.value.split('\n').length;
  const g = UI.$('#code-gutter');
  let txt = '';
  for (let i = 1; i <= lines; i++) txt += i + '\n';
  g.textContent = txt;
  g.scrollTop = area.scrollTop;
};

BP.saveCurrent = function () {
  if (!BP.currentScriptId || !ED.project.scripts[BP.currentScriptId]) return;
  const code = UI.$('#code-area').value;
  const check = ED.validateScript(code);
  if (!check.ok) {
    UI.toast('Syntax error: ' + check.error, 'err');
    BP.log('Syntax error di script "' + BP.currentScriptId + '": ' + check.error, 'error');
    BP.setTab('console');
    return;
  }
  ED.mutate('Edit script ' + BP.currentScriptId, () => {
    ED.project.scripts[BP.currentScriptId].code = code;
  });
  delete ED._drafts[BP.currentScriptId];
  BP._statusSaved();
  UI.toast('Script tersimpan', 'ok');
};

/* Flush semua draft sebelum Play. Return true kalau aman. */
BP.flushDrafts = function () {
  let ok = true;
  Object.keys(ED._drafts).forEach((sid) => {
    if (!ED.project.scripts[sid]) { delete ED._drafts[sid]; return; }
    const code = ED._drafts[sid];
    const check = ED.validateScript(code);
    if (!check.ok) {
      BP.log('Script "' + sid + '" belum bisa disimpan: ' + check.error, 'error');
      ok = false;
      return;
    }
    ED.pushUndo('Edit script ' + sid);
    ED.project.scripts[sid].code = code;
    delete ED._drafts[sid];
  });
  if (!ok) {
    BP.setTab('console');
    UI.toast('Ada script dengan syntax error — cek Console.', 'err');
    return false;
  }
  return true;
};

BP._statusSaved = function () {
  const el = UI.$('#script-status');
  el.textContent = 'Tersimpan';
  el.classList.remove('dirty');
};
BP._statusDirty = function () {
  const el = UI.$('#script-status');
  el.textContent = 'Belum disimpan — Ctrl+S';
  el.classList.add('dirty');
};
BP._statusDirtyIfDraft = function () {
  if (ED._drafts[BP.currentScriptId] != null) BP._statusDirty();
  else BP._statusSaved();
};

BP._insertSnippet = function (sn) {
  if (!BP.currentScriptId) {
    UI.toast('Buat / pilih script dulu.', 'info');
    return;
  }
  const area = UI.$('#code-area');
  const s = area.selectionStart;
  area.value = area.value.slice(0, s) + sn.code + area.value.slice(area.selectionEnd);
  area.selectionStart = area.selectionEnd = s + sn.code.length;
  area.focus();
  ED._drafts[BP.currentScriptId] = area.value;
  BP._statusDirty();
  BP._syncGutter();
};

/* ----------------------------- console ----------------------------- */

BP.log = function (msg, level) {
  level = level || 'info';
  const list = UI.$('#console-list');
  const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
  const row = UI.el('div', { class: 'console-row ' + level }, [
    UI.el('span', { class: 'console-time', text: time }),
    UI.el('span', { class: 'console-msg', text: msg })
  ]);
  list.appendChild(row);
  BP._logEntries.push([time, level, msg]);
  if (BP._logEntries.length > 300) {
    BP._logEntries.shift();
    if (list.firstChild) list.firstChild.remove();
  }
  BP.consoleCount++;
  const badge = UI.$('#console-count');
  badge.hidden = false;
  badge.textContent = BP.consoleCount > 99 ? '99+' : String(BP.consoleCount);
  if (level === 'error' || level === 'warn') BP.setTab('console');
  if (UI.$('#console-autoscroll').checked) list.scrollTop = list.scrollHeight;
};

BP.clearConsole = function () {
  UI.$('#console-list').innerHTML = '';
  BP._logEntries = [];
  BP.consoleCount = 0;
  UI.$('#console-count').hidden = true;
};
