/**
 * BackgroundView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni. TIDAK mengimpor EventBus/manager apapun — hanya
 * menerima data lewat parameter dari UIManager (push, bukan pull).
 */
export function renderBackground(path) {
  const el = document.getElementById('scene-background');
  if (!el) return;
  el.style.backgroundImage = path ? `url("${path}")` : 'none';
}
