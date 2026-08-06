/**
 * AnimationManager.js
 * ---------------------------------------------------------------------------
 * API generik `animate(target, presetName)` — tidak tahu MENGAPA sesuatu
 * dianimasikan, hanya tahu CARA menjalankan preset. Dipanggil langsung
 * (bukan lewat event), memancarkan `animation:complete` setelah selesai.
 *
 * Preset diimplementasikan lewat CSS class + Web Animation API sederhana
 * (fallback: setTimeout jika `getAnimations`/transition tidak didukung).
 */

import { EVENTS } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';

const PRESET_DURATION_MS = Object.freeze({
  fadeIn: 300,
  fadeOut: 300,
  slideIn: 300,
  slideOut: 300,
});

export class AnimationManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    if (!eventBus) throw new TypeError('AnimationManager membutuhkan instance EventBus.');
    this._eventBus = eventBus;
  }

  /**
   * @param {HTMLElement|string} target - elemen DOM atau id elemen
   * @param {string} presetName - salah satu dari fadeIn|fadeOut|slideIn|slideOut
   * @returns {Promise<void>}
   */
  animate(target, presetName) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    const duration = PRESET_DURATION_MS[presetName] ?? 300;

    if (!el) {
      Logger.warn('AnimationManager', `Target animasi "${target}" tidak ditemukan — animasi dilewati.`);
      this._eventBus.emit(EVENTS.ANIMATION.STARTED, { presetName, target: String(target) });
      this._eventBus.emit(EVENTS.ANIMATION.COMPLETE, { presetName, target: String(target) });
      return Promise.resolve();
    }

    this._eventBus.emit(EVENTS.ANIMATION.STARTED, { presetName, target: el.id ?? null });
    el.classList.add(`anim-${presetName}`);

    return new Promise((resolve) => {
      setTimeout(() => {
        el.classList.remove(`anim-${presetName}`);
        this._eventBus.emit(EVENTS.ANIMATION.COMPLETE, { presetName, target: el.id ?? null });
        resolve();
      }, duration);
    });
  }
}
