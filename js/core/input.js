// NEXUS Engine - keyboard & mouse (active only while a game is playing)
NX.input = (function(){
  const down = new Set();
  const pressed = [];
  let enabled = false;
  const mouse = { x:0, y:0, clicked:false, down:false };

  window.addEventListener('keydown', function(e){
    if(!enabled) return;
    if(e.code==='Space'||e.code.startsWith('Arrow')) e.preventDefault();
    if(!e.repeat) pressed.push(e.code);
    down.add(e.code);
  });
  window.addEventListener('keyup', function(e){ down.delete(e.code); });
  window.addEventListener('blur', function(){ down.clear(); });

  function attachMouse(el, toGame){
    el.addEventListener('pointerdown', function(e){
      if(!enabled) return;
      const p = toGame(e); mouse.x=p.x; mouse.y=p.y; mouse.clicked=true; mouse.down=true;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function(e){
      if(!enabled) return;
      const p = toGame(e); mouse.x=p.x; mouse.y=p.y;
    });
    el.addEventListener('pointerup', function(){ mouse.down=false; });
  }

  return {
    isDown: function(c){ return down.has(c); },
    takePressed: function(){ const p = pressed.slice(); pressed.length=0; return p; },
    mouse: function(){ return { x:mouse.x, y:mouse.y, clicked:mouse.clicked }; },
    endFrame: function(){ mouse.clicked=false; },
    setEnabled: function(v){ enabled=v; if(!v){ down.clear(); pressed.length=0; } },
    get enabled(){ return enabled; },
    attachMouse: attachMouse
  };
})();
