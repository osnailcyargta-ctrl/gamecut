# GameForge Studio — Game Engine

Game engine berbasis browser ala **Scratch / Godot / Unity** dengan UI bergaya **CapCut**. Kamu yang bikin gamenya dari nol lewat editor — engine ini **tidak berisi game hardcoded**.

> **0 baris kode game di dalam engine.** Semua game (termasuk 4 demo) hanyalah *project data* (scene + entity + prefabs + script) yang bisa dibuka, dibedah, dan dimodifikasi langsung di editor.

## Kenapa ini engine beneran?

| Kemampuan | Penjelasan |
|---|---|
| **Editor visual** | Hierarchy, Assets, Inspector, Viewport dengan grid/snap/zoom/drag — alur kerja sama seperti editor game pada umumnya |
| **Entity & Component** | Tambah entity (kotak, bola, teks, dst), atur transform/appearance/physics di Inspector |
| **Script system** | Setiap entity bisa dipasang script dengan lifecycle hook: `onStart`, `onUpdate`, `onKeyDown`, `onCollide`, `onClick`, `onMessage`, `onDraw` |
| **Prefabs** | Cetakan entity untuk di-`game.spawnFrom()` saat runtime — pola yang sama dengan prefabs Unity |
| **Message bus** | `game.send('topic', data)` — komunikasi antar entity tanpa ketergantungan langsung |
| **Physics ringan** | Velocity, gravity, bounce, dan deteksi tabrakan AABB/circle otomatis oleh engine |
| **Audio sintetis** | 13 efek suara WebAudio tanpa file eksternal |
| **Runtime terpisah** | `play.html` menjalankan project tanpa editor — bukti engine dan editor adalah dua lapisan berbeda |
| **Data-driven** | Project = JSON murni. Save ke browser, export/import file `.json`, autosave, undo/redo |

## Menjalankan

Cukup buka `index.html` di browser, atau (disarankan):

```bash
python3 -m http.server 8080
# buka http://localhost:8080
```

Sudah ter-deploy di GitHub Pages (dari branch `main`, root).

## Bikin game dari nol — 2 menit

1. **File → Project Baru** → tentukan nama & ukuran kanvas
2. Panel **Assets** → klik template (mis. *Player*) → entity muncul di scene
3. Atur posisi/warna/ukuran di **Inspector** (atau drag langsung di viewport)
4. Pasang perilaku: Inspector → **Script** → pilih dari pustaka snippet generik (gravitasi+lompat, tembak, kejar target, koin+skor, dst) atau tulis script sendiri
5. Tekan **▶ Run** (`Ctrl+Enter`) → mainkan. Error tampil di panel **Console**
6. **File → Simpan** untuk menyimpan ke browser / export `.json`

## Script API (ringkas)

Script = object literal dengan hook lifecycle. Variabel `game` selalu tersedia:

```js
({
  onStart(self) {
    game.state.score = 0;
  },
  onUpdate(self, dt) {
    if (game.input.down('ArrowLeft'))  self.x -= 300 * dt;
    if (game.input.pressed('Space'))   game.spawnFrom('Bullet', { x: self.cx, y: self.y });
  },
  onCollide(self, other) {
    if (other.tag === 'enemy') { other.destroy(); self.destroy(); }
  },
  onDraw(self, ctx) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(self.x, self.y, self.width, self.height);
  }
})
```

Dokumentasi lengkap ada di dalam aplikasi: tombol **📖** di topbar.

## Struktur project

```
├── index.html            # Editor (CapCut-style)
├── play.html             # Runtime standalone
├── css/
│   └── editor.css        # Tema gelap CapCut-style
├── js/
│   ├── engine/           # ═══ ENGINE — nol kode game ═══
│   │   ├── core.js       #   math, input, audio, loop, compiler, renderer
│   │   ├── entity.js     #   Entity runtime
│   │   └── runtime.js    #   Project → game: scene, collision, script API
│   ├── editor/           # ═══ EDITOR ═══
│   │   ├── state.js      #   model project + undo/redo + autosave
│   │   ├── ui.js         #   DOM helper, modal, menu, ikon
│   │   ├── snippets.js   #   pustaka perilaku generik + docs
│   │   ├── hierarchy.js  #   panel kiri-atas
│   │   ├── assets.js     #   panel kiri-bawah (template, prefabs, suara)
│   │   ├── inspector.js  #   panel kanan
│   │   ├── viewport.js   #   canvas editor (grid, snap, drag, zoom)
│   │   ├── bottompanel.js#   code editor + console
│   │   └── main.js       #   topbar, file ops, run/stop, shortcuts
│   └── games/            # ═══ GAME = PROJECT DATA (bukan hardcode) ═══
│       ├── snake.js
│       ├── space-invaders.js
│       ├── tetris.js
│       └── dice.js
```

## Demo projects

Empat game ini adalah *project data* — buka lewat **File → Buka** lalu bedah isinya di editor:

- 🐍 **Snake** — papan digambar via `onDraw`, input via `onKeyDown`
- 🚀 **Space Invaders** — prefabs + `spawnFrom`, collision, message bus, director pattern
- 🧱 **Tetris** — puzzle lengkap dalam satu script: rotasi matriks, lock, hapus baris
- 🎲 **Lempar Dadu** — dua entity berbagi satu script dengan properti berbeda (`slot: 0/1`)
