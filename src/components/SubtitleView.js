/**
 * SubtitleView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk nama speaker + teks subtitle/dialog.
 * Selalu tampil (bukan cuma dekorasi audio) — mendukung low-vision/deaf-blind
 * fallback sesuai requirement aksesibilitas WCAG proyek.
 */
export function renderSubtitle(speakerName, text) {
  const nameEl = document.getElementById('scene-speaker-name');
  const textEl = document.getElementById('scene-subtitle-text');
  if (nameEl) nameEl.textContent = speakerName ?? '';
  if (textEl) textEl.textContent = text ?? '';
}

export function clearSubtitle() {
  renderSubtitle('', '');
}

/**
 * Menyembunyikan seluruh kotak subtitle (frame + teks). Dipakai pada scene
 * cerita (story) yang hanya menampilkan gambar fullscreen + audio narasi,
 * tanpa frame dialog/kotak teks.
 */
export function hideSubtitleBox() {
  const box = document.getElementById('scene-subtitle-box');
  if (box) box.classList.add('subtitle-hidden');
}

/**
 * Menampilkan kembali kotak subtitle. Dipakai pada Menu, Quiz, dan Feedback.
 */
export function showSubtitleBox() {
  const box = document.getElementById('scene-subtitle-box');
  if (box) box.classList.remove('subtitle-hidden');
}
