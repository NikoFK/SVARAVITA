/**
 * ProgressManager.js
 * ---------------------------------------------------------------------------
 * Satu-satunya pemilik "sejauh mana pemain sudah maju". Mendengarkan
 * quiz:answerEvaluated (akumulasi Vita Point) dan quiz:completed (evaluasi
 * unlock level berikutnya), scene:changed (checkpoint resume). Memanggil
 * SaveManager.save() LANGSUNG (bukan lewat event), sesuai Blueprint.
 *
 * [PROVISIONAL IMPLEMENTATION] `_nextLevelId()` — Blueprint tidak
 * mendefinisikan urutan unlock secara eksplisit selain "5 tahap linear".
 * Diasumsikan unlock berurutan numerik ("level1" -> "level2" dst) dari ID.
 */

import { EVENTS } from '../constants/index.js';

export class ProgressManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./SaveManager.js').SaveManager} saveManager
   * @param {import('./DataManager.js').DataManager} dataManager - read-only, utk hitung total bintang per level
   */
  constructor(eventBus, saveManager, dataManager) {
    if (!eventBus) throw new TypeError('ProgressManager membutuhkan instance EventBus.');
    if (!saveManager) throw new TypeError('ProgressManager membutuhkan instance SaveManager.');
    if (!dataManager) throw new TypeError('ProgressManager membutuhkan instance DataManager.');
    this._eventBus = eventBus;
    this._saveManager = saveManager;
    this._dataManager = dataManager;

    const saved = this._saveManager.load();
    this._vitaPoint = saved?.vitaPoint ?? 0;
    this._unlockedLevels = new Set(saved?.unlockedLevels ?? ['level1']);
    this._lastCompletedScene = saved?.lastCompletedScene ?? null;
    // Bintang per level: { levelId: jumlah bintang yg diperoleh }
    this._levelStars = saved?.levelStars ?? {};
    // Scene yang sedang/terakhir diproses DialogueManager (utk hitung bintang)
    this._currentStorySceneId = null;
    this._currentStoryLevelId = null;

    this._eventBus.subscribe(EVENTS.QUIZ.ANSWER_EVALUATED, (p) => this._onAnswerEvaluated(p));
    this._eventBus.subscribe(EVENTS.QUIZ.COMPLETED, (p) => this._onQuizCompleted(p));
    this._eventBus.subscribe(EVENTS.SCENE.CHANGED, (p) => this._onSceneChanged(p));
    this._eventBus.subscribe(EVENTS.DIALOGUE.LINE_STARTED, (p) => this._onDialogueLineStarted(p));
    this._eventBus.subscribe(EVENTS.DIALOGUE.SEQUENCE_COMPLETE, (p) => this._onDialogueSequenceComplete(p));
    this._eventBus.subscribe(EVENTS.SCENE.ENTERED, (p) => this._onSceneEntered(p));
  }

