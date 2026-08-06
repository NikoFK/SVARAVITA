/**
 * GestureManager.js
 * ---------------------------------------------------------------------------
 * Menerjemahkan touchstart/click mentah menjadi intent abstrak. TIDAK tahu
 * intent itu untuk apa (ChoiceManager yang memetakan ke gameplay).
 *
 * Deteksi (sesuai struktur interaksi tunanetra, layar dibagi 50:50):
 *   - Single tap di separuh KIRI layar  → READ_LEFT_INTENT  (bacakan pilihan A)
 *   - Single tap di separuh KANAN layar → READ_RIGHT_INTENT (bacakan pilihan B)
 *   - Double tap di separuh KIRI layar  → SELECT_LEFT_INTENT  (pilih A)
 *   - Double tap di separuh KANAN layar → SELECT_RIGHT_INTENT (pilih B)
 *
 * Fallback mouse desktop: klik tombol #choice-left / #choice-right (dirender
 * ChoiceView) langsung memicu intent SELECT_* yang sama.
 */

import { EVENTS } from '../constants/index.js';

const DOUBLE_TAP_MAX_INTERVAL_MS = 350;

export class GestureManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {HTMLElement} [surfaceEl] - elemen full-screen sebagai area sentuh utama
   */
  constructor(eventBus, surfaceEl) {
    if (!eventBus) throw new TypeError('GestureManager membutuhkan instance EventBus.');
    this._eventBus = eventBus;
    this._lastTapTime = 0;
    this._lastTapX = 0;

    const surface = surfaceEl ?? (typeof document !== 'undefined' ? document.body : null);
    if (surface) {
      // SATU listener saja untuk menghindari double-fire. Semua klik
      // (tombol A/B visual maupun area bebas) diperlakukan sebagai ketukan
      // generik yang sama: single-tap = preview, double-tap cepat pada sisi
      // yang sama = konfirmasi pilihan (ditangani QuizManager via intent).
      // Tombol #choice-left/#choice-right TIDAK lagi memicu SELECT langsung
      // — konsisten dengan interaksi tunanetra (tap1 preview, tap2 pilih).
      surface.addEventListener('click', (event) => {
        this._handleTap(event.clientX);
      });
    }
  }

  /** @private */
  _handleTap(x) {
    const now = Date.now();
    const isDoubleTap = now - this._lastTapTime <= DOUBLE_TAP_MAX_INTERVAL_MS;
    this._lastTapTime = now;
    this._lastTapX = x;

    const isLeftHalf = x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);

    if (!isDoubleTap) {
      // SINGLE TAP → baca (kiri = A, kanan = B)
      if (isLeftHalf) {
        this._eventBus.emit(EVENTS.GESTURE.READ_LEFT_INTENT, {});
      } else {
        this._eventBus.emit(EVENTS.GESTURE.READ_RIGHT_INTENT, {});
      }
      return;
    }

    // DOUBLE TAP → pilih
    if (isLeftHalf) {
      this._eventBus.emit(EVENTS.GESTURE.SELECT_LEFT_INTENT, {});
    } else {
      this._eventBus.emit(EVENTS.GESTURE.SELECT_RIGHT_INTENT, {});
    }
    this._lastTapTime = 0; // reset supaya tap ketiga tidak dianggap double-tap lagi
  }
}
