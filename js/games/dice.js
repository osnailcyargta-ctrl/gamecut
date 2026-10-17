/* =====================================================================
 * DEMO PROJECT: LEMPAR DADU
 * Project data murni. Menunjukkan: onClick, onMessage (tombol LEMPAR
 * broadcast "roll"), animasi di onUpdate, dan menggambar pips dadu
 * lewat onDraw. Dua dadu = DUA entity yang pakai script yang sama.
 * ===================================================================== */
'use strict';

GameDemos.register('dice', {
  name: 'Lempar Dadu',
  emoji: '🎲',
  tagline: '2 dadu, animasi lempar, riwayat & statistik',
  description: 'Contoh game santai: klik/Spasi untuk melempar, onDraw menggambar pips, riwayat lemparan lewat game.state. Menunjukkan satu script dipakai dua entity dengan properti berbeda.',
  project: {
    formatVersion: 2,
    name: 'Lempar Dadu',
    settings: { width: 800, height: 600, background: '#141420' },
    prefabs: {},
    scripts: {
      'dadu': {
        name: 'Dadu (lempar + gambar)',
        code: [
          '({',
          '  onStart(self) {',
          '    self.value = game.random.int(1, 6);',
          '    self.rolling = false; self.timer = 0; self.swap = 0; self.wobble = 0;',
          '    game.state.dice = game.state.dice || [];',
          '    game.state.dice[self.slot || 0] = self.value;',
          '    game.state.history = game.state.history || [];',
          '    game.state.rolls = game.state.rolls || 0;',
          '  },',
          '',
          '  roll(self) {',
          '    if (self.rolling) return;',
          '    self.rolling = true;',
          '    self.timer = 0.9 + (self.slot || 0) * 0.12; /* slot 0 selesai terakhir */',
          '    self.swap = 0;',
          '    game.sound.play(\'blip\');',
          '  },',
          '',
          '  onClick(self) { this.roll(self); },',
          '',
          '  onKeyDown(self, key) { if (key === \'Space\') this.roll(self); },',
          '',
          '  onMessage(self, topic) { if (topic === \'roll\') this.roll(self); },',
          '',
          '  onUpdate(self, dt) {',
          '    if (!self.rolling) return;',
          '    self.timer -= dt; self.swap -= dt; self.wobble += dt * 30;',
          '    self.rotation = Math.sin(self.wobble) * 14;',
          '    if (self.swap <= 0) {',
          '      self.swap = 0.07;',
          '      self.value = game.random.int(1, 6);',
          '      game.sound.play(\'tick\');',
          '    }',
          '    if (self.timer <= 0) {',
          '      self.rolling = false; self.rotation = 0;',
          '      self.value = game.random.int(1, 6);',
          '      game.sound.play(\'coin\');',
          '      game.state.dice[self.slot || 0] = self.value;',
          '      if ((self.slot || 0) === 0) {',
          '        game.state.rolls += 1;',
          '        const total = game.state.dice.reduce((a, b) => a + b, 0);',
          '        game.state.history.unshift(total);',
          '        if (game.state.history.length > 8) game.state.history.pop();',
          '      }',
          '    }',
          '  },',
          '',
          '  onDraw(self, ctx) {',
          '    const x = self.x, y = self.y, w = self.width, h = self.height;',
          '    ctx.fillStyle = self.rolling ? \'#fef3c7\' : \'#f4f4f8\';',
          '    ctx.beginPath();',
          '    ctx.moveTo(x + 22, y);',
          '    ctx.lineTo(x + w - 22, y);',
          '    ctx.arcTo(x + w, y, x + w, y + 22, 22);',
          '    ctx.lineTo(x + w, y + h - 22);',
          '    ctx.arcTo(x + w, y + h, x + w - 22, y + h, 22);',
          '    ctx.lineTo(x + 22, y + h);',
          '    ctx.arcTo(x, y + h, x, y + h - 22, 22);',
          '    ctx.lineTo(x, y + 22);',
          '    ctx.arcTo(x, y, x + 22, y, 22);',
          '    ctx.closePath();',
          '    ctx.fill();',
          '    ctx.strokeStyle = \'rgba(0,0,0,0.18)\';',
          '    ctx.lineWidth = 2;',
          '    ctx.stroke();',
          '    const cx = x + w / 2, cy = y + h / 2;',
          '    const d = w * 0.16, off = w * 0.24;',
          '    const P = {',
          '      1: [[0,0]],',
          '      2: [[-1,-1],[1,1]],',
          '      3: [[-1,-1],[0,0],[1,1]],',
          '      4: [[-1,-1],[1,-1],[-1,1],[1,1]],',
          '      5: [[-1,-1],[0,0],[1,1],[-1,1],[1,-1]],',
          '      6: [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]',
          '    }[self.value] || [[0,0]];',
          '    ctx.fillStyle = \'#1d1d27\';',
          '    for (const p of P) {',
          '      ctx.beginPath();',
          '      ctx.arc(cx + p[0] * off, cy + p[1] * off, d / 2, 0, Math.PI * 2);',
          '      ctx.fill();',
          '    }',
          '  }',
          '})'
        ].join('\n')
      },
      'tombol-lempar': {
        name: 'Tombol LEMPAR',
        code: [
          '({',
          '  onDraw(self, ctx) {',
          '    const x = self.x, y = self.y, w = self.width, h = self.height;',
          '    ctx.fillStyle = \'#5468ff\';',
          '    ctx.beginPath();',
          '    ctx.moveTo(x + 14, y);',
          '    ctx.lineTo(x + w - 14, y);',
          '    ctx.arcTo(x + w, y, x + w, y + 14, 14);',
          '    ctx.lineTo(x + w, y + h - 14);',
          '    ctx.arcTo(x + w, y + h, x + w - 14, y + h, 14);',
          '    ctx.lineTo(x + 14, y + h);',
          '    ctx.arcTo(x, y + h, x, y + h - 14, 14);',
          '    ctx.lineTo(x, y + 14);',
          '    ctx.arcTo(x, y, x + 14, y, 14);',
          '    ctx.closePath();',
          '    ctx.fill();',
          '    ctx.fillStyle = \'#ffffff\';',
          '    ctx.font = \'bold 20px system-ui, sans-serif\';',
          '    ctx.textAlign = \'center\'; ctx.textBaseline = \'middle\';',
          '    ctx.fillText(\'LEMPAR\', x + w / 2, y + h / 2 + 1);',
          '  },',
          '  onClick(self) { game.send(\'roll\'); }',
          '})'
        ].join('\n')
      },
      'tampil-total': {
        name: 'Tampil: total',
        code: '({\n  onUpdate(self) {\n    const d = game.state.dice || [];\n    if (d.length) self.text = \'Total: \' + d.reduce((a, b) => a + b, 0);\n  }\n})'
      },
      'tampil-riwayat': {
        name: 'Tampil: riwayat',
        code: '({\n  onUpdate(self) {\n    const h = game.state.history || [];\n    self.text = h.length ? \'Riwayat: \' + h.join(\' \\u2022 \') : \'Riwayat: -\';\n  }\n})'
      },
      'tampil-statistik': {
        name: 'Tampil: statistik',
        code: '({\n  onUpdate(self) {\n    const h = game.state.history || [];\n    if (!h.length) { self.text = \'Lemparan: 0\'; return; }\n    const avg = (h.reduce((a, b) => a + b, 0) / h.length).toFixed(1);\n    self.text = \'Lemparan: \' + (game.state.rolls || 0) + \' \\u2022 Rata-rata: \' + avg;\n  }\n})'
      }
    },
    scenes: [
      {
        name: 'Main',
        entities: [
          {
            id: 'dic_title', name: 'Judul', shape: 'text', text: 'LEMPAR DADU',
            x: 200, y: 36, width: 400, height: 40, fontSize: 30, textBold: true,
            color: '#e8e8ee', z: 0
          },
          {
            id: 'dic_die1', name: 'Dadu 1', shape: 'custom', slot: 0,
            x: 248, y: 130, width: 130, height: 130, z: 1,
            scripts: ['dadu']
          },
          {
            id: 'dic_die2', name: 'Dadu 2', shape: 'custom', slot: 1,
            x: 422, y: 130, width: 130, height: 130, z: 1,
            scripts: ['dadu']
          },
          {
            id: 'dic_btn', name: 'Tombol LEMPAR', shape: 'custom',
            x: 310, y: 308, width: 180, height: 56, z: 2,
            scripts: ['tombol-lempar']
          },
          {
            id: 'dic_total', name: 'Total', shape: 'text', text: 'Total: -',
            x: 200, y: 396, width: 400, height: 36, fontSize: 26, textBold: true,
            color: '#facc15', z: 0, scripts: ['tampil-total']
          },
          {
            id: 'dic_hist', name: 'Riwayat', shape: 'text', text: 'Riwayat: -',
            x: 200, y: 440, width: 400, height: 26, fontSize: 15,
            color: '#a2a2b0', z: 0, scripts: ['tampil-riwayat']
          },
          {
            id: 'dic_stat', name: 'Statistik', shape: 'text', text: 'Lemparan: 0',
            x: 200, y: 470, width: 400, height: 26, fontSize: 15,
            color: '#a2a2b0', z: 0, scripts: ['tampil-statistik']
          },
          {
            id: 'dic_hint', name: 'Petunjuk', shape: 'text',
            text: 'Klik dadu / tombol, atau tekan Spasi',
            x: 200, y: 546, width: 400, height: 24, fontSize: 14,
            color: '#6d6d7c', z: 0
          }
        ]
      }
    ]
  }
});
