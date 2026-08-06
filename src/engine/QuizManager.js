/**
 * QuizManager.js
 * ---------------------------------------------------------------------------
 * Menjalankan satu Scene bertipe "quiz" dari soal pertama sampai terakhir.
 *
 * STRUKTUR ASSET QUIZ (per soal, folder `audio/{levelId}/soal/{shortId}/`):
 *   - soal.mp3           → audio pertanyaan
 *   - A.mp3              → audio pilihan A (preview saat single tap kiri)
 *   - B.mp3              → audio pilihan B (preview saat single tap kanan)
 *   - feedback benar.mp3 → audio feedback jawaban benar
 *   - feedback salah.mp3 → audio feedback jawaban salah
 *
 * PIPELINE AUDIO PER SOAL (baru, sesuai requirement UX):
 *   soal.mp3 → A.mp3 → B.mp3 → (baru mengizinkan input pemain)
 * Pilihan TIDAK ditampilkan/suara diputar sebelum urutan ini selesai.
 *
 * INTERAKSI A/B (baru, sesuai requirement):
 *   - Tap pertama pada sisi X   → preview: putar audio pilihan X (baca ulang)
 *   - Tap kedua pada sisi yang sama (dalam CONFIRM_WINDOW_MS) → KONFIRMASI pilih
 *   - Tap pada sisi berbeda      → ganti preview ke sisi itu (baca audio baru)
 *   - Setelah memilih → putar feedback benar/salah, lalu otomatis ke soal berikutnya
 *
 * [PROVISIONAL IMPLEMENTATION] `QUIZ_POINTS_PER_CORRECT` — Blueprint tidak
 * menyebutkan nilai poin per soal secara eksplisit. TODO: pindahkan ke
 * field data (mis. `question.points`) begitu skema soal diperluas.
 */

import { EVENTS, SCENE_TYPE, CHOICE_SIDE } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';
import { resolveQuestionAudioPath } from '../utils/pathResolver.js';

const MIN_READ_DURATION_MS = 800;
const READ_MS_PER_CHAR = 45;
const QUIZ_POINTS_PER_CORRECT = 10;
// Jendela waktu (ms) tap kedua pada sisi yang sama untuk dianggap
// "konfirmasi pilihan" setelah tap pertama (preview suara).
const CONFIRM_WINDOW_MS = 4000;

export class QuizManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./SceneManager.js').SceneManager} sceneManager - read-only
   * @param {import('./AudioManager.js').AudioManager} audioManager
   * @param {import('./UIManager.js').UIManager} uiManager
   */
  constructor(eventBus, sceneManager, audioManager, uiManager) {
    if (!eventBus) throw new TypeError('QuizManager membutuhkan instance EventBus.');
    if (!sceneManager) throw new TypeError('QuizManager membutuhkan instance SceneManager.');
    if (!audioManager) throw new TypeError('QuizManager membutuhkan instance AudioManager.');
    if (!uiManager) throw new TypeError('QuizManager membutuhkan instance UIManager.');

    this._eventBus = eventBus;
    this._sceneManager = sceneManager;
    this._audioManager = audioManager;
    this._uiManager = uiManager;

    this._questions = null;
    this._index = 0;
    this._sceneId = null;
    this._levelId = null;
    this._correctCount = 0;
    this._acceptingInput = false;
    this._locked = false;
    this._awaitedTrackId = null;
    this._onAwaited = null;
    // Pilihan yang sedang "dipreview" (tap pertama) — null jika belum ada.
    // Tap kedua pada pilihan yang sama (dalam CONFIRM_WINDOW_MS) = pilih.
    this._previewSide = null;
    this._previewTime = 0;

    this._eventBus.subscribe(EVENTS.SCENE.ENTERED, (p) => this._onSceneEntered(p));
    this._eventBus.subscribe(EVENTS.CHOICE.SELECTED, (p) => this._onChoiceSelected(p));
    this._eventBus.subscribe(EVENTS.CHOICE.READ_LEFT, () => this._onReadChoice(CHOICE_SIDE.LEFT));
    this._eventBus.subscribe(EVENTS.CHOICE.READ_RIGHT, () => this._onReadChoice(CHOICE_SIDE.RIGHT));
    this._eventBus.subscribe(EVENTS.AUDIO.PLAYBACK_COMPLETE, (p) => this._onAudioSettled(p));
    this._eventBus.subscribe(EVENTS.AUDIO.PLAYBACK_FAILED, (p) => this._onAudioSettled(p));
  }

  // =========================================================================
  // SCENE ENTERED
  // =========================================================================

  /** @private */
  _onSceneEntered({ sceneId, levelId, sceneType }) {
    if (sceneType !== SCENE_TYPE.QUIZ) return;

    const scene = this._sceneManager.getCurrentScene();
    if (!scene || !Array.isArray(scene.questions) || scene.questions.length === 0) {
      Logger.warn('QuizManager', `Scene "${sceneId}" bertipe quiz tapi tidak punya questions valid.`);
      return;
    }

    this._questions = scene.questions;
    this._sceneId = sceneId;
    this._levelId = levelId;
    this._index = 0;
    this._correctCount = 0;
    this._locked = false;
    this._previewSide = null;
    this._previewTime = 0;

    this._eventBus.emit(EVENTS.QUIZ.SEQUENCE_STARTED, { sceneId, totalQuestions: scene.questions.length });
    this._presentCurrentQuestion();
  }

  // =========================================================================
  // PRESENT QUESTION — PIPELINE AUDIO soal → A → B → input aktif
  // =========================================================================

  /** @private */
  _presentCurrentQuestion() {
    const question = this._questions[this._index];
    this._acceptingInput = false;
    this._locked = false;
    this._previewSide = null;
    this._previewTime = 0;

    this._eventBus.emit(EVENTS.QUIZ.QUESTION_STARTED, {
      sceneId: this._sceneId,
      questionId: question.id,
      questionIndex: this._index,
      totalQuestions: this._questions.length,
    });
    this._uiManager.renderQuestion(question);

    // Urutan wajib: Soal → Audio A → Audio B → baru menerima input.
    this._playQuestionIntro(question, () => {
      this._acceptingInput = true;
    });
  }

  /**
   * Memutar audio soal, lalu A, lalu B, lalu memanggil onReady.
   * @private
   */
  _playQuestionIntro(question, onReady) {
    const soalPath = this._questionAudioPath(question, 'soal');
    this._awaitAudioOrTimeout(soalPath, `${question.id}_soal`, question.questionText, () => {
      const aPath = this._questionAudioPath(question, 'A');
      this._awaitAudioOrTimeout(aPath, `${question.id}_A`, question.choiceLeft?.text ?? '', () => {
        const bPath = this._questionAudioPath(question, 'B');
        this._awaitAudioOrTimeout(bPath, `${question.id}_B`, question.choiceRight?.text ?? '', () => {
          if (onReady) onReady();
        });
      });
    });
  }

