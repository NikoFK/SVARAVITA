/**
 * Router.js
 * ---------------------------------------------------------------------------
 * Mengelola mode aplikasi tingkat-tinggi (Blueprint: satu tingkat di atas
 * SceneManager secara konsep). TIDAK menyimpan currentSceneId (itu tetap
 * milik SceneManager).
 *
 * FLOW (data-driven, mengikuti asset & JSON):
 *   start()       → Opening slideshow (auto-discovery) → Menu
 *   startNewGame()→ Tutorial (auto-discovery) → level1_scn001
 *   resumeGame()  → cek localStorage; jika ada → lanjut ke scene terakhir;
 *                   jika kosong → perlakukan seperti Mulai Baru (tutorial → level1)
 */

import { EVENTS, APP_MODE, SCENE_TYPE } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';
import { resolveSystemAudioPath } from '../utils/pathResolver.js';

const SYSTEM_LEVEL_ID = 'system';

export class Router {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./SceneManager.js').SceneManager} sceneManager
   * @param {import('./ProgressManager.js').ProgressManager} progressManager
   * @param {import('./OpeningManager.js').OpeningManager} openingManager
   * @param {import('./TutorialManager.js').TutorialManager} tutorialManager
   * @param {import('./AudioManager.js').AudioManager} audioManager
   */
  constructor(eventBus, sceneManager, progressManager, openingManager, tutorialManager, audioManager) {
    if (!eventBus) throw new TypeError('Router membutuhkan instance EventBus.');
    if (!sceneManager) throw new TypeError('Router membutuhkan instance SceneManager.');
    if (!progressManager) throw new TypeError('Router membutuhkan instance ProgressManager.');
    if (!openingManager) throw new TypeError('Router membutuhkan instance OpeningManager.');
    if (!tutorialManager) throw new TypeError('Router membutuhkan instance TutorialManager.');
    if (!audioManager) throw new TypeError('Router membutuhkan instance AudioManager.');

    this._eventBus = eventBus;
    this._sceneManager = sceneManager;
    this._progressManager = progressManager;
    this._openingManager = openingManager;
    this._tutorialManager = tutorialManager;
    this._audioManager = audioManager;
    this._currentMode = APP_MODE.BOOT;
    this._tutorialPlayed = false;

    this._eventBus.subscribe(EVENTS.SCENE.ENTERED, ({ sceneType }) => {
      if (sceneType === SCENE_TYPE.ENDING) this._setMode(APP_MODE.ENDING);
      else if (sceneType === SCENE_TYPE.MENU) this._setMode(APP_MODE.MENU);
    });
  }

  getCurrentMode() {
    return this._currentMode;
  }

/** Dipanggil sekali oleh GameEngine.start(). */
  async start() {
    console.log('[DEBUG] Router.start() DIPANGGIL');
    this._setMode(APP_MODE.BOOT);
    // Opening slideshow auto-discovery → menu
    this._openingManager.start(() => {
      console.log('[DEBUG] Router.start() -> Opening SELESAI, callback dipanggil. Mode MENU.');
      this._setMode(APP_MODE.MENU);
      console.log('[DEBUG] Router.start() -> loadScene(system, menu) dipanggil');
      this._sceneManager.loadScene(SYSTEM_LEVEL_ID, 'menu');
    });
  }

/** Dipanggil dari Main Menu "Mulai Baru". */
  async startNewGame() {
    this._setMode(APP_MODE.PLAYING);
    // [BUG FIX] "Mulai Baru" harus me-reset progres agar save lama (poin,
    // level terbuka, checkpoint) tidak terbawa ke permainan baru.
    this._progressManager.reset();
    // Tutorial hanya muncul saat Mulai Baru
    this._playTutorialThen(() => {
      this._sceneManager.loadScene('level1', 'level1_scn001');
    });
  }

  /** Dipanggil dari Main Menu "Lanjutkan". */
  async resumeGame() {
    const checkpoint = this._progressManager.getLastCompletedScene();
    if (checkpoint?.levelId && checkpoint?.sceneId) {
      this._setMode(APP_MODE.PLAYING);
      await this._sceneManager.loadScene(checkpoint.levelId, checkpoint.sceneId);
    } else {
      // Tidak ada save → perlakukan seperti Mulai Baru
      await this.startNewGame();
    }
  }

  /** @private */
  _playTutorialThen(onComplete) {
    this._tutorialManager.start(() => {
      // Putar audio "mulai baru.mp3" sebagai konfirmasi, lalu lanjut
      this._audioManager.playVoice(resolveSystemAudioPath('mulai baru.mp3'), 'sb_start_new');
      onComplete();
    });
  }

  /** @private */
  _setMode(mode) {
    if (this._currentMode === mode) return;
    this._currentMode = mode;
    this._eventBus.emit(EVENTS.ROUTER.MODE_CHANGED, { mode });
  }
}
