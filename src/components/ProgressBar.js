/**
 * ProgressBar.js
 * ---------------------------------------------------------------------------
 * Komponen render murni indikator progres soal dalam scene quiz.
 */
export function renderProgressBar(current, total) {
  const el = document.getElementById('hud');
  if (!el) return;
  const marker = document.getElementById('quiz-progress-marker') ?? (() => {
    const span = document.createElement('span');
    span.id = 'quiz-progress-marker';
    el.appendChild(span);
    return span;
  })();
  marker.textContent = total > 0 ? ` | Soal ${current}/${total}` : '';
}

export function clearProgressBar() {
  const marker = document.getElementById('quiz-progress-marker');
  if (marker) marker.textContent = '';
}
