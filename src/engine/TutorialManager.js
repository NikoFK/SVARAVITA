/**
 * TutorialManager.js
 * ---------------------------------------------------------------------------
 * Menjalankan sequence Tutorial (auto-discovery slide) sebelum level pertama.
 * Hanya dipanggil saat pemain memilih "Mulai Baru" (bukan "Lanjutkan").
 *
 * Slides diambil dari file asset (auto-discovery):
 *   - images/tutorial/bgrnd_tutorial{slide}.webp
 *   - audio/tutorial/tutorial_{slide}.mp3
 *
 * Berhenti ketika slide berikutnya tidak ada. Setelah selesai, melompat ke
 * level1_scn001.
 *
 * Tutorial SUDAH punya teks instruksi di system.json (scene "tutorial"),
 * tapi engine memakai auto-discovery slide asset. Teks instruksi dipakai
 * sebagai subtitle default jika diperlukan.
 */

import { EVENTS } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';
import { resolveTutorialImagePath, resolveTutorialAudioPath } from '../utils/pathResolver.js';
import { assetExists } from '../utils/assetExists.js';
import { renderTutorialSlide, hideTutorial } from '../components/TutorialView.js';

const MAX_TUTORIAL_SLIDES = 20; // batas aman auto-discovery (anti infinite loop)

export class TutorialManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./AudioManager.js').AudioManager} audioManager
   * @param {import('./SceneManager.js').SceneManager} sceneManager
   */
  constructor(eventBus, audioManager, sceneManager) {
    if (!eventBus) throw new TypeError('TutorialManager membutuhkan instance EventBus.');
    if (!audioManager) throw new TypeError('TutorialManager membutuhkan instance AudioManager.');
    if (!sceneManager) throw new TypeError('TutorialManager membutuhkan instance SceneManager.');

    this._eventBus = eventBus;
    this._audioManager = audioManager;
    this._sceneManager = sceneManager;

    this._slide = 0;
    this._isRunning = false;
    this._completeCallback = null;

    // Perpindahan tutorial didorong oleh event selesai audio (bukan timer).
    this._eventBus.subscribe(EVENTS.AUDIO.PLAYBACK_COMPLETE, (p) => this._onAudioSettled(p));
    this._eventBus.subscribe(EVENTS.AUDIO.PLAYBACK_FAILED, (p) => this._onAudioSettled(p));
  }

  /**
   * Memulai tutorial. Auto-discovery slide dari file asset.
   * @param {() => void} [onComplete] - dipanggil setelah semua slide selesai
   */
  async start(onComplete) {
    this._isRunning = true;
    this._slide = 0;
    this._completeCallback = onComplete ?? null;

    const firstExists = await this._slideExists(1);
    if (!firstExists) {
      Logger.warn('TutorialManager', 'Tidak ada slide tutorial (bgrnd_tutorial1.webp) — langsung ke level.');
      this._finish();
      return;
    }

    this._showSlide(1);
  }

/** @private */
  async _showSlide(slide) {
    this._slide = slide;
    const imagePath = resolveTutorialImagePath(slide);
    const audioPath = resolveTutorialAudioPath(slide);

    const title = 'Tutorial Bermain';
    const text = this._textForSlide(slide);

    renderTutorialSlide(slide, this._slideCount(), title, text, imagePath);

    // Putar audio tutorial jika ada. Perpindahan slide didorong sepenuhnya
    // oleh event selesai audio (PLAYBACK_COMPLETE), bukan timer.
    const audioExists = await this._audioExists(audioPath);
    if (audioExists) {
      this._audioManager.playVoice(audioPath, this._trackIdFor(slide));
    } else {
      // Tidak ada audio tutorial — lanjut ke slide berikutnya segera.
      this._advance();
    }
  }

  /** @private */
  _trackIdFor(slide) {
    return `tutorial_${slide}`;
  }

  /**
   * Dipanggil saat audio tutorial selesai (event, bukan timer).
   * @private
   */
  _onAudioSettled({ trackId, channel }) {
    if (channel !== 'voice') return;
    if (!this._isRunning) return;
    if (trackId !== this._trackIdFor(this._slide)) return; // bukan slide saat ini
    this._advance();
  }

  /** @private */
  async _advance() {
    const next = this._slide + 1;
    const exists = await this._slideExists(next);
    if (exists) {
      this._showSlide(next);
    } else {
      this._finish();
    }
  }

  /** @private */
  _finish() {
    this._isRunning = false;
    hideTutorial();
    const cb = this._completeCallback;
    this._completeCallback = null;
    if (cb) cb();
  }

  /**
   * Estimasi jumlah slide (dipakai untuk indikator dot). Auto-discovery
   * dilakukan async — di sini kita pakai nilai yang sudah kita tahu.
   * @private
   */
  _slideCount() {
    return this._slide;
  }

/** @private */
  async _slideExists(slide) {
    // assetExists() menangani Vite SPA-fallback (200 + text/html utk file
    // yang tak ada) — kalau pakai fetch().ok saja, tutorial berputar tanpa henti.
    return assetExists(resolveTutorialImagePath(slide));
  }

/** @private */
  async _audioExists(path) {
    return assetExists(path);
  }

  /** @private */
  _textForSlide(slide) {
    const texts = [
      'Ketuk 2 kali layar bagian kiri untuk memilih A. Ketuk 2 kali layar bagian kanan untuk memilih B.',
      'Ketuk 1 kali layar untuk dibacakan. Ketuk 2 kali layar untuk memilih.',
    ];
    return texts[slide - 1] ?? `Slide ${slide}`;
  }
}
