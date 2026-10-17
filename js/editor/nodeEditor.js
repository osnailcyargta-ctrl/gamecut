// NEXUS Editor - Node Graph editor (Blueprint-style): pan/zoom, wires, drag, menus, selection
NX.nodeEd = (function(){
  const U = NX.util;
  const S = () => NX.ed.S;
  const view = { x: 60, y: 40, z: 1 };
  let canvas, world, svg, selBox, menuEl = null;
  let sel = new Set();
  let mode = null;          // drag | box | link | pan
  let dragInfo = null;
  let boxInfo = null;
  let linkInfo = null;
  let panInfo = null;
  let tmpPath = null;
  let selfEdit = false;

  // ---------- helpers ----------
  function graph(){ return NX.ed.currentGraph(); }
  function defOf(type){ return NX.defOf(type, S().project); }
  function nodeById(id){ const g = graph(); return g ? (g.nodes||[]).find(n=>n.id===id) : null; }
  function clearSel(){ sel.clear(); paintSel(); }
  function paintSel(){
    if(!world) return;
    world.querySelectorAll('.ngnode').forEach(el => {
      el.classList.toggle('sel', sel.has(el.dataset.id));
    });
  }

  // ---------- coordinates ----------
  function applyView(){
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')';
    document.getElementById('ngZoomLbl').textContent = Math.round(view.z*100) + '%';
  }
  function toWorld(cx, cy){
    const r = canvas.getBoundingClientRect();
    return { x: (cx - r.left - view.x)/view.z, y: (cy - r.top - view.y)/view.z };
  }
  function portPos(nodeId, port, io){
    const el = world.querySelector('.port[data-node="'+nodeId+'"][data-port="'+port+'"][data-io="'+io+'"]');
    if(!el) return null;
    const pr = el.getBoundingClientRect();
    const wr = world.getBoundingClientRect();
    return { x: (pr.left + pr.width/2 - wr.left)/view.z, y: (pr.top + pr.height/2 - wr.top)/view.z };
  }
  function wirePath(a, b){
    const dx = Math.max(46, Math.abs(b.x-a.x)*0.5);
    return 'M ' + a.x + ' ' + a.y + ' C ' + (a.x+dx) + ' ' + a.y + ', ' + (b.x-dx) + ' ' + b.y + ', ' + b.x + ' ' + b.y;
  }

  // ---------- build ----------
  function renderCrumb(){
    const cr = document.getElementById('ngCrumb');
    const sc = NX.ed.scriptById(S().scriptId);
    let h = '';
    if(S().groupStack.length){
      h += '<button id="ngBack" class="btn sm">◀ Keluar</button><span class="crumbpath">';
      h += '<span class="crumb">'+U.esc(sc?sc.name:'?')+'</span>';
      S().groupStack.forEach(gid => {
        const g = NX.ed.groupById(gid);
        h += ' <b>▸</b> <span class="crumb on">🎶 '+U.esc(g?g.name:'?')+'</span>';
      });
      h += '</span>';
    } else {
      h += '<span class="crumbpath"><span class="crumb on">📜 '+U.esc(sc?sc.name:'—')+'</span></span>';
    }
    cr.innerHTML = h;
    const back = document.getElementById('ngBack');
    if(back) back.onclick = function(){ NX.ed.closeGroup(); };
  }
  function buildNode(n){
    const def = defOf(n.type);
    if(!def){
      const el = U.el('div','ngnode broken');
      el.dataset.id = n.id;
      el.innerHTML = '<div class="nghead" style="background:#7f1d1d">Node tidak dikenal</div>';
      return el;
    }
    const cat = NX.CATS[def.k] || NX.CATS.da;
    const el = U.el('div', 'ngnode k-'+def.k + (n.type.indexOf('grp:')===0 ? ' isgroup' : ''));
    el.dataset.id = n.id;
    el.style.left = (n.x||0) + 'px';
    el.style.top  = (n.y||0) + 'px';

    let h = '<div class="nghead" style="background:'+cat.c+'">'+U.esc(def.ti);
    if(n.type.indexOf('grp:')===0) h += ' <span class="grpedit">✎ isi</span>';
    h += '</div>';
    h += '<div class="ngbody">';
    if(def.ein) h += '<div class="nrow execin"><span class="port pexec" data-node="'+n.id+'" data-port="in" data-io="in" data-kind="exec"></span><span class="nlbl dim">jalankan</span></div>';
    (def.in||[]).forEach(ip => {
      h += '<div class="nrow"><span class="port pdata tin-'+ip.t+'" data-node="'+n.id+'" data-port="'+ip.n+'" data-io="in" data-kind="data" data-t="'+ip.t+'"></span>'+
           '<span class="nlbl">'+U.esc(ip.n)+'</span>'+
           '<span class="nwid">'+widget(ip, n)+'</span></div>';
    });
    h += '<div class="ndiv"></div>';
    (def.ex||[]).forEach(po => {
      h += '<div class="nrow execout"><span class="nlbl">'+U.esc(po==='out'?'lanjut':po)+'</span>'+
           '<span class="port pexec" data-node="'+n.id+'" data-port="'+po+'" data-io="out" data-kind="exec"></span></div>';
    });
    (def.out||[]).forEach(op => {
      h += '<div class="nrow"><span class="nlbl">'+U.esc(op.n)+'</span>'+
           '<span class="port pdata tout-'+op.t+'" data-node="'+n.id+'" data-port="'+op.n+'" data-io="out" data-kind="data" data-t="'+op.t+'"></span></div>';
    });
    h += '</div>';
    el.innerHTML = h;

    // widget events
    el.querySelectorAll('.nwid [data-wname]').forEach(w => {
      const name = w.dataset.wname;
      const apply = function(){
        n.props = n.props || {};
        n.props[name] = w.type==='checkbox' ? (w.checked?1:0) : w.value;
        selfEdit = true; NX.ed.touch(); selfEdit = false;
      };
      if(w.tagName==='SELECT' || w.type==='color') w.addEventListener('change', apply);
      else w.addEventListener('change', apply);
    });
    return el;
  }
  function widget(ip, n){
    const val = (n.props && n.props[ip.n] !== undefined) ? n.props[ip.n] : ip.d;
    const linked = linkInto(n.id, ip.n);
    const attrs = 'data-wname="'+ip.n+'"';
    let inner = '';
    switch(ip.w){
      case 'num': inner = '<input class="w fld" type="number" step="any" value="'+U.num(val,0)+'" '+attrs+'>'; break;
      case 'txt': inner = '<input class="w fld" value="'+U.esc(val==null?'':val)+'" '+attrs+'>'; break;
      case 'key': inner = '<select class="w fld" '+attrs+'>'+NX.KEYS.map(k=>'<option value="'+k+'"'+(val===k?' selected':'')+'>'+U.esc(NX.KEYLABEL[k]||k)+'</option>').join('')+'</select>'; break;
      case 'sound': inner = '<select class="w fld" '+attrs+'>'+NX.SOUNDS.map(s=>'<option value="'+s+'"'+(val===s?' selected':'')+'>'+s+'</option>').join('')+'</select>'; break;
      case 'op': case 'op1': case 'cmp': case 'logic': case 'prop':
        inner = '<select class="w fld" '+attrs+'>'+NX.OPTS[ip.w==='op1'?'op1':ip.w].map(o=>'<option value="'+U.esc(o)+'"'+(val===o?' selected':'')+'>'+U.esc(o)+'</option>').join('')+'</select>'; break;
      case 'color': inner = '<input class="w fld col" type="color" value="'+U.hex(val)+'" '+attrs+'>'; break;
      case 'bool': case 'chk': inner = '<select class="w fld" '+attrs+'><option value="1"'+(val==1?' selected':'')+'>ya</option><option value="0"'+(val!=1?' selected':'')+'>tidak</option></select>'; break;
      case 'prefab': {
        const pfs = S().project.prefabs.map(p=>'<option value="'+U.esc(p.name)+'"'+(val===p.name?' selected':'')+'>'+U.esc(p.name)+'</option>').join('');
        inner = '<select class="w fld" '+attrs+'>'+(pfs||'<option value="">(belum ada prefab)</option>')+'</select>'; break;
      }
      case 'varname': {
        const vs = NX.ed.curScene().variables.map(v=>v.name);
        inner = '<input class="w fld" list="vlist" value="'+U.esc(val==null?'':val)+'" '+attrs+'>';
        if(!document.getElementById('vlist')){
          const dl = U.el('datalist'); dl.id='vlist';
          dl.innerHTML = vs.map(v=>'<option value="'+U.esc(v)+'">').join('');
          document.body.appendChild(dl);
        }
        const dl = document.getElementById('vlist');
        dl.innerHTML = vs.map(v=>'<option value="'+U.esc(v)+'">').join('');
        break;
      }
      case 'target': {
        const opts = [['self','Self'],['other','Other']];
        NX.ed.curScene().entities.forEach(e => opts.push(['name:'+e.name, U.esc(e.name)]));
        const tags = collectTags();
        tags.forEach(t => opts.push(['tag:'+t, '#'+t]));
        const sv = val==null?'self':String(val);
        inner = '<select class="w fld" '+attrs+'>'+opts.map(o=>'<option value="'+U.esc(o[0])+'"'+(sv===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
        break;
      }
      case 'coll': {
        const opts = [['any','apa pun'],['self','self']];
        NX.ed.curScene().entities.forEach(e => opts.push(['name:'+e.name, U.esc(e.name)]));
        collectTags().forEach(t => opts.push(['tag:'+t, '#'+t]));
        const sv = val==null?'any':String(val);
        inner = '<select class="w fld" '+attrs+'>'+opts.map(o=>'<option value="'+U.esc(o[0])+'"'+(sv===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
        break;
      }
      default: inner = '<input class="w fld" value="'+U.esc(val==null?'':val)+'" '+attrs+'>';
    }
    return linked ? '<span class="wired">'+inner+'</span>' : inner;
  }
  function collectTags(){
    const t = new Set();
    NX.ed.curScene().entities.forEach(e => (e.tags||[]).forEach(x => t.add(x)));
    S().project.prefabs.forEach(p => (p.def.tags||[]).forEach(x => t.add(x)));
    return Array.from(t);
  }
  function linkInto(nodeId, inName){
    const g = graph(); if(!g) return null;
    return (g.links||[]).find(l => l.to[0]===nodeId && l.to[1]===inName) || null;
  }

  // ---------- wires ----------
  function drawWires(){
    const g = graph(); if(!g || !svg) return;
    let h = '';
    (g.links||[]).forEach(l => {
      const isExec = l.from[1]==='out'||l.from[1]==='Benar'||l.from[1]==='Salah'||l.from[1]==='Badan'||l.from[1]==='Selesai';
      const a = isExec ? portPos(l.from[0], l.from[1], 'out') : portPos(l.from[0], l.from[1], 'out');
      const b = portPos(l.to[0], l.to[1], 'in');
      if(!a || !b) return;
      let color = NX.TCOL.exec, wdt = 3;
      if(!isExec){
        const fn = nodeById(l.from[0]);
        const d = fn && defOf(fn.type);
        const op = d && d.out ? d.out.find(o=>o.n===l.from[1]) : null;
        color = NX.TCOL[(op&&op.t)] || NX.TCOL.any;
        wdt = 2.4;
      }
      const dd = 'path d="'+wirePath(a,b)+'" fill="none" stroke="'+color+'" stroke-width="'+wdt+'" class="wire"';
      h += '<'+dd+'></path><path d="'+wirePath(a,b)+'" fill="none" stroke="transparent" stroke-width="14" class="wirehit" data-lid="'+l.id+'"></path>';
    });
    h += '<path id="tmpWire" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-dasharray="6 5" style="display:none"></path>';
    svg.innerHTML = h;
    tmpPath = document.getElementById('tmpWire');
  }

  // ---------- full render ----------
  function renderGraph(){
    const g = graph();
    if(!g){ return; }
    renderCrumb();
    // rebuild nodes layer (preserve if only self edits)
    world.querySelectorAll('.ngnode').forEach(el => el.remove());
    const frag = document.createDocumentFragment();
    (g.nodes||[]).forEach(n => frag.appendChild(buildNode(n)));
    world.appendChild(frag);
    drawWires();
    paintSel();
    const empty = document.getElementById('ngEmpty');
    empty.style.display = (g.nodes||[]).length ? 'none' : '';
  }

  // ---------- interactions ----------
  function addNodeAt(type, wx, wy){
    const g = graph(); if(!g) return;
    const def = defOf(type); if(!def) return;
    if(!wx){ wx = Math.round((canvas.clientWidth/2 - view.x)/view.z - 90); wy = Math.round((canvas.clientHeight/2 - view.y)/view.z - 60); }
    const props = {};
    (def.in||[]).forEach(ip => props[ip.n] = ip.d);
    const n = { id: U.uid('n'), type, x: Math.round((wx||200)/10)*10, y: Math.round((wy||200)/10)*10, props };
    g.nodes.push(n);
    NX.ed.touch();
    renderGraph();
  }
  function addLink(from, to){
    const g = graph(); if(!g) return false;
    if(from[0]===to[0]) return false;
    // validate kinds via port elements
    const pFromEl = world.querySelector('.port[data-node="'+from[0]+'"][data-port="'+from[1]+'"][data-io="out"]');
    const pToEl = world.querySelector('.port[data-node="'+to[0]+'"][data-port="'+to[1]+'"][data-io="in"]');
    if(!pFromEl || !pToEl) return false;
    if(pFromEl.dataset.kind !== pToEl.dataset.kind) return false;
    if(pFromEl.dataset.kind==='data'){
      const outT = pFromEl.dataset.t, inT = pToEl.dataset.t;
      if(outT!==inT && outT!=='any' && inT!=='any' && !(outT==='num'&&inT==='any')) return false;
    }
    // replace existing link into this input
    g.links = g.links.filter(l => !(l.to[0]===to[0] && l.to[1]===to[1]));
    g.links.push({ id: U.uid('l'), from, to });
    NX.ed.touch();
    drawWires();
    // refresh widgets of that node (linked styling)
    renderGraph();
    return true;
  }
  function isDataPort(pair){
    const el = world.querySelector('.port[data-node="'+pair[0]+'"][data-port="'+pair[1]+'"][data-io="in"]');
    return el && el.dataset.kind==='data';
  }
  function deleteSelection(){
    const g = graph(); if(!g || !sel.size) return;
    g.nodes = g.nodes.filter(n => !sel.has(n.id));
    g.links = g.links.filter(l => !sel.has(l.from[0]) && !sel.has(l.to[0]));
    clearSel();
    NX.ed.touch();
    renderGraph();
  }
  function duplicateSelection(){
    const g = graph(); if(!g || !sel.size) return;
    const map = {};
    const clones = [];
    sel.forEach(id => {
      const n = nodeById(id); if(!n) return;
      const c = U.clone(n); c.id = U.uid('n'); c.x += 36; c.y += 36;
      map[id] = c.id; clones.push(c);
    });
    const newLinks = [];
    (g.links||[]).forEach(l => {
      if(map[l.from[0]] && map[l.to[0]]) newLinks.push({ id:U.uid('l'), from:[map[l.from[0]],l.from[1]], to:[map[l.to[0]],l.to[1]] });
    });
    clones.forEach(c => g.nodes.push(c));
    newLinks.forEach(l => g.links.push(l));
    sel = new Set(clones.map(c=>c.id));
    NX.ed.touch();
    renderGraph();
  }

  // add-node menu
  function openMenu(cx, cy, wx, wy){
    closeMenu();
    menuEl = U.el('div','ngmenu');
    menuEl.style.left = Math.min(cx, window.innerWidth-260) + 'px';
    menuEl.style.top  = Math.min(cy, window.innerHeight-380) + 'px';
    let h = '<input id="ngSearch" class="fld" placeholder="Cari node...">';
    let items = '';
    ['ev','fl','ac','da'].forEach(k => {
      Object.keys(NX.DEFS).forEach(t => {
        const d = NX.DEFS[t];
        if(d.k !== k) return;
        items += '<div class="ngmi" data-type="'+t+'" data-txt="'+U.esc((d.ti+' '+t).toLowerCase())+'">'+
          '<span class="dot" style="background:'+NX.CATS[k].c+'"></span>'+U.esc(d.ti)+'</div>';
      });
    });
    // playlist group instances
    (S().project.groups||[]).forEach(gd => {
      const blocked = S().groupStack.indexOf(gd.id)>=0;
      if(blocked) return;
      items += '<div class="ngmi grp" data-type="grp:'+gd.id+'" data-txt="'+U.esc(('playlist '+gd.name).toLowerCase())+'">'+
        '<span class="dot" style="background:#a78bfa"></span>🎶 '+U.esc(gd.name)+'</div>';
    });
    h += '<div class="ngmenu-list">'+items+'</div>';
    menuEl.innerHTML = h;
    document.body.appendChild(menuEl);
    menuEl.addEventListener('pointerdown', e => e.stopPropagation());
    menuEl.querySelectorAll('.ngmi').forEach(mi => {
      mi.onclick = function(){ addNodeAt(mi.dataset.type, wx, wy); closeMenu(); };
    });
    const si = document.getElementById('ngSearch');
    si.oninput = function(){
      const q = this.value.toLowerCase();
      menuEl.querySelectorAll('.ngmi').forEach(mi => {
        mi.style.display = mi.dataset.txt.indexOf(q)>=0 ? '' : 'none';
      });
    };
    setTimeout(()=>si.focus(), 30);
  }
  function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl=null; } }

  // ---------- pointer logic ----------
  function onDown(e){
    closeMenu();
    if(e.button === 2){ // right click: menu
      const w = toWorld(e.clientX, e.clientY);
      openMenu(e.clientX, e.clientY, w.x, w.y);
      return;
    }
    const portEl = e.target.closest('.port');
    if(portEl && e.button===0){ startLink(portEl, e); return; }
    const nodeEl = e.target.closest('.ngnode');
    if(nodeEl && e.button===0){
      const id = nodeEl.dataset.id;
      const t = e.target;
      if(t.tagName==='INPUT' || t.tagName==='SELECT') return; // let widgets work
      if(e.detail === 2){ // dblclick
        const n = nodeById(id);
        if(n && n.type.indexOf('grp:')===0){ NX.ed.openGroup(n.type.slice(4)); return; }
      }
      if(!sel.has(id)){
        if(!e.shiftKey) sel.clear();
        sel.add(id);
        paintSel();
      }
      const w = toWorld(e.clientX, e.clientY);
      const moving = [];
      sel.forEach(sid => { const nn = nodeById(sid); if(nn) moving.push({ n: nn, ox: nn.x, oy: nn.y }); });
      mode='drag'; dragInfo = { sx:w.x, sy:w.y, moving };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    // background
    const w = toWorld(e.clientX, e.clientY);
    if(e.button===1 || spaceHeld){
      mode='pan'; panInfo = { sx:e.clientX, sy:e.clientY, ox:view.x, oy:view.y };
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if(e.button===0){
      mode='box'; boxInfo = { sx:w.x, sy:w.y, ex:w.x, ey:w.y, add: e.shiftKey };
      selBox.style.display='block';
      updateSelBox();
      canvas.setPointerCapture(e.pointerId);
    }
  }
  function startLink(portEl, e){
    const io = portEl.dataset.io;
    const nodeId = portEl.dataset.node, port = portEl.dataset.port;
    let from = null;
    if(io==='out'){ from = [nodeId, port]; }
    else {
      const l = linkInto(nodeId, port);
      const g = graph();
      if(l){ g.links = g.links.filter(x=>x.id!==l.id); NX.ed.touch(); drawWires(); from = l.from; }
      else return;
    }
    mode='link'; linkInfo = { from };
    if(tmpPath){
      const a = portPos(from[0], from[1], 'out');
      if(a){ tmpPath.style.display=''; tmpPath.setAttribute('d', wirePath(a, a)); }
    }
    svg.style.pointerEvents = 'none';
    canvas.setPointerCapture(e.pointerId);
  }
  function onMove(e){
    if(mode==='drag' && dragInfo){
      const w = toWorld(e.clientX, e.clientY);
      const dx = w.x - dragInfo.sx, dy = w.y - dragInfo.sy;
      dragInfo.moving.forEach(m => {
        m.n.x = Math.round((m.ox+dx)/5)*5; m.n.y = Math.round((m.oy+dy)/5)*5;
        const el = world.querySelector('.ngnode[data-id="'+m.n.id+'"]');
        if(el){ el.style.left = m.n.x+'px'; el.style.top = m.n.y+'px'; }
      });
      drawWires();
      return;
    }
    if(mode==='pan' && panInfo){
      view.x = panInfo.ox + (e.clientX - panInfo.sx);
      view.y = panInfo.oy + (e.clientY - panInfo.sy);
      applyView();
      return;
    }
    if(mode==='box' && boxInfo){
      const w = toWorld(e.clientX, e.clientY);
      boxInfo.ex = w.x; boxInfo.ey = w.y;
      updateSelBox();
      return;
    }
    if(mode==='link' && linkInfo && tmpPath){
      const w = toWorld(e.clientX, e.clientY);
      const a = portPos(linkInfo.from[0], linkInfo.from[1], 'out') || w;
      tmpPath.setAttribute('d', wirePath(a, w));
    }
  }
  function onUp(e){
    if(mode==='drag' && dragInfo){
      NX.ed.touch(); mode=null; dragInfo=null; return;
    }
    if(mode==='pan'){ mode=null; panInfo=null; return; }
    if(mode==='box' && boxInfo){
      const x1 = Math.min(boxInfo.sx, boxInfo.ex), x2 = Math.max(boxInfo.sx, boxInfo.ex);
      const y1 = Math.min(boxInfo.sy, boxInfo.ey), y2 = Math.max(boxInfo.sy, boxInfo.ey);
      const hits = new Set();
      world.querySelectorAll('.ngnode').forEach(el => {
        const nx = parseFloat(el.style.left), ny = parseFloat(el.style.top);
        const nw = el.offsetWidth, nh = el.offsetHeight;
        if(nx < x2 && nx+nw > x1 && ny < y2 && ny+nh > y1) hits.add(el.dataset.id);
      });
      if(!boxInfo.add) sel.clear();
      hits.forEach(h => sel.add(h));
      boxInfo = null; selBox.style.display='none'; mode=null;
      paintSel();
      return;
    }
    if(mode==='link' && linkInfo){
      svg.style.pointerEvents = '';
      if(tmpPath) tmpPath.style.display='none';
      const elBelow = document.elementFromPoint(e.clientX, e.clientY);
      const portEl = elBelow && elBelow.closest ? elBelow.closest('.port') : null;
      if(portEl && portEl.dataset.io==='in'){
        addLink(linkInfo.from, [portEl.dataset.node, portEl.dataset.port]);
      }
      mode=null; linkInfo=null;
    }
  }
  function updateSelBox(){
    const x = Math.min(boxInfo.sx, boxInfo.ex), y = Math.min(boxInfo.sy, boxInfo.ey);
    const w = Math.abs(boxInfo.ex-boxInfo.sx), h = Math.abs(boxInfo.ey-boxInfo.sy);
    selBox.style.left = (x*view.z + view.x) + 'px';
    selBox.style.top  = (y*view.z + view.y) + 'px';
    selBox.style.width = (w*view.z) + 'px';
    selBox.style.height = (h*view.z) + 'px';
  }
  function onWheel(e){
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const nz = U.clamp(view.z * (e.deltaY<0 ? 1.12 : 0.89), 0.28, 1.7);
    view.x = mx - (mx - view.x) * (nz/view.z);
    view.y = my - (my - view.y) * (nz/view.z);
    view.z = nz;
    applyView();
    drawWires();
  }
  let spaceHeld = false;
  function onKey(e){
    const inField = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if(e.code==='Space' && !inField && S().tab==='node'){ spaceHeld = e.type==='keydown'; }
    if(e.type!=='keydown' || inField || S().tab!=='node') return;
    if(e.key==='Delete' || e.key==='Backspace'){
      if(sel.size){ e.preventDefault(); deleteSelection(); }
    } else if(e.key==='g' && (e.ctrlKey||e.metaKey)){
      e.preventDefault();
      if(sel.size) NX.groups.createDialog(Array.from(sel));
    } else if(e.key==='d' && (e.ctrlKey||e.metaKey)){
      e.preventDefault(); duplicateSelection();
    } else if(e.key==='Escape'){
      if(S().groupStack.length) NX.ed.closeGroup();
      else clearSel();
    }
  }
  function fitView(){
    const g = graph(); if(!g || !(g.nodes||[]).length){ view.x=60; view.y=40; view.z=1; applyView(); return; }
    let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
    world.querySelectorAll('.ngnode').forEach(el => {
      const nx = parseFloat(el.style.left), ny = parseFloat(el.style.top);
      x1=Math.min(x1,nx); y1=Math.min(y1,ny);
      x2=Math.max(x2,nx+el.offsetWidth); y2=Math.max(y2,ny+el.offsetHeight);
    });
    const cw = canvas.clientWidth - 60, ch = canvas.clientHeight - 60;
    const z = U.clamp(Math.min(cw/(x2-x1+80), ch/(y2-y1+80)), 0.28, 1.2);
    view.z = z;
    view.x = 30 - x1*z + 20;
    view.y = 30 - y1*z + 20;
    applyView();
  }

  // ---------- init ----------
  function init(){
    canvas = document.getElementById('ngCanvas');
    world  = document.getElementById('ngWorld');
    svg    = document.getElementById('ngWires');
    selBox = document.getElementById('ngSelBox');
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive:false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    document.addEventListener('pointerdown', function(e){ if(menuEl && !menuEl.contains(e.target)) closeMenu(); }, true);
    // wire delete
    svg.addEventListener('click', function(e){
      const hit = e.target.closest('.wirehit');
      if(!hit) return;
      const g = graph(); if(!g) return;
      g.links = g.links.filter(l => l.id !== hit.dataset.lid);
      NX.ed.touch();
      drawWires();
      NX.ed.toast('Sambungan dihapus');
    });
    document.getElementById('ngAdd').onclick = function(){
      openMenu(canvas.getBoundingClientRect().left + 40, canvas.getBoundingClientRect().top + 30);
    };
    document.getElementById('ngFit').onclick = fitView;
    document.getElementById('ngZoomIn').onclick = function(){ view.z = U.clamp(view.z*1.15, .28, 1.7); applyView(); drawWires(); };
    document.getElementById('ngZoomOut').onclick = function(){ view.z = U.clamp(view.z/1.15, .28, 1.7); applyView(); drawWires(); };
    document.getElementById('ngGroup').onclick = function(){
      if(sel.size) NX.groups.createDialog(Array.from(sel));
      else NX.ed.toast('Seleksi dulu beberapa node (tarik kotak)');
    };
    document.getElementById('ngDel').onclick = deleteSelection;
    NX.ed.onChange(function(){
      if(selfEdit) return;
      if(NX.ed.S.tab === 'node' && document.activeElement && world.contains(document.activeElement)) return;
      if(NX.ed.S.tab === 'node') renderGraph();
    });
  }
  function refresh(){
    renderGraph();
    fitView();
  }
  return { init, refresh, renderGraph, addNodeAt, clearSel, fitView };
})();
