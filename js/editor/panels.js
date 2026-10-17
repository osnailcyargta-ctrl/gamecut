// NEXUS Editor - left panels (scene/sprites/playlists/library) + right inspector
NX.panels = (function(){
  const U = NX.util;
  const S = () => NX.ed.S;

  // ============ LEFT: SCENE ============
  function renderScene(){
    const root = document.getElementById('lp-scene');
    if(!root) return;
    const prj = S().project;
    const sc = NX.ed.curScene();
    let h = '';
    h += '<div class="lp-head">SCENE</div>';
    h += '<div class="row gap"><select id="selScene" class="fld fld-grow">';
    prj.scenes.forEach(s => h += '<option value="'+s.id+'"'+(s.id===sc.id?' selected':'')+'>'+U.esc(s.name)+'</option>');
    h += '</select><button id="btnAddScene" class="btn sm" title="Tambah scene">＋</button></div>';

    h += '<div class="lp-head">ENTITAS <button id="btnEntAdd" class="btn sm">＋ Entitas</button></div>';
    h += '<div class="list">';
    sc.entities.forEach(e => {
      h += '<div class="litem'+(S().selEnt===e.id?' on':'')+'" data-id="'+e.id+'">'+
           '<span class="lic">'+shapeIcon(e)+'</span><span class="lname">'+U.esc(e.name)+'</span>'+
           '<button class="ibtn del" data-del="'+e.id+'" title="Hapus">✕</button></div>';
    });
    if(!sc.entities.length) h += '<div class="empty">Belum ada entitas. Klik ＋ Entitas.</div>';
    h += '</div>';

    h += '<div class="lp-head">SCRIPT</div><div class="list">';
    prj.scripts.forEach(k => {
      h += '<div class="litem'+(S().scriptId===k.id && !S().groupStack.length?' on':'')+'" data-script="'+k.id+'">'+
           '<span class="lic">'+(k.attach==='global'?'🌐':(k.attach.indexOf('scene:')===0?'🎞':'🎮'))+'</span>'+
           '<span class="lname">'+U.esc(k.name)+'<small>'+U.esc(attachLabel(k.attach))+'</small></span>'+
           '<button class="ibtn del" data-delscript="'+k.id+'" title="Hapus">✕</button></div>';
    });
    h += '</div><div class="row gap"><button id="btnScriptScene" class="btn sm grow">＋ Script Scene</button>'+
         '<button id="btnScriptGlobal" class="btn sm grow">＋ Global</button></div>';

    h += '<div class="lp-head">PREFAB</div><div class="list">';
    prj.prefabs.forEach(p => {
      h += '<div class="litem"><span class="lic">🧬</span><span class="lname">'+U.esc(p.name)+'<small>di-Spawn via node</small></span>'+
           '<button class="ibtn del" data-delpf="'+p.id+'" title="Hapus">✕</button></div>';
    });
    if(!prj.prefabs.length) h += '<div class="empty">Pilih entitas → "Jadikan Prefab".</div>';
    h += '</div>';
    root.innerHTML = h;

    document.getElementById('selScene').onchange = function(){ S().sceneId=this.value; S().selEnt=null; NX.ed.touch(); };
    document.getElementById('btnAddScene').onclick = function(){
      const name = prompt('Nama scene:', 'Scene '+(prj.scenes.length+1)); if(!name) return;
      prj.scenes.push({ id:U.uid('s'), name, bg:'#101014', entities:[], variables:[] });
      S().sceneId = prj.scenes[prj.scenes.length-1].id; NX.ed.touch();
    };
    document.getElementById('btnEntAdd').onclick = function(){ NX.ed.addEntity(); };
    document.getElementById('btnScriptScene').onclick = function(){
      NX.ed.addScript('Script Scene', 'scene:'+sc.id);
    };
    document.getElementById('btnScriptGlobal').onclick = function(){ NX.ed.addScript('Script Global', 'global'); };
    root.querySelectorAll('.litem[data-id]').forEach(el => {
      el.onclick = function(e){
        if(e.target.dataset.del) return;
        S().selEnt = el.dataset.id;
        document.querySelector('#rail .railbtn[data-tab="scene"]').click();
        NX.ed.emit();
      };
    });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = function(e){ e.stopPropagation(); NX.ed.delEnt(b.dataset.del); });
    root.querySelectorAll('.litem[data-script]').forEach(el => {
      el.onclick = function(e){ if(e.target.dataset.delscript) return; NX.ed.openScript(el.dataset.script); };
    });
    root.querySelectorAll('[data-delscript]').forEach(b => b.onclick = function(e){
      e.stopPropagation(); NX.ed.delScript(b.dataset.delscript);
    });
    root.querySelectorAll('[data-delpf]').forEach(b => b.onclick = function(){
      if(confirm('Hapus prefab ini?')){ prj.prefabs = prj.prefabs.filter(p=>p.id!==b.dataset.delpf); NX.ed.touch(); }
    });
  }
  function shapeIcon(e){
    const t = (e.shape||{}).t;
    return t==='text' ? '🔤' : t==='circle' ? '⚫' : t==='sprite' ? '🖼' : '⬛';
  }
  function attachLabel(a){
    if(a==='global') return 'global';
    if(a.indexOf('scene:')===0){ const s=S().project.scenes.find(x=>x.id===a.slice(6)); return 'scene '+(s?s.name:'?'); }
    if(a.indexOf('ent:')===0) return 'ent ' + NX.ed.entName(a.slice(4));
    return a;
  }

  // ============ LEFT: SPRITES ============
  function renderSprites(){
    const root = document.getElementById('lp-sprite');
    if(!root) return;
    const list = S().project.assets.sprites;
    let h = '<div class="lp-head">SPRITE <button id="btnSprNew" class="btn sm">＋ Gambar</button></div><div class="list">';
    list.forEach(sp => {
      h += '<div class="litem spr'+(S().selSprite===sp.id?' on':'')+'" data-id="'+sp.id+'">'+
           '<canvas class="sprev" data-id="'+sp.id+'" width="34" height="34"></canvas>'+
           '<span class="lname">'+U.esc(sp.name)+'<small>'+sp.size[0]+'×'+sp.size[1]+'</small></span>'+
           '<button class="ibtn del" data-del="'+sp.id+'">✕</button></div>';
    });
    if(!list.length) h += '<div class="empty">Gambar sprite sendiri — tanpa script!</div>';
    h += '</div>';
    root.innerHTML = h;
    document.getElementById('btnSprNew').onclick = function(){
      const box = U.el('div');
      box.innerHTML = '<label class="flab">Nama</label><input id="nSpName" class="fld" value="Sprite '+(list.length+1)+'">'+
        '<label class="flab">Ukuran grid</label><select id="nSpSize" class="fld">'+
        '<option value="8">8 × 8</option><option value="16" selected>16 × 16</option>'+
        '<option value="24">24 × 24</option><option value="32">32 × 32</option></select>';
      NX.ed.modal('Sprite Baru', box, [
        {label:'Batal'},
        {label:'Buat & Gambar', primary:true, fn:function(){
          const nm = document.getElementById('nSpName').value || 'Sprite';
          const sz = parseInt(document.getElementById('nSpSize').value,10);
          NX.ed.newSprite(nm, [sz,sz]);
          NX.ed.setTab('sprite');
        }}
      ]);
    };
    root.querySelectorAll('.litem[data-id]').forEach(el => {
      el.onclick = function(e){
        if(e.target.dataset.del) return;
        S().selSprite = el.dataset.id;
        NX.ed.setTab('sprite');
      };
    });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = function(e){
      e.stopPropagation();
      if(confirm('Hapus sprite ini?')) NX.ed.delSprite(b.dataset.del);
    });
    // thumbnails
    root.querySelectorAll('.sprev').forEach(cv => {
      const sp = NX.ed.spriteById(cv.dataset.id); if(!sp) return;
      const c2 = cv.getContext('2d');
      c2.clearRect(0,0,34,34);
      const s = Math.floor(Math.min(30/sp.size[0], 30/sp.size[1])) || 1;
      const ox = (34 - sp.size[0]*s)/2, oy = (34 - sp.size[1]*s)/2;
      for(let r=0;r<sp.size[1];r++) for(let c=0;c<sp.size[0];c++){
        if(sp.px[r][c]){ c2.fillStyle = sp.px[r][c]; c2.fillRect(ox+c*s, oy+r*s, s, s); }
      }
    });
  }

  // ============ LEFT: PLAYLISTS ============
  function renderPlaylists(){
    const root = document.getElementById('lp-playlist');
    if(!root) return;
    const list = S().project.groups;
    let h = '<div class="lp-head">PLAYLIST (NODE GABUNGAN)</div><div class="list">';
    list.forEach(g => {
      h += '<div class="litem"><span class="lic">🎶</span><span class="lname">'+U.esc(g.name)+
           '<small>'+(g.graph.nodes||[]).length+' node · '+(g.params||[]).length+' param</small></span>'+
           '<button class="ibtn" data-use="'+g.id+'" title="Pasang di graph">➕</button>'+
           '<button class="ibtn" data-edit="'+g.id+'" title="Edit isi">✎</button>'+
           '<button class="ibtn del" data-del="'+g.id+'">✕</button></div>';
    });
    if(!list.length) h += '<div class="empty">Buka tab <b>Node</b>, seleksi beberapa node, tekan <b>Ctrl+G</b> → jadi playlist yang bisa dipakai ulang.</div>';
    h += '</div>';
    root.innerHTML = h;
    root.querySelectorAll('[data-use]').forEach(b => b.onclick = function(){ NX.ed.addGroupInstance(b.dataset.use); NX.ed.setTab('node'); });
    root.querySelectorAll('[data-edit]').forEach(b => b.onclick = function(){ NX.ed.openGroup(b.dataset.edit); });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = function(){ NX.ed.deleteGroup(b.dataset.del); });
  }

  // ============ LEFT: LIBRARY ============
  function renderLibrary(){
    const root = document.getElementById('lp-library');
    if(!root) return;
    let h = '<div class="lp-head">LIBRARY NODE</div><div class="libnote">Klik node → masuk ke graph yang terbuka di tab Node.</div>';
    ['ev','ac','fl','da'].forEach(k => {
      h += '<div class="lp-head" style="color:'+NX.CATS[k].c+'">'+NX.CATS[k].n.toUpperCase()+'</div><div class="list">';
      Object.keys(NX.DEFS).forEach(t => {
        const d = NX.DEFS[t];
        if(d.k !== k) return;
        h += '<div class="litem libnode" data-type="'+t+'"><span class="dot" style="background:'+NX.CATS[k].c+'"></span><span class="lname">'+U.esc(d.ti)+'</span></div>';
      });
      h += '</div>';
    });
    root.innerHTML = h;
    root.querySelectorAll('.libnode').forEach(el => {
      el.onclick = function(){
        const g = NX.ed.currentGraph();
        if(!g){ NX.ed.toast('Buka script dulu di tab Node'); return; }
        NX.nodeEd.addNodeAt(el.dataset.type, null, null);
      };
    });
  }

  // ============ RIGHT: INSPECTOR ============
  function renderInspector(){
    const root = document.getElementById('rightPanel');
    const prj = S().project;
    const ent = NX.ed.entById(S().selEnt);
    let h = '';
    if(ent){
      const sh = ent.shape||{};
      h += '<div class="lp-head">ENTITAS: '+U.esc(ent.name)+'</div>';
      h += insText('entName','Nama', ent.name);
      h += '<div class="row2">'+
        insNum('entX','X',ent.x)+insNum('entY','Y',ent.y)+
        insNum('entW','Lebar',ent.w)+insNum('entH','Tinggi',ent.h)+
        insNum('entR','Rotasi',ent.rot||0)+insNum('entZ','Lapis',ent.z||0)+'</div>';
      h += '<label class="flab">Bentuk</label><select id="entShape" class="fld">'+
        ['rect|Kotak','circle|Bulat','text|Teks','sprite|Sprite'].map(o=>{const[v,l]=o.split('|');return '<option value="'+v+'"'+(sh.t===v?' selected':'')+'>'+l+'</option>';}).join('')+'</select>';
      h += '<div class="row2">'+insColor('entColor','Warna', sh.color||'#4cc9f0')+
        '<div><label class="flab">Sprite</label><select id="entSprite" class="fld"><option value="">—</option>'+
        prj.assets.sprites.map(sp=>'<option value="'+sp.id+'"'+(sh.sprite===sp.id?' selected':'')+'>'+U.esc(sp.name)+'</option>').join('')+
        '</select></div></div>';
      h += '<div class="row2">'+insNum('entFS','Ukuran teks', U.num(sh.fs,24))+
        '<div><label class="flab">Isi teks</label><input id="entText" class="fld" value="'+U.esc(sh.text||'')+'"></div></div>';
      h += insText('entTags','Tag (pisah koma)', (ent.tags||[]).join(', '));
      h += '<div class="row2 chkrow"><label class="chk"><input type="checkbox" id="entSolid"'+(ent.solid?' checked':'')+'> Bisa tabrakan</label>'+
        '<label class="chk"><input type="checkbox" id="entVis"'+((ent.visible!==0&&ent.visible!==false)?' checked':'')+'> Tampil</label>'+
        '<label class="chk"><input type="checkbox" id="edSnap"'+(S().snap?' checked':'')+'> Snap 20px</label></div>';
      h += '<div class="lp-head">SCRIPT ENTITAS INI</div>';
      (ent.scripts||[]).forEach(sid => {
        const k = NX.ed.scriptById(sid);
        if(k) h += '<div class="litem" data-open="'+sid+'"><span class="lic">🎮</span><span class="lname">'+U.esc(k.name)+'</span><button class="ibtn del" data-del="'+sid+'">✕</button></div>';
      });
      h += '<button id="btnEntScript" class="btn sm grow">＋ Script Entitas</button>';
      h += '<div class="row gap" style="margin-top:10px">'+
        '<button id="btnToPrefab" class="btn sm grow">🧬 Jadikan Prefab</button>'+
        '<button id="btnDupEnt" class="btn sm">⧉</button>'+
        '<button id="btnDelEnt" class="btn sm danger">🗑</button></div>';
    } else {
      const scn = NX.ed.curScene();
      h += '<div class="lp-head">SCENE: '+U.esc(scn.name)+'</div>';
      h += insText('scName','Nama scene', scn.name);
      h += '<div class="row2">'+insNum('scW','Lebar',prj.settings.w)+insNum('scH','Tinggi',prj.settings.h)+'</div>';
      h += insColor('scBg','Warna latar', scn.bg||'#101014');
      h += '<div class="lp-head">VARIABEL SCENE</div><div id="varRows">';
      (scn.variables||[]).forEach((v,i) => {
        h += '<div class="row gap varrow"><input class="fld vname" data-i="'+i+'" value="'+U.esc(v.name)+'">'+
          '<input class="fld grow vval" data-i="'+i+'" value="'+U.esc(JSON.stringify(v.value))+'">'+
          '<button class="ibtn del" data-i="'+i+'">✕</button></div>';
      });
      h += '</div><button id="btnVarAdd" class="btn sm grow">＋ Variabel</button>';
      h += '<div class="hintbox">Pilih entitas di Stage atau panel kiri untuk meng-edit propertinya.<br><br>Projek: <b>'+U.esc(prj.name)+'</b></div>';
    }
    root.innerHTML = h;
    bindInspector(ent);
  }

  function insNum(id,label,v){ return '<div><label class="flab">'+label+'</label><input id="'+id+'" class="fld" type="number" step="any" value="'+U.num(v,0)+'"></div>'; }
  function insText(id,label,v){ return '<label class="flab">'+label+'</label><input id="'+id+'" class="fld" value="'+U.esc(v==null?'':v)+'">'; }
  function insColor(id,label,v){ return '<div><label class="flab">'+label+'</label><input id="'+id+'" class="fld col" type="color" value="'+U.hex(v)+'"></div>'; }

  function bindInspector(ent){
    const root = document.getElementById('rightPanel');
    const $ = id => document.getElementById(id);
    const scn = NX.ed.curScene();
    if(ent){
      const commit = () => { NX.ed.touch(); NX.stage.draw(); };
      $('entName').onchange = function(){ ent.name=this.value||ent.name; commit(); };
      ['entX:x','entY:y','entW:w','entH:h','entR:rot','entZ:z'].forEach(p => {
        const [id,k] = p.split(':');
        $(id).onchange = function(){ ent[k] = U.num(this.value,0); commit(); };
      });
      $('entShape').onchange = function(){
        ent.shape = ent.shape||{};
        if(this.value==='sprite' && !ent.shape.sprite){ const sp=S().project.assets.sprites[0]; ent.shape.sprite = sp?sp.id:''; }
        ent.shape.t = this.value; commit();
      };
      $('entColor').oninput = function(){ ent.shape.color=this.value; NX.stage.draw(); };
      $('entColor').onchange = function(){ commit(); };
      $('entSprite').onchange = function(){ ent.shape.sprite=this.value; commit(); };
      $('entFS').onchange = function(){ ent.shape.fs=U.num(this.value,24); commit(); };
      $('entText').onchange = function(){ ent.shape.text=this.value; commit(); };
      $('entTags').onchange = function(){ ent.tags=this.value.split(',').map(s=>s.trim()).filter(Boolean); commit(); };
      $('entSolid').onchange = function(){ ent.solid=this.checked?1:0; commit(); };
      $('entVis').onchange = function(){ ent.visible=this.checked?1:0; commit(); };
      $('edSnap').onchange = function(){ S().snap=this.checked; };
      $('btnEntScript').onclick = function(){ NX.ed.addScript('Script '+ent.name, 'ent:'+ent.id); };
      $('btnToPrefab').onclick = function(){ NX.ed.savePrefabFromEnt(ent.id); };
      $('btnDupEnt').onclick = function(){ NX.ed.dupEnt(ent.id); };
      $('btnDelEnt').onclick = function(){ if(confirm('Hapus entitas ini?')) NX.ed.delEnt(ent.id); };
      root.querySelectorAll('[data-open]').forEach(el => {
        el.onclick = function(e){ if(e.target.dataset.del) return; NX.ed.openScript(el.dataset.open); };
        const d = el.querySelector('[data-del]');
        if(d) d.onclick = function(e){
          e.stopPropagation();
          ent.scripts = ent.scripts.filter(x=>x!==d.dataset.del);
          NX.ed.touch();
        };
      });
    } else {
      $('scName').onchange = function(){ scn.name=this.value||scn.name; NX.ed.touch(); };
      $('scW').onchange = function(){ S().project.settings.w=U.num(this.value,960); NX.ed.touch(); NX.stage.refresh(); };
      $('scH').onchange = function(){ S().project.settings.h=U.num(this.value,540); NX.ed.touch(); NX.stage.refresh(); };
      $('scBg').oninput = function(){ scn.bg=this.value; NX.stage.draw(); };
      $('scBg').onchange = function(){ NX.ed.touch(); };
      $('btnVarAdd').onclick = function(){
        scn.variables.push({name:'var'+((scn.variables||[]).length+1), value:0});
        NX.ed.touch();
      };
      root.querySelectorAll('.varrow').forEach(row => {
        const i = parseInt(row.querySelector('.vname').dataset.i,10);
        row.querySelector('.vname').onchange = function(){ scn.variables[i].name=this.value.trim()||('var'+(i+1)); NX.ed.touch(); };
        row.querySelector('.vval').onchange = function(){
          try{ scn.variables[i].value = JSON.parse(this.value); }catch(e){ scn.variables[i].value = U.parseAny(this.value); }
          NX.ed.touch();
        };
        row.querySelector('.ibtn').onclick = function(){ scn.variables.splice(i,1); NX.ed.touch(); };
      });
    }
  }

  function renderAll(){
    renderScene(); renderSprites(); renderPlaylists(); renderLibrary(); renderInspector();
    const pn = document.getElementById('projName');
    if(pn && document.activeElement !== pn && S().project) pn.value = S().project.name || '';
  }
  function init(){
    NX.ed.onChange(renderAll);
    renderAll();
  }
  return { init, renderAll, renderInspector, renderScene };
})();
