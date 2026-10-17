/* =====================================================================
 * DEMO PROJECT: SPACE INVADERS
 * Project data murni — pakai prefabs (Bullet, EnemyBullet, Enemy),
 * pesan antar-script (game.send), dan game.state. Buka di editor
 * untuk membedah.
 * ===================================================================== */
'use strict';

GameDemos.register('invaders', {
  name: 'Space Invaders',
  emoji: '🚀',
  tagline: 'Formasi musuh, tembakan, wave & nyawa',
  description: 'Menunjukkan prefabs + spawnFrom, collision (onCollide), message bus (game.send), dan director pattern: entity tak terlihat yang mengatur formasi musuh.',
  project: {
    formatVersion: 2,
    name: 'Space Invaders',
    settings: { width: 800, height: 600, background: '#0b0b12' },
    prefabs: {
      'Bullet': {
        name: 'Bullet', tag: 'bullet',
        width: 6, height: 18, shape: 'rect', color: '#fbbf24', borderRadius: 3,
        physics: { vx: 0, vy: -560, gravity: 0, bounce: 0, collider: 'aabb' },
        scripts: ['peluru-kena-musuh', 'mati-offscreen']
      },
      'EnemyBullet': {
        name: 'EnemyBullet', tag: 'ebullet',
        width: 6, height: 14, shape: 'rect', color: '#f87171', borderRadius: 3,
        physics: { vx: 0, vy: 300, gravity: 0, bounce: 0, collider: 'aabb' },
        scripts: ['peluru-musuh-kena-player', 'mati-offscreen']
      },
      'Enemy': {
        name: 'Enemy', tag: 'enemy',
        width: 36, height: 26, shape: 'triangle', color: '#f87171',
        physics: { vx: 0, vy: 0, gravity: 0, bounce: 0, collider: 'aabb' },
        scripts: ['musuh-goyang']
      }
    },
    scripts: {
      'kapal-gerak': {
        name: 'Kapal: gerak kiri-kanan',
        code: '({\n  onUpdate(self, dt) {\n    const sp = self.speed || 320;\n    const b = game.bounds();\n    if (game.input.down(\'ArrowLeft\')) self.x -= sp * dt;\n    if (game.input.down(\'ArrowRight\')) self.x += sp * dt;\n    self.x = Math.max(10, Math.min(b.w - 10 - self.width, self.x));\n  }\n})'
      },
      'kapal-tembak': {
        name: 'Kapal: tembak (Space)',
        code: '({\n  onUpdate(self, dt) {\n    self.cd = (self.cd || 0) - dt;\n    if (game.input.pressed(\'Space\') && self.cd <= 0) {\n      self.cd = 0.38;\n      game.spawnFrom(\'Bullet\', { x: self.cx - 3, y: self.y - 20 });\n      game.sound.play(\'laser\');\n    }\n  }\n})'
      },
      'kapal-kedip': {
        name: 'Kapal: kedip saat kena',
        code: '({\n  onMessage(self, topic) {\n    if (topic === \'player-hit\') self._inv = 1.4;\n  },\n  onUpdate(self, dt) {\n    if (self._inv > 0) {\n      self._inv -= dt;\n      self.visible = Math.floor(self._inv * 12) % 2 === 0;\n    } else {\n      self.visible = true;\n    }\n  }\n})'
      },
      'peluru-kena-musuh': {
        name: 'Peluru: kena musuh',
        code: '({\n  onCollide(self, other) {\n    if (other.tag !== \'enemy\') return;\n    game.state.score = (game.state.score || 0) + (other.points || 10);\n    game.sound.play(\'explosion\');\n    other.destroy();\n    self.destroy();\n    game.send(\'enemy-died\');\n  }\n})'
      },
      'peluru-musuh-kena-player': {
        name: 'Peluru musuh: kena player',
        code: '({\n  onCollide(self, other) {\n    if (other.tag === \'player\' && game.state.over !== true) {\n      game.send(\'player-hit\');\n      self.destroy();\n    }\n  }\n})'
      },
      'mati-offscreen': {
        name: 'Hancur saat keluar layar',
        code: '({\n  onUpdate(self) {\n    const b = game.bounds();\n    if (self.y + self.height < -60 || self.y > b.h + 60 ||\n        self.x + self.width < -60 || self.x > b.w + 60) self.destroy();\n  }\n})'
      },
      'musuh-goyang': {
        name: 'Musuh: animasi goyang',
        code: '({\n  onUpdate(self) {\n    self.rotation = Math.sin(game.time * 5 + self.x * 0.05) * 7;\n  }\n})'
      },
      'director': {
        name: 'Director: formasi & wave',
        code: [
          '({',
          '  onStart(self) {',
          '    const g = game.state;',
          '    g.score = 0; g.lives = 3; g.wave = 1; g.over = false; g.msg = \'\';',
          '    this.spawnWave(self);',
          '  },',
          '',
          '  spawnWave(self) {',
          '    const g = game.state;',
          '    const cols = 8, rows = 4;',
          '    const colors = [\'#f87171\', \'#fbbf24\', \'#4ade80\', \'#60a5fa\'];',
          '    for (let r = 0; r < rows; r++) {',
          '      for (let c = 0; c < cols; c++) {',
          '        game.spawnFrom(\'Enemy\', {',
          '          name: \'Enemy \' + r + \'-\' + c,',
          '          x: 120 + c * 70,',
          '          y: 110 + r * 52 + (g.wave - 1) * 16,',
          '          color: colors[r % colors.length],',
          '          points: (rows - r) * 5',
          '        });',
          '      }',
          '    }',
          '    g.marchDir = 1; g.marchTimer = 0;',
          '    g.shootTimer = game.random.float(0.7, 1.5);',
          '  },',
          '',
          '  onUpdate(self, dt) {',
          '    const g = game.state;',
          '    if (g.over) {',
          '      if (game.input.pressed(\'Enter\')) game.restart();',
          '      return;',
          '    }',
          '    const enemies = game.findAll(\'enemy\');',
          '    if (!enemies.length) {',
          '      g.wave += 1;',
          '      game.sound.play(\'powerup\');',
          '      this.spawnWave(self);',
          '      return;',
          '    }',
          '    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;',
          '    for (const e of enemies) {',
          '      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.width);',
          '      maxY = Math.max(maxY, e.y + e.height);',
          '    }',
          '    const speed = 26 + (32 - enemies.length) * 7 + (g.wave - 1) * 8;',
          '    g.marchTimer -= dt;',
          '    if (g.marchTimer <= 0) {',
          '      g.marchTimer = Math.max(0.12, 0.55 - (g.wave - 1) * 0.05 - (32 - enemies.length) * 0.012);',
          '      let descend = false;',
          '      if (g.marchDir > 0 && maxX + speed > 790) descend = true;',
          '      if (g.marchDir < 0 && minX - speed < 10) descend = true;',
          '      if (descend) {',
          '        g.marchDir *= -1;',
          '        for (const e of enemies) e.y += 22;',
          '        game.sound.play(\'tick\');',
          '      } else {',
          '        for (const e of enemies) e.x += g.marchDir * speed;',
          '      }',
          '    }',
          '    g.shootTimer -= dt;',
          '    if (g.shootTimer <= 0) {',
          '      g.shootTimer = game.random.float(0.5, 1.5) / Math.min(3, 0.5 + g.wave * 0.5);',
          '      const shooter = game.random.pick(enemies);',
          '      game.spawnFrom(\'EnemyBullet\', { x: shooter.cx - 3, y: shooter.y + shooter.height });',
          '    }',
          '    const player = game.find(\'Player\');',
          '    if (maxY > (player ? player.y - 8 : 540)) {',
          '      g.over = true; g.msg = \'Musuh menembus pertahanan!\';',
          '      game.sound.play(\'lose\');',
          '      game.best(\'invaders\', g.score);',
          '    }',
          '  },',
          '',
          '  onMessage(self, topic) {',
          '    const g = game.state;',
          '    if (topic === \'player-hit\') {',
          '      g.lives -= 1;',
          '      game.sound.play(\'hit\');',
          '      if (g.lives <= 0) {',
          '        g.over = true; g.msg = \'Nyawa habis!\';',
          '        game.sound.play(\'lose\');',
          '        game.best(\'invaders\', g.score);',
          '      }',
          '    }',
          '  }',
          '})'
        ].join('\n')
      },
      'tampil-score': {
        name: 'Tampil: score & wave',
        code: '({\n  onUpdate(self) {\n    const g = game.state;\n    self.text = \'Score: \' + (g.score || 0) + \'    Wave: \' + (g.wave || 1);\n  }\n})'
      },
      'tampil-lives': {
        name: 'Tampil: nyawa',
        code: '({\n  onUpdate(self) {\n    const n = Math.max(0, game.state.lives == null ? 3 : game.state.lives);\n    self.text = \'\\u2665\'.repeat(n) || \'-\';\n  }\n})'
      },
      'tampil-over': {
        name: 'Tampil: game over',
        code: '({\n  onUpdate(self) {\n    const g = game.state;\n    if (g.over) {\n      self.text = \'GAME OVER\\n\' + (g.msg || \'\') + \'\\nEnter = main lagi\';\n      self.visible = true;\n    } else self.visible = false;\n  }\n})'
      },
      'starfield': {
        name: 'Latar: bintang jatuh',
        code: [
          '({',
          '  onStart(self) {',
          '    const b = game.bounds();',
          '    self.stars = [];',
          '    for (let i = 0; i < 70; i++) {',
          '      self.stars.push({',
          '        x: game.random.float(0, b.w), y: game.random.float(0, b.h),',
          '        s: game.random.float(0.6, 2.2), v: game.random.float(8, 42)',
          '      });',
          '    }',
          '  },',
          '  onDraw(self, ctx) {',
          '    const b = game.bounds();',
          '    ctx.fillStyle = \'#0b0b12\';',
          '    ctx.fillRect(0, 0, b.w, b.h);',
          '    for (const st of self.stars) {',
          '      st.y += st.v * game.dt;',
          '      if (st.y > b.h) st.y -= b.h;',
          '      ctx.fillStyle = \'rgba(255,255,255,\' + (0.2 + st.s / 6) + \')\';',
          '      ctx.fillRect(st.x, st.y, st.s, st.s);',
          '    }',
          '  }',
          '})'
        ].join('\n')
      }
    },
    scenes: [
      {
        name: 'Main',
        entities: [
          {
            id: 'inv_bg', name: 'Starfield', shape: 'custom',
            x: 0, y: 0, width: 1, height: 1, z: -1,
            scripts: ['starfield']
          },
          {
            id: 'inv_director', name: 'Director', shape: 'custom',
            x: 0, y: 0, width: 1, height: 1, z: 0,
            scripts: ['director']
          },
          {
            id: 'inv_player', name: 'Player', tag: 'player', shape: 'triangle',
            x: 378, y: 540, width: 44, height: 36, color: '#4ade80',
            z: 5, physics: { vx: 0, vy: 0, gravity: 0, bounce: 0, collider: 'aabb' },
            scripts: ['kapal-gerak', 'kapal-tembak', 'kapal-kedip']
          },
          {
            id: 'inv_score', name: 'Skor', shape: 'text', text: 'Score: 0',
            x: 16, y: 12, width: 320, height: 26, fontSize: 16, align: 'left',
            color: '#e8e8ee', z: 5, scripts: ['tampil-score']
          },
          {
            id: 'inv_lives', name: 'Nyawa', shape: 'text', text: '\u2665\u2665\u2665',
            x: 640, y: 12, width: 144, height: 26, fontSize: 18, align: 'right',
            color: '#f87171', z: 5, scripts: ['tampil-lives']
          },
          {
            id: 'inv_over', name: 'GameOver', shape: 'text', text: 'GAME OVER',
            x: 200, y: 240, width: 400, height: 110, fontSize: 26, textBold: true,
            color: '#f87171', z: 9, visible: false, scripts: ['tampil-over']
          },
          {
            id: 'inv_hint', name: 'Petunjuk', shape: 'text',
            text: '\u2190 \u2192 gerak \u2022 Space tembak',
            x: 200, y: 568, width: 400, height: 22, fontSize: 13,
            color: '#6d6d7c', z: 5
          }
        ]
      }
    ]
  }
});
