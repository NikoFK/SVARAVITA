# SVARAVITA

Game edukasi literasi kesehatan berbasis **Scene-Based Audio Narrative** untuk
penyandang tunanetra. Vanilla JavaScript ES Module, tanpa framework, tanpa
backend, tanpa database — dibangun dengan Vite sebagai dev server/bundler.

## Menjalankan

```bash
npm install
npm run dev       # dev server, http://localhost:5173
npm run build     # build produksi ke dist/
npm run preview   # jalankan hasil build secara lokal
```

Buka folder ini di VSCode, jalankan `npm install` lalu `npm run dev` — game
langsung berjalan di browser.

## Status Aset

**Folder `public/assets/` sudah lengkap strukturnya, tapi masih kosong** —
belum ada file gambar (`.webp`), audio (`.mp3`), atau ikon (`.svg`) asli.
Ini **disengaja** (kebijakan proyek: tidak membuat file dummy) dan **bukan
bug**. Game tetap berjalan penuh dari Opening sampai Ending tanpa aset ini:

- Background kosong (elemen tetap ada, hanya tanpa gambar).
- Potret karakter tidak tampil.
- Audio dilewati (game tetap menampilkan subtitle teks, estimasi durasi baca
  dipakai sebagai pengganti durasi audio).
- Tidak ada crash, tidak ada scene yang gagal dimuat, tidak ada gameplay yang
  berhenti — lihat `SceneManager.js`/`AssetLoader.js` untuk detail graceful
  degradation.

**Untuk menambahkan aset asli**: cukup taruh file dengan nama dan path yang
sudah ditentukan (lihat struktur di bawah) — tidak perlu mengubah kode atau
JSON apa pun.

## Struktur Proyek

```
SVARAVITA/
├── index.html
├── style.css
├── package.json
├── vite.config.js
├── data/
│   └── index.js              # registry level (ES module, di-import DataManager)
├── public/                   # disalin apa adanya ke dist/ saat build
│   ├── data/
│   │   ├── system.json       # scene opening/logo/tutorial/menu
│   │   └── level1.json ... level5.json
│   └── assets/
│       ├── images/backgrounds/{system,level1..5}/
│       ├── images/characters/{vara,zea,expert,friend,stefany}/
│       ├── icons/
│       └── audio/{bgm,sfx,narrator,vara,zea,expert,friend,stefany}/...
└── src/
    ├── main.js                # entry point (tap-to-start gate + wiring menu)
    ├── engine/                # 13 manager (GameEngine, SceneManager, dst)
    ├── components/            # fungsi render murni (dipanggil UIManager)
    ├── constants/             # enum tetap (SCENE_TYPE, SPEAKER, EVENTS, dst)
    └── utils/                 # pathResolver, validators, Logger
```

## Alur Cerita

5 level mengikuti taksonomi Bloom: Level 1 (Pengetahuan) → Level 2 (Memahami)
→ Level 3 (Menerapkan) → Level 4 (Menganalisis) → Level 5 (Evaluasi), diakhiri
Epilog. Karakter: Vara, Zea, Ahli Gizi (`expert`), teman UKS (`friend`,
Level 4), Stefany (`stefany`, Level 5).

## Deploy

Hasil `npm run build` (folder `dist/`) bisa langsung diunggah ke:
- **Vercel**: import repo, build command `npm run build`, output `dist`.
- **GitHub Pages**: unggah isi `dist/` ke branch `gh-pages`, atau pakai Actions.
- **Hosting statis lain** (termasuk shared hosting seperti InfinityFree):
  unggah isi `dist/` apa adanya. `vite.config.js` memakai `base: './'`
  supaya tetap jalan meski di-deploy ke subfolder.

Tidak perlu mengubah kode apa pun untuk deploy — seluruh path aset relatif.

> **Catatan Vercel**: jika mengaktifkan SPA fallback/rewrite `"/(.*)" -> "/index.html"`,
> kecualikan `/assets/*` dan `/data/*` dari rewrite tersebut — kalau tidak,
> path aset yang belum ada akan mengembalikan `200` (isi `index.html`) alih-alih
> `404` yang sebenarnya. Ini tidak memengaruhi GitHub Pages/hosting statis biasa
> (termasuk InfinityFree), yang tidak melakukan SPA fallback.
