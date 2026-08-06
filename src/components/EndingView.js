/**
 * EndingView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk layar akhir (Ending Screen).
 *
 * Menampilkan:
 *   🎉 Selamat — Permainan selesai.
 *   ⭐ Total Bintang
 *   ❤️ Total Vita Point
 *
 * Skor diambil dari hasil permainan (dilewatkan lewat parameter oleh
 * UIManager/Router) — bukan hardcode.
 *
 * Fungsi diekspor:
 *   - renderEnding({ totalStars, totalVitaPoint }) → tampilkan ending
 *   - hideEnding()                                 → sembunyikan ending
 */

const OVERLAY_ID = 'ending-overlay';

/**
 * Menampilkan overlay Ending Screen.
 * @param {object} data
 * @param {number} data.totalStars     - jumlah bintang total yang diperoleh
 * @param {number} data.totalVitaPoint - jumlah Vita Point total
 */
export function renderEnding({ totalStars = 0, totalVitaPoint = 0 }) {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="ending-card">
      <div class="ending-emoji">🎉</div>
      <h1 class="ending-title">Selamat!</h1>
      <p class="ending-subtitle">Permainan selesai.</p>

      <div class="ending-stats">
        <div class="ending-stat">
          <span class="ending-stat-icon">⭐</span>
          <span class="ending-stat-value">${escapeHtml(String(totalStars))}</span>
          <span class="ending-stat-label">Total Bintang</span>
        </div>
        <div class="ending-stat">
          <span class="ending-stat-icon">❤️</span>
          <span class="ending-stat-value">${escapeHtml(String(totalVitaPoint))}</span>
          <span class="ending-stat-label">Total Vita Point</span>
        </div>
      </div>

      <p class="ending-hint">Ketuk untuk kembali ke menu utama</p>
    </div>
  `;
}

/**
 * Menyembunyikan overlay ending.
 */
export function hideEnding() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }
}

/**
 * Escape HTML entities.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch]);
}
