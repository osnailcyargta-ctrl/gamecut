// NEXUS Engine - Node type library (the only "vocabulary"; games = graphs of these nodes)
// def fields: ti(title) k(kind: ev/ac/fl/da) ein(has exec-in) ex(exec-out names) in[](data-in) out[](data-out) d(desc)
NX.TCOL = { num:'#fbbf24', text:'#22d3ee', bool:'#f87171', ref:'#c084fc', list:'#818cf8', any:'#94a3b8', exec:'#ffffff' };
NX.CATS = { ev:{n:'Event', c:'#22c55e'}, ac:{n:'Aksi', c:'#3b82f6'}, fl:{n:'Alur', c:'#f59e0b'}, da:{n:'Data', c:'#eab308'}, gr:{n:'Playlist', c:'#a78bfa'} };

(function(){
  const i = (n,t,w,d) => ({n, t, w, d});
  const o = (n,t) => ({n, t});

  NX.DEFS = {
    // ---------- EVENTS ----------
    'ev.start'  :{ti:'Saat Mulai',        k:'ev', ex:['out'], d:'Jalankan sekali saat scene dimulai.'},
    'ev.update' :{ti:'Tiap Frame',        k:'ev', ex:['out'], d:'Jalankan setiap frame (~60x per detik).'},
    'ev.key'    :{ti:'Saat Tombol Ditekan',k:'ev', ex:['out'], in:[i('key','text','key','Space')], d:'Jalankan sekali setiap kali tombol ditekan.'},
    'ev.click'  :{ti:'Saat Diklik',       k:'ev', ex:['out'], d:'Entitas ini (atau layar, untuk script scene) diklik.'},
    'ev.collide':{ti:'Saat Tabrakan',     k:'ev', ex:['out'], in:[i('with','text','coll','any')], out:[o('other','ref')], d:'Mulai menabrak target (any / tag:... / nama entitas).'},
    'ev.timer'  :{ti:'Setiap X Detik',    k:'ev', ex:['out'], in:[i('sec','num','num',1)], d:'Jalankan berulang setiap X detik.'},
    'ev.msg'    :{ti:'Saat Pesan',        k:'ev', ex:['out'], in:[i('name','text','txt','go')], d:'Menerima pesan dari node Kirim Pesan.'},

    // ---------- ACTIONS ----------
    'ac.move'     :{ti:'Geser',           k:'ac', ein:1, ex:['out'], in:[i('dx','num','num',0), i('dy','num','num',0)], d:'Geser target sebesar dx, dy piksel.'},
    'ac.setpos'   :{ti:'Pindah ke',       k:'ac', ein:1, ex:['out'], in:[i('x','num','num',0), i('y','num','num',0)], d:'Pindahkan target ke posisi (x, y). Pusat scene = (W/2, H/2).'},
    'ac.rotate'   :{ti:'Putar',           k:'ac', ein:1, ex:['out'], in:[i('deg','num','num',90)], d:'Putar target sebesar derajat.'},
    'ac.spawn'    :{ti:'Spawn Prefab',    k:'ac', ein:1, ex:['out'], in:[i('prefab','text','prefab',''), i('x','num','num',0), i('y','num','num',0)], out:[o('entity','ref')], d:'Munculkan salinan Prefab di posisi (x, y).'},
    'ac.destroy'  :{ti:'Hancurkan',       k:'ac', ein:1, ex:['out'], in:[i('target','ref','target','self')], d:'Hancurkan target (Self / Other / nama / tag:...).'},
    'ac.sound'    :{ti:'Bunyikan Suara',  k:'ac', ein:1, ex:['out'], in:[i('name','text','sound','beep')], d:'Mainkan efek suara sintetis.'},
    'ac.msg'      :{ti:'Kirim Pesan',     k:'ac', ein:1, ex:['out'], in:[i('name','text','txt','go')], d:'Kirim pesan ke semua graph yang punya node Saat Pesan.'},
    'ac.setvar'   :{ti:'Set Variabel',    k:'ac', ein:1, ex:['out'], in:[i('var','text','varname',''), i('val','any','txt',0)], d:'Isi variabel scene dengan nilai.'},
    'ac.chgvar'   :{ti:'Tambah Variabel', k:'ac', ein:1, ex:['out'], in:[i('var','text','varname',''), i('by','num','num',1)], d:'Tambah (atau kurangi, pakai minus) nilai variabel.'},
    'ac.settext'  :{ti:'Set Teks',        k:'ac', ein:1, ex:['out'], in:[i('target','ref','target','self'), i('text','any','txt','Halo')], d:'Ubah isi teks entitas teks.'},
    'ac.setcolor' :{ti:'Set Warna',       k:'ac', ein:1, ex:['out'], in:[i('target','ref','target','self'), i('color','text','color','#ff5566')], d:'Ubah warna kotak/bulat/teks target.'},
    'ac.setvis'   :{ti:'Tampil / Sembunyi',k:'ac', ein:1, ex:['out'], in:[i('target','ref','target','self'), i('vis','any','bool',1)], d:'Tampilkan (1) atau sembunyikan (0) target.'},
    'ac.listapp'  :{ti:'List Tambah',     k:'ac', ein:1, ex:['out'], in:[i('var','text','varname',''), i('val','any','txt',0)], d:'Tambahkan nilai ke akhir variabel list.'},
    'ac.listset'  :{ti:'List Set Index',  k:'ac', ein:1, ex:['out'], in:[i('var','text','varname',''), i('idx','num','num',0), i('val','any','txt',0)], d:'Isi elemen list pada index tertentu.'},
    'ac.listrem'  :{ti:'List Hapus Index',k:'ac', ein:1, ex:['out'], in:[i('var','text','varname',''), i('idx','num','num',0)], d:'Hapus elemen list pada index (yang setelahnya bergeser).'},
    'ac.win'      :{ti:'MENANG',          k:'ac', ein:1, ex:['out'], in:[i('text','text','txt','Kamu Menang!')], d:'Tampilkan layar menang & hentikan scene.'},
    'ac.lose'     :{ti:'KALAH',           k:'ac', ein:1, ex:['out'], in:[i('text','text','txt','Game Over')], d:'Tampilkan layar kalah & hentikan scene.'},
    'ac.restart'  :{ti:'Ulang Scene',     k:'ac', ein:1, ex:['out'], d:'Mulai ulang scene dari awal.'},
    'ac.break'    :{ti:'Break Loop',      k:'ac', ein:1, ex:[], d:'Keluar dari loop Ulangi terdekat.'},

    // ---------- FLOW ----------
    'fl.branch':{ti:'Jika',        k:'fl', ein:1, ex:['Benar','Salah'], in:[i('cond','bool','chk',0)], d:'Pilih jalur Benar / Salah.'},
    'fl.repeat':{ti:'Ulangi N Kali',k:'fl', ein:1, ex:['Badan','Selesai'], in:[i('times','num','num',4)], out:[o('i','num')], d:'Loop 0..N-1. Pin i = hitungan loop ini.'},
    'fl.wait'  :{ti:'Tunggu',      k:'fl', ein:1, ex:['out'], in:[i('sec','num','num',1)], d:'Tunda kelanjutan beberapa detik (tidak membekukan game).'},
    'grp.in'   :{ti:'► Masuk Playlist',  k:'fl', ex:['out'], d:'Titik masuk eksekusi di dalam playlist.'},
    'grp.out'  :{ti:'► Keluar Playlist', k:'fl', ein:1, ex:[], d:'Titik selesai eksekusi di dalam playlist.'},

    // ---------- DATA ----------
    'da.num'    :{ti:'Angka',           k:'da', in:[i('v','num','num',0)], out:[o('val','num')], d:'Konstanta angka.'},
    'da.txt'    :{ti:'Teks',            k:'da', in:[i('v','text','txt','')], out:[o('val','text')], d:'Konstanta teks.'},
    'da.getvar' :{ti:'Ambil Variabel',  k:'da', in:[i('var','text','varname','')], out:[o('val','any')], d:'Baca nilai variabel scene.'},
    'da.random' :{ti:'Angka Acak',      k:'da', in:[i('min','num','num',1), i('max','num','num',6), i('bulat','any','bool',1)], out:[o('val','num')], d:'Angka acak antara min dan max.'},
    'da.math'   :{ti:'Matematika',      k:'da', in:[i('a','num','num',0), i('op','text','op','+'), i('b','num','num',0)], out:[o('val','num')], d:'+ − × ÷ % min max ^'},
    'da.math1'  :{ti:'Matematika 1',    k:'da', in:[i('a','num','num',0), i('op','text','op1','floor')], out:[o('val','num')], d:'abs, floor, round, sqrt, negatif.'},
    'da.cmp'    :{ti:'Bandingkan',      k:'da', in:[i('a','any','txt',0), i('cmp','text','cmp','='), i('b','any','txt',0)], out:[o('val','bool')], d:'Bandingkan dua nilai (angka atau teks).'},
    'da.logic'  :{ti:'Logika',          k:'da', in:[i('op','text','logic','AND'), i('a','bool','chk',0), i('b','bool','chk',0)], out:[o('val','bool')], d:'AND / OR / NOT.'},
    'da.keydown':{ti:'Tombol Ditahan',  k:'da', in:[i('key','text','key','ArrowLeft')], out:[o('val','bool')], d:'TRUE selama tombol ditahan.'},
    'da.propof' :{ti:'Properti Entitas',k:'da', in:[i('target','ref','target','self'), i('prop','text','prop','x')], out:[o('val','num')], d:'Baca x / y / w / h / rot entitas.'},
    'da.findent':{ti:'Cari Entitas',    k:'da', in:[i('name','text','txt','')], out:[o('val','ref')], d:'Cari entitas bernama tepat itu.'},
    'da.count'  :{ti:'Hitung Tag',      k:'da', in:[i('tag','text','txt','musuh')], out:[o('val','num')], d:'Hitung entitas hidup dengan tag itu.'},
    'da.listget':{ti:'List Ambil',      k:'da', in:[i('var','text','txt',''), i('idx','num','num',0)], out:[o('val','any')], d:'Baca elemen list di index (var bisa hasil Gabung Teks).'},
    'da.listlen':{ti:'List Panjang',    k:'da', in:[i('var','text','txt','')], out:[o('val','num')], d:'Jumlah elemen dalam list.'},
    'da.join'   :{ti:'Gabung Teks',     k:'da', in:[i('a','any','txt',''), i('b','any','txt','')], out:[o('val','text')], d:'Gabungkan dua nilai jadi satu teks.'}
  };

  // widget option lists
  NX.KEYS = ['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','KeyW','KeyA','KeyS','KeyD','KeyZ','KeyX','KeyC','KeyP','KeyR','ShiftLeft'];
  NX.KEYLABEL = {Space:'Spasi',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Enter:'Enter',KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',KeyZ:'Z',KeyX:'X',KeyC:'C',KeyP:'P',KeyR:'R',ShiftLeft:'Shift'};
  NX.SOUNDS = NX.audio.names;
  NX.OPTS = {
    op  : ['+','-','×','÷','%','min','max','^'],
    op1 : ['abs','floor','round','sqrt','neg'],
    cmp : ['=','≠','<','>','≤','≥'],
    logic: ['AND','OR','NOT'],
    prop : ['x','y','w','h','rot']
  };
  NX.MATHFN = {
    '+':(a,b)=>a+b, '-':(a,b)=>a-b, '×':(a,b)=>a*b, '÷':(a,b)=> b===0?0:a/b,
    '%':(a,b)=> b===0?0:((a%b)+b)%b, min:Math.min, max:Math.max, '^':Math.pow
  };
  NX.MATH1FN = { abs:Math.abs, floor:Math.floor, round:Math.round, sqrt:Math.sqrt, neg:a=>-a };
  NX.CMPFN = {
    '=':(a,b)=>a===b, '≠':(a,b)=>a!==b,
    '<':(a,b)=>a<b, '>':(a,b)=>a>b, '≤':(a,b)=>a<=b, '≥':(a,b)=>a>=b
  };

  // dynamic def for playlist (group) nodes
  NX.groupDef = function(gd){
    const seen = {}, ins = [];
    (gd.params||[]).forEach(p => {
      if(seen[p.param]) return;
      seen[p.param] = 1;
      ins.push(i(p.param, p.t||'any', p.w||'txt', p.d!=null?p.d:0));
    });
    return { ti:'🎶 ' + (gd.name||'Playlist'), k:'gr', ein:1, ex:['out'], in:ins,
      d:'Playlist: logika gabungan. Dobel-klik untuk membuka isinya.' };
  };
  NX.defOf = function(type, project){
    if(NX.DEFS[type]) return NX.DEFS[type];
    if(type.indexOf('grp:')===0 && project){
      const gid = type.slice(4);
      const gd = (project.groups||[]).find(g=>g.id===gid);
      if(gd) return NX.groupDef(gd);
    }
    return null;
  };
})();
