// NEXUS Engine - Runtime: scene lifecycle, entities, collisions, event dispatch, rendering.
// Contains ZERO game logic; every game is a project (data) made of nodes.
NX.Runtime = function(canvas, project, sceneId){
  this.cv = canvas;
  this.cx = canvas.getContext('2d');
  this.project = project;
  this.sceneId = sceneId;
  this.scene = project.scenes.find(s=>s.id===sceneId) || project.scenes[0];
  this.W = NX.util.num(project.settings && project.settings.w, 960);
  this.H = NX.util.num(project.settings && project.settings.h, 540);
  canvas.width = this.W; canvas.height = this.H;
  this.state = 'run';       // run | won | lost
  this.ents = [];
  this.vars = {};
  this.timers = {};         // graphId -> { nodeId: elapsed }
  this.sched = [];          // {at, gid, nodeId, port, self, other}
  this.msgQ = [];
  this.touch = {};          // collision edge map
  this.started = false;
  this.spawnSeq = 0;
  this._raf = null;
  this._last = 0;
  this._acc = 0;
};
NX.Runtime.prototype = {
  start: function(){
    const sc = this.scene;
    (sc.variables||[]).forEach(v => {
      this.vars[v.name] = Array.isArray(v.value) ? v.value.slice() : NX.util.parseAny(NX.util.clone(v.value));
    });
    (sc.entities||[]).forEach(e => this.ents.push(this.instantiate(e)));
    this.bg = sc.bg || '#101014';
    this._last = performance.now();
    const loop = (ts)=>{ this._raf = requestAnimationFrame(loop); this.tick(ts); };
    this._raf = requestAnimationFrame(loop);
  },
  stop: function(){
    this.state = 'stopped';
    if(this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  },
  instantiate: function(def){
    const e = {
      id: NX.util.uid('e'),
      name: def.name, x: def.x||0, y: def.y||0, w: def.w||32, h: def.h||32,
      rot: def.rot||0, z: def.z||0, solid: !!def.solid, visible: def.visible!==0 && def.visible!==false,
      tags: (def.tags||[]).slice(), shape: NX.util.clone(def.shape||{t:'rect',color:'#4cc9f0'}),
      scripts: (def.scripts||[]).slice(), dead:false
    };
    return e;
  },
  // ---------- vars & lists ----------
  getVar: function(name){ return Object.prototype.hasOwnProperty.call(this.vars, name) ? this.vars[name] : 0; },
  setVar: function(name, v){ this.vars[name] = v; },
  changeVar: function(name, by){
    const cur = NX.util.num(this.vars[name], 0);
    this.vars[name] = cur + NX.util.num(by, 0);
  },
  listGet: function(name, idx, dflt){
    const a = this.vars[name];
    if(!Array.isArray(a)) return dflt!=null?dflt:0;
    if(idx<0 || idx>=a.length) return dflt!=null?dflt:0;
    return a[idx];
  },
  listSet: function(name, idx, val){
    let a = this.vars[name];
    if(!Array.isArray(a)) { a = []; this.vars[name] = a; }
    while(a.length <= idx) a.push(0);
    a[idx] = val;
  },
  listAppend: function(name, val){
    let a = this.vars[name];
    if(!Array.isArray(a)) { a = []; this.vars[name] = a; }
    a.push(val);
  },
  listRemove: function(name, idx){
    const a = this.vars[name];
    if(Array.isArray(a) && idx>=0 && idx<a.length) a.splice(idx,1);
  },
  listLen: function(name){ const a=this.vars[name]; return Array.isArray(a)?a.length:0; },
  // ---------- entities ----------
  findEntity: function(name){
    return this.ents.find(e => !e.dead && e.name === name) || null;
  },
  byTag: function(tag){ return this.ents.filter(e => !e.dead && e.tags.indexOf(tag)>=0); },
  countTag: function(tag){ return this.byTag(tag).length; },
  resolve: function(t, ctx){
    if(t && typeof t === 'object') return [t];               // ref from a wire
    const s = String(t==null?'':t);
    if(s==='self')  return ctx.self  ? [ctx.self]  : [];
    if(s==='other') return ctx.other ? [ctx.other] : [];
    if(s.indexOf('tag:')===0) return this.byTag(s.slice(4));
    if(s.indexOf('name:')===0){ const e=this.findEntity(s.slice(5)); return e?[e]:[]; }
    if(s==='any' || s==='') return [];
    const e = this.findEntity(s);
    return e ? [e] : [];
  },
  propOf: function(e, p){ return NX.util.num(p==='x'?e.x : p==='y'?e.y : p==='w'?e.w : p==='h'?e.h : (e.rot||0), 0); },
  spawn: function(prefabName, x, y){
    const pf = (this.project.prefabs||[]).find(p => p.name === prefabName);
    if(!pf){ console.warn('[NEXUS] prefab tidak ada:', prefabName); return null; }
    this.spawnSeq++;
    const def = NX.util.clone(pf.def);
    def.name = (pf.name + '_' + this.spawnSeq);
    def.x = x; def.y = y;
    def.scripts = (pf.def.scripts||[]).slice();
    const e = this.instantiate(def);
    this.ents.push(e);
    return e;
  },
  destroyEnt: function(e){ if(e) e.dead = true; },
  sound: function(name){ NX.audio.play(name); },
  sendMessage: function(name){ this.msgQ.push(name); },
  win:  function(txt){ if(this.state==='run'){ this.state='won';  this.endText=txt; this.sound('win'); } },
  lose: function(txt){ if(this.state==='run'){ this.state='lost'; this.endText=txt; this.sound('lose'); } },
  restart: function(){
    const cb = this.onRestart;
    this.stop();
    if(cb) cb();
  },
  keyDown: function(code){ return NX.input.enabled ? NX.input.isDown(code) : false; },
  getTimers: function(gid){
    if(!this.timers[gid]) this.timers[gid] = {};
    return this.timers[gid];
  },
  schedule: function(sec, gid, nodeId, port, ctx){
    this.sched.push({ at: performance.now() + sec*1000, gid, nodeId, port,
      self: ctx.self||null, other: ctx.other||null });
  },
  // ---------- events ----------
  graphById: function(gid){ return (this.project.scripts||[]).find(s=>s.id===gid); },
  fireNode: function(graph, node, ctx){
    const it = new NX.Interp(this, graph, ctx);
    it.fire(node);
  },
  eachEventNode: function(kind, fn){
    const pr = 'ev.' + kind;
    const self = this;
    (this.project.scripts||[]).forEach(function(sc){
      const g = sc.graph; if(!g || !g.nodes) return;
      const scopeOk = sc.attach==='global' || sc.attach===('scene:'+self.sceneId);
      if(!scopeOk) return;
      g.nodes.forEach(function(n){
        if(n.type !== pr) return;
        fn(sc, g, n);
      });
    });
    // entity scripts
    this.ents.forEach(function(e){
      if(e.dead) return;
      (e.scripts||[]).forEach(function(sid){
        const sc = (self.project.scripts||[]).find(s=>s.id===sid);
        if(!sc || !sc.graph || !sc.graph.nodes) return;
        sc.graph.nodes.forEach(function(n){
          if(n.type !== pr) return;
          fn(sc, sc.graph, n, e);
        });
      });
    });
  },
  fireKind: function(kind, matchFn){
    const self = this;
    this.eachEventNode(kind, function(sc, g, n, ent){
      if(matchFn && !matchFn(n, ent)) return;
      self.fireNode(g, n, { self: ent||null, other: null });
    });
  },
  // ---------- main loop ----------
  tick: function(ts){
    const dt = Math.min(0.05, (ts - this._last)/1000);
    this._last = ts;
    if(this.state !== 'run' && this.state !== 'won' && this.state !== 'lost') { this.render(); return; }

    if(this.state === 'run'){
      if(!this.started){
        this.started = true;
        this.fireKind('start');
        this.drainMessages();
      }
      // timers
      const self = this;
      this.eachEventNode('timer', function(sc, g, n, ent){
        const key = g.id + '|' + n.id;
        const t = self.getTimers(g.id);
        const cur = NX.util.num(t[key], 0) + dt;
        const sec = Math.max(0.02, NX.util.num(n.props?n.props.sec:1, 1));
        if(cur >= sec){ t[key] = cur - sec; self.fireNode(g, n, { self: ent||null, other:null }); }
        else t[key] = cur;
      });
      // update
      this.fireKind('update');
      // key pressed
      const pressed = NX.input.enabled ? NX.input.takePressed() : [];
      if(pressed.length){
        pressed.forEach(function(code){
          self.fireKind('key', function(n){ return String(n.props?n.props.key:'') === code; });
        });
      } else { NX.input.takePressed(); }
      // collisions
      this.collide();
      // clicks
      const m = NX.input.mouse();
      if(m.clicked){
        const hit = this.pickEnt(m.x, m.y);
        this.fireKind('click', function(n, ent){ return ent ? (hit===ent) : true; });
      }
      // scheduled continuations (from Tunggu)
      const now = performance.now();
      for(let i=this.sched.length-1;i>=0;i--){
        const s = this.sched[i];
        if(now >= s.at){
          this.sched.splice(i,1);
          const g = this.graphById(s.gid);
          const n = g && g.nodes ? g.nodes.find(x=>x.id===s.nodeId) : null;
          if(g && n && this.state==='run' && (!s.self || !s.self.dead)){
            this.fireNode(g, n, { self:s.self, other:s.other });
          }
        }
      }
      this.drainMessages();
      // sweep dead
      if(this.ents.some(e=>e.dead)) this.ents = this.ents.filter(e=>!e.dead);
    }
    NX.input.endFrame();
    this.render();
  },
  drainMessages: function(){
    let guard = 60;
    while(this.msgQ.length && guard-- > 0 && this.state==='run'){
      const name = this.msgQ.shift();
      this.fireKind('msg', function(n){ return String(n.props?n.props.name:'') === name; });
    }
    if(guard<=0) this.msgQ.length = 0;
  },
  collide: function(){
    const list = this.ents.filter(e => e.solid && !e.dead && e.visible);
    const pairs = [];
    for(let i=0;i<list.length;i++){
      for(let j=i+1;j<list.length;j++){
        const a = list[i], b = list[j];
        if(Math.abs(a.x-b.x) < (a.w+b.w)/2 && Math.abs(a.y-b.y) < (a.h+b.h)/2){
          pairs.push([a,b]);
        }
      }
    }
    const key = (a,b)=> a.id<b.id ? a.id+'|'+b.id : b.id+'|'+a.id;
    const fresh = [];
    pairs.forEach(p => {
      const k = key(p[0],p[1]);
      if(!this.touch[k]) fresh.push(p);
      this.touch[k] = true;
    });
    // expire old pairs
    const alive = {}; pairs.forEach(p => alive[key(p[0],p[1])] = true);
    for(const k in this.touch) if(!alive[k]) delete this.touch[k];
    // fire events
    const self = this;
    fresh.forEach(p => {
      [p, [p[1],p[0]]].forEach(pair => {
        const a = pair[0], b = pair[1];
        (a.scripts||[]).forEach(sid => {
          const sc = (self.project.scripts||[]).find(s=>s.id===sid);
          if(!sc || !sc.graph || !sc.graph.nodes) return;
          sc.graph.nodes.forEach(n => {
            if(n.type !== 'ev.collide') return;
            const w = String(n.props?n.props.with:'any');
            const ok = w==='any' ||
              (w.indexOf('tag:')===0  && b.tags.indexOf(w.slice(4))>=0) ||
              (w.indexOf('name:')===0 && b.name===w.slice(5)) ||
              b.name===w;
            if(ok) self.fireNode(sc.graph, n, { self:a, other:b });
          });
        });
      });
    });
  },
  pickEnt: function(x, y){
    let best = null;
    this.ents.forEach(e => {
      if(e.dead || !e.visible) return;
      if(Math.abs(x-e.x) <= e.w/2 && Math.abs(y-e.y) <= e.h/2){
        if(!best || (e.z||0) >= (best.z||0)) best = e;
      }
    });
    return best;
  },
  // ---------- rendering ----------
  render: function(){
    const cx = this.cx, W = this.W, H = this.H;
    cx.fillStyle = this.bg || '#101014';
    cx.fillRect(0,0,W,H);
    const list = this.ents.filter(e=>!e.dead && e.visible).slice().sort((a,b)=>(a.z||0)-(b.z||0));
    list.forEach(e => this.drawEnt(e));
    if(this.state==='won' || this.state==='lost'){
      cx.fillStyle = 'rgba(8,8,12,0.72)';
      cx.fillRect(0,0,W,H);
      cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillStyle = this.state==='won' ? '#4ade80' : '#f87171';
      cx.font = '700 44px system-ui, sans-serif';
      cx.fillText(this.endText || (this.state==='won'?'MENANG':'KALAH'), W/2, H/2 - 16);
      cx.fillStyle = '#c9c9d1';
      cx.font = '500 16px system-ui, sans-serif';
      cx.fillText('Tekan tombol Ulang untuk main lagi', W/2, H/2 + 28);
    }
  },
  drawEnt: function(e){
    const cx = this.cx, s = e.shape || {};
    cx.save();
    cx.translate(e.x, e.y);
    if(e.rot) cx.rotate(e.rot * Math.PI/180);
    if(s.t === 'text'){
      cx.fillStyle = NX.util.hex(s.color);
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.font = '700 ' + NX.util.num(s.fs, 24) + 'px system-ui, sans-serif';
      cx.fillText(s.text == null ? '' : String(s.text), 0, 0);
    } else if(s.t === 'circle'){
      cx.fillStyle = NX.util.hex(s.color);
      cx.beginPath();
      cx.ellipse(0, 0, Math.max(1,e.w/2), Math.max(1,e.h/2), 0, 0, Math.PI*2);
      cx.fill();
    } else if(s.t === 'sprite' && s.sprite){
      const sp = this.spriteOf(s.sprite);
      if(sp) this.drawSprite(cx, sp, e.w, e.h);
      else { cx.fillStyle = '#555'; cx.fillRect(-e.w/2,-e.h/2,e.w,e.h); }
    } else {
      cx.fillStyle = NX.util.hex(s.color);
      cx.fillRect(-e.w/2, -e.h/2, e.w, e.h);
    }
    cx.restore();
  },
  spriteOf: function(id){
    this._spCache = this._spCache || {};
    if(this._spCache[id]) return this._spCache[id];
    const sp = (this.project.assets.sprites||[]).find(s=>s.id===id) || null;
    this._spCache[id] = sp;
    return sp;
  },
  drawSprite: function(cx, sp, w, h){
    const cols = sp.size[0], rows = sp.size[1];
    const sx = w/cols, sy = h/rows;
    cx.imageSmoothingEnabled = false;
    for(let r=0;r<rows;r++){
      const row = sp.px[r];
      for(let c=0;c<cols;c++){
        const col = row[c];
        if(col) { cx.fillStyle = col; cx.fillRect(-w/2 + c*sx, -h/2 + r*sy, sx+0.5, sy+0.5); }
      }
    }
  }
};
