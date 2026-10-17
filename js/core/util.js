// NEXUS Engine - util helpers
window.NX = window.NX || {};
NX.util = {
  uid(p){ return (p||'n') + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4); },
  clamp(v,a,b){ return v<a?a:(v>b?b:v); },
  clone(o){ return JSON.parse(JSON.stringify(o)); },
  esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); },
  num(v,d){ const n=parseFloat(v); return isNaN(n)?(d||0):n; },
  isNum(s){ return typeof s==='string' && /^-?\d+(\.\d+)?$/.test(s.trim()); },
  parseAny(v){ if(typeof v==='string' && NX.util.isNum(v)) return parseFloat(v); return v; },
  el(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; },
  hex(c){ // pad short hex
    if(typeof c!=='string') return '#888888';
    if(/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    return '#888888';
  },
  download(name, text){
    const b=new Blob([text],{type:'application/json'}); const u=URL.createObjectURL(b);
    const a=document.createElement('a'); a.href=u; a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(u), 2000);
  }
};
