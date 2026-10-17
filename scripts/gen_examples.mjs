// Generator: 4 contoh game sebagai PROJECT DATA (node graphs) untuk NEXUS Engine.
// Engine & editor TIDAK punya kode game — semua game murni data node.
// Jalankan: node scripts/gen_examples.mjs
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples');
let _id = 0;
const nid = p => p + (++_id);

class GB {
  constructor(){ this.nodes = []; this.links = []; }
  n(type, props, x, y){ const id = nid('n'); this.nodes.push({ id, type, props: props||{}, x: x||0, y: y||0 }); return id; }
  l(from, outP, to, inP){ this.links.push({ id: nid('l'), from: [from, outP||'out'], to: [to, inP||'in'] }); }
}
// wire data input: number -> da.num; {txt} -> da.txt; {node,port} -> wire
function W(g, node, inName, val, x, y){
  if(val && typeof val === 'object' && val.node !== undefined){ g.l(val.node, val.port||'val', node, inName); return; }
  if(val && typeof val === 'object' && val.txt !== undefined){ const t = g.n('da.txt', { v: val.txt }, x, y); g.l(t, 'val', node, inName); return; }
  const c = g.n('da.num', { v: val }, x, y); g.l(c, 'val', node, inName);
}
const getv  = (g, name, x, y) => ({ node: g.n('da.getvar', { var: name }, x, y), port:'val' });
const propG = (g, target, prop, x, y) => ({ node: g.n('da.propof', { target, prop }, x, y), port:'val' });
const keyG  = (g, key, x, y) => ({ node: g.n('da.keydown', { key }, x, y), port:'val' });
const cntG  = (g, tag, x, y) => ({ node: g.n('da.count', { tag }, x, y), port:'val' });
function mathN(g, a, op, b, x, y){ const m = g.n('da.math', { op }, x, y); W(g, m, 'a', a, x-70, y); W(g, m, 'b', b, x-70, y+56); return { node: m, port:'val' }; }
function math1N(g, a, op, x, y){ const m = g.n('da.math1', { op }, x, y); W(g, m, 'a', a, x-70, y); return { node: m, port:'val' }; }
function joinN(g, a, b, x, y){ const j = g.n('da.join', {}, x, y); W(g, j, 'a', a, x-70, y); W(g, j, 'b', b, x-70, y+56); return { node: j, port:'val' }; }
function cmpN(g, a, cmp, b, x, y){ const c = g.n('da.cmp', { cmp }, x, y); W(g, c, 'a', a, x-70, y); W(g, c, 'b', b, x-70, y+56); return { node: c, port:'val' }; }
function logicN(g, op, a, b, x, y){ const l = g.n('da.logic', { op }, x, y); W(g, l, 'a', a, x-70, y); W(g, l, 'b', b, x-70, y+56); return { node: l, port:'val' }; }
function rndN(g, min, max, x, y){ return { node: g.n('da.random', { min, max, bulat:1 }, x, y), port:'val' }; }
function ent(name, x, y, w, h, shape, extra){
  return { id: nid('e'), name, x, y, w, h, rot:0, z: (extra&&extra.z)||0, solid: (extra&&extra.solid)||0,
    visible:1, tags: (extra&&extra.tags)||[], shape, scripts: (extra&&extra.scripts)||[] };
}
function txtEnt(name, x, y, text, fs, color, z){ return ent(name, x, y, 100, 30, { t:'text', text, fs, color: color||'#e8e8ea' }, { z: z==null?5:z }); }
function spritePx(rows, color){ return rows.map(r => r.split('').map(ch => ch==='X' ? color : null)); }

// ================= 1) DADU =================
function buildDice(){
  const sid = nid('s');
  const tombol = ent('Tombol', 240, 388, 220, 66, { t:'rect', color:'#22d3ee' }, { z:2 });
  const prj = {
    magic:'nexus-project', v:1, name:'Lempar Dadu',
    settings:{ w:480, h:480 },
    assets:{ sprites:[] }, prefabs:[],
    scenes:[{ id: sid, name:'Meja', bg:'#14181f', variables:[
      { name:'hasil', value:0 }, { name:'lempar', value:0 }
    ], entities:[
      txtEnt('Angka', 240, 190, '?', 120, '#ffffff'),
      txtEnt('Info', 240, 300, 'Klik tombolnya!', 16, '#9a9aa6'),
      tombol,
      txtEnt('TombolTxt', 240, 388, 'LEMPAR', 22, '#08252b', 6)
    ]}],
    scripts:[], groups:[]
  };
  const g = new GB();
  const ev = g.n('ev.click', {}, 40, 40);
  const snd = g.n('ac.sound', { name:'coin' }, 40, 170);
  const sv = g.n('ac.setvar', { var:'hasil' }, 40, 300);
  W(g, sv, 'val', rndN(g, 1, 6, -180, 360), -60, 360);
  const cv2 = g.n('ac.chgvar', { var:'lempar', by:1 }, 40, 430);
  const st1 = g.n('ac.settext', { target:'name:Angka' }, 40, 560);
  W(g, st1, 'text', getv(g,'hasil',-180,620), -60, 620);
  const jn = joinN(g, { txt:'Sudah lempar: ' }, getv(g,'lempar',-180,760), -180, 700);
  const st2 = g.n('ac.settext', { target:'name:Info' }, 40, 700);
  W(g, st2, 'text', jn, -60, 740);
  g.l(ev,'out',snd,'in'); g.l(snd,'out',sv,'in'); g.l(sv,'out',cv2,'in');
  g.l(cv2,'out',st1,'in'); g.l(st1,'out',st2,'in');
  const ksc = { id: nid('k'), name:'Lempar', attach:'ent:'+tombol.id, graph: g };
  prj.scripts.push(ksc);
  tombol.scripts.push(ksc.id);
  return prj;
}

