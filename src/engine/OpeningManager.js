/**
 * OpeningManager.js
 * ---------------------------------------------------------------------------
 * Menjalankan sequence Opening (slideshow sambutan) dengan auto-discovery
 * jumlah slide dari file asset:
 *   - images/system/opening{index}.webp
 *   - audio/system/opening_audio_{index}.mp3 (opsional, jika ada)
 *
 * Berhenti ketika slide berikutnya tidak ada. Setelah selesai, pindah ke
 * Menu (scene "menu" di level system).
 *
 * [PROVISIONAL] Audio per slide opening belum tentu ada di folder system —
 * hanya ada "Ketuk Layar.mp3", "Lanjut atau baru.mp3", dst. Untuk slide
 * opening, audio dibaca dari lines[0] scene opening di system.json (fallback
 * ke estimasi durasi baca jika tidak ada audio spesifik).
 */

import { EVENTS } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';
import { resolveLoadingScreenAudioPath, resolveOpeningImagePath } from '../utils/pathResolver.js';
import { assetExists } from '../utils/assetExists.js';
import { showOpeningSlide, hideOpening } from '../components/OpeningView.js';

const MAX_OPENING_SLIDES = 20; // batas aman auto-discovery (anti infinite loop)

export class OpeningManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./SceneManager.js').SceneManager} sceneManager
   * @param {import('./AudioManager.js').AudioManager} audioManager
   */
  constructor(eventBus, sceneManager, audioManager) {
    if (!eventBus) throw new TypeError('OpeningManager membutuhkan instance EventBus.');
    if (!sceneManager) throw new TypeError('OpeningManager membutuhkan instance SceneManager.');
    if (!audioManager) throw new TypeError('OpeningManager membutuhkan instance AudioManager.');

    this._eventBus = eventBus;
    this._sceneManager = sceneManager;
    this._audioManager = audioManager;

    this._slide = 0;
    this._isRunning = false;
    this._completeCallback = null;
  }

  /**
   * Memulai opening slideshow. Auto-discovery slide dari file asset.
   * @param {() => void} [onComplete] - dipanggil setelah semua slide selesai
   */
  async start(onComplete) {
    console.log('[DEBUG] OpeningManager.start() DIPANGGIL');
    this._isRunning = true;
    this._slide = 0;
    this._completeCallback = onComplete ?? null;

    const firstExists = await this._slideExists(1);
    console.log('[DEBUG] OpeningManager.start() -> opening1 exists:', firstExists);
    if (!firstExists) {
      Logger.warn('OpeningManager', 'Tidak ada slide opening (opening1.webp) — langsung ke menu.');
      this._finish();
      return;
    }

    // BACKSOUND: mulai loading_screen.mp3 (loop) tepat saat slide pertama
    // opening muncul. Diputar SATU KALI sepanjang slideshow, tidak direstart
    // saat pindah slide (lihat _showSlide). Dihentikan di _finish().
    this._audioManager.playBgm(resolveLoadingScreenAudioPath(), 'loading_screen');

    this._showSlide(1);
  }

  /** @private */
  async _showSlide(slide) {
    console.log(`[DEBUG] OpeningManager._showSlide(${slide})`);
    this._slide = slide;
    const imagePath = resolveOpeningImagePath(slide);
    const text = this._textForSlide(slide);

    showOpeningSlide(slide, imagePath, text);

    // Durasi per slide (estimasi dari teks)
    const duration = Math.max(2500, (text?.length ?? 0) * 45);
    console.log(`[DEBUG] OpeningManager._showSlide(${slide}) -> durasi ${duration}ms`);
    setTimeout(() => {
      if (this._isRunning) this._advance();
    }, duration);
  }

  /** @private */
  async _advance() {
    const next = this._slide + 1;
    console.log(`[DEBUG] OpeningManager._advance() -> cek slide ${next}`);
    const exists = await this._slideExists(next);
    console.log(`[DEBUG] OpeningManager._advance() -> slide ${next} exists: ${exists}`);
    if (exists) {
      this._showSlide(next);
    } else {
      this._finish();
    }
  }

  /** @private */
  _finish() {
    console.log('[DEBUG] OpeningManager._finish() DIPANGGIL — callback akan dipanggil');
    this._isRunning = false;
    hideOpening();
    // BACKSOUND: hentikan loading_screen.mp3 saat opening selesai (masuk Menu).
    this._audioManager.stopBgm();
    const cb = this._completeCallback;
    this._completeCallback = null;
    if (cb) {
      console.log('[DEBUG] OpeningManager._finish() -> memanggil completeCallback');
      cb();
    } else {
      console.log('[DEBUG] OpeningManager._finish() -> TIDAK ADA completeCallback!');
    }
  }

  /** @private */
  async _slideExists(slide) {
    // Pakai assetExists() — bukan fetch().ok saja — karena Vite SPA-fallback
    // mengembalikan HTTP 200 + text/html untuk file yang tidak ada, sehingga
    // res.ok selalu true dan opening berputar tanpa henti (bug di browser).
    return assetExists(resolveOpeningImagePath(slide));
  }

  /** @private */
  _textForSlide(slide) {
    const scene = this._sceneManager.getCurrentScene();
    const line = scene?.lines?.[0]?.text;
    return line ?? `SVARAVITA — Game Edukasi Literasi Kesehatan`;
  }
}
