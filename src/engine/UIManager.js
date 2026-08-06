/**
 * UIManager.js
 * ---------------------------------------------------------------------------
 * Satu-satunya yang menyentuh DOM untuk elemen non-Scene-managed sesuai
 * Technical Blueprint. Murni presentasi pasif: data selalu di-*push* dari
 * manager pemanggil (SceneManager/DialogueManager/QuizManager), tidak
 * pernah mengambil data sendiri dari DataManager, tidak pernah memutar
 * audio sendiri.
 *
 * STRUKTUR ASSET BARU: 1 scene = 1 gambar + 1 audio. Tidak ada lagi
 * portrait karakter terpisah. Background scene = gambar {sceneId}.webp.
 */

import { EVENTS, SPEAKER, SCENE_TYPE } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';
import { resolveSceneImagePath, resolveMenuImagePath, resolveWinGameAudioPath } from '../utils/pathResolver.js';
import { renderBackground } from '../components/BackgroundView.js';
import { renderSubtitle, clearSubtitle, hideSubtitleBox, showSubtitleBox } from '../components/SubtitleView.js';
import { renderChoices, clearChoices } from '../components/ChoiceView.js';
import { renderQuizQuestion } from '../components/QuizView.js';
import { renderHud, renderProgressInfo, clearProgressInfo } from '../components/HUD.js';
import { renderEnding, hideEnding } from '../components/EndingView.js';
import { showLoading, hideLoading } from '../components/LoadingScreen.js';
import { speak, stopSpeaking } from '../utils/tts.js';

export class UIManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./SceneManager.js').SceneManager} sceneManager - read-only
   * @param {import('./ProgressManager.js').ProgressManager} progressManager - read-only
   * @param {import('./AudioManager.js').AudioManager} audioManager
   */
  constructor(eventBus, sceneManager, progressManager, audioManager) {
    if (!eventBus) throw new TypeError('UIManager membutuhkan instance EventBus.');
    if (!sceneManager) throw new TypeError('UIManager membutuhkan instance SceneManager.');
    if (!progressManager) throw new TypeError('UIManager membutuhkan instance ProgressManager.');
    if (!audioManager) throw new TypeError('UIManager membutuhkan instance AudioManager.');
    this._eventBus = eventBus;
    this._sceneManager = sceneManager;
    this._progressManager = progressManager;
    this._audioManager = audioManager;

    /** @private state untuk progress info */
    this._currentLevelId = null;
    this._currentQuestionIndex = 0;
    this._currentTotalQuestions = 0;

    this._eventBus.subscribe(EVENTS.SCENE.ENTERED, (p) => this._onSceneEntered(p));
    this._eventBus.subscribe(EVENTS.SCENE.EXITED, () => {
      this._currentLevelId = null;
      this._currentQuestionIndex = 0;
      this._currentTotalQuestions = 0;
      this.clearScene();
    });
    this._eventBus.subscribe(EVENTS.ASSET.PRELOAD_STARTED, () => showLoading());
    this._eventBus.subscribe(EVENTS.ASSET.LOADED, () => hideLoading());
    this._eventBus.subscribe(EVENTS.ASSET.PRELOAD_FAILED, () => hideLoading());
    this._eventBus.subscribe(EVENTS.PROGRESS.VITA_POINT_CHANGED, (p) => renderHud(p));
    this._eventBus.subscribe(EVENTS.QUIZ.QUESTION_STARTED, (p) => this._onQuestionStarted(p));
    this._eventBus.subscribe(EVENTS.QUIZ.COMPLETED, (p) => this._onQuizCompleted(p));
  }

  /** Mengosongkan seluruh tampilan Scene (dipanggil saat scene:exited). */
  clearScene() {
    clearSubtitle();
    clearChoices();
    clearProgressInfo();
  }

/**
   * Render satu scene cerita (non-quiz): gambar fullscreen + audio narasi.
   *
   * [REQUIREMENT #4] TIDAK lagi menampilkan subtitle/teks pada scene cerita —
   * hanya gambar fullscreen + audio narasi. Teks dihapus sepenuhnya, dan
   * kotak/frame subtitle disembunyikan total.
   *
   * @param {object} scene - data scene
   * @param {string} levelId
   */
  renderScene(scene, levelId) {
    const sceneId = scene.id;

    // Background scene = gambar {sceneId}.webp (fullscreen)
    if (sceneId && levelId) {
      renderBackground(resolveSceneImagePath(levelId, sceneId));
    } else {
      renderBackground(null);
    }

    // Teks/subtitle TIDAK ditampilkan lagi (requirement #4).
    // Tidak hanya teksnya — kotak/frame subtitle pun disembunyikan total,
    // karena scene cerita hanya menampilkan gambar fullscreen + audio narasi.
    clearSubtitle();
    hideSubtitleBox();
  }

  /**
   * Dipanggil QuizManager saat soal baru mulai dibacakan.
   * @param {object} question
   */
  renderQuestion(question) {
    showSubtitleBox();
    renderQuizQuestion(question.questionText);
    renderChoices(question.choiceLeft?.text, question.choiceRight?.text);
  }

  /** Dipanggil QuizManager saat menampilkan feedback benar/salah. */
  renderFeedback(text) {
    showSubtitleBox();
    renderSubtitle('', text);
  }

