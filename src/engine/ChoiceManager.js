/**
 * ChoiceManager.js
 * ---------------------------------------------------------------------------
 * Menerjemahkan intent gesture abstrak menjadi keputusan gameplay konkret,
 * tergantung konteks aktif (quiz atau bukan) — dilacak lewat scene:entered.
 *
 * Single tap (READ_LEFT/RIGHT_INTENT) diteruskan sebagai event baca pilihan
 * agar QuizManager bisa membacakan A/B. Double tap (SELECT_LEFT/RIGHT_INTENT)
 * diteruskan sebagai pilihan (choice:selected) hanya jika konteks = quiz.
 */

import { EVENTS, SCENE_TYPE, CHOICE_SIDE } from '../constants/index.js';

export class ChoiceManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    if (!eventBus) throw new TypeError('ChoiceManager membutuhkan instance EventBus.');
    this._eventBus = eventBus;
    this._activeContextType = null;

    this._eventBus.subscribe(EVENTS.SCENE.ENTERED, ({ sceneType }) => {
      this._activeContextType = sceneType;
    });

    // Single tap → baca pilihan (kiri A / kanan B)
    this._eventBus.subscribe(EVENTS.GESTURE.READ_LEFT_INTENT, () => {
      this._eventBus.emit(EVENTS.CHOICE.READ_LEFT, { side: CHOICE_SIDE.LEFT });
    });
    this._eventBus.subscribe(EVENTS.GESTURE.READ_RIGHT_INTENT, () => {
      this._eventBus.emit(EVENTS.CHOICE.READ_RIGHT, { side: CHOICE_SIDE.RIGHT });
    });

    // Double tap → pilih
    this._eventBus.subscribe(EVENTS.GESTURE.SELECT_LEFT_INTENT, () => this._handleIntent(CHOICE_SIDE.LEFT));
    this._eventBus.subscribe(EVENTS.GESTURE.SELECT_RIGHT_INTENT, () => this._handleIntent(CHOICE_SIDE.RIGHT));
  }

  /** @private */
  _handleIntent(side) {
    if (this._activeContextType === SCENE_TYPE.QUIZ) {
      this._eventBus.emit(EVENTS.CHOICE.SELECTED, { side });
    } else {
      this._eventBus.emit(EVENTS.CHOICE.IGNORED, {});
    }
  }
}
