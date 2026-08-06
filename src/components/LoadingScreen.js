/**
 * LoadingScreen.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk indikator loading (fallback visual untuk
 * low-vision, meski game ini audio-first).
 *
 * [Bug fix] Elemen #loading-screen dipakai ulang sebagai tap-to-start gate
 * di awal (lihat main.js/index.html) dengan teks "Ketuk layar untuk mulai".
 * Sebelumnya showLoading() tidak pernah mereset teks itu, sehingga layar
 * loading BERIKUTNYA (saat asset:preloadStarted scene manapun) masih
 * menampilkan teks ajakan tap yang sudah tidak relevan — membingungkan
 * untuk pengguna low-vision yang mengandalkan teks tsb. showLoading() kini
 * selalu menimpa teks ke pesan netral, KECUALI dipanggil dengan flag
 * preserveText (dipakai main.js sekali saja untuk gerbang awal).
 */
const DEFAULT_LOADING_TEXT = 'Memuat...';

export function showLoading(preserveText = false) {
  const el = document.getElementById('loading-screen');
  if (!el) return;
  if (!preserveText) {
    const textEl = document.getElementById('loading-screen-text');
    if (textEl) textEl.textContent = DEFAULT_LOADING_TEXT;
  }
  el.style.display = 'flex';
}

export function hideLoading() {
  const el = document.getElementById('loading-screen');
  if (el) el.style.display = 'none';
}
