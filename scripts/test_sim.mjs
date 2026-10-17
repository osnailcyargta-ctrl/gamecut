// Uji headless: jalankan 4 contoh game di interpreter node graph (tanpa browser).
// Menemukan bug logika graph / interpreter sebelum deploy.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- stub browser ----
const listeners = {};
globalThis.window = globalThis;
globalThis.document = { addEventListener: ()=>{}, getElementById: ()=>null };
globalThis.addEventListener = (t,f)=>{ (listeners[t]=listeners[t]||[]).push(f); };
globalThis.requestAnimationFrame = cb => { globalThis.__raf = cb; return 1; };
globalThis.cancelAnimationFrame = () => {};
const ctxStub = new Proxy({}, {
  get: (t,k) => (k in t) ? t[k] : (...a)=>{},
  set: (t,k,v) => { t[k]=v; return true; }
});
const fakeCanvas = () => ({ width:0, height:0, getContext: ()=>ctxStub,
  addEventListener: ()=>{}, setPointerCapture: ()=>{},
  getBoundingClientRect: ()=>({ left:0, top:0, width:960, height:540 }) });

for(const f of ['util','audio','input','nodedefs','interpreter','runtime']){
  eval(readFileSync(join(ROOT,'js/core', f+'.js'),'utf8'));
  globalThis.NX = window.NX;
}
const U = NX.util;

let t = 0;
function boot(jsonFile){
  const prj = JSON.parse(readFileSync(join(ROOT,'examples',jsonFile),'utf8'));
  const rt = new NX.Runtime(fakeCanvas(), prj, prj.scenes[0].id);
  rt.start(); rt.stop(); // init state tanpa rAF loop
  rt.state = 'run';
  t += 1000;
  rt._last = t;
  return rt;
}
function frames(rt, n, dt=16.7){ for(let i=0;i<n;i++){ t += dt; rt.tick(t); } }
function fireKey(rt, scriptName, code, selfEnt){
  const sc = rt.project.scripts.find(s=>s.name===scriptName);
  const node = sc.graph.nodes.find(n=>n.type==='ev.key' && n.props.key===code);
  if(!node) throw new Error('node ev.key '+code+' tidak ada di '+scriptName);
  rt.fireNode(sc.graph, node, { self: selfEnt||null, other:null });
}
function fireClick(rt, scriptName){
  const sc = rt.project.scripts.find(s=>s.name===scriptName);
  const node = sc.graph.nodes.find(n=>n.type==='ev.click');
  rt.fireNode(sc.graph, node, { self: rt.findEntity('Tombol'), other:null });
}
let pass=0, fail=0;
function check(label, cond, extra){
  if(cond){ pass++; console.log('  ✓', label, extra!==undefined?('→ '+extra):''); }
  else { fail++; console.log('  ✗ GAGAL:', label, extra!==undefined?('→ '+JSON.stringify(extra)):''); }
}
function sect(s){ console.log('\n== '+s+' =='); }

// ---------- DADU ----------
sect('DADU');
{
  const rt = boot('dice.json');
  fireClick(rt, 'Lempar');
  const hasil = rt.vars.hasil;
  check('hasil = angka 1..6', Number.isInteger(hasil) && hasil>=1 && hasil<=6, hasil);
  check('Angka text berubah', rt.findEntity('Angka').shape.text == hasil);
  check('counter lempar = 1', rt.vars.lempar === 1);
  fireClick(rt, 'Lempar'); fireClick(rt, 'Lempar');
  check('counter lempar = 3', rt.vars.lempar === 3, rt.vars.lempar);
}

// ---------- SNAKE ----------
sect('SNAKE');
{
  const rt = boot('snake.json');
  frames(rt, 5);
  const head0 = { x: rt.findEntity('kepala').x, y: rt.findEntity('kepala').y };
  check('ular diam sebelum input', head0.x===30 && head0.y===30, head0);
  fireKey(rt, 'Kontrol', 'ArrowRight');
  frames(rt, 20); // ~2 tick → x≈70
  const h1 = rt.findEntity('kepala');
  check('ular gerak ke kanan', h1.x > 30, h1.x);
  // makan: taruh makanan 2 sel di depan (masih jauh dari tembok)
  const food = rt.findEntity('makanan');
  food.x = h1.x + 40; food.y = h1.y;
  frames(rt, 40); // maju & makan
  check('skor bertambah setelah makan', rt.vars.skor >= 1, rt.vars.skor);
  check('ekor tumbuh (list)', rt.vars.ekor.length >= 1, rt.vars.ekor.length);
  const segs = rt.ents.filter(e=>e.name.startsWith('seg_'));
  check('entitas segmen muncul', segs.length >= 1, segs.length);
  check('segmen diposisikan di jalur (bukan offscreen)', segs.length && segs[0].x > -100, segs.map(s=>s.x+','+s.y));
  // tabrak tembok: terus kanan sampai habis
  frames(rt, 500);
  check('game over saat nabrak tembok', rt.state === 'lost', rt.state);
}

