// NEXUS Engine - Node Graph Interpreter (executes graphs; zero game-specific code)
NX.Interp = function(rt, graph, ctx){
  this.rt = rt; this.graph = graph; this.ctx = ctx || {};
  this.nodes = {}; this.links = [];
  (graph.nodes||[]).forEach(n => { if(n && n.id) this.nodes[n.id] = n; });
  (graph.links||[]).forEach(l => { if(l && l.from && l.to) this.links.push(l); });
  this.budget = 25000;
  this._break = false;
  this.depth = 0;
  this.spawnOut = {};      // nodeId -> last spawned entity ref
  this.paramMap = null;    // groupId -> paramValues (for playlist nodes)
  this.paramValues = null;
};
NX.Interp.prototype = {
  outLink: function(nodeId, port){
    for(let k=0;k<this.links.length;k++){
      const l = this.links[k];
      if(l.from[0]===nodeId && l.from[1]===port) return l;
    }
    return null;
  },
  inLink: function(nodeId, inName){
    for(let k=0;k<this.links.length;k++){
      const l = this.links[k];
      if(l.to[0]===nodeId && l.to[1]===inName) return l;
    }
    return null;
  },
  // ---------- execution ----------
  fire: function(node){            // event entry
    this._break = false;
    this.runChain(node.id, 'out');
  },
  runChain: function(nodeId, port){
    let link = this.outLink(nodeId, port);
    while(link){
      if(--this.budget < 0){ console.warn('[NEXUS] limit eksekusi graph tercapai'); return; }
      if(this.rt.state !== 'run') return;
      const n = this.nodes[link.to[0]];
      if(!n){ return; }
      const r = this.exec(n);
      if(r === 'stop' || this._break) return;
      const nextPort = (r && r.port) ? r.port : 'out';
      link = this.outLink(n.id, nextPort);
    }
  },
  exec: function(n){
    const rt = this.rt, ctx = this.ctx;
    const T = n.type;
    if(T === 'grp.out') return 'stop';
    if(T === 'fl.wait'){
      return { wait: Math.max(0, NX.util.num(this.evalIn(n,'sec'), 1)) };
    }
    if(T === 'fl.branch'){
      const c = !!this.evalIn(n, 'cond');
      return { port: c ? 'Benar' : 'Salah' };
    }
    if(T === 'fl.repeat'){
      const times = NX.util.clamp(Math.floor(NX.util.num(this.evalIn(n,'times'),0)), 0, 20000);
      this._repIter = this._repIter || {};
      for(let k=0;k<times;k++){
        this._repIter[n.id] = k;
        this.runChain(n.id, 'Badan');
        if(this._break){ this._break = false; break; }
        if(rt.state !== 'run') break;
      }
      this._repIter[n.id] = null;
      return { port:'Selesai' };
    }
    if(T === 'ac.break'){ this._break = true; return 'stop'; }
    if(T.indexOf('grp:') === 0){ return this.execGroup(n); }

    // plain action nodes
    switch(T){
      case 'ac.move':    rt.resolve(this.evalIn(n,'target'),ctx).forEach(e=>{ e.x += this.dv(n,'dx'); e.y += this.dv(n,'dy'); }); break;
      case 'ac.setpos':  rt.resolve(this.evalIn(n,'target'),ctx).forEach(e=>{ e.x = this.dv(n,'x'); e.y = this.dv(n,'y'); }); break;
      case 'ac.rotate':  rt.resolve(this.evalIn(n,'target'),ctx).forEach(e=>{ e.rot = NX.util.num(e.rot) + this.dv(n,'deg'); }); break;
      case 'ac.spawn': {
        const ent = rt.spawn(String(this.evalIn(n,'prefab')||''), this.dv(n,'x'), this.dv(n,'y'));
        if(ent) this.spawnOut[n.id] = ent;
        break;
      }
      case 'ac.destroy': rt.resolve(this.evalIn(n,'target'),ctx).forEach(e=>rt.destroyEnt(e)); break;
      case 'ac.sound':   rt.sound(String(this.evalIn(n,'name')||'beep')); break;
      case 'ac.msg':     rt.sendMessage(String(this.evalIn(n,'name')||'')); break;
      case 'ac.setvar':  rt.setVar(String(this.evalIn(n,'var')||''), NX.util.parseAny(this.evalIn(n,'val'))); break;
      case 'ac.chgvar':  rt.changeVar(String(this.evalIn(n,'var')||''), this.dv(n,'by')); break;
      case 'ac.settext': rt.resolve(this.evalIn(n,'target'),ctx).forEach(e=>{ e.shape = e.shape||{}; e.shape.text = String(this.evalIn(n,'text')); }); break;
      case 'ac.setcolor':rt.resolve(this.evalIn(n,'target'),ctx).forEach(e=>{ e.shape = e.shape||{}; e.shape.color = String(this.evalIn(n,'color')||'#ffffff'); }); break;
      case 'ac.setvis':  rt.resolve(this.evalIn(n,'target'),ctx).forEach(e=>{ e.visible = !!this.evalIn(n,'vis') && this.evalIn(n,'vis')!==0; }); break;
      case 'ac.listapp': rt.listAppend(String(this.evalIn(n,'var')||''), NX.util.parseAny(this.evalIn(n,'val'))); break;
      case 'ac.listset': rt.listSet(String(this.evalIn(n,'var')||''), Math.floor(this.dv(n,'idx')), NX.util.parseAny(this.evalIn(n,'val'))); break;
      case 'ac.listrem': rt.listRemove(String(this.evalIn(n,'var')||''), Math.floor(this.dv(n,'idx'))); break;
      case 'ac.win':     rt.win(String(this.evalIn(n,'text')||'Kamu Menang!')); return 'stop';
      case 'ac.lose':    rt.lose(String(this.evalIn(n,'text')||'Game Over')); return 'stop';
      case 'ac.restart': rt.restart(); return 'stop';
      default: break;
    }
    return null;
  },
  execGroup: function(n){
    const rt = this.rt;
    const gd = (rt.project.groups||[]).find(g => ('grp:'+g.id) === n.type);
    if(!gd || !gd.graph){ console.warn('[NEXUS] playlist hilang:', n.type); return null; }
    if(++this.depth > 4){ this.depth--; return null; }
    // pre-evaluate params on the group node
    const pv = {};
    (gd.params||[]).forEach(p => { pv[p.param] = this.evalIn(n, p.param); });
    const inner = new NX.Interp(rt, gd.graph, this.ctx);
    inner.depth = this.depth;
    inner.paramValues = pv;
    inner.paramMap = {};
    (gd.params||[]).forEach(p => { inner.paramMap[p.node + ':' + p.input] = p.param; });
    // find entry marker
    const entry = (gd.graph.nodes||[]).find(m => m.type === 'grp.in');
    if(entry) inner.runChain(entry.id, 'out');
    this.depth--;
    return null;
  },
  // ---------- data evaluation ----------
  dv: function(n, name){ const v = this.evalIn(n, name); return NX.util.num(v, 0); },
  evalIn: function(n, name){
    const l = this.inLink(n.id, name);
    if(l){ return this.evalOut(l.from[0], l.from[1]); }
    const def = NX.defOf(n.type, this.rt.project);
    const inp = def && def.in ? def.in.find(x=>x.n===name) : null;
    let v = (n.props && n.props[name] !== undefined) ? n.props[name] : (inp ? inp.d : 0);
    if(this.paramMap){
      const pk = this.paramMap[n.id + ':' + name];
      if(pk && this.paramValues && this.paramValues[pk] !== undefined) v = this.paramValues[pk];
    }
    if(!inp) return v;
    if(inp.t === 'num') return NX.util.num(v, 0);
    if(inp.t === 'text') return String(v==null?'':v);
    if(inp.t === 'bool'){ return v===1||v===true||v==='true'||v==='1'; }
    return v;
  },
  evalOut: function(nodeId, port){
    if(this.rt.state !== 'run') return 0;
    const n = this.nodes[nodeId];
    if(!n) return 0;
    const rt = this.rt, ctx = this.ctx;
    switch(n.type){
      case 'ev.collide': return ctx.other || null;
      case 'fl.repeat':  return (this._repIter && this._repIter[n.id] != null) ? this._repIter[n.id] : 0;
      case 'ac.spawn':   return this.spawnOut[n.id] || null;
      case 'da.num':     return NX.util.num(n.props ? n.props.v : 0, 0);
      case 'da.txt':     return String(n.props ? (n.props.v==null?'':n.props.v) : '');
      case 'da.getvar':  return rt.getVar(String(n.props ? n.props.var : ''));
      case 'da.random': {
        const mn = this.dv(n,'min'), mx = this.dv(n,'max');
        const raw = n.props ? n.props.bulat : 1;
        const isInt = !(raw===0 || raw===false || raw==='0');
        if(isInt) return Math.floor(Math.random()*(mx-mn+1))+mn;
        return Math.random()*(mx-mn)+mn;
      }
      case 'da.math': {
        const op = String(n.props?n.props.op:'+');
        const fn = NX.MATHFN[op] || NX.MATHFN['+'];
        return fn(this.dv(n,'a'), this.dv(n,'b'));
      }
      case 'da.math1': {
        const op = String(n.props?n.props.op:'floor');
        const fn = NX.MATH1FN[op] || NX.MATH1FN.floor;
        return fn(this.dv(n,'a'));
      }
      case 'da.cmp': {
        const rawA = this.evalIn(n,'a'), rawB = this.evalIn(n,'b');
        let a = rawA, b = rawB;
        if(NX.util.isNum(String(rawA)) && NX.util.isNum(String(rawB))){ a=parseFloat(rawA); b=parseFloat(rawB); }
        const fn = NX.CMPFN[String(n.props?n.props.cmp:'=')] || NX.CMPFN['='];
        return !!fn(a,b);
      }
      case 'da.logic': {
        const op = String(n.props?n.props.op:'AND');
        const a = !!this.evalIn(n,'a'), b = !!this.evalIn(n,'b');
        if(op==='OR') return a||b;
        if(op==='NOT') return !a;
        return a&&b;
      }
      case 'da.keydown': return rt.keyDown(String(this.evalIn(n,'key')));
      case 'da.propof': {
        const list = rt.resolve(this.evalIn(n,'target'), ctx);
        const e = list[0]; if(!e) return 0;
        const p = String(n.props?n.props.prop:'x');
        return NX.util.num(p==='x'?e.x : p==='y'?e.y : p==='w'?e.w : p==='h'?e.h : (e.rot||0), 0);
      }
      case 'da.findent': return rt.findEntity(String(this.evalIn(n,'name')||''));
      case 'da.count':   return rt.countTag(String(this.evalIn(n,'tag')||''));
      case 'da.listget': return rt.listGet(String(this.evalIn(n,'var')||''), Math.floor(this.dv(n,'idx')));
      case 'da.listlen': return rt.listLen(String(this.evalIn(n,'var')||''));
      case 'da.join':    return String(this.evalIn(n,'a')) + String(this.evalIn(n,'b'));
      default: return 0;
    }
  }
};
