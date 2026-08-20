/**
 * BackgroundView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni. TIDAK mengimpor EventBus/manager apapun — hanya
 * menerima data lewat parameter dari UIManager (push, bukan pull).
 */
let transitionId = 0;

export function renderBackground(path) {
  const el = document.getElementById('scene-background');
  if (!el) return;

  const currentTransition = ++transitionId;
  el.style.opacity = '0';
  requestAnimationFrame(() => {
    if (currentTransition !== transitionId) return;
    el.style.backgroundImage = path ? `url("${path}")` : 'none';
    requestAnimationFrame(() => {
      if (currentTransition === transitionId) el.style.opacity = '1';
    });
  });
}
