// NEXUS Engine - synthesized sound effects (no external assets)
NX.audio = (function(){
  let ctx = null;
  function ac(){
    if(!ctx){ try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const P = {
    beep :{t:'square',   f:880,  d:0.08, v:0.14},
    boop :{t:'triangle', f:440,  d:0.12, v:0.20},
    move :{t:'sine',     f:220,  d:0.05, v:0.14},
    zap  :{t:'sawtooth', f:1200, f2:180, d:0.15, v:0.16},
    boom :{t:'noise',    d:0.28, v:0.28},
    ding :{t:'sine',     f:1320, d:0.18, v:0.18},
    coin :{t:'square',   f:988,  f2:1319,d:0.12, v:0.10},
    lock :{t:'square',   f:180,  f2:90,  d:0.10, v:0.18},
    win  :{t:'sine',     f:660,  f2:1320,d:0.45, v:0.20},
    lose :{t:'sawtooth', f:220,  f2:60,  d:0.55, v:0.20}
  };
  function play(name){
    const p = P[name]; if(!p) return;
    const c = ac(); if(!c) return;
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(p.v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p.d);
    g.connect(c.destination);
    if(p.t === 'noise'){
      const len = Math.floor(c.sampleRate * p.d);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
      const s = c.createBufferSource(); s.buffer = buf; s.connect(g); s.start(t);
    } else {
      const o = c.createOscillator();
      o.type = p.t; o.frequency.setValueAtTime(p.f, t);
      if(p.f2) o.frequency.exponentialRampToValueAtTime(p.f2, t + p.d);
      o.connect(g); o.start(t); o.stop(t + p.d + 0.03);
    }
  }
  return { play, names: Object.keys(P) };
})();
