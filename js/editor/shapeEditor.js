// NEXUS Editor - Sprite editor: gambar piksel sendiri (pensil, isi, garis, kotak, bulat, cermin, undo)
NX.shapeEd = (function(){
  const U = NX.util;
  const PALETTE = ['#ffffff','#9ca3af','#4b5563','#111114','#ef4444','#f97316','#fbbf24','#4ade80','#22c55e','#0ea5e9','#22d3ee','#3b82f6','#8b5cf6','#ec4899','#f8fafc','#7c2d12'];
  let cv, cx, cur = null, tool = 'pen', color = '#22d3ee', mirror = false;
  let cell = 20, ox = 0, oy = 0, drawing = false, startCell = null, snap = null;
  let undoStack = [];

  function sprite(){ return NX.ed.spriteById(NX.ed.S.selSprite); }
  function layout(){
    const sp = sprite(); if(!sp) return;
    const wrap = document.getElementById('spWrap');
    const max = Math.min(wrap.clientWidth - 220, wrap.clientHeight - 40, 560);
    cell = Math.max(8, Math.floor(max / Math.max(sp.size[0], sp.size[1])));
    cv.width = sp.size[0]*cell + 1;
    cv.height = sp.size[1]*cell + 1;
  }
  function draw(){
    const sp = sprite(); if(!sp) return;
    const W = sp.size[0], H = sp.size[1];
    cx.fillStyle = '#191920';
    cx.fillRect(0,0,cv.width,cv.height);
    // checker
    for(let r=0;r<H;r++) for(let c=0;c<W;c++){
      if((r+c)%2===0){ cx.fillStyle = 'rgba(255,255,255,0.03)'; cx.fillRect(ox+c*cell, oy+r*cell, cell, cell); }
    }
    for(let r=0;r<H;r++) for(let c=0;c<W;c++){
      const col = snap ? snap[r][c] : sp.px[r][c];
      if(col){ cx.fillStyle = col; cx.fillRect(ox+c*cell, oy+r*cell, cell, cell); }
    }
    // ghost preview for line/rect/ellipse
    if(snap && startCell){
      // already merged into snap
    }
    cx.strokeStyle = 'rgba(255,255,255,0.10)';
    for(let c=0;c<=W;c++){ cx.beginPath(); cx.moveTo(ox+c*cell+.5, oy); cx.lineTo(ox+c*cell+.5, oy+H*cell); cx.stroke(); }
    for(let r=0;r<=H;r++){ cx.beginPath(); cx.moveTo(ox, oy+r*cell+.5); cx.lineTo(ox+W*cell, oy+r*cell+.5); cx.stroke(); }
    // border every 8 cells
    cx.strokeStyle = 'rgba(255,255,255,0.18)';
    for(let c=0;c<=W;c+=8){ cx.beginPath(); cx.moveTo(ox+c*cell+.5, oy); cx.lineTo(ox+c*cell+.5, oy+H*cell); cx.stroke(); }
  }
  function toCell(e){
    const r = cv.getBoundingClientRect();
    return { c: Math.floor((e.clientX - r.left - ox)/cell), r: Math.floor((e.clientY - r.top - oy)/cell) };
  }
  function pushUndo(){
    const sp = sprite(); if(!sp) return;
    undoStack.push(JSON.stringify(sp.px));
    if(undoStack.length > 40) undoStack.shift();
  }
  function undo(){
    const sp = sprite(); if(!sp || !undoStack.length) return;
    sp.px = JSON.parse(undoStack.pop());
    NX.ed.touch(); draw();
  }
  function inB(sp, c, r){ return c>=0 && r>=0 && c<sp.size[0] && r<sp.size[1]; }
  function put(sp, c, r, erase){
    if(!inB(sp,c,r)) return;
    sp.px[r][c] = erase ? null : color;
    if(mirror){ const mc = sp.size[0]-1-c; if(inB(sp,mc,r)) sp.px[r][mc] = erase ? null : color; }
  }
  function flood(sp, c, r, erase){
    const target = sp.px[r][c];
    const repl = erase ? null : color;
    if(target === repl) return;
    const st = [[c,r]];
    while(st.length){
      const [x,y] = st.pop();
      if(!inB(sp,x,y) || sp.px[y][x] !== target) continue;
      sp.px[y][x] = repl;
      st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    if(mirror){
      // mirror flood
      const mc = sp.size[0]-1-c;
      const t2 = sp.px[r] ? sp.px[r][mc] : null;
      if(t2 !== null && t2 !== undefined && t2 !== repl){
        const st2 = [[mc,r]];
        while(st2.length){
          const [x,y] = st2.pop();
          if(!inB(sp,x,y) || sp.px[y][x] !== t2) continue;
          sp.px[y][x] = repl;
          st2.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
        }
      }
    }
  }
  function lineInto(sp, c0, r0, c1, r1, ghostPx, erase){
    let dx = Math.abs(c1-c0), dy = Math.abs(r1-r0);
    let sx = c0<c1?1:-1, sy = r0<r1?1:-1, err = dx-dy;
    let c = c0, r = r0;
    while(true){
      if(ghostPx) { if(inB(sp,c,r)) ghostPx[r][c] = erase ? null : color; }
      else put(sp, c, r, erase);
      if(c===c1 && r===r1) break;
      const e2 = 2*err;
      if(e2 > -dy){ err -= dy; c += sx; }
      if(e2 < dx){ err += dx; r += sy; }
    }
  }
  function rectInto(sp, c0, r0, c1, r1, ghostPx, erase){
    const a = Math.min(c0,c1), b = Math.max(c0,c1), p = Math.min(r0,r1), q = Math.max(r0,r1);
    for(let c=a;c<=b;c++){ for(const rr of [p,q]){ if(ghostPx){ if(inB(sp,c,rr)) ghostPx[rr][c] = erase?null:color; } else put(sp,c,rr,erase); } }
    for(let r=p;r<=q;r++){ for(const cc of [a,b]){ if(ghostPx){ if(inB(sp,cc,r)) ghostPx[r][cc] = erase?null:color; } else put(sp,cc,r,erase); } }
  }
  function ellipseInto(sp, c0, r0, c1, r1, ghostPx, erase){
    const a = Math.min(c0,c1), b = Math.max(c0,c1), p = Math.min(r0,r1), q = Math.max(r0,r1);
    const mx = (a+b)/2, my = (p+q)/2, rx = (b-a)/2 || .5, ry = (q-p)/2 || .5;
    for(let r=p;r<=q;r++) for(let c=a;c<=b;c++){
      const v = ((c-mx)/rx)*((c-mx)/rx) + ((r-my)/ry)*((r-my)/ry);
      if(v <= 1 && v > 0.55){ if(ghostPx){ if(inB(sp,c,r)) ghostPx[r][c] = erase?null:color; } else put(sp,c,r,erase); }
    }
  }
  function onDown(e){
    const sp = sprite(); if(!sp) return;
    if(e.button===2){ tool = 'eraser'; syncTools(); }
    const p = toCell(e);
    if(!inB(sp, p.c, p.r)) return;
    pushUndo();
    drawing = true;
    startCell = p;
    if(tool==='pen' || tool==='eraser'){ put(sp, p.c, p.r, tool==='eraser'); draw(); }
    else if(tool==='fill'){ flood(sp, p.c, p.r, e.button===2); NX.ed.touch(); draw(); drawing=false; }
    else { snap = JSON.parse(JSON.stringify(sp.px)); }
    e.preventDefault();
  }
  function onMove(e){
    if(!drawing) return;
    const sp = sprite(); if(!sp) return;
    const p = toCell(e);
    if(tool==='pen' || tool==='eraser'){ put(sp, p.c, p.r, tool==='eraser'); draw(); }
    else if(startCell && snap){
      const ghost = JSON.parse(JSON.stringify(sp.px));
      if(tool==='line') lineInto(sp, startCell.c, startCell.r, p.c, p.r, ghost, false);
      if(tool==='rect') rectInto(sp, startCell.c, startCell.r, p.c, p.r, ghost, false);
      if(tool==='ellipse') ellipseInto(sp, startCell.c, startCell.r, p.c, p.r, ghost, false);
      // render base + ghost
      const keep = sp.px; sp.px = ghost;
      draw();
      sp.px = keep;
    }
  }
  function onUp(){
    if(!drawing) return;
    drawing = false;
    const sp = sprite(); if(!sp) return;
    if(snap && startCell){
      const p = { c: lastCell ? lastCell.c : startCell.c, r: lastCell ? lastCell.r : startCell.r };
      if(tool==='line') lineInto(sp, startCell.c, startCell.r, p.c, p.r, null, false);
      if(tool==='rect') rectInto(sp, startCell.c, startCell.r, p.c, p.r, null, false);
      if(tool==='ellipse') ellipseInto(sp, startCell.c, startCell.r, p.c, p.r, null, false);
      snap = null;
    }
    startCell = null;
    NX.ed.touch();
    draw();
  }
  let lastCell = null;
  function init(){
    cv = document.getElementById('spCanvas');
    cx = cv.getContext('2d');
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', function(e){ lastCell = toCell(e); onMove(e); });
    window.addEventListener('pointerup', onUp);
    document.getElementById('spUndo').onclick = undo;
    document.getElementById('spClear').onclick = function(){
      const sp = sprite(); if(!sp) return;
      pushUndo();
      for(let r=0;r<sp.size[1];r++) for(let c=0;c<sp.size[0];c++) sp.px[r][c] = null;
      NX.ed.touch(); draw();
    };
    document.getElementById('spSave').onclick = function(){
      NX.ed.touch(); NX.ed.toast('Sprite tersimpan ke proyek'); NX.ed.setTab('stage');
    };
    document.getElementById('spMirror').onchange = function(){ mirror = this.checked; };
    document.getElementById('spColor').oninput = function(){ color = this.value; markPicked(); };
    // palette
    const pal = document.getElementById('spPal');
    PALETTE.forEach(c => {
      const b = U.el('button','swatch');
      b.style.background = c;
      b.dataset.c = c;
      b.onclick = function(){ color = c; document.getElementById('spColor').value = c; markPicked(); };
      pal.appendChild(b);
    });
    // tools
    const tools = [['pen','🖊','Pensil'],['eraser','🧽','Hapus'],['fill','🪣','Isi'],['line','📏','Garis'],['rect','⬜','Kotak'],['ellipse','⚪','Bulat']];
    const tb = document.getElementById('spTools');
    tools.forEach(t => {
      const b = U.el('button','btn sm tbtn');
      b.innerHTML = t[1] + '<small>' + t[2] + '</small>';
      b.title = t[2];
      b.dataset.tool = t[0];
      b.onclick = function(){ tool = t[0]; syncTools(); };
      tb.appendChild(b);
    });
    document.getElementById('spQuick').onchange = function(){
      const sp = sprite(); if(!sp || !this.value) return;
      pushUndo();
      for(let r=0;r<sp.size[1];r++) for(let c=0;c<sp.size[0];c++) sp.px[r][c] = null;
      const m = Math.floor(Math.min(sp.size[0], sp.size[1]) * 0.8);
      const c0 = Math.floor((sp.size[0]-m)/2), r0 = Math.floor((sp.size[1]-m)/2);
      const c1 = c0+m-1, r1 = r0+m-1;
      const v = this.value;
      if(v==='box') rectInto(sp, c0, r0, c1, r1, null, false);
      if(v==='ball') ellipseInto(sp, c0, r0, c1, r1, null, false);
      if(v==='tri'){ for(let r=0;r<=m-1;r++){ const half = Math.round((r+1)/2); for(let c=m/2-half; c<=m/2+half; c++){ if(inB(sp,c,r0+r)) put(sp,c,r0+r,false); } } }
      this.value = '';
      NX.ed.touch(); draw();
    };
    markPicked();
  }
  function syncTools(){
    document.querySelectorAll('#spTools .tbtn').forEach(b => b.classList.toggle('on', b.dataset.tool===tool));
  }
  function markPicked(){
    document.querySelectorAll('#spPal .swatch').forEach(b => b.classList.toggle('on', b.dataset.c===color));
  }
  function refresh(){
    const sp = sprite();
    const name = document.getElementById('spName');
    name.textContent = sp ? ('🖼 ' + sp.name + '  (' + sp.size[0] + '×' + sp.size[1] + ')') : '— pilih / buat sprite di panel kiri —';
    document.getElementById('spEditor').style.display = sp ? '' : 'none';
    if(sp){ layout(); draw(); }
  }
  return { init, refresh };
})();
