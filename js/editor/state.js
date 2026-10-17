/* =====================================================================
 * GameForge Studio — state.js
 * Model data project + undo/redo + autosave + registry demo.
 * Project = data murni (JSON-able). Entity di editor adalah object
 * polos, bukan GE.Entity (runtime yang mengonversi).
 * ===================================================================== */
'use strict';

window.ED = {
  project: null,
  sceneIndex: 0,
  selection: null,   /* null | {type:'entity',id} | {type:'prefab',name} | {type:'settings'} */
  playing: false,
  _undo: [],
  _redo: [],
  _drafts: {},       /* draft script yang belum disimpan */
  _saveTimer: 0
};

/* --------------------------- event bus ---------------------------- */
const ED_LISTENERS = {};
ED.events = {
  on(evt, fn) { (ED_LISTENERS[evt] = ED_LISTENERS[evt] || []).push(fn); },
  emit(evt, ...args) {
    (ED_LISTENERS[evt] || []).forEach((fn) => {
      try { fn(...args); } catch (err) { console.error(err); }
    });
  }
};

/* --------------------------- project CRUD -------------------------- */

ED.newProject = function (opts) {
  opts = opts || {};
  const project = {
    formatVersion: 2,
    name: opts.name || 'Game Tanpa Nama',
    settings: {
      width: +opts.width || 800,
      height: +opts.height || 600,
      background: opts.background || '#101014'
    },
    prefabs: {},
    scripts: {},
    scenes: [{ name: 'Main', entities: [] }]
  };
  ED.loadProjectData(project);
  return project;
};

ED.loadProjectData = function (project) {
  ED.project = GE.clone(project);
  ED.sceneIndex = 0;
  ED.selection = null;
  ED._undo = [];
  ED._redo = [];
  ED._drafts = {};
  /* regenerasi id entity biar unik */
  const scene = ED.currentScene();
  if (scene) scene.entities.forEach((e) => { e.id = e.id || GE.uid('e'); });
  ED.events.emit('project');
  ED.events.emit('selection');
  ED.events.emit('history');
};

ED.currentScene = function () {
  if (!ED.project) return null;
  return ED.project.scenes[ED.sceneIndex] || null;
};

ED.setScene = function (i) {
  if (i < 0 || i >= ED.project.scenes.length) return;
  ED.sceneIndex = i;
  ED.selection = null;
  ED.events.emit('project');
  ED.events.emit('selection');
};

ED.findEntity = function (id) {
  const scene = ED.currentScene();
  if (!scene) return null;
  return scene.entities.find((e) => e.id === id) || null;
};

ED.selectedEntity = function () {
  if (!ED.selection || ED.selection.type !== 'entity') return null;
  return ED.findEntity(ED.selection.id);
};

/* ------------------------- undo / redo ----------------------------- */

ED.pushUndo = function (label) {
  ED._undo.push({
    label: label || 'Ubah',
    snap: JSON.stringify({ project: ED.project, sceneIndex: ED.sceneIndex })
  });
  if (ED._undo.length > 60) ED._undo.shift();
  ED._redo = [];
};

ED.commit = function () {
  ED.autosaveSoon();
  ED.events.emit('project');
  ED.events.emit('history');
};

ED.undo = function () {
  if (!ED._undo.length) return;
  const cur = JSON.stringify({ project: ED.project, sceneIndex: ED.sceneIndex });
  ED._redo.push(cur);
  const snap = JSON.parse(ED._undo.pop().snap);
  ED.project = snap.project;
  ED.sceneIndex = Math.min(snap.sceneIndex, ED.project.scenes.length - 1);
  if (ED.selection && ED.selection.type === 'entity' && !ED.findEntity(ED.selection.id)) ED.selection = null;
  ED.commit();
};

ED.redo = function () {
  if (!ED._redo.length) return;
  ED._undo.push({
    label: 'redo',
    snap: JSON.stringify({ project: ED.project, sceneIndex: ED.sceneIndex })
  });
  const snap = JSON.parse(ED._redo.pop());
  ED.project = snap.project;
  ED.sceneIndex = Math.min(snap.sceneIndex, ED.project.scenes.length - 1);
  if (ED.selection && ED.selection.type === 'entity' && !ED.findEntity(ED.selection.id)) ED.selection = null;
  ED.commit();
};