// ================= 2) SNAKE =================
function buildSnake(){
  const SW = 560;
  const kepala = ent('kepala', 30, 30, 18, 18, { t:'rect', color:'#4ade80' }, { z:3, solid:1 });
  const makanan = ent('makanan', 230, 230, 16, 16, { t:'circle', color:'#f87171' }, { z:2, solid:1, tags:['makanan'] });
  const prj = {
    magic:'nexus-project', v:1, name:'Ular Sanke',
    settings:{ w:SW, h:SW },
    assets:{ sprites:[] },
    prefabs:[{ id: nid('p'), name:'seg', def:{ name:'seg', x:-999, y:-999, w:18, h:18, z:1, solid:1, tags:['ekor'], shape:{ t:'rect', color:'#16a34a' }, scripts:[] } }],
    scenes:[{ id: nid('s'), name:'Arena', bg:'#0d1410', variables:[
      { name:'arahX', value:0 }, { name:'arahY', value:0 },
      { name:'ekor', value:[] }, { name:'skor', value:0 },
      { name:'hidup', value:1 }, { name:'baruMakan', value:0 }
    ], entities:[ kepala, makanan, txtEnt('skorUI', SW/2, 22, 'Skor: 0', 20, '#e8e8ea') ]}],
    scripts:[], groups:[]
  };
  const sid = prj.scenes[0].id;

  // --- kontrol arah ---
  const gk = new GB();
  [['ArrowRight',1,0,40],['ArrowLeft',-1,0,340],['ArrowUp',0,-1,640],['ArrowDown',0,1,940]].forEach(d => {
    const ev = gk.n('ev.key', { key:d[0] }, d[3], 40);
    const br = gk.n('fl.branch', {}, d[3], 170);
    W(gk, br, 'cond', getv(gk,'hidup',d[3]-140,240), d[3]-60, 250);
    const s1 = gk.n('ac.setvar', { var:'arahX' }, d[3], 340);
    W(gk, s1, 'val', d[1], d[3]-120, 400);
    const s2 = gk.n('ac.setvar', { var:'arahY' }, d[3], 480);
    W(gk, s2, 'val', d[2], d[3]-120, 540);
    gk.l(ev,'out',br,'in'); gk.l(br,'Benar',s1,'in'); gk.l(s1,'out',s2,'in');
  });
  const rk = gk.n('ev.key', { key:'KeyR' }, 1240, 40);
  const rs = gk.n('ac.restart', {}, 1240, 170);
  gk.l(rk,'out',rs,'in');
  prj.scripts.push({ id: nid('k'), name:'Kontrol', attach:'scene:'+sid, graph: gk });

  // --- gerak & ekor ---
  const gm = new GB();
  const tmr = gm.n('ev.timer', { sec:0.14 }, 40, 40);
  const brH = gm.n('fl.branch', {}, 40, 170);
  W(gm, brH, 'cond', getv(gm,'hidup',-120,240), -40, 250);
  const hpx = propG(gm, 'name:kepala', 'x', -400, 380);
  const hpy = propG(gm, 'name:kepala', 'y', -400, 520);
  const nx = mathN(gm, hpx, '+', mathN(gm, getv(gm,'arahX',-620,440), '×', 20, -620, 560), -400, 620);
  const ny = mathN(gm, hpy, '+', mathN(gm, getv(gm,'arahY',-620,680), '×', 20, -620, 800), -400, 740);
  const orA = logicN(gm, 'OR', cmpN(gm, nx, '<', 10, -620, 940), cmpN(gm, nx, '>', 550, -620, 1120), -500, 1280);
  const orB = logicN(gm, 'OR', cmpN(gm, ny, '<', 10, -620, 1440), cmpN(gm, ny, '>', 550, -620, 1620), -500, 1800);
  const orC = logicN(gm, 'OR', orA, orB, -500, 1960);
  const brW = gm.n('fl.branch', {}, 40, 300);
  W(gm, brW, 'cond', orC, -60, 2100);
  gm.l(tmr,'out',brH,'in'); gm.l(brH,'Benar',brW,'in');
  const loseN = gm.n('ac.lose', {}, 300, 300);
  W(gm, loseN, 'text', joinN(gm, { txt:'Nabrak! Skor: ' }, getv(gm,'skor',100,380), 100, 340), 180, 380);
  gm.l(brW,'Benar',loseN,'in');
  // Salah: catat posisi lama, kelola ekor, gerak, reposition segmen
  const pack = mathN(gm, mathN(gm, hpx, '×', 1000, -400, 2280), '+', hpy, -180, 2320);
  const la = gm.n('ac.listapp', { var:'ekor' }, 340, 2260);
  W(gm, la, 'val', pack, 200, 2320);
  const brG = gm.n('fl.branch', {}, 340, 2380);
  W(gm, brG, 'cond', getv(gm,'baruMakan',200,2460), 200, 2500);
  const sB = gm.n('ac.setvar', { var:'baruMakan' }, 660, 2300);
  W(gm, sB, 'val', 0, 540, 2360);
  const lr = gm.n('ac.listrem', { var:'ekor' }, 340, 2560);
  W(gm, lr, 'idx', 0, 220, 2620);
  const mvp = gm.n('ac.setpos', { target:'name:kepala' }, 340, 2700);
  W(gm, mvp, 'x', nx, 220, 2760); W(gm, mvp, 'y', ny, 220, 2840);
  const rep = gm.n('fl.repeat', { times:0 }, 340, 2840);
  W(gm, rep, 'times', { node: gm.n('da.listlen', { var:'ekor' }, 200, 2900), port:'val' }, 220, 2900);
  const pos = { node: gm.n('da.listget', { var:'ekor' }, 640, 2900), port:'val' };
  W(gm, pos.node, 'idx', { node: rep, port:'i' }, 520, 2960);
  const sx = math1N(gm, mathN(gm, pos, '÷', 1000, 640, 3020), 'floor', 640, 3080);
  const sy = mathN(gm, pos, '%', 1000, 640, 3200);
  const fe = gm.n('da.findent', {}, 940, 2940);
  W(gm, fe, 'name', joinN(gm, { txt:'seg_' }, mathN(gm, { node:rep, port:'i' }, '+', 1, 640, 3300), 790, 3240), 820, 3000);
  const sp2 = gm.n('ac.setpos', { target:'self' }, 940, 3060);
  W(gm, sp2, 'target', { node: fe, port:'val' }, 820, 3120);
  W(gm, sp2, 'x', sx, 820, 3180); W(gm, sp2, 'y', sy, 820, 3260);
  gm.l(brW,'Salah',la,'in'); gm.l(la,'out',brG,'in');
  gm.l(brG,'Benar',sB,'in'); gm.l(brG,'Salah',lr,'in');
  gm.l(sB,'out',mvp,'in'); gm.l(lr,'out',mvp,'in');
  gm.l(mvp,'out',rep,'in'); gm.l(rep,'Badan',sp2,'in');
  prj.scripts.push({ id: nid('k'), name:'Gerak & Ekor', attach:'scene:'+sid, graph: gm });

  // --- kepala: makan & mati ---
  const gh = new GB();
  const cl1 = gh.n('ev.collide', { with:'tag:makanan' }, 40, 40);
  const sbm = gh.n('ac.setvar', { var:'baruMakan' }, 40, 170);
  W(gh, sbm, 'val', 1, -80, 230);
  const cs = gh.n('ac.chgvar', { var:'skor', by:1 }, 40, 300);
  const stS = gh.n('ac.settext', { target:'name:skorUI' }, 40, 430);
  W(gh, stS, 'text', joinN(gh, { txt:'Skor: ' }, getv(gh,'skor',-160,500), -160, 460), -60, 490);
  const snd = gh.n('ac.sound', { name:'coin' }, 40, 560);
  const spf = gh.n('ac.spawn', { prefab:'seg' }, 40, 690);
  W(gh, spf, 'x', -999, -100, 750); W(gh, spf, 'y', -999, -100, 830);
  const fx = mathN(gh, mathN(gh, rndN(gh, 1, 27, -400, 900), '×', 20, -400, 960), '+', 10, -400, 1020);
  const fy = mathN(gh, mathN(gh, rndN(gh, 1, 27, -400, 1140), '×', 20, -400, 1200), '+', 10, -400, 1260);
  const mvf = gh.n('ac.setpos', { target:'name:makanan' }, 40, 820);
  W(gh, mvf, 'x', fx, -100, 880); W(gh, mvf, 'y', fy, -100, 960);
  gh.l(cl1,'out',sbm,'in'); gh.l(sbm,'out',cs,'in'); gh.l(cs,'out',stS,'in');
  gh.l(stS,'out',snd,'in'); gh.l(snd,'out',spf,'in'); gh.l(spf,'out',mvf,'in');
  const cl2 = gh.n('ev.collide', { with:'tag:ekor' }, 500, 40);
  const ls2 = gh.n('ac.lose', {}, 500, 170);
  W(gh, ls2, 'text', joinN(gh, { txt:'Kena ekor! Skor: ' }, getv(gh,'skor',260,240), 260, 200), 380, 230);
  gh.l(cl2,'out',ls2,'in');
  const ksc = { id: nid('k'), name:'Kepala Ular', attach:'ent:'+kepala.id, graph: gh };
  prj.scripts.push(ksc);
  kepala.scripts.push(ksc.id);
  return prj;
}

