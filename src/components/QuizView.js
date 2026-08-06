/**
 * QuizView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk teks pertanyaan kuis (dipakai bersama
 * SubtitleView area agar layout tetap konsisten dengan scene naratif).
 */
export function renderQuizQuestion(questionText) {
  const textEl = document.getElementById('scene-subtitle-text');
  const nameEl = document.getElementById('scene-speaker-name');
  if (nameEl) nameEl.textContent = 'Soal';
  if (textEl) textEl.textContent = questionText ?? '';
}