/* ED.mutate: bungkus perubahan dengan undo + commit */
ED.mutate = function (label, fn) {
  ED.pushUndo(label);
  fn();
  ED.commit();
};

/* Update ringan (saat drag / ketik) — tanpa undo, tanpa re-render penuh */
ED.soft = function () {
  ED.autosaveSoon();
};

/* -------------------------- entity ops ----------------------------- */

ED.addEntity = function (props, label) {
  const scene = ED.currentScene();
  if (!scene) return null;
  const e = Object.assign({
    id: GE.uid('e'),
    name: 'Entity',
    tag: '',
    x: 100, y: 100,
    width: 80, height: 80,
    shape: 'rect',
    color: '#5468ff',
    opacity: 1,
    visible: true,
    z: scene.entities.length,
    text: '',
    fontSize: 24,
    fontFamily: 'sans',
    align: 'center',
    borderRadius: 0,
    borderWidth: 0,
    physics: { vx: 0, vy: 0, gravity: 0, bounce: 0, collider: 'none' },
    scripts: []
  }, GE.clone(props || {}));
  e.id = GE.uid('e');
  ED.mutate(label || 'Tambah entity ' + e.name, () => {
    scene.entities.push(e);
  });
  ED.selection = { type: 'entity', id: e.id };
  ED.events.emit('selection');
  return e;
};

ED.duplicateEntity = function (id) {
  const e = ED.findEntity(id);
  if (!e) return;
  const copy = GE.clone(e);
  copy.id = GE.uid('e');
  copy.name = e.name + ' copy';
  copy.x += 24; copy.y += 24;
  ED.mutate('Duplikat ' + e.name, () => {
    ED.currentScene().entities.push(copy);
  });
  ED.selection = { type: 'entity', id: copy.id };
  ED.events.emit('selection');
};

ED.deleteEntity = function (id) {
  const e = ED.findEntity(id);
  if (!e) return;
  ED.mutate('Hapus ' + e.name, () => {
    const scene = ED.currentScene();
    const i = scene.entities.findIndex((x) => x.id === id);
    if (i >= 0) scene.entities.splice(i, 1);
  });
  if (ED.selection && ED.selection.id === id) {
    ED.selection = null;
    ED.events.emit('selection');
  }
};

ED.moveEntityOrder = function (id, dir) {
  const scene = ED.currentScene();
  const i = scene.entities.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= scene.entities.length) return;
  ED.mutate('Urutkan entity', () => {
    const [it] = scene.entities.splice(i, 1);
    scene.entities.splice(j, 0, it);
  });
};

/* -------------------------- script ops ----------------------------- */

ED.slug = function (s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'script';
};

ED.createScript = function (name, code) {
  let id = ED.slug(name);
  let n = 2;
  while (ED.project.scripts[id]) id = ED.slug(name) + '_' + n++;
  ED.mutate('Buat script ' + name, () => {
    ED.project.scripts[id] = { name: name, code: code || SNIPPETS.blankScript() };
  });
  return id;
};

ED.deleteScript = function (id) {
  if (!ED.project.scripts[id]) return;
  ED.mutate('Hapus script ' + id, () => {
    delete ED.project.scripts[id];
    /* lepas dari semua entity & prefab */
    ED.project.scenes.forEach((sc) => sc.entities.forEach((e) => {
      e.scripts = (e.scripts || []).filter((s) => s !== id);
    }));
    Object.values(ED.project.prefabs).forEach((p) => {
      p.scripts = (p.scripts || []).filter((s) => s !== id);
    });
  });
  if (ED._drafts[id]) delete ED._drafts[id];
};

ED.renameScript = function (id, newName) {
  if (!ED.project.scripts[id]) return;
  ED.mutate('Rename script', () => {
    ED.project.scripts[id].name = newName;
  });
};

ED.scriptUsage = function (id) {
  let n = 0;
  ED.project.scenes.forEach((sc) => sc.entities.forEach((e) => {
    if ((e.scripts || []).includes(id)) n++;
  }));
  Object.values(ED.project.prefabs).forEach((p) => {
    if ((p.scripts || []).includes(id)) n++;
  });
  return n;
};

ED.attachScript = function (owner, scriptId) {
  owner.scripts = owner.scripts || [];
  if (owner.scripts.includes(scriptId)) return;
  ED.mutate('Pasang script ' + scriptId, () => {
    owner.scripts.push(scriptId);
  });
};

