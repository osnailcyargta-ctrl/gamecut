// NEXUS Player - standalone runtime page (loads example project data + runs it)
(function(){
  const U = NX.util;
  let rt = null, list = [];

  function fetchJSON(url, cb, tries){
    tries = tries || 3;
    fetch(url).then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(cb).catch(function(e){
      window.__fetchErr = ((e && (e.message || String(e))) || 'unknown') + ' | ' + ((e && e.stack || '').split('\n')[1] || '');
      if(tries > 1) setTimeout(function(){ fetchJSON(url, cb, tries-1); }, 350);
      else document.getElementById('pvList').innerHTML = '<div class="empty">Gagal memuat daftar contoh. Pastikan dibuka lewat http (GitHub Pages), bukan file://</div>';
    });
  }

  function buildList(items){
    list = items;
    const root = document.getElementById('pvList');
    root.innerHTML = '';
    items.forEach(it => {
      const c = U.el('button','card');
      c.innerHTML = '<span class="ic">'+(it.icon||'🎮')+'</span><b>'+U.esc(it.name)+'</b><small>'+U.esc(it.desc||'')+'</small>';
      c.onclick = function(){ play(it); };
      root.appendChild(c);
    });
  }

  function play(item){
    fetchJSON('examples/' + item.id + '.json', function(p){
      if(!NX.store.validate(p)){ alert('Data contoh rusak.'); return; }
      const stage = document.getElementById('pvStage');
      stage.style.display = 'flex';
      document.getElementById('pvTitle').textContent = '🎮 ' + p.name;
      startRun(p);
      document.addEventListener('keydown', esc);
    });
  }
  function startRun(p){
    const canvas = document.getElementById('pvCanvas');
    if(rt){ rt.stop(); rt = null; }
    rt = new NX.Runtime(canvas, U.clone(p), p.scenes[0].id);
    rt.onRestart = function(){ setTimeout(function(){ startRun(p); }, 30); };
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
  }
  function stop(){
    if(rt){ rt.stop(); rt = null; }
    NX.input.setEnabled(false);
    document.getElementById('pvStage').style.display = 'none';
    document.removeEventListener('keydown', esc);
  }
  function esc(e){ if(e.key==='Escape') stop(); }

  document.getElementById('pvStop').onclick = stop;
  document.getElementById('pvRe').onclick = function(){
    if(lastProject) startRun(lastProject);
  };
  let lastProject = null;
  const _origStart = startRun;
  startRun = function(p){ lastProject = p; _origStart(p); };

  fetchJSON('examples/index.json', buildList);
})();
