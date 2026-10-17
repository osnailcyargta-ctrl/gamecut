/* =====================================================================
 * GameForge Studio — snippets.js
 * Pustaka perilaku generik (generic behavior library) — ini bagian
 * dari ENGINE, bukan game. Analogi: block palette-nya Scratch atau
 * komponen bawaan Godot. Semua game dibangun dari potongan-potongan
 * generik seperti ini + script buatan sendiri.
 * ===================================================================== */
'use strict';

window.SNIPPETS = {};

SNIPPETS.blankScript = function () {
  return [
    '({',
    '  onStart(self) {',
    '    // jalan sekali saat entity muncul',
    '  },',
    '',
    '  onUpdate(self, dt) {',
    '    // jalan tiap frame — dt = detik sejak frame lalu',
    '  }',
    '})'
  ].join('\n');
};

SNIPPETS.list = [
  {
    id: 'move-arrows',
    name: 'Gerak dengan tombol panah',
    desc: 'Entity bergerak kiri/kanan/atas/bawah pakai panah. Kecepatan = self.speed.',
    code: [
      '({',
      '  onUpdate(self, dt) {',
      '    const sp = self.speed || 260;',
      '    if (game.input.down(\'ArrowLeft\'))  self.x -= sp * dt;',
      '    if (game.input.down(\'ArrowRight\')) self.x += sp * dt;',
      '    if (game.input.down(\'ArrowUp\'))    self.y -= sp * dt;',
      '    if (game.input.down(\'ArrowDown\'))  self.y += sp * dt;',
      '    const b = game.bounds();',
      '    self.x = Math.max(0, Math.min(b.w - self.width, self.x));',
      '    self.y = Math.max(0, Math.min(b.h - self.height, self.y));',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'move-wasd',
    name: 'Gerak dengan WASD',
    desc: 'Sama seperti panah, tapi pakai W/A/S/D.',
    code: [
      '({',
      '  onUpdate(self, dt) {',
      '    const sp = self.speed || 260;',
      '    if (game.input.down(\'a\')) self.x -= sp * dt;',
      '    if (game.input.down(\'d\')) self.x += sp * dt;',
      '    if (game.input.down(\'w\')) self.y -= sp * dt;',
      '    if (game.input.down(\'s\')) self.y += sp * dt;',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'follow-mouse',
    name: 'Ikuti mouse',
    desc: 'Entity mengikuti posisi kursor dengan kecepatan terbatas.',
    code: [
      '({',
      '  onUpdate(self, dt) {',
      '    const sp = self.speed || 400;',
      '    const m = game.input.mouse;',
      '    const dx = m.x - self.cx, dy = m.y - self.cy;',
      '    const d = Math.hypot(dx, dy);',
      '    if (d > 2) {',
      '      self.x += (dx / d) * Math.min(sp, sp * dt * 4) * dt * 4;',
      '      self.y += (dy / d) * Math.min(sp, sp * dt * 4) * dt * 4;',
      '    }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'gravity-jump',
    name: 'Gravitasi + lompat (Space)',
    desc: 'Platformer dasar: jatuh, lompat, lantai di dasar kanvas.',
    code: [
      '({',
      '  onUpdate(self, dt) {',
      '    const b = game.bounds();',
      '    const floor = self.floorY != null ? self.floorY : b.h - self.height;',
      '    self.vy = (self.vy || 0) + (self.gravity || 1600) * dt;',
      '    self.y += self.vy * dt;',
      '    const sp = self.speed || 300;',
      '    if (game.input.down(\'ArrowLeft\'))  self.x -= sp * dt;',
      '    if (game.input.down(\'ArrowRight\')) self.x += sp * dt;',
      '    self.x = Math.max(0, Math.min(b.w - self.width, self.x));',
      '    if (self.y >= floor) { self.y = floor; self.vy = 0; self._ground = true; }',
      '    else self._ground = false;',
      '    if (game.input.pressed(\'Space\') && self._ground) {',
      '      self.vy = -(self.jump || 640);',
      '      game.sound.play(\'bounce\');',
      '    }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'bounce-edges',
    name: 'Pantul di tepi layar',
    desc: 'Butuh velocity (vx/vy). Memantul saat kena tepi kanvas.',
    code: [
      '({',
      '  onUpdate(self) {',
      '    const b = game.bounds();',
      '    if (self.x <= 0) { self.x = 0; self.vx = Math.abs(self.vx); game.sound.play(\'bounce\'); }',
      '    if (self.x + self.width >= b.w) { self.x = b.w - self.width; self.vx = -Math.abs(self.vx); game.sound.play(\'bounce\'); }',
      '    if (self.y <= 0) { self.y = 0; self.vy = Math.abs(self.vy); game.sound.play(\'bounce\'); }',
      '    if (self.y + self.height >= b.h) { self.y = b.h - self.height; self.vy = -Math.abs(self.vy); game.sound.play(\'bounce\'); }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'shoot-on-space',
    name: 'Tembak peluru (Space)',
    desc: 'Spawn prefab peluru saat Space ditekan. Prefab = self.bulletPrefab (default "Bullet").',
    code: [
      '({',
      '  onUpdate(self, dt) {',
      '    self.cd = (self.cd || 0) - dt;',
      '    if (game.input.pressed(\'Space\') && self.cd <= 0) {',
      '      self.cd = self.cooldown || 0.35;',
      '      game.spawnFrom(self.bulletPrefab || \'Bullet\', {',
      '        x: self.cx - 3, y: self.y - 18',
      '      });',
      '      game.sound.play(\'laser\');',
      '    }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'die-offscreen',
    name: 'Hancur saat keluar layar',
    desc: 'Entity dihapus kalau sudah jauh di luar kanvas.',
    code: [
      '({',
      '  onUpdate(self) {',
      '    const b = game.bounds();',
      '    if (self.y + self.height < -60 || self.y > b.h + 60 ||',
      '        self.x + self.width < -60 || self.x > b.w + 60) self.destroy();',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'spin',
    name: 'Berputar',
    desc: 'Rotasi terus. Kecepatan derajat/detik = self.spinSpeed.',
    code: [
      '({',
      '  onUpdate(self, dt) {',
      '    self.rotation = (self.rotation + (self.spinSpeed || 90) * dt) % 360;',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'patrol-x',
    name: 'Patroli kiri-kanan',
    desc: 'Bolak-balik antara self.minX dan self.maxX.',
    code: [
      '({',
      '  onStart(self) { self._dir = 1; },',
      '  onUpdate(self, dt) {',
      '    const sp = self.speed || 120;',
      '    self.x += self._dir * sp * dt;',
      '    if (self.maxX != null && self.x > self.maxX) self._dir = -1;',
      '    if (self.minX != null && self.x < self.minX) self._dir = 1;',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'chase-tag',
    name: 'Kejar entity lain',
    desc: 'Mengejar entity terdekat dengan tag self.chaseTag.',
    code: [
      '({',
      '  onUpdate(self, dt) {',
      '    const targets = game.findAll(self.chaseTag || \'player\');',
      '    if (!targets.length) return;',
      '    let best = null, bd = Infinity;',
      '    for (const t of targets) {',
      '      const d = self.distanceTo(t);',
      '      if (d < bd) { bd = d; best = t; }',
      '    }',
      '    const sp = self.speed || 120;',
      '    if (best && bd > 1) {',
      '      self.x += ((best.cx - self.cx) / bd) * sp * dt;',
      '      self.y += ((best.cy - self.cy) / bd) * sp * dt;',
      '    }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'timer-send',
    name: 'Timer kirim pesan',
    desc: 'Setiap self.interval detik kirim pesan self.topic ke semua script.',
    code: [
      '({',
      '  onStart(self) { self._t = self.interval || 3; },',
      '  onUpdate(self, dt) {',
      '    self._t -= dt;',
      '    if (self._t <= 0) {',
      '      self._t = self.interval || 3;',
      '      game.send(self.topic || \'tick\', { time: game.time });',
      '    }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'health-damage',
    name: 'Nyawa & damage',
    desc: 'Punya self.health. Berkurang saat kena entity dengan tag self.damageTag.',
    code: [
      '({',
      '  onStart(self) { self.health = self.health != null ? self.health : 3; },',
      '  onCollide(self, other) {',
      '    if (other.tag === (self.damageTag || \'enemy\')) {',
      '      self.health -= 1;',
      '      game.sound.play(\'hit\');',
      '      if (self.health <= 0) {',
      '        game.sound.play(\'explosion\');',
      '        self.destroy();',
      '      }',
      '    }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'collect-score',
    name: 'Koin + skor',
    desc: 'Dipasang di koin: saat disentuh player (tag self.playerTag), tambah skor & hancur.',
    code: [
      '({',
      '  onCollide(self, other) {',
      '    if (other.tag === (self.playerTag || \'player\')) {',
      '      game.state.score = (game.state.score || 0) + (self.points || 10);',
      '      game.sound.play(\'coin\');',
      '      self.destroy();',
      '    }',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'score-display',
    name: 'Tampilkan skor',
    desc: 'Entity text otomatis menampilkan game.state.score.',
    code: [
      '({',
      '  onUpdate(self) {',
      '    self.text = (self.prefix || \'Score: \') + (game.state.score || 0);',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'wrap-screen',
    name: 'Wrap ke sisi lain',
    desc: 'Keluar kanan muncul kiri (ala Pac-Man).',
    code: [
      '({',
      '  onUpdate(self) {',
      '    const b = game.bounds();',
      '    if (self.x > b.w) self.x = -self.width;',
      '    if (self.x + self.width < 0) self.x = b.w;',
      '    if (self.y > b.h) self.y = -self.height;',
      '    if (self.y + self.height < 0) self.y = b.h;',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'status-display',
    name: 'Tampil pesan state',
    desc: 'Entity text menampilkan game.state.msg saat game.state.over.',
    code: [
      '({',
      '  onUpdate(self) {',
      '    const g = game.state;',
      '    if (g.over) { self.text = g.msg || \'GAME OVER\'; self.visible = true; }',
      '    else self.visible = false;',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'click-destroy',
    name: 'Klik untuk hancur',
    desc: 'Entity hilang + suara saat diklik (point-and-click sederhana).',
    code: [
      '({',
      '  onClick(self) {',
      '    game.sound.play(\'coin\');',
      '    game.state.score = (game.state.score || 0) + (self.points || 1);',
      '    self.destroy();',
      '  }',
      '})'
    ].join('\n')
  },
  {
    id: 'spawn-timer',
    name: 'Spawn berkala',
    desc: 'Setiap self.interval detik spawn prefab self.spawnPrefab di posisi acak atas layar.',
    code: [
      '({',
      '  onStart(self) { self._t = 1; },',
      '  onUpdate(self, dt) {',
      '    self._t -= dt;',
      '    if (self._t <= 0) {',
      '      self._t = self.interval || 2;',
      '      const b = game.bounds();',
      '      game.spawnFrom(self.spawnPrefab || \'Enemy\', {',
      '        x: game.random.float(20, b.w - 60), y: -40',
      '      });',
      '    }',
      '  }',
      '})'
    ].join('\n')
  }
];

SNIPPETS.byId = function (id) {
  return SNIPPETS.list.find((s) => s.id === id) || null;
};

/* ------------------------- dokumentasi API ------------------------- */

SNIPPETS.docsHTML = function () {
  const hookRows = [
    ['onStart(self)', 'Dipanggil sekali saat entity muncul di scene.'],
    ['onUpdate(self, dt)', 'Dipanggil tiap frame. dt = detik sejak frame terakhir.'],
    ['onKeyDown(self, key)', 'Saat tombol ditekan. key: "ArrowLeft", "Space", "a", dst.'],
    ['onKeyUp(self, key)', 'Saat tombol dilepas.'],
    ['onCollide(self, other)', 'Satu kali per pasangan yang bertabrakan tiap frame. Butuh collider != none.'],
    ['onClick(self)', 'Entity diklik dengan mouse (mode Play).'],
    ['onMessage(self, topic, data)', 'Menerima pesan dari game.send(topic, data).'],
    ['onDraw(self, ctx, time)', 'Gambar custom di canvas (koordinat dunia) setelah bentuk bawaan.']
  ].map((r) => '<tr><td><code>' + r[0] + '</code></td><td>' + r[1] + '</td></tr>').join('');

  const apiRows = [
    ['game.state', 'Objek state bebas — dipakai bebas oleh semua script (skor, posisi, dsb).'],
    ['game.bounds()', '<code>{w, h}</code> ukuran kanvas game.'],
    ['game.time / game.dt', 'Waktu (detik) sejak scene mulai / dt frame ini.'],
    ['game.input.down("ArrowLeft")', 'Tombol sedang ditekan?'],
    ['game.input.pressed("Space")', 'Tombol BARU ditekan frame ini.'],
    ['game.input.mouse', '<code>{x, y, down}</code> posisi mouse (koordinat game).'],
    ['game.random.int(a, b) / float(a, b)', 'Angka acak.'],
    ['game.random.pick(arr) / chance(p)', 'Pilih acak / probabilitas.'],
    ['game.spawn({x, y, width, ...})', 'Spawn entity baru dari properti bebas.'],
    ['game.spawnFrom("Prefab", {overrides})', 'Spawn dari prefab project.'],
    ['game.destroy(entity)', 'Hancurkan entity (self.destroy() juga bisa).'],
    ['game.find("Nama") / findAll("tag")', 'Cari entity by nama / tag.'],
    ['game.send("topic", data)', 'Broadcast pesan ke semua script (onMessage).'],
    ['game.sound.play("coin")', 'Suara sintetis: click, blip, beep, tick, coin, powerup, win, lose, hit, explosion, laser, bounce, roll.'],
    ['game.restart()', 'Restart scene dari awal (state direset).'],
    ['game.switchScene("Nama")', 'Pindah scene.'],
    ['game.best("key", val) / getBest("key")', 'Simpan / baca rekor tersimpan (localStorage).'],
    ['game.log(...) / game.warn(...)', 'Tulis ke panel Console editor.']
  ].map((r) => '<tr><td><code>' + r[0] + '</code></td><td>' + r[1] + '</td></tr>').join('');

  const selfRows = [
    ['self.x / self.y / self.cx / self.cy', 'Posisi (x,y = pojok kiri atas; cx,cy = center).'],
    ['self.width / self.height / self.scale', 'Ukuran & skala.'],
    ['self.vx / self.vy / self.gravity', 'Velocity — diintegrasikan otomatis engine tiap frame.'],
    ['self.rotation / self.opacity / self.visible', 'Tampilan.'],
    ['self.text / self.color / self.fontSize', 'Ubah tampilan text entity langsung.'],
    ['self.name / self.tag', 'Identitas — dipakai game.find() / findAll().'],
    ['self.destroy()', 'Hancurkan entity ini.'],
    ['self.overlaps(other) / self.distanceTo(other)', 'Helper posisi.']
  ].map((r) => '<tr><td><code>' + r[0] + '</code></td><td>' + r[1] + '</td></tr>').join('');

  return [
    '<div class="docs">',
    '<h3>1. Konsep</h3>',
    '<p>Game di GameForge = <b>project data</b>: scene berisi entity, entity punya properti + script, dan prefabs (cetakan entity). Tidak ada satu baris pun kode game di dalam engine — buka aja project demo di editor dan lihat sendiri.</p>',
    '<h3>2. Struktur script</h3>',
    '<pre>({\n  onStart(self) {\n    game.state.score = 0;\n  },\n  onUpdate(self, dt) {\n    self.x += 100 * dt; // gerak kanan 100 px/detik\n  }\n})</pre>',
    '<p>Script adalah object literal dengan hook di bawah. Variabel <code>game</code> selalu tersedia.</p>',
    '<h3>3. Hook lifecycle</h3>',
    '<table>' + hookRows + '</table>',
    '<h3>4. API game</h3>',
    '<table>' + apiRows + '</table>',
    '<h3>5. Properti self</h3>',
    '<table>' + selfRows + '</table>',
    '<h3>6. Shortcut editor</h3>',
    '<table>',
    '<tr><td><code>Ctrl+Enter</code></td><td>Play / Stop</td></tr>',
    '<tr><td><code>Esc</code></td><td>Berhenti dari mode Play</td></tr>',
    '<tr><td><code>Ctrl+S</code></td><td>Simpan script / project</td></tr>',
    '<tr><td><code>Ctrl+Z / Ctrl+Y</code></td><td>Undo / Redo</td></tr>',
    '<tr><td><code>Ctrl+D</code></td><td>Duplikat entity terpilih</td></tr>',
    '<tr><td><code>Delete</code></td><td>Hapus entity terpilih</td></tr>',
    '<tr><td><code>Panah</code></td><td> Geser entity 1px (Shift = 10px)</td></tr>',
    '<tr><td><code>Scroll / Ctrl+Scroll</code></td><td>Zoom viewport</td></tr>',
    '</table>',
    '</div>'
  ].join('');
};

/* Panduan cepat 6 langkah bikin game dari nol */
SNIPPETS.guideHTML = function () {
  return [
    '<div class="docs">',
    '<h3>Bikin game dari nol — 2 menit</h3>',
    '<ol class="guide">',
    '<li><b>File → Project Baru</b>, tentukan nama & ukuran kanvas.</li>',
    '<li>Buka panel <b>Assets</b> (kiri bawah) → klik template (mis. <i>Player</i>). Entity muncul di scene & Hierarchy.</li>',
    '<li>Atur posisi/warna/ukuran di <b>Inspector</b> (kanan). Geser langsung di viewport juga bisa — ukuran tombol & snapping dibuat nyaman.</li>',
    '<li>Pasang perilaku: Inspector → bagian <b>Script</b> → <i>+ Pasang Script</i> → pilih dari pustaka snippet (mis. <i>Gravitasi + lompat</i>) atau tulis sendiri.</li>',
    '<li>Tekan <b>▶ RUN</b> (atau Ctrl+Enter) untuk main. Error muncul di panel Console bawah.</li>',
    '<li>Simpan (File → Simpan) — project tersimpan di browser & bisa diekspor ke file .json.</li>',
    '</ol>',
    '<p>Butuh musuh yang berulang? Bikin <b>Prefab</b> di panel Assets, lalu dari script panggil <code>game.spawnFrom("NamaPrefab", {...})</code> — persis seperti prefabs di Unity.</p>',
    '<p>4 game demo (Snake, Space Invaders, Tetris, Lempar Dadu) 100% dibikin dengan cara yang sama — buka lewat <b>File → Buka</b> dan bedah isinya.</p>',
    '</div>'
  ].join('');
};
