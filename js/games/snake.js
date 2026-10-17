/* =====================================================================
 * DEMO PROJECT: SNAKE
 * Ini BUKAN kode engine — ini project data. Buka di editor
 * (File → Buka → Demo) untuk melihat & mengubah semua entity, properti,
 * dan script-nya. Game ini dibangun 100% dari API engine.
 * ===================================================================== */
'use strict';

GameDemos.register('snake', {
  name: 'Snake',
  emoji: '🐍',
  tagline: 'Klasik grid — panah untuk makan & memanjang',
  description: 'Ular klasik di papan 20x20. Contoh penggunaan script onDraw untuk menggambar papan, onKeyDown untuk input, dan game.state untuk logika skor.',
  project: {
    formatVersion: 2,
    name: 'Snake',
    settings: { width: 800, height: 600, background: '#101014' },
    prefabs: {},
    scripts: {
      'snake-game': {
        name: 'Logika ular (papan)',
        code: [
          '({',
          '  onStart(self) {',
          '    const g = game.state;',
          '    g.grid = 20; // papan 20x20 sel',
          '    g.snake = [{cx:10,cy:10},{cx:9,cy:10},{cx:8,cy:10}];',
          '    g.dir = {x:1,y:0}; g.nextDir = {x:1,y:0};',
          '    g.score = 0; g.speed = 7; g.acc = 0;',
          '    g.started = false; g.over = false;',
          '    g.food = this.spawnFood(self);',
          '  },',
          '',
          '  spawnFood(self) {',
          '    const g = game.state;',
          '    let cx, cy, tries = 0;',
          '    do {',
          '      cx = game.random.int(0, g.grid - 1);',
          '      cy = game.random.int(0, g.grid - 1);',
          '      tries++;',
          '    } while (g.snake.some(s => s.cx === cx && s.cy === cy) && tries < 500);',
          '    return {cx, cy};',
          '  },',
          '',
          '  onUpdate(self, dt) {',
          '    const g = game.state;',
          '    if (g.over) {',
          '      if (game.input.pressed(\'Enter\')) game.restart();',
          '      return;',
          '    }',
          '    if (!g.started) return;',
          '    g.acc += dt;',
          '    const step = 1 / g.speed;',
          '    while (g.acc >= step) {',
          '      g.acc -= step;',
          '      g.dir = g.nextDir;',
          '      const head = {cx: g.snake[0].cx + g.dir.x, cy: g.snake[0].cy + g.dir.y};',
          '      const hitWall = head.cx < 0 || head.cy < 0 || head.cx >= g.grid || head.cy >= g.grid;',
          '      const hitSelf = g.snake.some(s => s.cx === head.cx && s.cy === head.cy);',
          '      if (hitWall || hitSelf) {',
          '        g.over = true;',
          '        game.sound.play(\'lose\');',
          '        game.best(\'snake\', g.score);',
          '        return;',
          '      }',
          '      g.snake.unshift(head);',
          '      if (head.cx === g.food.cx && head.cy === g.food.cy) {',
          '        g.score += 10;',
          '        game.sound.play(\'coin\');',
          '        if (g.score % 50 === 0) g.speed = Math.min(15, g.speed + 1);',
          '        g.food = this.spawnFood(self);',
          '      } else {',
          '        g.snake.pop();',
          '      }',
          '    }',
          '  },',
          '',
          '  onKeyDown(self, key) {',
          '    const g = game.state;',
          '    if (g.over) return;',
          '    const dirs = {',
          '      ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1},',
          '      ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0}',
          '    };',
          '    const d = dirs[key];',
          '    if (!d) return;',
          '    g.started = true;',
          '    if (d.x !== -g.dir.x || d.y !== -g.dir.y) g.nextDir = d;',
          '  },',
          '',
          '  onDraw(self, ctx) {',
          '    const g = game.state;',
          '    const cw = self.width / g.grid, ch = self.height / g.grid;',
          '    ctx.fillStyle = \'#131320\';',
          '    ctx.fillRect(self.x, self.y, self.width, self.height);',
          '    ctx.strokeStyle = \'rgba(255,255,255,0.05)\';',
          '    ctx.lineWidth = 1;',
          '    ctx.beginPath();',
          '    for (let i = 1; i < g.grid; i++) {',
          '      ctx.moveTo(self.x + i*cw, self.y); ctx.lineTo(self.x + i*cw, self.y + self.height);',
          '      ctx.moveTo(self.x, self.y + i*ch); ctx.lineTo(self.x + self.width, self.y + i*ch);',
          '    }',
          '    ctx.stroke();',
          '    const fx = self.x + (g.food.cx + 0.5) * cw, fy = self.y + (g.food.cy + 0.5) * ch;',
          '    ctx.fillStyle = \'#f87171\';',
          '    ctx.beginPath(); ctx.arc(fx, fy, cw * 0.36, 0, Math.PI * 2); ctx.fill();',
          '    g.snake.forEach((s, i) => {',
          '      const x = self.x + s.cx * cw, y = self.y + s.cy * ch;',
          '      ctx.fillStyle = i === 0 ? \'#a7f3d0\' : (i % 2 ? \'#34d399\' : \'#4ade80\');',
          '      ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);',
          '    });',
          '  }',
          '})'
        ].join('\n')
      },
      'show-score': {
        name: 'Tampilkan skor & rekor',
        code: '({\n  onUpdate(self) {\n    self.text = \'Score: \' + (game.state.score || 0) + \'    Rekor: \' + game.getBest(\'snake\');\n  }\n})'
      },
      'show-msg': {
        name: 'Pesan mulai / game over',
        code: [
          '({',
          '  onUpdate(self) {',
          '    const g = game.state;',
          '    if (g.over) {',
          '      self.text = \'GAME OVER — Score \' + g.score + \' • Enter = main lagi\';',
          '      self.visible = true;',
          '    } else if (!g.started) {',
          '      self.text = \'Tekan panah untuk mulai\';',
          '      self.visible = true;',
          '    } else {',
          '      self.visible = false;',
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
            id: 'snk_title', name: 'Judul', shape: 'text', text: 'SNAKE',
            x: 200, y: 26, width: 400, height: 40, fontSize: 32, textBold: true,
            color: '#4ade80', z: 0
          },
          {
            id: 'snk_score', name: 'Skor', shape: 'text', text: 'Score: 0',
            x: 200, y: 68, width: 400, height: 24, fontSize: 16,
            color: '#e8e8ee', z: 0, scripts: ['show-score']
          },
          {
            id: 'snk_board', name: 'Papan', shape: 'custom',
            x: 200, y: 100, width: 400, height: 400, color: '#131320', z: 1,
            scripts: ['snake-game']
          },
          {
            id: 'snk_msg', name: 'Pesan', shape: 'text', text: 'Tekan panah untuk mulai',
            x: 200, y: 282, width: 400, height: 36, fontSize: 21, textBold: true,
            color: '#facc15', z: 2, scripts: ['show-msg']
          },
          {
            id: 'snk_hint', name: 'Petunjuk', shape: 'text',
            text: 'Panah = gerak • Enter = main lagi',
            x: 200, y: 552, width: 400, height: 24, fontSize: 14,
            color: '#6d6d7c', z: 0
          }
        ]
      }
    ]
  }
});