/** @private */
  _onSceneEntered({ levelId, sceneType }) {
    console.log(`[DEBUG] UIManager._onSceneEntered -> sceneType='${sceneType}', levelId='${levelId}'`);
    const scene = this._sceneManager.getCurrentScene();
    if (!scene) return;

    // Scene cerita: renderScene dipanggil DialogueManager.
    // Scene quiz: renderQuestion dipanggil QuizManager.
// Scene menu: render tombol Mulai Baru/Lanjutkan.
    // Scene ending: renderEndingScreen.
    this.clearScene();
    hideEnding();
    stopSpeaking();

    if (sceneType === SCENE_TYPE.MENU) {
      console.log('[DEBUG] UIManager._onSceneEntered -> MERENDER MENU (Mulai Baru/Lanjutkan)');
      // Background Menu Utama = gambar "tombol play.webp" fullscreen.
      // Hanya di-set di scene MENU; scene lain memakai background masing-masing
      // (renderScene untuk cerita, renderQuestion untuk quiz, dst.).
      renderBackground(resolveMenuImagePath());
      showSubtitleBox();
      renderChoices('Mulai Baru', 'Lanjutkan');

      // Tampilkan teks prompt di kotak dialog atas (jangan biarkan kosong).
      renderSubtitle(
        'Menu Utama',
        'Ketuk layar bagian kiri untuk Mulai Baru, atau ketuk layar bagian kanan untuk Lanjutkan.'
      );
    }

    if (sceneType === SCENE_TYPE.ENDING) {
      this._renderEndingScreen();
    }

    Logger.debug('UIManager', `Scene "${sceneType}" masuk — menunggu konten dari DialogueManager/QuizManager.`);

    // Update state level untuk progress info
    this._currentLevelId = levelId ?? null;
    this._currentQuestionIndex = 0;
    this._currentTotalQuestions = 0;
    this._updateProgressDisplay();
  }

  /**
   * Render Ending Screen dengan hasil permainan (total star & vita point),
   * lalu membacakan hasilnya via TTS.
   * @private
   */
  _renderEndingScreen() {
    const totalVitaPoint = this._progressManager.getVitaPoint();
    const totalStars = this._progressManager.getTotalEarnedStars();
    renderEnding({ totalStars, totalVitaPoint });

    // TTS membacakan hasil akhir secara dinamis.
    const message =
      `Permainan selesai. Kamu mendapatkan ${totalVitaPoint} Vita Point. ` +
      `Dan memperoleh ${totalStars} bintang.`;
    speak(message);

    // BACKSOUND KEMENANGAN: win_game.mp3 diputar SETELAH Result Screen
    // (bintang + Vita Point) sempat tampil. Jeda ~800ms agar pengguna
    // melihat hasilnya dulu, lalu audio diputar SEBAGAI VOICE (sekali) —
    // pemain tetap berada di halaman hasil sampai audio selesai (scene
    // ending tidak auto-advance; transisi hanya lewat ketukan pengguna).
    setTimeout(() => {
      this._audioManager.playVoice(resolveWinGameAudioPath(), 'win_game');
    }, 800);

    // Ketuk pada overlay ending → kembali ke menu utama.
    const overlay = document.getElementById('ending-overlay');
    if (overlay) {
      overlay.onclick = () => {
        stopSpeaking();
        hideEnding();
        this._sceneManager.loadScene('system', 'menu');
      };
    }
  }

  /** @private Handler untuk quiz:questionStarted */
  _onQuestionStarted({ sceneId, questionIndex, totalQuestions }) {
    this._currentQuestionIndex = questionIndex;
    this._currentTotalQuestions = totalQuestions;
    this._updateProgressDisplay();
  }

  /** @private Handler untuk quiz:completed */
  _onQuizCompleted({ sceneId, totalQuestions, correctCount }) {
    this._currentQuestionIndex = totalQuestions; // Semua sudah dijawab
    this._currentTotalQuestions = totalQuestions;
    this._updateProgressDisplay();
  }

/**
   * Update progress info di pojok kiri atas.
   * @private
   */
  async _updateProgressDisplay() {
    if (!this._currentLevelId) return;
    const levelId = this._currentLevelId;
    const totalStars = await this._progressManager.getTotalStars(levelId);
    const earnedStars = this._progressManager.getEarnedStars(levelId);
    renderProgressInfo({
      levelId,
      questionIndex: this._currentQuestionIndex,
      totalQuestions: this._currentTotalQuestions,
      totalStars,
      earnedStars,
    });
  }

  /** @private */
  _speakerDisplayName(speaker) {
    const names = {
      [SPEAKER.NARRATOR]: '',
      [SPEAKER.VARA]: 'Vara',
      [SPEAKER.ZEA]: 'Zea',
      [SPEAKER.EXPERT]: 'Ahli Gizi',
    };
    return names[speaker] ?? speaker;
  }
}
