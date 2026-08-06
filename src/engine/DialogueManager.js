/**
 * DialogueManager.js
 * ---------------------------------------------------------------------------
 * Menangani Scene cerita (non-quiz) dalam struktur asset baru:
 * 1 scene = 1 gambar + 1 audio tunggal.
 *
 * Memutar audio scene {sceneId}.mp3, menampilkan gambar {sceneId}.webp,
 * dan menunggu audio selesai (event, bukan callback) sebelum lanjut ke
 * nextScene (via SceneManager auto-advance / scene:sequenceComplete).
 *
 * [PROVISIONAL IMPLEMENTATION] Toleransi kegagalan audio: baik
 * `audio:playbackComplete` MAUPUN `audio:playbackFailed` dianggap "scene
 * ini selesai, lanjut" — supaya game tetap berjalan walau mp3 placeholder
 * belum ada. Jika audio tidak ada sama sekali, pakai estimasi durasi baca.
 */

import { EVENTS, SCENE_TYPE } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';
import { resolveSceneAudioPath } from '../utils/pathResolver.js';

const MIN_READ_DURATION_MS = 800;
const READ_MS_PER_CHAR = 45;

export class DialogueManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./SceneManager.js').SceneManager} sceneManager - read-only
   * @param {import('./AudioManager.js').AudioManager} audioManager
   * @param {import('./UIManager.js').UIManager} uiManager
   */
  constructor(eventBus, sceneManager, audioManager, uiManager) {
    if (!eventBus) throw new TypeError('DialogueManager membutuhkan instance EventBus.');
    if (!sceneManager) throw new TypeError('DialogueManager membutuhkan instance SceneManager.');
    if (!audioManager) throw new TypeError('DialogueManager membutuhkan instance AudioManager.');
    if (!uiManager) throw new TypeError('DialogueManager membutuhkan instance UIManager.');

    this._eventBus = eventBus;
    this._sceneManager = sceneManager;
    this._audioManager = audioManager;
    this._uiManager = uiManager;

    this._currentSceneId = null;
    this._currentLevelId = null;
    this._currentScene = null;
    this._isPlaying = false;

    this._eventBus.subscribe(EVENTS.SCENE.ENTERED, (p) => this._onSceneEntered(p));
    this._eventBus.subscribe(EVENTS.AUDIO.PLAYBACK_COMPLETE, (p) => this._onAudioSettled(p));
    this._eventBus.subscribe(EVENTS.AUDIO.PLAYBACK_FAILED, (p) => this._onAudioSettled(p));
  }

  /** @private */
  _onSceneEntered({ sceneId, levelId, sceneType }) {
    if (sceneType === SCENE_TYPE.QUIZ) return; // domain QuizManager
    if (sceneType === SCENE_TYPE.MENU) return; // menu ditangani Router/UIManager
    if (sceneType === SCENE_TYPE.ENDING) return; // ending screen ditangani UIManager

    const scene = this._sceneManager.getCurrentScene();
    if (!scene) return;

    this._currentSceneId = sceneId;
    this._currentLevelId = levelId;
    this._currentScene = scene;
    this._isPlaying = true;

    // Render gambar scene + subtitle (teks dari lines[0] atau scene text)
    this._uiManager.renderScene(scene, levelId);

    const path = scene.audio ?? (levelId ? resolveSceneAudioPath(levelId, sceneId) : null);
    if (path) {
      this._audioManager.playVoice(path, sceneId);
    } else {
      this._scheduleAdvanceWithoutAudio(scene);
    }
  }

  /** @private */
  _scheduleAdvanceWithoutAudio(scene) {
    const text = scene.lines?.[0]?.text ?? '';
    const duration = Math.max(MIN_READ_DURATION_MS, text.length * READ_MS_PER_CHAR);
    setTimeout(() => {
      if (this._isPlaying && this._currentSceneId === scene.id) {
        this._complete();
      }
    }, duration);
  }

  /** @private */
  _onAudioSettled({ trackId, channel }) {
    if (channel !== 'voice') return;
    if (this._currentSceneId !== trackId) return; // bukan giliran DialogueManager
    this._complete();
  }

  /** @private */
  _complete() {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    const sceneId = this._currentSceneId;
    this._currentSceneId = null;
    this._currentScene = null;
    this._eventBus.emit(EVENTS.DIALOGUE.SEQUENCE_COMPLETE, { sceneId, totalLines: 1 });
  }
}
