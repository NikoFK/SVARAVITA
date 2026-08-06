/**
 * SpeakerPortrait.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk potret karakter yang sedang bicara.
 */
export function renderPortrait(path, speakerId) {
  const el = document.getElementById('scene-portrait');
  if (!el) return;
  el.style.backgroundImage = `url("${path}")`;
  el.dataset.speaker = speakerId;
  el.style.visibility = 'visible';
}

export function clearPortrait() {
  const el = document.getElementById('scene-portrait');
  if (!el) return;
  el.style.visibility = 'hidden';
  el.removeAttribute('data-speaker');
}
