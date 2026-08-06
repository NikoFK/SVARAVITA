/**
 * HUD.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk indikator:
 *   - Vita Point (pojok kanan atas)
 *   - Progress info (pojok kiri atas): level saat ini, bintang level unlock,
 *     progress soal (soal ke-X dari total).
 */

/**
 * Render Vita Point di pojok kanan atas.
 * @param {{ previousTotal?: number, newTotal?: number, total?: number, vitaPoint?: number }} payload
 */
export function renderHud(payload) {
  const el = document.getElementById('hud');
  if (!el) return;
  const point = payload?.newTotal ?? payload?.total ?? payload?.vitaPoint ?? 0;
  el.innerHTML = `❤️ Vita Point: ${point}`;
}

/**
 * Render progress info di pojok kiri atas.
 * Menampilkan:
 *   - Baris 1: Level saat ini (misal "Level 1")
 *   - Baris 2: Bintang ★ (total sesuai jumlah scene cerita level, nyala
 *     sesuai bintang yang sudah diperoleh pemain)
 *   - Baris 3: Progress soal (misal "Soal 3/5")
 *
 * [BUG FIX] Star TIDAK lagi dihitung dari `unlockedLevels.length` (yang
 * membuat Level 1–4 selalu tampil 4 bintang). Sekarang jumlah bintang
 * mengikuti DATA level (jumlah scene cerita) dan bintang nyala mengikuti
 * hasil permainan pemain pada level tersebut.
 *
 * @param {object} params
 * @param {string}  params.levelId           - ID level saat ini (misal "level1")
 * @param {number}  params.questionIndex     - Index soal saat ini (0-based)
 * @param {number}  params.totalQuestions    - Total soal di level ini
 * @param {number}  params.totalStars        - Jumlah bintang maksimal level (jumlah scene cerita)
 * @param {number}  params.earnedStars       - Jumlah bintang yang sudah diperoleh di level ini
 */
export function renderProgressInfo({ levelId, questionIndex, totalQuestions, totalStars = 5, earnedStars = 0 }) {
  const el = document.getElementById('progress-info');
  if (!el) return;

  // Level name
  const levelNum = parseInt(levelId?.replace('level', '') ?? '0', 10) || 1;
  const levelName = `Level ${levelNum}`;

  // [BUG FIX] TOTAL bintang SELALU 5. Jumlah yang menyala = nomor level
  // (Level 1 → 1 nyala, Level 2 → 2 nyala, dst. sampai 5). Tidak lagi
  // mengikuti jumlah scene cerita JSON maupun jumlah bintang yang diperoleh.
  const starsTotal = 5;
  const starsEarned = Math.max(1, Math.min(levelNum, starsTotal));
  let starsHtml = '';
  for (let i = 1; i <= starsTotal; i++) {
    if (i <= starsEarned) {
      // Bintang nyala — full gold star SVG (class active)
      starsHtml += SVG_STAR_FILLED;
    } else {
      // Bintang mati — outline/empty star SVG (class inactive)
      starsHtml += SVG_STAR_EMPTY;
    }
  }

  // Soal progress
  const qIndex = (questionIndex ?? 0) + 1; // 1-based display
  const qTotal = totalQuestions ?? 0;
  const soalText = qTotal > 0 ? `Soal ${qIndex}/${qTotal}` : '';

  el.innerHTML = `
    <div class="progress-level">${levelName}</div>
    <div class="progress-stars">${starsHtml}</div>
    ${soalText ? `<div class="progress-soal">${soalText}</div>` : ''}
  `;
}

/**
 * Clear progress info.
 */
export function clearProgressInfo() {
  const el = document.getElementById('progress-info');
  if (el) el.innerHTML = '';
}

// ---------------------------------------------------------------------------
// SVG BINTANG — open source, scalable
// ---------------------------------------------------------------------------

/** Bintang nyala (warna emas) — class "active" */
const SVG_STAR_FILLED = `
  <svg class="star-icon active" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFD700" stroke="#FFA500" stroke-width="1.5"/>
  </svg>`;

/** Bintang mati (outline, abu-abu) — class "inactive" */
const SVG_STAR_EMPTY = `
  <svg class="star-icon inactive" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="none" stroke="#555555" stroke-width="1.5"/>
  </svg>`;

