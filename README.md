# ◆ NEXUS — Game Engine Visual

Game engine yang jalan penuh di browser. Bikin game **dari nol** tanpa nulis kode —
gaya CapCut, rasa Scratch/Godot/Unity.

**Tidak ada game hardcoded.** Engine, editor, dan player tidak memuat satu baris
logika game pun. Semua game = **project data** (Scene + Entitas + Node Graph).

## Buka

- **Editor**: `index.html` — buat proyek, gambar sprite, susun node graph, mainkan.
- **Player**: `play.html` — mainkan contoh game langsung (runtime murni).

## Alur bikin game dari nol

1. **Scene** — atur ukuran & warna latar, tambah **Entitas** (kotak / bulat / teks / sprite).
2. **Gambar** — tab *Gambar*: gambar sprite piksel sendiri (pensil, isi, garis, kotak,
   bulat, cermin simetris, undo). Tanpa script sama sekali.
3. **Node Graph** — tab *Node*: klik kanan → pilih node. Sambungkan:
   - port **putih** = alur eksekusi (Event → Aksi → Aksi → ...)
   - port **warna** = data (angka, teks, bool, referensi entitas)
4. **Mainkan** — tombol ▶ Main. Esc untuk keluar.

## Fitur

| Fitur | Penjelasan |
|---|---|
| Node Graph | 40+ tipe node: Event, Aksi, Alur (Jika/Ulangi/Tunggu/Break), Data (variabel, list, matematika, tabrakan...) |
| 🎶 Playlist | Seleksi beberapa node → `Ctrl+G` → jadi **1 node** yang bisa dipasang ulang di mana saja. Dobel-klik untuk mengedit isinya. Parameter bisa di-expose saat pembuatan. |
| 🖼 Sprite Editor | Gambar piksel sendiri: 8×8 s/d 32×32, palet warna, cermin simetris, flood fill, bentuk cepat |
| Prefab | Entitas template untuk di-Spawn (peluru, musuh, ekor ular...) |
| Variabel & List | Variabel scene + operasi list (tambah/set/hapus/ambil/panjang) |
| Collision | Event tabrakan per-tag/entitas, edge-triggered |
| Suara | Efek suara sintetis (WebAudio) — tanpa file audio |
| Autosave | Proyek tersimpan otomatis di browser + export/import file `.json` |

## Contoh game (100% buatan node)

| Game | Bukti apa |
|---|---|
| 🎲 Lempar Dadu | event klik, angka acak, teks dinamis |
| 🐍 Ular Sanke | timer, list ekor, spawn prefab, collision, game over |
| 👾 Space Invaders | 32 entitas, formasi berulang, peluru prefab, menang/kalah |
| 🧱 Tetris Node | memakai **7 Playlist**: Geser Piece, Posisi Valid?, Gambar Piece, Hapus Piece, Kunci & Bersih Baris, Spawn Piece, Turun 1 Langkah |

Buka lewat **📚 Contoh** lalu bedah graph-nya di tab Node.

## Shortcut

`Klik kanan` tambah node · `Ctrl+G` jadikan Playlist · `Ctrl+D` duplikat ·
`Del` hapus · `Roda mouse` zoom · `Klik tengah/space+drag` geser ·
`Dobel-klik` masuk isi Playlist · `Esc` keluar

## Teknis

- Vanilla JS multi-file, tanpa build step, tanpa dependency — cocok untuk GitHub Pages.
- `js/core/` = runtime engine (interpreter node graph, collision, render, audio).
  **Nol kode game.** `js/editor/` = editor. `examples/*.json` = game sebagai data.
- Regenerasi contoh: `node scripts/gen_examples.mjs` · uji logika: `node scripts/test_sim.mjs`
