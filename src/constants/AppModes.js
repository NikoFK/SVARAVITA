/**
 * AppModes.js
 * ---------------------------------------------------------------------------
 * Mode aplikasi tingkat-tinggi yang dimiliki Router (BUKAN scene di dalam
 * gameplay — itu tetap milik SceneManager). Urutan sesuai Lifecycle Game
 * pada Technical Blueprint: boot -> intro -> menu -> playing -> ending.
 */
export const APP_MODE = Object.freeze({
  BOOT: 'boot',
  INTRO: 'intro',
  MENU: 'menu',
  PLAYING: 'playing',
  ENDING: 'ending',
});
