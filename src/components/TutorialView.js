/**
 * TutorialView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk overlay tutorial sebelum level pertama.
 * Ditampilkan hanya saat pemain memilih "Mulai Baru".
 *
 * LAYOUT (per revisi UX):
 *   - Background tutorial (bgrnd_tutorial{n}.webp) sebagai LAPISAN
 *     FULLSCREEN paling belakang (bukan di dalam popup).
 *   - Popup hanya berisi teks + indikator dot (mudah dibaca).
 *
 * Menggunakan aset:
 *   - images/tutorial/bgrnd_tutorial{slide}.webp (background fullscreen)
 *   - audio/tutorial/tutorial_{slide}.mp3 (audio, diputar oleh TutorialManager)
 *
 * Fungsi diekspor:
 *   - renderTutorialSlide(slideNumber, totalSlides, title, text, imagePath)
 *   - hideTutorial()
 */

const OVERLAY_ID = 'tutorial-overlay';

/**
 * Menampilkan satu slide tutorial di #tutorial-overlay.
 * @param {number} slideNumber  — nomor slide saat ini (1-based)
 * @param {number} totalSlides  — total slide
 * @param {string} title        — judul slide (mis. "Tutorial Bermain")
 * @param {string} text         — teks instruksi
 * @param {string} [imagePath]  — path background (bgrnd_tutorial{n}.webp)
 */
export function renderTutorialSlide(slideNumber, totalSlides, title, text, imagePath) {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  overlay.style.display = 'flex';
  overlay.style.backgroundImage = imagePath ? `url('${imagePath}')` : 'none';
  overlay.innerHTML = `
    <div class="tutorial-card">
      <div class="tutorial-title">${escapeHtml(title)}</div>
      <div class="tutorial-text">${escapeHtml(text)}</div>
      <div class="tutorial-dots">
        ${_buildDots(slideNumber, totalSlides)}
      </div>
    </div>
  `;
}

/**
 * Menyembunyikan overlay tutorial.
 */
export function hideTutorial() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.style.display = 'none';
    overlay.style.backgroundImage = 'none';
    overlay.innerHTML = '';
  }
}

/**
 * Membuat indikator dot (1 dot aktif, sisanya non-aktif).
 * @param {number} active
 * @param {number} total
 * @returns {string}
 */
function _buildDots(active, total) {
  let html = '';
  for (let i = 1; i <= total; i++) {
    const cls = i === active ? 'tutorial-dot active' : 'tutorial-dot';
    html += `<span class="${cls}"></span>`;
  }
  return html;
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