getVitaPoint() {
    return this._vitaPoint;
  }

  /**
   * Me-reset seluruh progres ke kondisi New Game (Mulai Baru).
   * Dipanggil Router.startNewGame() supaya save lama (poin bintang, level
   * terbuka, checkpoint) tidak terbawa ke permainan baru.
   *
   * [BUG FIX] Sebelumnya "Mulai Baru" tidak me-reset ProgressManager, sehingga
   * `vitaPoint` dari save lama (mis. 300 dari sesi uji sebelumnya) langsung
   * ditampilkan di HUD dan dijumlahkan dengan poin baru.
   */
  reset() {
    this._vitaPoint = 0;
    this._unlockedLevels = new Set(['level1']);
    this._lastCompletedScene = null;
    this._levelStars = {};
    this._currentStorySceneId = null;
    this._currentStoryLevelId = null;
    this._persist();
  }

  /** @returns {string[]} */
  getUnlockedLevels() {
    return [...this._unlockedLevels];
  }

  isLevelUnlocked(levelId) {
    return this._unlockedLevels.has(levelId);
  }

  /**
   * Jumlah bintang yang diperoleh pemain pada sebuah level.
   * @param {string} levelId
   * @returns {number}
   */
  getEarnedStars(levelId) {
    return this._levelStars[levelId] ?? 0;
  }

  /**
   * Total bintang untuk sebuah level (jumlah scene cerita, dari data level).
   * @param {string} levelId
   * @returns {number}
   */
  async getTotalStars(levelId) {
    const levelData = await this._dataManager.getLevelData(levelId);
    if (!levelData || !Array.isArray(levelData.scenes)) return 5;
    return levelData.scenes.filter((s) => s && (s.type === 'narration' || s.type === 'dialogue')).length;
  }

  /**
   * Total bintang yang diperoleh di seluruh level.
   * @returns {number}
   */
  getTotalEarnedStars() {
    return Object.values(this._levelStars).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }

  /** @returns {{levelId: string, sceneId: string}|null} */
  getLastCompletedScene() {
    return this._lastCompletedScene;
  }

  /** @private */
  _onAnswerEvaluated({ pointsAwarded }) {
    if (!pointsAwarded) return;
    const previousTotal = this._vitaPoint;
    this._vitaPoint += pointsAwarded;
    this._eventBus.emit(EVENTS.PROGRESS.VITA_POINT_CHANGED, {
      previousTotal,
      newTotal: this._vitaPoint,
      delta: pointsAwarded,
    });
    this._persist();
  }

  /** @private */
  _onQuizCompleted({ sceneId }) {
    const levelId = this._deriveLevelId(sceneId);
    if (!levelId) return;
    const nextLevelId = this._nextLevelId(levelId);
    if (nextLevelId && !this._unlockedLevels.has(nextLevelId)) {
      this._unlockedLevels.add(nextLevelId);
      this._eventBus.emit(EVENTS.PROGRESS.LEVEL_UNLOCKED, { levelId: nextLevelId });
      this._persist();
    }
  }

/** @private */
  _onSceneChanged({ toSceneId }) {
    const levelId = this._deriveLevelId(toSceneId) ?? this._lastCompletedScene?.levelId ?? null;
    this._lastCompletedScene = { levelId, sceneId: toSceneId };
    this._eventBus.emit(EVENTS.PROGRESS.SCENE_CHECKPOINT_UPDATED, { levelId, sceneId: toSceneId });
    this._persist();
  }

  /** @private */
  _onSceneEntered({ sceneId, levelId }) {
    // Catat scene cerita yang baru masuk (untuk menghitung bintang saat
    // sequence nya selesai dibaca).
    this._currentStorySceneId = sceneId ?? null;
    this._currentStoryLevelId = levelId ?? null;
  }

  /** @private */
  _onDialogueLineStarted({ sceneId, levelId }) {
    this._currentStorySceneId = sceneId ?? this._currentStorySceneId;
    this._currentStoryLevelId = levelId ?? this._currentStoryLevelId;
  }

  /**
   * Cerita selesai dibaca → tandai 1 bintang untuk scene cerita itu.
   * @private
   */
  _onDialogueSequenceComplete({ sceneId, levelId }) {
    const sid = sceneId ?? this._currentStorySceneId;
    const lid = levelId ?? this._currentStoryLevelId;
    if (!sid || !lid) return;

    const prev = this._levelStars[lid] ?? 0;
    if (prev > 0) return; // sudah pernah dihitung (mis. replay) — jaga agar tidak dobel
    this._levelStars[lid] = 1;
    this._persist();
  }

  /** @private */
  _persist() {
    this._saveManager.save({
      vitaPoint: this._vitaPoint,
      unlockedLevels: [...this._unlockedLevels],
      lastCompletedScene: this._lastCompletedScene,
      levelStars: this._levelStars,
    });
  }

  /** @private */
  _deriveLevelId(sceneId) {
    const match = /^(.+)_scn\d+$/.exec(sceneId ?? '');
    return match ? match[1] : null;
  }

  /** @private */
  _nextLevelId(levelId) {
    const match = /^level(\d+)$/.exec(levelId ?? '');
    if (!match) return null;
    return `level${parseInt(match[1], 10) + 1}`;
  }
}
