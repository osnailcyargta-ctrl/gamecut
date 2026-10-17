// NEXUS Editor - bootstrap
window.addEventListener('DOMContentLoaded', function(){
  NX.ed.init();
  NX.panels.init();
  NX.stage.init();
  NX.nodeEd.init();
  NX.shapeEd.init();

  // welcome modal
  const wl = document.getElementById('welcomeModal');
  function closeWl(){ wl.style.display='none'; }
  document.getElementById('wlContinue').onclick = function(){ closeWl(); NX.ed.setTab('stage'); NX.ed.toast('Proyek terakhir dimuat dari browser'); };
  document.getElementById('wlNew').onclick = function(){ closeWl(); NX.ed.newProject(); };
  document.getElementById('wlExamples').onclick = function(){ closeWl(); document.getElementById('btnExamples').click(); };
  document.getElementById('wlOpen').onclick = function(){
    NX.store.importFile(function(p){ closeWl(); NX.ed.loadProject(p); NX.ed.toast('Proyek dimuat'); });
  };

  // tab-change refresh hooks
  let lastTab = null;
  NX.ed.onChange(function(){
    const t = NX.ed.S.tab;
    if(t === lastTab) return;
    lastTab = t;
    if(t==='node') NX.nodeEd.refresh();
    if(t==='sprite') NX.shapeEd.refresh();
    if(t==='stage') NX.stage.refresh();
  });

  // first paint of stage
  NX.stage.refresh();
});
