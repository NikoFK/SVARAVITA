/**
 * DataManager.js
 * ---------------------------------------------------------------------------
 * Tujuan (Engine Architecture §15): satu-satunya titik akses ke file data
 * JSON (Scene, level) — abstraksi di atas fetch(). Data statis/read-only
 * selama sesi berjalan — TIDAK menyimpan state permainan (progres, Vita
 * Point, itu domain ProgressManager).
 *
 * Kontrak yang dijaga di sini:
 * - Lazy loading: level baru di-fetch hanya saat benar-benar diminta
 *   getLevelData(levelId) — tidak ada level yang dimuat di awal.
 * - Caching: level yang sudah dimuat tidak pernah di-fetch ulang.
 * - Validasi: setiap JSON WAJIB lolos validators.js sebelum masuk cache
 *   atau dipakai siapapun.
 * - Event only, tidak pernah memanggil SceneManager secara langsung —
 *   DataManager tidak mengimpor ataupun mengetahui SceneManager sama
 *   sekali, sesuai aturan layer (dipanggil dari GameEngine/SceneManager,
 *   tidak pernah memanggil balik ke atas).
 */

import { EVENTS } from '../constants/index.js';
import { validateLevelData } from '../utils/validators.js';
import { Logger } from '../utils/Logger.js';
import { REGISTERED_LEVEL_IDS } from '../../data/index.js';

const LEVEL_DATA_BASE_PATH = 'data';

export class DataManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus - instance EventBus milik GameEngine
   */
  constructor(eventBus) {
    if (!eventBus) {
      throw new TypeError('DataManager membutuhkan instance EventBus.');
    }
    this._eventBus = eventBus;

    /** @type {Map<string, object>} levelId -> data level yang sudah lolos validasi */
    this._cache = new Map();

    /** @type {Map<string, Promise<object|null>>} mencegah fetch duplikat saat dipanggil bersamaan */
    this._pending = new Map();
  }

  /**
   * @param {string} levelId
   * @returns {boolean} true jika levelId terdaftar di data/index.js
   */
  isLevelRegistered(levelId) {
    return REGISTERED_LEVEL_IDS.includes(levelId);
  }

  /**
   * @returns {string[]} salinan daftar levelId terdaftar (bukan referensi langsung)
   */
  getRegisteredLevelIds() {
    return [...REGISTERED_LEVEL_IDS];
  }

  /**
   * Ambil data level dari cache SAJA, tanpa memicu fetch. Berguna untuk
   * pengecekan sinkron cepat oleh SceneManager (mis. "apakah level ini
   * sudah siap sebelum saya render").
   * @param {string} levelId
   * @returns {object|undefined}
   */
  getCachedLevelData(levelId) {
    return this._cache.get(levelId);
  }

  /**
   * Mengambil data satu level. Lazy: hanya fetch saat pertama kali diminta.
   * Aman dipanggil berkali-kali bersamaan untuk levelId yang sama — hanya
   * akan melakukan satu fetch fisik (deduplikasi lewat _pending).
   * @param {string} levelId
   * @returns {Promise<object|null>} data level (sudah tervalidasi), atau null jika gagal
   * @fires data:levelLoaded
   * @fires data:loadFailed
   * @fires data:parseError
   */
  async getLevelData(levelId) {
    if (this._cache.has(levelId)) {
      Logger.debug('DataManager', `Cache hit untuk "${levelId}".`);
      return this._cache.get(levelId);
    }

    if (this._pending.has(levelId)) {
      Logger.debug('DataManager', `"${levelId}" sedang dimuat, menunggu promise yang sama.`);
      return this._pending.get(levelId);
    }

    const loadPromise = this._fetchAndValidate(levelId);
    this._pending.set(levelId, loadPromise);
    try {
      return await loadPromise;
    } finally {
      this._pending.delete(levelId);
    }
  }

  /**
   * Shortcut mengambil satu Scene tertentu dari sebuah level (memuat level
   * dulu jika belum ada di cache).
   * @param {string} levelId
   * @param {string} sceneId
   * @returns {Promise<object|null>}
   */
  async getSceneData(levelId, sceneId) {
    const levelData = await this.getLevelData(levelId);
    if (!levelData) return null;
    return levelData.scenes.find((scene) => scene?.id === sceneId) ?? null;
  }

  /**
   * Menghapus cache. Tanpa argumen = hapus semua (berguna untuk testing
   * atau reset penuh saat New Game dengan data yang mungkin sudah berubah).
   * @param {string} [levelId]
   */
  clearCache(levelId) {
    if (levelId) this._cache.delete(levelId);
    else this._cache.clear();
  }

  /**
   * @private
   * @param {string} levelId
   * @returns {Promise<object|null>}
   */
  async _fetchAndValidate(levelId) {
    if (!this.isLevelRegistered(levelId)) {
      Logger.warn('DataManager', `"${levelId}" tidak terdaftar di data/index.js — tetap dicoba dimuat.`);
    }

    const path = `${LEVEL_DATA_BASE_PATH}/${levelId}.json`;
    let response;
    try {
      response = await fetch(path);
    } catch (networkError) {
      this._emitLoadFailed(levelId, networkError?.message ?? 'Network error saat mengambil data level.');
      return null;
    }

    if (!response.ok) {
      this._emitLoadFailed(levelId, `HTTP ${response.status} saat memuat "${path}".`);
      return null;
    }

    let rawData;
    try {
      rawData = await response.json();
    } catch (parseException) {
      this._emitParseError(levelId, `JSON.parse gagal: ${parseException?.message ?? 'unknown error'}`);
      return null;
    }

    const result = validateLevelData(rawData, levelId);
    if (!result.valid) {
      this._emitParseError(levelId, `Validasi skema gagal:\n- ${result.errors.join('\n- ')}`);
      return null;
    }
    if (result.warnings.length > 0) {
      Logger.warn('DataManager', `"${levelId}" lolos validasi dengan ${result.warnings.length} warning:`, result.warnings);
    }

    this._cache.set(levelId, rawData);
    this._eventBus.emit(EVENTS.DATA.LEVEL_LOADED, {
      levelId,
      sceneCount: rawData.scenes.length,
    });
    Logger.info('DataManager', `"${levelId}" berhasil dimuat & tervalidasi (${rawData.scenes.length} scene).`);
    return rawData;
  }

  /** @private */
  _emitLoadFailed(levelId, reason) {
    Logger.error('DataManager', `Gagal memuat "${levelId}": ${reason}`);
    this._eventBus.emit(EVENTS.DATA.LOAD_FAILED, { levelId, reason });
  }

  /** @private */
  _emitParseError(levelId, reason) {
    Logger.error('DataManager', `Gagal parse/validasi "${levelId}": ${reason}`);
    this._eventBus.emit(EVENTS.DATA.PARSE_ERROR, { levelId, reason });
  }
}