// ================= 3) SPACE INVADERS =================
function buildInvaders(){
  const alien = { id: nid('a'), name:'Alien', size:[11,8], px: spritePx([
    '..X.....X..','...X...X...','..XXXXXXX..','.XX.XXX.XX.','XXXXXXXXXXX','X.XXXXXXX.X','X.X.....X.X','...XX.XX...'
  ], '#7ef29a') };
  const ship = { id: nid('a'), name:'Kapal', size:[11,7], px: spritePx([
    '.....X.....','....XXX....','....XXX....','.XXXXXXXXX.','XXXXXXXXXXX','XXXXXXXXXXX','XX.......XX'
  ], '#e8e8ea') };
  const bul  = { id: nid('a'), name:'Peluru', size:[2,6], px: spritePx(['XX','XX','XX','XX','XX','XX'], '#fbbf24') };
  const bulE = { id: nid('a'), name:'PeluruMusuh', size:[2,6], px: spritePx(['XX','XX','XX','XX','XX','XX'], '#f87171') };

  const ents = [];
  for(let r=0;r<4;r++) for(let c=0;c<8;c++){
    ents.push(ent('musuh_'+(r*8+c+1), 118 + c*58, 90 + r*46, 40, 30,
      { t:'sprite', sprite: alien.id }, { z:2, solid:1, tags:['musuh'] }));
  }
  const kapal = ent('kapal', 320, 588, 44, 28, { t:'sprite', sprite: ship.id }, { z:3, solid:1 });
  ents.push(kapal);
  const skorUI = txtEnt('skorUI', 84, 24, 'Skor: 0', 18, '#e8e8ea');
  const nyawaUI = txtEnt('nyawaUI', 556, 24, 'Nyawa: 3', 18, '#e8e8ea');
  ents.push(skorUI, nyawaUI);

  const prj = {
    magic:'nexus-project', v:1, name:'Space Invaders',
    settings:{ w:640, h:640 },
    assets:{ sprites:[alien, ship, bul, bulE] },
    prefabs:[
      { id: nid('p'), name:'Peluru',  def:{ name:'Peluru',  x:0, y:0, w:8, h:20, z:4, solid:1, tags:[],          shape:{ t:'sprite', sprite: bul.id },  scripts:[] } },
      { id: nid('p'), name:'PeluruE', def:{ name:'PeluruE', x:0, y:0, w:8, h:20, z:4, solid:1, tags:['peluruE'], shape:{ t:'sprite', sprite: bulE.id }, scripts:[] } }
    ],
    scenes:[{ id: nid('s'), name:'Angkasa', bg:'#0a0a12', variables:[
      { name:'skor', value:0 }, { name:'nyawa', value:3 }, { name:'arah', value:1 }, { name:'tembok', value:0 }
    ], entities: ents }],
    scripts:[], groups:[]
  };
  const sid = prj.scenes[0].id;

  // --- peluru pemain ---
  const gp = new GB();
  const up = gp.n('ev.update', {}, 40, 40);
  const mv = gp.n('ac.move', { target:'self' }, 40, 170);
  W(gp, mv, 'dy', -9, -80, 230);
  const br = gp.n('fl.branch', {}, 40, 300);
  W(gp, br, 'cond', cmpN(gp, propG(gp,'self','y',-220,380), '<', 20, -220, 460), -100, 380);
  const ds = gp.n('ac.destroy', { target:'self' }, 40, 430);
  gp.l(up,'out',mv,'in'); gp.l(mv,'out',br,'in'); gp.l(br,'Benar',ds,'in');
  const cl = gp.n('ev.collide', { with:'tag:musuh' }, 380, 40);
  const c1 = gp.n('ac.chgvar', { var:'skor', by:10 }, 380, 170);
  const sUI = gp.n('ac.settext', { target:'name:skorUI' }, 380, 300);
  W(gp, sUI, 'text', joinN(gp, { txt:'Skor: ' }, getv(gp,'skor',180,370), 180, 340), 260, 360);
  const sn = gp.n('ac.sound', { name:'boom' }, 380, 430);
  const dO = gp.n('ac.destroy', { target:'other' }, 380, 560);
  const dS = gp.n('ac.destroy', { target:'self' }, 380, 690);
  const bw = gp.n('fl.branch', {}, 380, 820);
  W(gp, bw, 'cond', cmpN(gp, cntG(gp,'musuh',180,890), '=', 0, 180, 950), 260, 880);
  const wn = gp.n('ac.win', {}, 380, 950);
  W(gp, wn, 'text', { txt:'MENANG! Semua alien kalah.' }, 260, 1010);
  gp.l(cl,'out',c1,'in'); gp.l(c1,'out',sUI,'in'); gp.l(sUI,'out',sn,'in'); gp.l(sn,'out',dO,'in');
  gp.l(dO,'out',dS,'in'); gp.l(dS,'out',bw,'in'); gp.l(bw,'Benar',wn,'in');
  const bsc = { id: nid('k'), name:'Peluru Pemain', attach:'global', graph: gp };
  prj.scripts.push(bsc);
  prj.prefabs[0].def.scripts = [bsc.id];

  // --- peluru musuh ---
  const ge = new GB();
  const up2 = ge.n('ev.update', {}, 40, 40);
  const mv2 = ge.n('ac.move', { target:'self' }, 40, 170);
  W(ge, mv2, 'dy', 6, -80, 230);
  const br2 = ge.n('fl.branch', {}, 40, 300);
  W(ge, br2, 'cond', cmpN(ge, propG(ge,'self','y',-220,380), '>', 620, -220, 460), -100, 380);
  const ds2 = ge.n('ac.destroy', { target:'self' }, 40, 430);
  ge.l(up2,'out',mv2,'in'); ge.l(mv2,'out',br2,'in'); ge.l(br2,'Benar',ds2,'in');
  const esc = { id: nid('k'), name:'Peluru Musuh', attach:'global', graph: ge };
  prj.scripts.push(esc);
  prj.prefabs[1].def.scripts = [esc.id];

  // --- kapal ---
  const gk = new GB();
  const upk = gk.n('ev.update', {}, 40, 40);
  const bl = gk.n('fl.branch', {}, 40, 170);
  W(gk, bl, 'cond', keyG(gk,'ArrowLeft',-180,240), -100, 230);
  const ml = gk.n('ac.move', { target:'self' }, 40, 300);
  W(gk, ml, 'dx', -6, -100, 360);
  const br2k = gk.n('fl.branch', {}, 40, 430);
  W(gk, br2k, 'cond', keyG(gk,'ArrowRight',-180,500), -100, 490);
  const mr = gk.n('ac.move', { target:'self' }, 40, 560);
  W(gk, mr, 'dx', 6, -100, 620);
  gk.l(upk,'out',bl,'in'); gk.l(bl,'Benar',ml,'in'); gk.l(ml,'out',br2k,'in'); gk.l(br2k,'Benar',mr,'in');
  const spk = gk.n('ev.key', { key:'Space' }, 380, 40);
  const spn = gk.n('ac.spawn', { prefab:'Peluru' }, 380, 170);
  W(gk, spn, 'x', propG(gk,'self','x',180,240), 260, 280);
  W(gk, spn, 'y', mathN(gk, propG(gk,'self','y',-60,330), '-', 30, -60, 390), 260, 340);
  const zn = gk.n('ac.sound', { name:'zap' }, 380, 300);
  gk.l(spk,'out',spn,'in'); gk.l(spn,'out',zn,'in');
  const clk = gk.n('ev.collide', { with:'tag:peluruE' }, 380, 420);
  const cn = gk.n('ac.chgvar', { var:'nyawa', by:-1 }, 380, 550);
  const nUI = gk.n('ac.settext', { target:'name:nyawaUI' }, 380, 680);
  W(gk, nUI, 'text', joinN(gk, { txt:'Nyawa: ' }, getv(gk,'nyawa',180,750), 180, 720), 260, 740);
  const bm = gk.n('ac.sound', { name:'boom' }, 380, 810);
  const dO2 = gk.n('ac.destroy', { target:'other' }, 380, 940);
  const brk = gk.n('fl.branch', {}, 380, 1070);
  W(gk, brk, 'cond', cmpN(gk, getv(gk,'nyawa',180,1140), '≤', 0, 180, 1200), 260, 1130);
  const lsn = gk.n('ac.lose', {}, 380, 1200);
  W(gk, lsn, 'text', { txt:'Kalah! Kapalmu hancur.' }, 260, 1260);
  gk.l(clk,'out',cn,'in'); gk.l(cn,'out',nUI,'in'); gk.l(nUI,'out',bm,'in'); gk.l(bm,'out',dO2,'in');
  gk.l(dO2,'out',brk,'in'); gk.l(brk,'Benar',lsn,'in');
  const ksc = { id: nid('k'), name:'Kapal', attach:'ent:'+kapal.id, graph: gk };
  prj.scripts.push(ksc);
  kapal.scripts.push(ksc.id);

  // --- formasi (scene): gerak, cek tepi via loop 32, bom ---
  const gf = new GB();
  const tf = gf.n('ev.timer', { sec:0.5 }, 40, 40);
  const mvA = gf.n('ac.move', { target:'tag:musuh' }, 40, 170);
  W(gf, mvA, 'dx', mathN(gf, getv(gf,'arah',-200,230), '×', 14, -200, 290), -80, 230);
  gf.l(tf,'out',mvA,'in');
  const svT = gf.n('ac.setvar', { var:'tembok' }, 40, 300);
  W(gf, svT, 'val', 0, -80, 360);
  gf.l(mvA,'out',svT,'in');
  const rep32 = gf.n('fl.repeat', { times:32 }, 40, 430);
  gf.l(svT,'out',rep32,'in');
  const fe = gf.n('da.findent', {}, 300, 500);
  W(gf, fe, 'name', joinN(gf, { txt:'musuh_' }, mathN(gf, { node:rep32, port:'i' }, '+', 1, 140, 560), 140, 620), 180, 540);
  const xx = propG(gf, 'self', 'x', 300, 640);
  gf.nodes.find(n=>n.id===xx.node).props.target = 'self';
  gf.l(fe, 'val', xx.node, 'target');
  const b1 = gf.n('fl.branch', {}, 560, 480);
  W(gf, b1, 'cond', cmpN(gf, xx, '>', 550, 300, 760), 380, 700);
  const sv1 = gf.n('ac.setvar', { var:'tembok' }, 820, 440);
  W(gf, sv1, 'val', 1, 700, 500);
  const bk1 = gf.n('ac.break', {}, 820, 580);
  gf.l(rep32,'Badan',b1,'in'); gf.l(b1,'Benar',sv1,'in'); gf.l(sv1,'out',bk1,'in');
  const b2 = gf.n('fl.branch', {}, 560, 720);
  W(gf, b2, 'cond', logicN(gf, 'AND', cmpN(gf, xx, '<', 90, 300, 860), cmpN(gf, xx, '>', 0, 300, 1000), 300, 940), 380, 780);
  const sv2 = gf.n('ac.setvar', { var:'tembok' }, 820, 680);
  W(gf, sv2, 'val', 1, 700, 740);
  const bk2 = gf.n('ac.break', {}, 820, 820);
  gf.l(b1,'Salah',b2,'in'); gf.l(b2,'Benar',sv2,'in'); gf.l(sv2,'out',bk2,'in');
  const yy = propG(gf, 'self', 'y', 300, 1120);
  gf.nodes.find(n=>n.id===yy.node).props.target = 'self';
  gf.l(fe, 'val', yy.node, 'target');
  const b3 = gf.n('fl.branch', {}, 560, 1000);
  W(gf, b3, 'cond', cmpN(gf, yy, '>', 500, 300, 1200), 380, 1040);
  const lsf = gf.n('ac.lose', {}, 820, 960);
  W(gf, lsf, 'text', { txt:'Alien mendarat! Game over.' }, 700, 1020);
  gf.l(b2,'Salah',b3,'in'); gf.l(b3,'Benar',lsf,'in');
  const brT = gf.n('fl.branch', {}, 40, 560);
  W(gf, brT, 'cond', getv(gf,'tembok',-120,620), -60, 580);
  gf.l(rep32,'Selesai',brT,'in');
  const svA = gf.n('ac.setvar', { var:'arah' }, 300, 560);
  W(gf, svA, 'val', mathN(gf, getv(gf,'arah',100,660), '×', -1, 100, 720), 180, 620);
  const mvD = gf.n('ac.move', { target:'tag:musuh' }, 300, 760);
  W(gf, mvD, 'dy', 22, 180, 820);
  gf.l(brT,'Benar',svA,'in'); gf.l(svA,'out',mvD,'in');
  const tB = gf.n('ev.timer', { sec:1.1 }, 40, 1000);
  const bxx = mathN(gf, mathN(gf, rndN(gf, 1, 8, -220, 1100), '-', 1, -220, 1160), '×', 58, -220, 1220);
  const spE = gf.n('ac.spawn', { prefab:'PeluruE' }, 300, 1060);
  W(gf, spE, 'x', mathN(gf, bxx, '+', 118, -60, 1280), -60, 1120);
  W(gf, spE, 'y', 110, -60, 1200);
  gf.l(tB,'out',spE,'in');
  prj.scripts.push({ id: nid('k'), name:'Formasi', attach:'scene:'+sid, graph: gf });
  return prj;
}

