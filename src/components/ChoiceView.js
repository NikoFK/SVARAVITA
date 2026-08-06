/**
 * ChoiceView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk pilihan A/B (tanpa framework, DOM langsung).
 *
 * Menampilkan dua tombol visual di bagian bawah layar dengan badge A & B,
 * efek 3D gamified, cocok untuk pengguna tunanetra (layar terbagi dua).
 *
 * Deteksi ketukan (single tap = baca, double tap = pilih) TIDAK di sini —
 * ditangani GestureManager yang memasang listener di document.body dan
 * membagi layar 50:50 lewat event.clientX. ChoiceView hanya bertanggung
 * jawab merender tampilan visual + menyediakan id #choice-left/#choice-right
 * sebagai fallback klik desktop langsung-pilih.
 *
 * Fungsi diekspor:
 *   - renderChoices(leftText, rightText) → isi #quiz-choices
 *   - clearChoices() → kosongkan #quiz-choices
 */

const CONTAINER_ID = 'quiz-choices';

/**
 * Merender dua opsi pilihan (A=kiri, B=kanan) ke dalam #quiz-choices.
 * @param {string} leftText  – teks untuk pilihan kiri (A)
 * @param {string} rightText – teks untuk pilihan kanan (B)
 */
export function renderChoices(leftText, rightText) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // Bersihkan konten lama
  container.innerHTML = '';

  // --- WRAPPER ---
  const wrapper = document.createElement('div');
  wrapper.className = 'choice-wrapper';

  // --- VISUAL BUTTONS CONTAINER ---
  const btnContainer = document.createElement('div');
  btnContainer.className = 'visual-buttons-container';

  // --- TOMBOL KIRI (A) ---
  const btnLeft = document.createElement('div');
  btnLeft.className = 'choice-btn';
  btnLeft.id = 'choice-left';
  btnLeft.innerHTML = `
    <div class="choice-badge">A</div>
    <p class="choice-text">${escapeHtml(leftText ?? '')}</p>
  `;
  btnContainer.appendChild(btnLeft);

  // --- TOMBOL KANAN (B) ---
  const btnRight = document.createElement('div');
  btnRight.className = 'choice-btn';
  btnRight.id = 'choice-right';
  btnRight.innerHTML = `
    <div class="choice-badge">B</div>
    <p class="choice-text">${escapeHtml(rightText ?? '')}</p>
  `;
  btnContainer.appendChild(btnRight);

  wrapper.appendChild(btnContainer);
  container.appendChild(wrapper);
}

/**
 * Mengosongkan konten #quiz-choices.
 */
export function clearChoices() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) container.innerHTML = '';
}

/**
 * Escape HTML entities untuk mencegah XSS dari teks pengguna/data.
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
