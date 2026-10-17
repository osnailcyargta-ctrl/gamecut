// NEXUS Editor - "Playlist": gabung banyak node jadi 1 node reusable (Ctrl+G)
NX.groups = (function(){
  const U = NX.util;

  function isMarker(t){ return t==='grp.in' || t==='grp.out'; }

  function createDialog(selIds){
    const ed = NX.ed, S = ed.S;
    const graph = ed.currentGraph();
    if(!graph){ ed.toast('Buka script dulu di tab Node'); return; }
    if(S.groupStack.length){
      const curGid = S.groupStack[S.groupStack.length-1];
      const bad = selIds.some(id => {
        const n = graph.nodes.find(x=>x.id===id);
        return n && n.type === 'grp:'+curGid;
      });
      if(bad){ ed.toast('Playlist tidak boleh memuat dirinya sendiri'); return; }
    }
    const selNodes = selIds
      .map(id => graph.nodes.find(n=>n.id===id))
      .filter(n => n && !isMarker(n.type));
    if(!selNodes.length){ ed.toast('Pilih beberapa node dulu (tarik kotak di area kosong)'); return; }
    const selSet = {}; selNodes.forEach(n => selSet[n.id] = true);

    // classify links
    const innerLinks = [];
    let entryNodeId = null;
    let outSrc = null;
    const autoParams = [];
    let pn = 0;
    graph.links.forEach(l => {
      const inSel  = selSet[l.from[0]] && selSet[l.to[0]];
      const fromSel = !!selSet[l.from[0]];
      const toSel   = !!selSet[l.to[0]];
      if(inSel){ innerLinks.push(l); return; }
      const isExecLink = l.from[1]==='out' || l.from[1]==='Benar' || l.from[1]==='Salah' || l.from[1]==='Badan' || l.from[1]==='Selesai';
      if(fromSel && isExecLink){
        if(!outSrc) outSrc = { nodeId:l.from[0], port:l.from[1] };
        // dropped
      } else if(toSel && isExecLink){
        if(!entryNodeId) entryNodeId = l.to[0];
        // dropped
      } else if(toSel){
        // external data link into selection -> param
        const srcNode = graph.nodes.find(n=>n.id===l.from[0]);
        const dstNode = graph.nodes.find(n=>n.id===l.to[0]);
        let t='any', w='txt';
        if(srcNode){
          const sd = NX.defOf(srcNode.type, S.project);
          const op = sd && sd.out ? sd.out.find(o=>o.n===l.from[1]) : null;
          if(op) t = op.t;
        }
        if(dstNode){
          const dd = NX.defOf(dstNode.type, S.project);
          const ip = dd && dd.in ? dd.in.find(x=>x.n===l.to[1]) : null;
          if(ip) w = ip.w || 'txt';
        }
        pn++;
        autoParams.push({ param:'Masukan'+pn, node:l.to[0], input:l.to[1], t, w, d:0 });
      }
      // fromSel + data-out: just dropped
    });

    // candidate constant params
    const EXCL = { target:1, prefab:1, sound:1, key:1, varname:1, color:1, op:1, op1:1, cmp:1, logic:1, prop:1, coll:1, bool:1, chk:1 };
    const cands = [];
    selNodes.forEach(n => {
      const def = NX.defOf(n.type, S.project);
      if(!def || !def.in) return;
      def.in.forEach(ip => {
        if(EXCL[ip.w]) return;
        const v = n.props ? n.props[ip.n] : undefined;
        if(v === undefined) return;
        cands.push({ node:n.id, input:ip.n, t:ip.t, w:ip.w, d:v, label:(def.ti+'.'+ip.n+' = '+v), nodeTitle:def.ti });
      });
    });

    // dialog
    const box = U.el('div');
    let h = '<label class="flab">Nama playlist</label><input id="gName" class="fld" value="Playlist '+(S.project.groups.length+1)+'">';
    h += '<label class="flab">Jadikan parameter (bisa diisi tiap kali dipasang)</label><div class="paramlist">';
    cands.slice(0,24).forEach((c,i) => {
      h += '<label class="chk"><input type="checkbox" data-pi="'+i+'"'+(autoParams.some(a=>a.node===c.node&&a.input===c.input)?' disabled':'')+(i<6?' checked':'')+'> '+U.esc(c.label)+'</label>';
    });
    if(autoParams.length) h += '<div class="hintbox">'+autoParams.length+' sambungan dari luar otomatis jadi parameter.</div>';
    h += '</div>';
    box.innerHTML = h;
    NX.ed.modal('Buat Playlist', box, [
      { label:'Batal' },
      { label:'🎶 Jadikan Playlist', primary:true, fn:function(){
        const name = document.getElementById('gName').value.trim() || 'Playlist';
        build(selNodes, innerLinks, entryNodeId, outSrc, autoParams, cands, name);
      }}
    ]);
  }

  function build(selNodes, innerLinks, entryNodeId, outSrc, autoParams, cands, name){
    const ed = NX.ed, S = ed.S;
    const graph = ed.currentGraph();
    if(!graph) return;
    const selSet = {}; selNodes.forEach(n => selSet[n.id]=true);
    const gid = U.uid('g');
    const nodes = selNodes.map(n => U.clone(n));
    const links = innerLinks.map(l => U.clone(l));

    // markers
    const mIn = { id:U.uid('n'), type:'grp.in', x: 0, y: 0, props:{} };
    nodes.push(mIn);
    if(entryNodeId && selSet[entryNodeId]) links.push({ id:U.uid('l'), from:[mIn.id,'out'], to:[entryNodeId,'in'] });
    const mOut = { id:U.uid('n'), type:'grp.out', x: 900, y: 0, props:{} };
    nodes.push(mOut);
    if(outSrc && selSet[outSrc.nodeId]) links.push({ id:U.uid('l'), from:[outSrc.nodeId,outSrc.port], to:[mOut.id,'in'] });

    // params: auto (external data-in) + checked constants
    const checked = {};
    document.querySelectorAll('#modalRoot [data-pi]').forEach(cb => {
      if(cb.checked && !cb.disabled) checked[cb.dataset.pi] = true;
    });
    const params = autoParams.slice();
    cands.forEach((c,i) => {
      if(checked[i] && !params.some(p=>p.node===c.node && p.input===c.input)){
        params.push({ param:'Isi'+(params.length+1), node:c.node, input:c.input, t:c.t, w:c.w, d:c.d });
      }
    });
    // ensure unique param names
    const used = {};
    params.forEach(p => {
      let base = p.param, k = 2;
      while(used[p.param]) p.param = base + '_' + (k++);
      used[p.param] = true;
    });

    S.project.groups.push({ id:gid, name, graph:{ nodes, links }, params });

    // remove selection from current graph
    graph.nodes = graph.nodes.filter(n => !selSet[n.id]);
    graph.links = graph.links.filter(l => !(selSet[l.from[0]] || selSet[l.to[0]]));

    const props = {};
    params.forEach(p => { props[p.param] = p.d; });
    const cx = selNodes.reduce((a,n)=>a+(n.x||0),0)/selNodes.length;
    const cy = selNodes.reduce((a,n)=>a+(n.y||0),0)/selNodes.length;
    graph.nodes.push({ id:U.uid('n'), type:'grp:'+gid, x:cx, y:cy, props });
    NX.nodeEd.clearSel();
    ed.toast('Playlist "'+name+'" dibuat — tinggal pasang di mana saja');
    ed.touch();
  }

  return { createDialog };
})();