ED.detachScript = function (owner, scriptId) {
  ED.mutate('Lepas script ' + scriptId, () => {
    owner.scripts = (owner.scripts || []).filter((s) => s !== scriptId);
  });
};

ED.validateScript = function (code) {
  return GE.compileScript(code);
};

/* -------------------------- prefab ops ----------------------------- */

ED.addPrefab = function (name) {
  const p = {
    name: name,
    tag: ED.slug(name),
    x: 100, y: 100,
    width: 40, height: 40,
    shape: 'rect',
    color: '#fbbf24',
    opacity: 1,
    borderRadius: 0,
    borderWidth: 0,
    physics: { vx: 0, vy: 0, gravity: 0, bounce: 0, collider: 'aabb' },
    scripts: []
  };
  ED.mutate('Buat prefab ' + name, () => {
    ED.project.prefabs[name] = p;
  });
  ED.selection = { type: 'prefab', name: name };
  ED.events.emit('selection');
  return p;
};

ED.deletePrefab = function (name) {
  if (!ED.project.prefabs[name]) return;
  ED.mutate('Hapus prefab ' + name, () => {
    delete ED.project.prefabs[name];
  });
  if (ED.selection && ED.selection.type === 'prefab' && ED.selection.name === name) {
    ED.selection = null;
    ED.events.emit('selection');
  }
};

ED.selectedPrefab = function () {
  if (!ED.selection || ED.selection.type !== 'prefab') return null;
  return ED.project.prefabs[ED.selection.name] || null;
};

/* --------------------------- scene ops ----------------------------- */

ED.addScene = function (name) {
  ED.mutate('Tambah scene', () => {
    ED.project.scenes.push({ name: name, entities: [] });
  });
  ED.setScene(ED.project.scenes.length - 1);
};

ED.deleteScene = function (i) {
  if (ED.project.scenes.length <= 1) return;
  ED.mutate('Hapus scene', () => {
    ED.project.scenes.splice(i, 1);
  });
  ED.setScene(Math.min(i, ED.project.scenes.length - 1));
};

ED.renameScene = function (i, name) {
  ED.mutate('Rename scene', () => {
    ED.project.scenes[i].name = name;
  });
};

/* ---------------------------- storage ------------------------------ */

ED.autosaveSoon = function () {
  clearTimeout(ED._saveTimer);
  ED._saveTimer = setTimeout(ED.autosaveNow, 600);
};

ED.autosaveNow = function () {
  if (!ED.project) return;
  try {
    localStorage.setItem('ge_studio_autosave', JSON.stringify({
      project: ED.project,
      sceneIndex: ED.sceneIndex,
      at: Date.now()
    }));
  } catch (e) { /* storage penuh, abaikan */ }
};

ED.listSaved = function () {
  try {
    const map = JSON.parse(localStorage.getItem('ge_studio_projects') || '{}');
    return Object.entries(map)
      .map(([name, p]) => ({ name: name, savedAt: p.savedAt || 0, project: p.project }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch (e) { return []; }
};

ED.saveProject = function (name) {
  if (!ED.project) return;
  name = name || ED.project.name;
  ED.project.name = name;
  try {
    const map = JSON.parse(localStorage.getItem('ge_studio_projects') || '{}');
    map[name] = { savedAt: Date.now(), project: ED.project };
    localStorage.setItem('ge_studio_projects', JSON.stringify(map));
    ED.events.emit('project');
    return true;
  } catch (e) {
    return false;
  }
};

ED.deleteSaved = function (name) {
  try {
    const map = JSON.parse(localStorage.getItem('ge_studio_projects') || '{}');
    delete map[name];
    localStorage.setItem('ge_studio_projects', JSON.stringify(map));
  } catch (e) { /* noop */ }
};

ED.savePlayNow = function () {
  try {
    localStorage.setItem('ge_studio_playnow', JSON.stringify({
      name: ED.project.name,
      project: ED.project
    }));
  } catch (e) { /* noop */ }
};

/* --------------------------- demo games ---------------------------- */
/* Game demo didaftarkan lewat GameDemos.register() oleh js/games/*.js
 * — editor tidak hardcode daftar game.                               */

ED.demos = function () {
  return GameDemos.list;
};

ED.openDemo = function (id) {
  const demo = GameDemos.list.find((d) => d.id === id);
  if (!demo) return false;
  ED.loadProjectData(GE.clone(demo.project));
  return true;
};
