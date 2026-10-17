// NEXUS Engine - project persistence (localStorage + file import/export)
NX.store = (function(){
  const KEY = 'nexus.project.v1';
  const EX  = 'nexus.examples.v1';

  function validate(p){
    return p && p.magic==='nexus-project' && Array.isArray(p.scenes);
  }
  return {
    saveLocal: function(proj){ try{ localStorage.setItem(KEY, JSON.stringify(proj)); }catch(e){} },
    loadLocal: function(){ try{ const s=localStorage.getItem(KEY); if(!s) return null; const p=JSON.parse(s); return validate(p)?p:null; }catch(e){ return null; } },
    clearLocal: function(){ try{ localStorage.removeItem(KEY); }catch(e){} },
    saveExamplesIndex: function(list){ try{ localStorage.setItem(EX, JSON.stringify(list)); }catch(e){} },
    loadExamplesIndex: function(){ try{ const s=localStorage.getItem(EX); return s?JSON.parse(s):null; }catch(e){ return null; } },
    exportFile: function(proj){
      NX.util.download((proj.name||'proyek').replace(/[^\w\- ]+/g,'') + '.nexus.json', JSON.stringify(proj, null, 1));
    },
    importFile: function(cb){
      const inp = document.createElement('input');
      inp.type='file'; inp.accept='.json,application/json';
      inp.onchange = function(){
        const f = inp.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = function(){
          try{ const p = JSON.parse(r.result); if(!validate(p)) throw new Error('format'); cb(p); }
          catch(e){ alert('File bukan proyek NEXUS yang valid.'); }
        };
        r.readAsText(f);
      };
      inp.click();
    },
    validate: validate
  };
})();