// ================= 4) TETRIS (pakai Playlist) =================
function buildTetris(){
  const CW = 24, BX = 120, BY = 40;
  const COLS = { 1:'#22d3ee', 2:'#fbbf24', 3:'#a78bfa', 4:'#4ade80', 5:'#f87171', 6:'#60a5fa', 7:'#fb923c' };
  const BGC = '#191922';
  const base = {
    1: [[-1,0],[0,0],[1,0],[2,0]], 2: [[0,0],[1,0],[0,1],[1,1]],
    3: [[-1,0],[0,0],[1,0],[0,1]], 4: [[0,0],[1,0],[-1,1],[0,1]],
    5: [[-1,0],[0,0],[0,1],[1,1]], 6: [[-1,0],[0,0],[1,0],[-1,1]],
    7: [[-1,0],[0,0],[1,0],[1,1]]
  };
  const rot1 = c => [-c[1], c[0]];
  const packed = {};
  for(let t=1;t<=7;t++){
    let cells = base[t];
    for(let r=0;r<4;r++){
      packed[t+'_'+r] = cells.map(c => (c[0]+2)*100 + (c[1]+2));
      cells = cells.map(rot1);
    }
  }
  const ents = [];
  for(let i=0;i<200;i++){
    const col = i%10, row = Math.floor(i/10);
    ents.push(ent('sel_'+i, BX + col*CW + 12, BY + row*CW + 12, 22, 22, { t:'rect', color:BGC }, { z:1 }));
  }
  ents.push(txtEnt('skorUI', 240, 18, 'Skor: 0', 17, '#e8e8ea'));
  ents.push(txtEnt('bantu', 240, 588, 'geser · putar · turun · R ulang', 12, '#6b6b78'));

  const prj = {
    magic:'nexus-project', v:1, name:'Tetris Node',
    settings:{ w:480, h:600 },
    assets:{ sprites:[] }, prefabs:[],
    scenes:[{ id: nid('s'), name:'Papan', bg:'#101016', variables:[
      { name:'papan', value:[] }, { name:'px', value:4 }, { name:'py', value:1 },
      { name:'tipe', value:1 }, { name:'rot', value:0 },
      { name:'okPos', value:0 }, { name:'geserOK', value:0 }, { name:'skor', value:0 },
      { name:'cnt', value:0 }, { name:'dst', value:0 }, { name:'src', value:0 }
    ], entities: ents }],
    scripts:[], groups:[]
  };
  const sid = prj.scenes[0].id;

  // nama list offset dinamis: 'T'+tipe+'_'+rot
  function dynT(g, x, y){
    const j1 = joinN(g, { txt:'_' }, getv(g,'rot',x-160,y+60), x-160, y);
    const j2 = joinN(g, getv(g,'tipe',x-320,y-10), j1, x-320, y-70);
    return joinN(g, { txt:'T' }, j2, x-480, y-130);
  }
  // offsets: listget dinamis utk node repeat (i)
  function offsets(g, rep, x, y){
    const lg = g.n('da.listget', { var:'' }, x, y);
    const nm = dynT(g, x-220, y-60);
    g.l(nm.node, 'val', lg, 'var');
    W(g, lg, 'idx', { node: rep, port:'i' }, x-80, y+56);
    return { node: lg, port:'val' };
  }
  // dari offset o: dx,dy,bx,by,idx papan
  function cellIdx(g, o, x, y){
    const dx = mathN(g, math1N(g, mathN(g, o, '÷', 100, x-180, y), 'floor', x-180, y+56), '-', 2, x-180, y+112);
    const dy = mathN(g, mathN(g, o, '%', 100, x-180, y+190), '-', 2, x-180, y+250);
    const bx = mathN(g, getv(g,'px',x-360,y+60), '+', dx, x-360, y+310);
    const by = mathN(g, getv(g,'py',x-360,y+420), '+', dy, x-360, y+480);
    const idx = mathN(g, bx, '+', mathN(g, by, '×', 10, x-520, y+550), x-520, y+610);
    return { dx, dy, bx, by, idx };
  }
  function findCell(g, idx, x, y){
    const fe = g.n('da.findent', {}, x, y);
    W(g, fe, 'name', joinN(g, { txt:'sel_' }, idx, x-150, y+60), x-80, y+30);
    return { node: fe, port:'val' };
  }
  // rantai warna utk nilai 1..7; return node setcolor terakhir
  function colorChain(g, prevNode, outPort, valSrc, targetSrc, x, y){
    let prev = prevNode, port = outPort;
    for(let v=1; v<=6; v++){
      const c = g.n('da.cmp', { cmp:'=' }, x, y+v*44);
      W(g, c, 'a', valSrc, x-70, y+v*44); W(g, c, 'b', v, x-70, y+v*44+56);
      const br = g.n('fl.branch', {}, x+150, y+v*44);
      W(g, br, 'cond', { node:c, port:'val' }, x+80, y+v*44+56);
      g.l(prev, port, br, 'in');
      const sc = g.n('ac.setcolor', { target:'self' }, x+330, y+v*44);
      W(g, sc, 'target', targetSrc, x+210, y+v*44+56);
      W(g, sc, 'color', { txt: COLS[v] }, x+210, y+v*44);
      g.l(br, 'Benar', sc, 'in');
      prev = br; port = 'Salah';
    }
    const sc7 = g.n('ac.setcolor', { target:'self' }, x+330, y+7*44);
    W(g, sc7, 'target', targetSrc, x+210, y+7*44+56);
    W(g, sc7, 'color', { txt: COLS[7] }, x+210, y+7*44);
    g.l(prev, 'Salah', sc7, 'in');
    return sc7;
  }
  const mkGrp = (name, g, params) => {
    const id = nid('g');
    prj.groups.push({ id, name, graph: g, params: params||[] });
    return id;
  };

  // ---- PLAYLIST: Hapus Piece ----
  let g = new GB();
  {
    const mi = g.n('grp.in', {}, 0, 300);
    const rep = g.n('fl.repeat', { times:4 }, 260, 300);
    g.l(mi,'out',rep,'in');
    const o = offsets(g, rep, 520, 380);
    const ci = cellIdx(g, o, 760, 380);
    const sc = g.n('ac.setcolor', { target:'self' }, 1240, 400);
    W(g, sc, 'target', findCell(g, ci.idx, 1000, 460), 1120, 470);
    W(g, sc, 'color', { txt: BGC }, 1120, 420);
    g.l(rep,'Badan',sc,'in');
    const mo = g.n('grp.out', {}, 1480, 300);
    g.l(sc,'out',mo,'in');
  }
  const G_HAPUS = mkGrp('Hapus Piece', g);

  // ---- PLAYLIST: Gambar Piece ----
  g = new GB();
  {
    const mi = g.n('grp.in', {}, 0, 300);
    const rep = g.n('fl.repeat', { times:4 }, 260, 300);
    g.l(mi,'out',rep,'in');
    const o = offsets(g, rep, 520, 380);
    const ci = cellIdx(g, o, 760, 380);
    const c0 = g.n('da.cmp', { cmp:'<' }, 1050, 700);
    W(g, c0, 'a', ci.idx, 950, 740); W(g, c0, 'b', 0, 950, 796);
    const nt = g.n('da.logic', { op:'NOT' }, 1230, 700);
    W(g, nt, 'a', { node:c0, port:'val' }, 1130, 756);
    const br0 = g.n('fl.branch', {}, 1420, 380);
    W(g, br0, 'cond', { node:nt, port:'val' }, 1320, 740);
    g.l(rep,'Badan',br0,'in');
    const fc = findCell(g, ci.idx, 1660, 460);
    const last = colorChain(g, br0, 'Benar', getv(g,'tipe',1520,900), fc, 1900, 380);
    const mo = g.n('grp.out', {}, 2350, 300);
    g.l(last,'out',mo,'in'); g.l(br0,'Salah',mo,'in');
  }
  const G_GAMBAR = mkGrp('Gambar Piece', g);

  // ---- PLAYLIST: Posisi Valid? ----
  g = new GB();
  {
    const mi = g.n('grp.in', {}, 0, 300);
    const sv = g.n('ac.setvar', { var:'okPos' }, 260, 300);
    W(g, sv, 'val', 1, 140, 360);
    g.l(mi,'out',sv,'in');
    const rep = g.n('fl.repeat', { times:4 }, 260, 470);
    g.l(sv,'out',rep,'in');
    const o = offsets(g, rep, 520, 550);
    const ci = cellIdx(g, o, 760, 550);
    const c1 = cmpN(g, ci.bx, '<', 0, 1060, 560);
    const c2 = cmpN(g, ci.bx, '>', 9, 1060, 720);
    const c4 = cmpN(g, ci.by, '>', 19, 1060, 880);
    const or1 = logicN(g, 'OR', c1, c2, 1300, 620);
    const or2 = logicN(g, 'OR', or1, c4, 1300, 760);
    const b1 = g.n('fl.branch', {}, 1540, 620);
    W(g, b1, 'cond', or2, 1440, 700);
    const sv0 = g.n('ac.setvar', { var:'okPos' }, 1800, 560);
    W(g, sv0, 'val', 0, 1680, 620);
    const bk1 = g.n('ac.break', {}, 1800, 700);
    g.l(rep,'Badan',b1,'in'); g.l(b1,'Benar',sv0,'in'); g.l(sv0,'out',bk1,'in');
    const lv = g.n('da.listget', { var:'papan' }, 1060, 1060);
    W(g, lv, 'idx', ci.idx, 960, 1120);
    const c3 = cmpN(g, { node:lv, port:'val' }, '≠', 0, 1300, 1060);
    const b2 = g.n('fl.branch', {}, 1540, 1060);
    W(g, b2, 'cond', c3, 1440, 1120);
    const sv0b = g.n('ac.setvar', { var:'okPos' }, 1800, 1000);
    W(g, sv0b, 'val', 0, 1680, 1060);
    const bk2 = g.n('ac.break', {}, 1800, 1140);
    g.l(b1,'Salah',b2,'in'); g.l(b2,'Benar',sv0b,'in'); g.l(sv0b,'out',bk2,'in');
    const mo = g.n('grp.out', {}, 2050, 300);
    g.l(rep,'Selesai',mo,'in');
  }
  const G_VALID = mkGrp('Posisi Valid?', g);

  // ---- PLAYLIST: Geser Piece (params dx, dy) ----
  g = new GB();
  let mAddX, mAddY, mSubX, mSubY;
  {
    const mi = g.n('grp.in', {}, 0, 300);
    const sv = g.n('ac.setvar', { var:'geserOK' }, 260, 300);
    W(g, sv, 'val', 1, 140, 360);
    const hp = g.n('grp:'+G_HAPUS, {}, 260, 440);
    mAddX = g.n('da.math', { op:'+' }, 520, 300); W(g, mAddX, 'a', getv(g,'px',340,340), 420, 340);
    g.nodes.find(n=>n.id===mAddX).props.b = 0;
    const spx = g.n('ac.setvar', { var:'px' }, 780, 300);
    W(g, spx, 'val', { node:mAddX, port:'val' }, 660, 340);
    mAddY = g.n('da.math', { op:'+' }, 520, 460); W(g, mAddY, 'a', getv(g,'py',340,500), 420, 500);
    g.nodes.find(n=>n.id===mAddY).props.b = 0;
    const spy = g.n('ac.setvar', { var:'py' }, 780, 460);
    W(g, spy, 'val', { node:mAddY, port:'val' }, 660, 500);
    const vd = g.n('grp:'+G_VALID, {}, 1040, 380);
    const br = g.n('fl.branch', {}, 1300, 380);
    W(g, br, 'cond', getv(g,'okPos',1180,460), 1180, 420);
    mSubX = g.n('da.math', { op:'-' }, 1560, 300); W(g, mSubX, 'a', getv(g,'px',1380,340), 1480, 340);
    g.nodes.find(n=>n.id===mSubX).props.b = 0;
    const spx2 = g.n('ac.setvar', { var:'px' }, 1820, 300);
    W(g, spx2, 'val', { node:mSubX, port:'val' }, 1700, 340);
    mSubY = g.n('da.math', { op:'-' }, 1560, 460); W(g, mSubY, 'a', getv(g,'py',1380,500), 1480, 500);
    g.nodes.find(n=>n.id===mSubY).props.b = 0;
    const spy2 = g.n('ac.setvar', { var:'py' }, 1820, 460);
    W(g, spy2, 'val', { node:mSubY, port:'val' }, 1700, 500);
    const sv0 = g.n('ac.setvar', { var:'geserOK' }, 1820, 620);
    W(g, sv0, 'val', 0, 1700, 680);
    const gb2 = g.n('grp:'+G_GAMBAR, {}, 1820, 760);
    const gb1 = g.n('grp:'+G_GAMBAR, {}, 1300, 880);
    g.l(mi,'out',sv,'in'); g.l(sv,'out',hp,'in'); g.l(hp,'out',spx,'in'); g.l(spx,'out',spy,'in');
    g.l(spy,'out',vd,'in'); g.l(vd,'out',br,'in');
    g.l(br,'Salah',spx2,'in'); g.l(spx2,'out',spy2,'in'); g.l(spy2,'out',sv0,'in'); g.l(sv0,'out',gb2,'in');
    g.l(br,'Benar',gb1,'in');
    const mo = g.n('grp.out', {}, 2080, 880);
    g.l(gb1,'out',mo,'in'); g.l(gb2,'out',mo,'in');
  }
  const G_GESER = mkGrp('Geser Piece', g, [
    { param:'dx', node:mAddX, input:'b', t:'num', w:'num', d:-1 },
    { param:'dx', node:mSubX, input:'b', t:'num', w:'num', d:-1 },
    { param:'dy', node:mAddY, input:'b', t:'num', w:'num', d:0 },
    { param:'dy', node:mSubY, input:'b', t:'num', w:'num', d:0 }
  ]);

  // ---- PLAYLIST: Kunci & Bersih Baris ----
  g = new GB();
  {
    const mi = g.n('grp.in', {}, 0, 300);
    const rep = g.n('fl.repeat', { times:4 }, 260, 300);
    g.l(mi,'out',rep,'in');
    const o = offsets(g, rep, 520, 380);
    const ci = cellIdx(g, o, 760, 380);
    const ls = g.n('ac.listset', { var:'papan' }, 1240, 400);
    W(g, ls, 'idx', ci.idx, 1120, 460);
    W(g, ls, 'val', getv(g,'tipe',1120,540), 1120, 520);
    g.l(rep,'Badan',ls,'in');
    const snd = g.n('ac.sound', { name:'lock' }, 260, 440);
    g.l(rep,'Selesai',snd,'in');
    const rep20 = g.n('fl.repeat', { times:20 }, 520, 440);
    g.l(snd,'out',rep20,'in');
    const svC = g.n('ac.setvar', { var:'cnt' }, 780, 440);
    W(g, svC, 'val', 0, 660, 500);
    g.l(rep20,'Badan',svC,'in');
    const rep10 = g.n('fl.repeat', { times:10 }, 780, 580);
    g.l(svC,'out',rep10,'in');
    const lvC = g.n('da.listget', { var:'papan' }, 1040, 660);
    W(g, lvC, 'idx', mathN(g, mathN(g, { node:rep20, port:'i' }, '×', 10, 860, 740), '+', { node:rep10, port:'i' }, 860, 800), 940, 720);
    const cb = g.n('fl.branch', {}, 1300, 620);
    W(g, cb, 'cond', cmpN(g, { node:lvC, port:'val' }, '≠', 0, 1160, 720), 1180, 660);
    const cc = g.n('ac.chgvar', { var:'cnt', by:1 }, 1560, 580);
    g.l(rep10,'Badan',cb,'in'); g.l(cb,'Benar',cc,'in');
    const fb = g.n('fl.branch', {}, 780, 760);
    W(g, fb, 'cond', cmpN(g, getv(g,'cnt',640,840), '=', 10, 640, 880), 660, 800);
    g.l(cb,'Salah',fb,'in');
    const cs = g.n('ac.chgvar', { var:'skor', by:100 }, 1040, 800);
    g.l(fb,'Benar',cs,'in');
    // geser baris di atasnya
    const repJ = g.n('fl.repeat', { times:0 }, 1040, 940);
    W(g, repJ, 'times', { node: rep20, port:'i' }, 900, 1000);
    g.l(cs,'out',repJ,'in');
    const svD = g.n('ac.setvar', { var:'dst' }, 1300, 900);
    W(g, svD, 'val', mathN(g, { node:rep20, port:'i' }, '-', { node:repJ, port:'i' }, 1140, 960), 1220, 920);
    const svS = g.n('ac.setvar', { var:'src' }, 1300, 1060);
    W(g, svS, 'val', mathN(g, getv(g,'dst',1140,1120), '-', 1, 1140, 1180), 1220, 1100);
    const repC = g.n('fl.repeat', { times:10 }, 1300, 1200);
    g.l(repJ,'Badan',svD,'in'); g.l(svD,'out',svS,'in'); g.l(svS,'out',repC,'in');
    const lvS = g.n('da.listget', { var:'papan' }, 1560, 1300);
    W(g, lvS, 'idx', mathN(g, mathN(g, getv(g,'src',1380,1420), '×', 10, 1380, 1480), '+', { node:repC, port:'i' }, 1380, 1540), 1460, 1360);
    const lsD = g.n('ac.listset', { var:'papan' }, 1820, 1240);
    W(g, lsD, 'idx', mathN(g, mathN(g, getv(g,'dst',1640,1360), '×', 10, 1640, 1420), '+', { node:repC, port:'i' }, 1640, 1480), 1720, 1300);
    W(g, lsD, 'val', { node: lvS, port:'val' }, 1720, 1380);
    g.l(repC,'Badan',lsD,'in');
    // baris paling atas dikosongkan
    const repT = g.n('fl.repeat', { times:10 }, 1040, 1400);
    g.l(repJ,'Selesai',repT,'in');
    const lsT = g.n('ac.listset', { var:'papan' }, 1300, 1400);
    W(g, lsT, 'idx', { node:repT, port:'i' }, 1180, 1460);
    W(g, lsT, 'val', 0, 1180, 1520);
    g.l(repT,'Badan',lsT,'in');
    // update skor UI
    const sUI = g.n('ac.settext', { target:'name:skorUI' }, 520, 1560);
    W(g, sUI, 'text', joinN(g, { txt:'Skor: ' }, getv(g,'skor',340,1640), 340, 1600), 400, 1620);
    g.l(rep20,'Selesai',sUI,'in');
    // repaint semua sel
    const rep2 = g.n('fl.repeat', { times:200 }, 520, 1700);
    g.l(sUI,'out',rep2,'in');
    const lvR = g.n('da.listget', { var:'papan' }, 780, 1780);
    W(g, lvR, 'idx', { node:rep2, port:'i' }, 660, 1840);
    const brR = g.n('fl.branch', {}, 1040, 1740);
    W(g, brR, 'cond', cmpN(g, { node:lvR, port:'val' }, '=', 0, 900, 1840), 920, 1780);
    const scBg = g.n('ac.setcolor', { target:'self' }, 1300, 1700);
    W(g, scBg, 'target', findCell(g, { node:rep2, port:'i' }, 1040, 1900), 1180, 1910);
    W(g, scBg, 'color', { txt: BGC }, 1180, 1760);
    g.l(rep2,'Badan',brR,'in'); g.l(brR,'Benar',scBg,'in');
    const last = colorChain(g, brR, 'Salah', { node: lvR, port:'val' }, findCell(g, { node:rep2, port:'i' }, 1040, 2020), 1560, 1700);
    const mo = g.n('grp.out', {}, 2300, 1700);
    g.l(rep2,'Selesai',mo,'in'); g.l(last,'out',mo,'in');
  }
  const G_KUNCI = mkGrp('Kunci & Bersih Baris', g);

  // ---- PLAYLIST: Spawn Piece ----
  g = new GB();
  {
    const mi = g.n('grp.in', {}, 0, 300);
    const st = g.n('ac.setvar', { var:'tipe' }, 260, 300);
    W(g, st, 'val', rndN(g, 1, 7, 80, 380), 160, 340);
    const sr = g.n('ac.setvar', { var:'rot' }, 520, 300);
    W(g, sr, 'val', 0, 400, 360);
    const sx2 = g.n('ac.setvar', { var:'px' }, 780, 300);
    W(g, sx2, 'val', 4, 660, 360);
    const sy2 = g.n('ac.setvar', { var:'py' }, 1040, 300);
    W(g, sy2, 'val', 1, 920, 360);
    const vd = g.n('grp:'+G_VALID, {}, 1040, 460);
    const br = g.n('fl.branch', {}, 1300, 380);
    W(g, br, 'cond', getv(g,'okPos',1180,460), 1180, 420);
    const gb = g.n('grp:'+G_GAMBAR, {}, 1300, 500);
    const ls2 = g.n('ac.lose', {}, 1560, 500);
    W(g, ls2, 'text', joinN(g, { txt:'Papan penuh! Skor: ' }, getv(g,'skor',1380,580), 1380, 560), 1440, 560);
    g.l(mi,'out',st,'in'); g.l(st,'out',sr,'in'); g.l(sr,'out',sx2,'in'); g.l(sx2,'out',sy2,'in');
    g.l(sy2,'out',vd,'in'); g.l(vd,'out',br,'in');
    g.l(br,'Benar',gb,'in'); g.l(br,'Salah',ls2,'in');
    const mo = g.n('grp.out', {}, 1560, 360);
    g.l(gb,'out',mo,'in');
  }
  const G_SPAWN = mkGrp('Spawn Piece', g);

  // ---- PLAYLIST: Turun 1 Langkah ----
  g = new GB();
  {
    const mi = g.n('grp.in', {}, 0, 300);
    const gs = g.n('grp:'+G_GESER, {}, 260, 300);
    g.nodes.find(n=>n.id===gs).props = { dx:0, dy:1 };
    const br = g.n('fl.branch', {}, 520, 300);
    W(g, br, 'cond', getv(g,'geserOK',400,380), 400, 400);
    const kn = g.n('grp:'+G_KUNCI, {}, 520, 480);
    const sp = g.n('grp:'+G_SPAWN, {}, 780, 480);
    g.l(mi,'out',gs,'in'); g.l(gs,'out',br,'in');
    g.l(br,'Salah',kn,'in'); g.l(kn,'out',sp,'in');
    const mo = g.n('grp.out', {}, 1040, 300);
    g.l(br,'Benar',mo,'in'); g.l(sp,'out',mo,'in');
  }
  const G_TURUN = mkGrp('Turun 1 Langkah', g);

  // ---- script Mulai ----
  g = new GB();
  {
    const evS = g.n('ev.start', {}, 40, 40);
    const rpI = g.n('fl.repeat', { times:200 }, 40, 170);
    g.l(evS,'out',rpI,'in');
    const ap0 = g.n('ac.listapp', { var:'papan' }, 300, 170);
    W(g, ap0, 'val', 0, 180, 230);
    g.l(rpI,'Badan',ap0,'in');
    let prev = rpI, py2 = 320;
    for(let t=1;t<=7;t++) for(let r=0;r<4;r++){
      const ids = [];
      for(let k=0;k<4;k++){
        const ap = g.n('ac.listapp', { var:('T'+t+'_'+r) }, 300 + k*260, py2);
        W(g, ap, 'val', packed[t+'_'+r][k], 180 + k*260, py2+60);
        ids.push(ap);
      }
      g.l(prev, prev===rpI ? 'Selesai' : 'out', ids[0], 'in');
      for(let k=0;k<3;k++) g.l(ids[k],'out',ids[k+1],'in');
      prev = ids[3]; py2 += 74;
    }
    const sUI = g.n('ac.settext', { target:'name:skorUI' }, 300, py2);
    W(g, sUI, 'text', { txt:'Skor: 0' }, 180, py2+60);
    g.l(prev,'out',sUI,'in');
    const spG = g.n('grp:'+G_SPAWN, {}, 300, py2+140);
    g.l(sUI,'out',spG,'in');
  }
  prj.scripts.push({ id: nid('k'), name:'Mulai', attach:'scene:'+sid, graph: g });

  // ---- script Tombol ----
  g = new GB();
  {
    const kL = g.n('ev.key', { key:'ArrowLeft' }, 40, 40);
    const gsL = g.n('grp:'+G_GESER, {}, 40, 170);
    g.nodes.find(n=>n.id===gsL).props = { dx:-1, dy:0 };
    g.l(kL,'out',gsL,'in');
    const kR = g.n('ev.key', { key:'ArrowRight' }, 320, 40);
    const gsR = g.n('grp:'+G_GESER, {}, 320, 170);
    g.nodes.find(n=>n.id===gsR).props = { dx:1, dy:0 };
    g.l(kR,'out',gsR,'in');
    const kD = g.n('ev.key', { key:'ArrowDown' }, 600, 40);
    const gsD = g.n('grp:'+G_TURUN, {}, 600, 170);
    g.l(kD,'out',gsD,'in');
    const kU = g.n('ev.key', { key:'ArrowUp' }, 880, 40);
    const hpU = g.n('grp:'+G_HAPUS, {}, 880, 170);
    const r1 = g.n('ac.setvar', { var:'rot' }, 880, 300);
    W(g, r1, 'val', mathN(g, mathN(g, getv(g,'rot',560,360), '+', 1, 560, 420), '%', 4, 560, 480), 760, 320);
    const vdU = g.n('grp:'+G_VALID, {}, 880, 430);
    const brU = g.n('fl.branch', {}, 1150, 360);
    W(g, brU, 'cond', getv(g,'okPos',1030,440), 1030, 460);
    const r3 = g.n('ac.setvar', { var:'rot' }, 1420, 300);
    W(g, r3, 'val', mathN(g, mathN(g, getv(g,'rot',1120,360), '+', 3, 1120, 420), '%', 4, 1120, 480), 1300, 320);
    const gbU = g.n('grp:'+G_GAMBAR, {}, 1420, 430);
    const gbU2 = g.n('grp:'+G_GAMBAR, {}, 1150, 500);
    g.l(kU,'out',hpU,'in'); g.l(hpU,'out',r1,'in'); g.l(r1,'out',vdU,'in'); g.l(vdU,'out',brU,'in');
    g.l(brU,'Salah',r3,'in'); g.l(r3,'out',gbU,'in');
    g.l(brU,'Benar',gbU2,'in');
    const kRr = g.n('ev.key', { key:'KeyR' }, 40, 560);
    const rsR = g.n('ac.restart', {}, 40, 690);
    g.l(kRr,'out',rsR,'in');
  }
  prj.scripts.push({ id: nid('k'), name:'Tombol', attach:'scene:'+sid, graph: g });

  // ---- script Gravitasi ----
  g = new GB();
  const tm = g.n('ev.timer', { sec:0.55 }, 40, 40);
  const td = g.n('grp:'+G_TURUN, {}, 40, 170);
  g.l(tm,'out',td,'in');
  prj.scripts.push({ id: nid('k'), name:'Gravitasi', attach:'scene:'+sid, graph: g });

  return prj;
}