// ---------- SPACE INVADERS ----------
sect('SPACE INVADERS');
{
  const rt = boot('space-invaders.json');
  frames(rt, 5);
  const kapal = rt.findEntity('kapal');
  const m1 = rt.findEntity('musuh_1');
  const x0 = m1.x;
  frames(rt, 40); // ~0.67s → 1 tick formasi
  check('formasi geser', rt.findEntity('musuh_1').x !== x0, rt.findEntity('musuh_1').x);
  // tembak (dengan ctx self = kapal)
  fireKey(rt, 'Kapal', 'Space', kapal);
  frames(rt, 2);
  const peluru = rt.ents.find(e=>e.name.startsWith('Peluru_'));
  check('peluru spawn', !!peluru, peluru && (peluru.x+','+peluru.y));
  if(peluru){ peluru.x = rt.findEntity('musuh_1').x; peluru.y = rt.findEntity('musuh_1').y; }
  frames(rt, 3);
  check('musuh berkurang jadi 31', rt.countTag('musuh') === 31, rt.countTag('musuh'));
  check('skor +10', rt.vars.skor === 10, rt.vars.skor);
  check('peluru hilang', !rt.ents.some(e=>e.name.startsWith('Peluru_')));
  // bom musuh kena kapal
  frames(rt, 90); // timer bom 1.1s
  const be = rt.ents.find(e=>e.name.startsWith('PeluruE_'));
  check('bom musuh spawn', !!be);
  if(be){ be.x = kapal.x; be.y = kapal.y; frames(rt, 3); }
  check('nyawa berkurang jadi 2', rt.vars.nyawa === 2, rt.vars.nyawa);
  // formasi terus sampai mendarat → lose
  frames(rt, 3000);
  check('alien mendarat → game over', rt.state==='lost', rt.state);
}

// ---------- TETRIS ----------
sect('TETRIS');
{
  const rt = boot('tetris.json');
  frames(rt, 5);
  check('papan 200 sel kosong', rt.vars.papan.length===200 && rt.vars.papan.every(v=>v===0), rt.vars.papan.length);
  check('piece spawn: tipe 1..7', rt.vars.tipe>=1 && rt.vars.tipe<=7, rt.vars.tipe);
  check('piece spawn: py=1', rt.vars.py===1, rt.vars.py);
  const filled = () => rt.vars.papan.filter(v=>v>0).length;
  check('piece tergambar (4 sel terisi visual)', rt.ents.filter(e=>e.name.startsWith('sel_') && e.shape.color!== '#191922').length === 4);
  // turun cepat sampai terkunci
  let locked = false;
  for(let i=0;i<25 && !locked;i++){
    fireKey(rt, 'Tombol', 'ArrowDown'); frames(rt, 3);
    if(filled() > 0) locked = true;
  }
  frames(rt, 10);
  check('ada sel terkunci di papan setelah drop', filled() === 4, filled());
  check('piece baru spawn (py reset, siap main)', rt.vars.py >= 1 && rt.vars.okPos === 1, rt.vars.py);
  // geser kiri 3x
  fireKey(rt, 'Tombol', 'ArrowLeft'); frames(rt, 2);
  fireKey(rt, 'Tombol', 'ArrowLeft'); frames(rt, 2);
  fireKey(rt, 'Tombol', 'ArrowLeft'); frames(rt, 2);
  check('px berkurang', rt.vars.px <= 3, rt.vars.px);
  // rotasi
  const rot0 = rt.vars.rot;
  fireKey(rt, 'Tombol', 'ArrowUp'); frames(rt, 2);
  check('rot berubah', rt.vars.rot === ((rot0+1)%4), { dari: rot0, ke: rt.vars.rot });
  // gravitasi jalan
  frames(rt, 80);
  check('state tetap run (tidak crash)', rt.state === 'run', rt.state);
  // banyak piece → stack penuh → lose ATAU tetap jalan
  for(let i=0;i<40;i++){
    for(let k=0;k<25;k++){ fireKey(rt, 'Tombol', 'ArrowDown'); frames(rt, 3); }
    frames(rt, 6);
    if(rt.state !== 'run') break;
  }
  check('banyak piece terkunci / game over papan penuh', filled() > 40 || rt.state==='lost', { filled: filled(), state: rt.state });
}

console.log('\n==============================');
console.log('PASS:', pass, ' FAIL:', fail);
process.exit(fail ? 1 : 0);
