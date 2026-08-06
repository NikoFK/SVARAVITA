import { defineConfig } from 'vite';

/**
 * vite.config.js
 * ---------------------------------------------------------------------------
 * `base: './'` (bukan absolut '/') supaya hasil build bisa di-deploy ke path
 * manapun tanpa perubahan kode — termasuk GitHub Pages yang biasanya
 * menyajikan situs dari sub-path (mis. https://user.github.io/svaravita/),
 * bukan hanya domain root seperti Vercel.
 *
 * `publicDir: 'public'` (default Vite) — folder `public/data/levels/*.json`
 * dan `public/assets/**` disalin APA ADANYA ke root `dist/` saat build,
 * sehingga fetch('data/levels/level1.json') dan fetch('assets/...') di
 * DataManager.js/AssetLoader.js tetap valid persis seperti saat development,
 * TANPA perlu path prefix apapun (selaras dengan `base: './'` di atas).
 *
 * `data/index.js` (registry level, di-import sebagai ES module oleh
 * DataManager.js) SENGAJA TIDAK ditaruh di public/ — ia tetap di
 * `<root>/data/index.js` supaya diproses/dibundel normal oleh Vite sebagai
 * bagian dari module graph, bukan disalin mentah sebagai file statis.
 *
 * Proyek ini murni ES Module + fetch() + JSON (Technical Blueprint §Deployment:
 * "static web app", tanpa Express/Node server/PHP) — Vite di sini murni
 * sebagai dev server + bundler produksi, bukan mengubah arsitektur runtime.
 */
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // [BUG FIX] Default Vite menaruh bundle JS/CSS terkompilasi di
    // "dist/assets/" — nama yang SAMA PERSIS dengan "public/assets/" (folder
    // aset game: gambar/audio/ikon). Ditemukan lewat validasi build akhir:
    // keduanya bercampur jadi satu folder "dist/assets/" (belum rusak,
    // karena Vite memakai nama file ber-hash unik, tapi rapuh — risiko nyata
    // suatu saat nama chunk bentrok dengan sub-folder kita). Dipisah total
    // ke "dist/app/" supaya "dist/assets/" hanya berisi aset game.
    assetsDir: 'app',
  },
  server: {
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
  },
});
