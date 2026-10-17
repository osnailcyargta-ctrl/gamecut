// NEXUS Editor - Stage tab: scene preview, entity drag/select, grid & snap
NX.stage = (function(){
  const U = NX.util;
  let cv, cx, scale = 1, offX = 0, offY = 0, dragging = null;

  function fit(){
    const sc = NX.ed.curScene(); if(!sc) return;
    const W = NX.util.num(NX.ed.S.project.settings.w, 960);
    const H = NX.util.num(NX.ed.S.project.settings.h, 540);
    cv.width = W; cv.height = H;
    const wrap = cv.parentElement;
    const aw = wrap.clientWidth - 24, ah = wrap.clientHeight - 24;
    scale = Math.min(aw/W, ah/H, 1.5);
    cv.style.width  = Math.floor(W*scale) + 'px';
    cv.style.height = Math.floor(H*scale) + 'px';
  }
  function toGame(e){
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left)/scale, y: (e.clientY - r.top)/scale };
  }
  function draw(){
    const sc = NX.ed.curScene(); if(!sc) return;
    const W = cv.width, H = cv.height;
    cx.fillStyle = sc.bg || '#101014';
    cx.fillRect(0,0,W,H);
    // grid
    cx.strokeStyle = 'rgba(255,255,255,0.05)';
    cx.lineWidth = 1;
    for(let x=0;x<=W;x+=20){ cx.beginPath(); cx.moveTo(x+.5,0); cx.lineTo(x+.5,H); cx.stroke(); }
    for(let y=0;y<=H;y+=20){ cx.beginPath(); cx.moveTo(0,y+.5); cx.lineTo(W,y+.5); cx.stroke(); }
    // border
    cx.strokeStyle = 'rgba(255,255,255,0.12)';
    cx.strokeRect(.5,.5,W-1,H-1);
    // entities
    const prj = NX.ed.S.project;
    sc.entities.slice().sort((a,b)=>(a.z||0)-(b.z||0)).forEach(e => {
      const fake = { shape:e.shape, w:e.w, h:e.h, rot:e.rot, x:0, y:0 };
      cx.save(); cx.translate(e.x, e.y);
      if(e.rot) cx.rotate((e.rot||0)*Math.PI/180);
      const s = e.shape||{};
      if(s.t==='text'){
        cx.fillStyle = U.hex(s.color);
        cx.textAlign='center'; cx.textBaseline='middle';
        cx.font = '700 ' + U.num(s.fs,24) + 'px system-ui, sans-serif';
        cx.fillText(s.text==null?'':String(s.text), 0, 0);
      } else if(s.t==='circle'){
        cx.fillStyle = U.hex(s.color);
        cx.beginPath(); cx.ellipse(0,0,Math.max(1,e.w/2),Math.max(1,e.h/2),0,0,Math.PI*2); cx.fill();
      } else if(s.t==='sprite' && s.sprite){
        const sp = NX.ed.spriteById(s.sprite);
        if(sp){
          const cols = sp.size[0], rows = sp.size[1], sx = e.w/cols, sy = e.h/rows;
          cx.imageSmoothingEnabled = false;
          for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
            if(sp.px[r][c]){ cx.fillStyle = sp.px[r][c]; cx.fillRect(-e.w/2+c*sx, -e.h/2+r*sy, sx+.5, sy+.5); }
          }
        } else { cx.fillStyle='#555'; cx.fillRect(-e.w/2,-e.h/2,e.w,e.h); }
      } else {
        cx.fillStyle = U.hex(s.color);
        cx.fillRect(-e.w/2,-e.h/2,e.w,e.h);
      }
      cx.restore();
      if(NX.ed.S.selEnt === e.id){
        cx.strokeStyle = '#22d3ee'; cx.lineWidth = 2;
        cx.setLineDash([5,4]);
        cx.strokeRect(e.x-e.w/2-4, e.y-e.h/2-4, e.w+8, e.h+8);
        cx.setLineDash([]);
      }
    });
  }
  function pick(p){
    const sc = NX.ed.curScene(); if(!sc) return null;
    let best = null;
    sc.entities.forEach(e => {
      if(Math.abs(p.x-e.x) <= e.w/2+3 && Math.abs(p.y-e.y) <= e.h/2+3){
        if(!best || (e.z||0) >= (best.z||0)) best = e;
      }
    });
    return best;
  }
  function init(){
    cv = document.getElementById('stageCanvas');
    cx = cv.getContext('2d');
    cv.addEventListener('pointerdown', function(e){
      const p = toGame(e);
      const ent = pick(p);
      NX.ed.S.selEnt = ent ? ent.id : null;
      if(ent){
        dragging = { id: ent.id, dx: p.x - ent.x, dy: p.y - ent.y };
        cv.setPointerCapture(e.pointerId);
      }
      NX.ed.emit();
      draw();
    });
    cv.addEventListener('pointermove', function(e){
      if(!dragging) return;
      const ent = NX.ed.entById(dragging.id); if(!ent) return;
      const p = toGame(e);
      let nx = p.x - dragging.dx, ny = p.y - dragging.dy;
      if(NX.ed.S.snap){ nx = Math.round(nx/20)*20; ny = Math.round(ny/20)*20; }
      ent.x = Math.round(nx); ent.y = Math.round(ny);
      draw();
      NX.ed.emit();
    });
    cv.addEventListener('pointerup', function(){ if(dragging){ dragging=null; NX.ed.touch(); } });
    document.getElementById('btnAddEnt').onclick = function(){
      NX.ed.addEntity();
      document.querySelector('#rail .railbtn[data-tab="scene"]').click();
    };
  }
  function refresh(){ fit(); draw(); }
  return { init, refresh, draw };
})();