// =========================================================================
  // READ CHOICE (SINGLE TAP) — PREVIEW SUARA PILIHAN A/B
  // =========================================================================
  //
  // [REQUIREMENT #3] Tap pertama = PREVIEW (bacakan ulang audio pilihan tsb),
  // TIDAK memilih. Seleksi hanya terjadi lewat DOUBLE TAP pada sisi yang sama
  // (dideteksi GestureManager → SELECT_*_INTENT → choice:selected →
  // _onChoiceSelected). Logika "tap2 pada sisi sama = konfirmasi" TIDAK
  // ditangani di sini untuk menghindari bentrok dengan deteksi double-tap
  // GestureManager (yang jendelanya ~350ms).

  /** @private */
  _onReadChoice(side) {
    if (this._locked || !this._acceptingInput || !this._questions) return;

    const question = this._questions[this._index];
    if (!question) return;

    const type = side === CHOICE_SIDE.LEFT ? 'A' : 'B';
    const path = this._questionAudioPath(question, type);
    if (path) {
      this._audioManager.playVoice(path, `${question.id}_read_${type}`);
    }
  }

  // =========================================================================
  // CHOICE SELECTED (KONFIRMASI PILIHAN)
  // =========================================================================

  /** @private */
  _onChoiceSelected({ side }) {
    if (!this._acceptingInput || this._locked || !this._questions) return;
    this._acceptingInput = false;
    this._locked = true;
    this._previewSide = null;
    this._previewTime = 0;

    const question = this._questions[this._index];
    const isCorrect = question.correctAnswer === side;
    const pointsAwarded = isCorrect ? QUIZ_POINTS_PER_CORRECT : 0;
    if (isCorrect) this._correctCount += 1;

    this._eventBus.emit(EVENTS.QUIZ.ANSWER_EVALUATED, {
      questionId: question.id,
      selectedSide: side,
      isCorrect,
      pointsAwarded,
    });

    const feedbackType = isCorrect ? 'feedback benar' : 'feedback salah';
    const feedbackText = isCorrect ? question.feedbackCorrect?.text : question.feedbackWrong?.text;
    this._uiManager.renderFeedback(feedbackText ?? '');

    const path = this._questionAudioPath(question, feedbackType);
    this._awaitAudioOrTimeout(path, `${question.id}_fb`, feedbackText, () => {
      this._advance();
    });
  }

  // =========================================================================
  // ADVANCE
  // =========================================================================

  /** @private */
  _advance() {
    this._index += 1;
    if (!this._questions || this._index >= this._questions.length) {
      const sceneId = this._sceneId;
      const totalQuestions = this._questions?.length ?? 0;
      const correctCount = this._correctCount;
      this._questions = null;
      this._acceptingInput = false;
      this._locked = false;
      this._previewSide = null;
      this._previewTime = 0;
      this._eventBus.emit(EVENTS.QUIZ.COMPLETED, { sceneId, totalQuestions, correctCount });
      return;
    }
    this._presentCurrentQuestion();
  }

  // =========================================================================
  // AUDIO UTILITY
  // =========================================================================

  /**
   * Membangun path audio dari aset folder soal.
   * @private
   * @param {object} question
   * @param {'soal'|'A'|'B'|'feedback benar'|'feedback salah'} type
   * @returns {string}
   */
  _questionAudioPath(question, type) {
    if (!this._levelId) return null;
    return resolveQuestionAudioPath(this._levelId, question.id, type);
  }

  /**
   * Memutar audio jika ada path, atau menunggu estimasi durasi baca jika
   * tidak ada — lalu memanggil callback baik lewat audio settle maupun timeout.
   * @private
   */
  _awaitAudioOrTimeout(path, trackId, text, onSettled) {
    if (path) {
      this._audioManager.playVoice(path, trackId);
      this._awaitedTrackId = trackId;
      this._onAwaited = onSettled;
    } else {
      const duration = Math.max(MIN_READ_DURATION_MS, (text?.length ?? 0) * READ_MS_PER_CHAR);
      setTimeout(onSettled, duration);
    }
  }

  /** @private */
  _onAudioSettled({ trackId, channel }) {
    if (channel !== 'voice') return;
    if (!this._awaitedTrackId || trackId !== this._awaitedTrackId) return;
    const callback = this._onAwaited;
    this._awaitedTrackId = null;
    this._onAwaited = null;
    if (callback) callback();
  }
}