// ============ main ============
mkdirSync(OUT, { recursive:true });
const items = [];
function emit(id, name, icon, desc, prj){
  writeFileSync(join(OUT, id + '.json'), JSON.stringify(prj));
  items.push({ id, name, icon, desc });
  const nodes = prj.scripts.reduce((a,s)=>a+(s.graph.nodes||[]).length, 0)
    + prj.groups.reduce((a,x)=>a+(x.graph.nodes||[]).length, 0);
  console.log(id.padEnd(16), (nodes+' nodes').padStart(8), (JSON.stringify(prj).length/1024).toFixed(1)+' KB');
}
emit('dice', 'Lempar Dadu', '🎲', 'Klik tombol, angka acak 1-6 + jumlah lemparan', buildDice());
emit('snake', 'Ular Sanke', '🐍', 'Panah untuk gerak. Makan, ekor memanjang!', buildSnake());
emit('space-invaders', 'Space Invaders', '👾', '32 alien turun formasi. Tembak semuanya!', buildInvaders());
emit('tetris', 'Tetris Node', '🧱', 'Dibuat pakai 7 Playlist: Geser, Valid, Kunci, Spawn...', buildTetris());
writeFileSync(join(OUT, 'index.json'), JSON.stringify(items, null, 1));
console.log('OK — examples/index.json');
