// NEXUS Editor - app state, project operations, modals, play overlay
NX.ed = (function(){
  const U = NX.util;
  const S = {
    project: null,
    tab: 'stage',            // stage | node | sprite
    sceneId: null,
    scriptId: null,          // open script in node tab
    groupStack: [],          // entering playlists
    selEnt: null,
    selSprite: null,
    snap: true,
    listeners: []
  };

  function uid(p){ return U.uid(p); }

  function defaultProject(){
    const sid = uid('s'), eid = uid('e'), scid = uid('k');
    return {
      magic:'nexus-project', v:1, name:'Proyek Baru',
      settings:{ w:960, h:540 },
      assets:{ sprites:[] },
      prefabs:[],
      scenes:[{ id:sid, name:'Scene 1', bg:'#101014',
        entities:[{ id:eid, name:'Judul', x:480, y:200, w:200, h:40, rot:0, z:5, solid:false, visible:1,
          tags:[], shape:{ t:'text', color:'#e8e8ea', text:'Game Baru', fs:32 }, scripts:[] }],
        variables:[] }],
      scripts:[{ id:scid, name:'Intro', attach:'scene:'+sid, graph:{ nodes:[], links:[] } }],
      groups:[]
    };
  }

  // ---------- change notification ----------
  function onChange(cb){ S.listeners.push(cb); }
  function emit(){ S.listeners.forEach(cb => { try{ cb(); }catch(e){ console.error(e); } }); }
  let saveT = null;
  function touch(){
    if(saveT) clearTimeout(saveT);
    saveT = setTimeout(function(){
      try{ localStorage.setItem('nexus.autosave', JSON.stringify(S.project)); }catch(e){}
    }, 500);
    emit();
  }

  // ---------- lookups ----------
  function curScene(){ return S.project.scenes.find(s=>s.id===S.sceneId) || S.project.scenes[0]; }
  function entById(id){ const sc=curScene(); return sc ? sc.entities.find(e=>e.id===id) : null; }
  function spriteById(id){ return (S.project.assets.sprites||[]).find(s=>s.id===id) || null; }
  function scriptById(id){ return (S.project.scripts||[]).find(s=>s.id===id) || null; }
  function prefabById(id){ return (S.project.prefabs||[]).find(s=>s.id===id) || null; }
  function groupById(id){ return (S.project.groups||[]).find(g=>g.id===id) || null; }
  function entName(id){ const e = entById(id); return e ? e.name : '(hilang)'; }

  // ---------- project ops ----------
  function loadProject(p, silent){
    S.project = p;
    S.sceneId = p.scenes[0] ? p.scenes[0].id : null;
    S.scriptId = (p.scripts[0]||{}).id || null;
    S.groupStack = []; S.selEnt = null; S.selSprite = null;
    touch();
    if(!silent) setTab('stage');
  }
  function newProject(){ loadProject(defaultProject()); NX.store.clearLocal(); toast('Proyek baru dibuat'); }

  function addEntity(def){
    const sc = curScene();
    const e = Object.assign({
      id: uid('e'), name:'Entitas ' + (sc.entities.length+1), x: sc ? 480:0, y: sc ? 270:0,
      w:40, h:40, rot:0, z:0, solid:false, visible:1, tags:[], shape:{t:'rect', color:'#4cc9f0'}, scripts:[]
    }, def||{});
    sc.entities.push(e);
    S.selEnt = e.id;
    touch();
    return e;
  }
  function delEnt(id){
    const sc = curScene();
    sc.entities = sc.entities.filter(e=>e.id!==id);
    S.project.scripts = S.project.scripts.filter(s=>s.attach!=='ent:'+id);
    if(S.selEnt===id) S.selEnt=null;
    touch();
  }
  function dupEnt(id){
    const e = entById(id); if(!e) return;
    const c = U.clone(e);
    c.id = uid('e'); c.name = e.name+' copy'; c.x += 24; c.y += 24;
    curScene().entities.push(c);
    S.selEnt = c.id;
    touch();
  }
  function savePrefabFromEnt(id){
    const e = entById(id); if(!e) return;
    const name = prompt('Nama Prefab:', e.name);
    if(!name) return;
    const def = U.clone(e); delete def.id;
    S.project.prefabs.push({ id: uid('p'), name, def });
    toast('Prefab "'+name+'" tersimpan — bisa di-Spawn dari node');
    touch();
  }

  function addScript(name, attach){
    const sc = { id: uid('k'), name: name||'Script', attach: attach||'global', graph:{ nodes:[], links:[] } };
    S.project.scripts.push(sc);
    if(attach && attach.indexOf('ent:')===0){
      const e = entById(attach.slice(4));
      if(e) e.scripts.push(sc.id);
    }
    S.scriptId = sc.id;
    touch();
    setTab('node');
    return sc;
  }
  function delScript(id){
    S.project.scripts = S.project.scripts.filter(s=>s.id!==id);
    S.project.scenes.forEach(sc => sc.entities.forEach(e => { e.scripts = (e.scripts||[]).filter(x=>x!==id); }));
    S.project.prefabs.forEach(pf => { pf.def.scripts = (pf.def.scripts||[]).filter(x=>x!==id); });
    if(S.scriptId===id) S.scriptId = (S.project.scripts[0]||{}).id||null;
    if(S.groupStack.length===0 && !S.scriptId) setTab('stage');
    touch();
  }

  function newSprite(name, size){
    const sp = { id: uid('a'), name: name||'Sprite', size: size, px: [] };
    for(let r=0;r<size[1];r++){ const row=[]; for(let c=0;c<size[0];c++) row.push(null); sp.px.push(row); }
    S.project.assets.sprites.push(sp);
    S.selSprite = sp.id;
    touch();
    return sp;
  }
  function delSprite(id){
    S.project.assets.sprites = S.project.assets.sprites.filter(s=>s.id!==id);
    if(S.selSprite===id) S.selSprite=null;
    touch();
  }

  // ---------- graph navigation ----------
  function openScript(id){ S.scriptId = id; S.groupStack = []; setTab('node'); }
  function openGroup(gid){ if(groupById(gid)) { S.groupStack.push(gid); setTab('node'); } }
  function closeGroup(){ S.groupStack.pop(); setTab('node'); }
  function currentGraph(){
    if(S.groupStack.length){
      const gd = groupById(S.groupStack[S.groupStack.length-1]);
      if(gd) return gd.graph;
    }
    const sc = scriptById(S.scriptId);
    return sc ? sc.graph : null;
  }
  function currentNodeOwner(){ // for inspector hints
    if(S.groupStack.length) return { kind:'group', id:S.groupStack[S.groupStack.length-1] };
    return { kind:'script', id:S.scriptId };
  }

  function addGroupInstance(gid, x, y){
    const gd = groupById(gid); if(!gd) return;
    const g = currentGraph(); if(!g) return;
    g.nodes.push({ id: uid('n'), type:'grp:'+gid, x: x||300, y: y||200, props: (function(){ const o={}; (gd.params||[]).forEach(p=>{ o[p.param]=p.d; }); return o; })() });
    touch();
  }
  function deleteGroup(gid){
    if(!confirm('Hapus playlist ini? Semua node playlist-nya juga dihapus dari graph.')) return;
    S.project.groups = S.project.groups.filter(g=>g.id!==gid);
    const strip = (graph)=>{ if(!graph) return; graph.nodes = (graph.nodes||[]).filter(n=>n.type!=='grp:'+gid); };
    S.project.scripts.forEach(s=>strip(s.graph));
    S.project.groups.forEach(g=>strip(g.graph));
    if(S.groupStack.indexOf(gid)>=0) S.groupStack = [];
    touch();
  }

  // ---------- tabs ----------
  function setTab(t){
    S.tab = t;
    document.querySelectorAll('#tabbar .tabbtn').forEach(b => b.classList.toggle('on', b.dataset.tab===t));
    document.getElementById('stageTab').style.display  = t==='stage'  ? '' : 'none';
    document.getElementById('nodeTab').style.display   = t==='node'   ? '' : 'none';
    document.getElementById('spriteTab').style.display = t==='sprite' ? '' : 'none';
    emit();
  }

  // ---------- play overlay ----------
  let rt = null;
  function playScene(){
    if(rt) return;
    const modal = document.getElementById('playModal');
    modal.style.display = 'flex';
    startRun();
    document.addEventListener('keydown', escClose);
  }
  function startRun(){
    const canvas = document.getElementById('playCanvas');
    if(rt){ rt.stop(); rt = null; }
    rt = new NX.Runtime(canvas, U.clone(S.project), S.sceneId);
    rt.onRestart = function(){ setTimeout(startRun, 30); };
    if(!canvas._nxBound){
      canvas._nxBound = true;
      NX.input.attachMouse(canvas, function(e){
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (rt ? rt.W / r.width : 1),
                 y: (e.clientY - r.top) * (rt ? rt.H / r.height : 1) };
      });
    }
    NX.input.setEnabled(true);
    rt.start();
    document.getElementById('playState').textContent = '';
  }
  function stopPlay(){
    if(rt){ rt.stop(); rt = null; }
    NX.input.setEnabled(false);
    document.getElementById('playModal').style.display = 'none';
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e){ if(e.key==='Escape') stopPlay(); }

  // ---------- examples ----------
  function fetchJSON(url, cb, tries){
    tries = tries || 3;
    fetch(url).then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(cb).catch(function(){
      if(tries > 1) setTimeout(function(){ fetchJSON(url, cb, tries-1); }, 350);
      else toast('Gagal memuat: ' + url);
    });
  }
  function loadExampleList(cb){
    fetchJSON('examples/index.json', cb);
  }
  function loadExample(id){
    fetchJSON('examples/' + id + '.json', function(p){
      if(!NX.store.validate(p)){ toast('Contoh rusak'); return; }
      loadProject(p);
      toast('Contoh dimuat: ' + p.name);
    });
  }

  // ---------- small UI ----------
  function toast(msg){
    const root = document.getElementById('toasts');
    const t = U.el('div','toast',U.esc(msg));
    root.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 400); }, 2200);
  }
  function modal(title, bodyEl, buttons){
    const root = document.getElementById('modalRoot');
    root.innerHTML = '';
    const back = U.el('div','modal-back');
    const box  = U.el('div','modal');
    box.appendChild(U.el('div','modal-title', U.esc(title)));
    const body = U.el('div','modal-body');
    body.appendChild(bodyEl);
    box.appendChild(body);
    const row = U.el('div','modal-btns');
    (buttons||[]).forEach(b => {
      const btn = U.el('button','btn' + (b.primary?' primary':'') + (b.danger?' danger':''), U.esc(b.label));
      btn.onclick = function(){ try{ b.fn && b.fn(); } finally { if(!b.keep) back.remove(); } };
      row.appendChild(btn);
    });
    box.appendChild(row);
    back.appendChild(box);
    root.appendChild(back);
    return back;
  }

  function init(){
    // topbar
    document.getElementById('projName').addEventListener('input', function(){
      S.project.name = this.value; touch();
    });
    document.getElementById('btnPlay').onclick = playScene;
    document.getElementById('btnStopPlay').onclick = stopPlay;
    document.getElementById('btnRePlay').onclick = startRun;
    document.getElementById('btnSave').onclick = function(){
      NX.store.saveLocal(S.project); toast('Tersimpan di browser');
    };
    document.getElementById('btnExport').onclick = function(){ NX.store.exportFile(S.project); };
    document.getElementById('btnImport').onclick = function(){
      NX.store.importFile(function(p){ loadProject(p); toast('Proyek dimuat'); });
    };
    document.getElementById('btnNew').onclick = function(){
      if(confirm('Buat proyek baru? Proyek sekarang akan diganti.')) newProject();
    };
    document.getElementById('btnHelp').onclick = showHelp;

    // examples menu
    const exBtn = document.getElementById('btnExamples');
    exBtn.onclick = function(){
      loadExampleList(function(list){
        const box = U.el('div');
        box.appendChild(U.el('div','modal-sub','Semua contoh dibuat 100% dengan node engine — bukan kode game. Buka dan bedah graph-nya!'));
        list.forEach(it => {
          const row = U.el('button','pick-row');
          row.innerHTML = '<span class="pick-ic">'+ (it.icon||'🎮') +'</span><span><b>'+U.esc(it.name)+'</b><br><small>'+U.esc(it.desc||'')+'</small></span>';
          row.onclick = function(){ row.closest('.modal-back').remove(); loadExample(it.id); };
          box.appendChild(row);
        });
        modal('Buka Contoh', box, [{label:'Tutup'}]);
      });
    };

    // tabbar
    document.querySelectorAll('#tabbar .tabbtn').forEach(b => {
      b.onclick = function(){ setTab(b.dataset.tab); };
    });
    // rail
    document.querySelectorAll('#rail .railbtn').forEach(b => {
      b.onclick = function(){
        document.querySelectorAll('#rail .railbtn').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
        document.querySelectorAll('#leftPanel .lpanel').forEach(p=>p.style.display='none');
        const lp = document.getElementById('lp-'+b.dataset.tab);
        if(lp) lp.style.display='';
      };
    });

    // autosave restore
    const auto = localStorage.getItem('nexus.autosave');
    if(auto){
      try{
        const p = JSON.parse(auto);
        if(NX.store.validate(p)){
          loadProject(p, true);
          document.getElementById('welcomeModal').style.display = 'flex';
          return;
        }
      }catch(e){}
    }
    loadProject(defaultProject(), true);
    document.getElementById('welcomeModal').style.display = 'flex';
  }

  function showHelp(){
    const box = U.el('div','helpbox');
    box.innerHTML =
    '<h4>🎮 Cara kerja NEXUS</h4>'+
    '<p>Game = <b>Scene</b> berisi <b>Entitas</b> + <b>Script Node Graph</b>. Tidak ada kode game yang hardcode — semuanya dibuat dari node.</p>'+
    '<h4>1. Entitas &amp; gambar</h4>'+
    '<p>Tambah entitas di panel kiri (tab Scene). Bentuk: kotak, bulat, teks, atau <b>Sprite</b> yang kamu gambar sendiri di tab <b>Gambar</b> (pensil, isi, cermin, undo).</p>'+
    '<h4>2. Script dengan node</h4>'+
    '<p>Buka tab <b>Node</b>. Klik kanan canvas → pilih node. Sambungkan port putih (alur eksekusi) dan port warna (data). Mulai dari node hijau <i>Event</i> (Saat Mulai / Saat Tombol / Setiap X Detik...).</p>'+
    '<h4>3. Playlist (node gabungan)</h4>'+
    '<p>Seleksi beberapa node (tarik kotak di area kosong) → tekan <b>Ctrl+G</b> → jadi <b>1 node Playlist</b> yang bisa dipasang ulang di mana saja. Dobel-klik node playlist untuk mengedit isinya.</p>'+
    '<h4>4. Variabel &amp; Prefab</h4>'+
    '<p>Variabel scene diset lewat panel kanan; node Set/Ambil Variabel memakainya. <b>Jadikan Prefab</b> untuk entitas yang mau di-Spawn (peluru, musuh, ekor ular...).</p>'+
    '<h4>Shortcut</h4>'+
    '<p>Klik-kanan: tambah node · Ctrl+G: jadikan Playlist · Ctrl+D: duplikat node · Del: hapus · Roda mouse: zoom · Klik-tengah: geser tampilan · Dobel-klik playlist: masuk isi</p>';
    modal('Panduan Singkat', box, [{label:'Mengerti!', primary:true}]);
  }

  return {
    S, init, onChange, touch, emit,
    curScene, entById, spriteById, scriptById, prefabById, groupById, entName,
    loadProject, newProject,
    addEntity, delEnt, dupEnt, savePrefabFromEnt,
    addScript, delScript, newSprite, delSprite,
    openScript, openGroup, closeGroup, currentGraph, currentNodeOwner,
    addGroupInstance, deleteGroup,
    setTab, playScene, stopPlay,
    loadExample, loadExampleList,
    toast, modal, showHelp
  };
})();
