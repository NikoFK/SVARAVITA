/**
 * AssetLoader.js
 * ---------------------------------------------------------------------------
 * Satu-satunya titik yang tahu cara memuat file (gambar/audio) dari assets/,
 * termasuk resolusi path lewat pathResolver. TIDAK mengetahui SceneManager —
 * hanya menerima data Scene sebagai parameter dan melapor lewat EventBus.
 *
 * STRUKTUR ASSET BARU (data-driven, mengikuti JSON sebagai source of truth):
 *   - Scene cerita:  1 gambar {sceneId}.webp + 1 audio {sceneId}.mp3
 *   - Quiz:          soal/{questionId}/soal.mp3, A.mp3, B.mp3,
 *                    feedback benar.mp3, feedback salah.mp3
 *
 * [ASSUMPTION] TIDAK ada lagi BGM/SFX/portrait/background/folder per-speaker.
 * Seluruh asset lama (characters/, bgm/, sfx/, icons/) tidak lagi dipakai.
 */

import { EVENTS, SCENE_TYPE } from '../constants/index.js';
import {
  resolveSceneImagePath,
  resolveSceneAudioPath,
  resolveQuestionAudioPath,
} from '../utils/pathResolver.js';
import { Logger } from '../utils/Logger.js';

/** Sesuai Event Contract §4 Error Events: "Retry preload 1x sebelum menyerah". */
const MAX_RETRY_ATTEMPTS = 1;

export class AssetLoader {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus - instance EventBus milik GameEngine
   */
  constructor(eventBus) {
    if (!eventBus) {
      throw new TypeError('AssetLoader membutuhkan instance EventBus.');
    }
    this._eventBus = eventBus;

    /** @type {Map<string, true>} assetPath -> sudah berhasil dimuat */
    this._cache = new Map();
  }

  /**
   * @param {string} assetPath
   * @returns {boolean}
   */
  isCached(assetPath) {
    return this._cache.has(assetPath);
  }

  /**
   * @returns {number} jumlah asset unik yang sudah tersimpan di cache
   */
  getCacheSize() {
    return this._cache.size;
  }

  /**
   * Menghapus seluruh cache. Berguna untuk testing atau reset penuh.
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Preload seluruh asset yang dibutuhkan satu Scene.
   * @param {object} sceneData - data Scene mentah dari DataManager (sudah tervalidasi)
   * @returns {Promise<{ sceneId: string, total: number, succeeded: string[], failed: {path: string, reason: string}[] }>}
   * @fires asset:preloadStarted
   * @fires asset:preloadProgress
   * @fires asset:loaded
   * @fires asset:preloadFailed
   */
  async preloadScene(sceneData) {
    if (!sceneData || typeof sceneData !== 'object' || typeof sceneData.id !== 'string') {
      throw new TypeError('AssetLoader.preloadScene: sceneData tidak valid (field "id" wajib ada).');
    }

    const sceneId = sceneData.id;
    const levelId = this._deriveLevelId(sceneId);
    const assetEntries = this._collectAssetPaths(sceneData, levelId);
    const total = assetEntries.length;

    this._eventBus.emit(EVENTS.ASSET.PRELOAD_STARTED, { sceneId });
    Logger.info('AssetLoader', `Mulai preload "${sceneId}" (${total} asset unik).`);

    const succeeded = [];
    const failed = [];
    let loaded = 0;

    await Promise.all(
      assetEntries.map(async (path) => {
        const result = await this._loadOneWithRetry(path);
        loaded += 1;
        this._eventBus.emit(EVENTS.ASSET.PRELOAD_PROGRESS, { sceneId, loaded, total });

        if (result.ok) {
          succeeded.push(path);
        } else {
          failed.push({ path, reason: result.reason });
        }
      })
    );

    if (failed.length === 0) {
      this._eventBus.emit(EVENTS.ASSET.LOADED, { sceneId });
      Logger.info('AssetLoader', `"${sceneId}" selesai — ${succeeded.length}/${total} asset sukses.`);
    } else {
      for (const failure of failed) {
        this._eventBus.emit(EVENTS.ASSET.PRELOAD_FAILED, {
          sceneId,
          assetPath: failure.path,
          reason: failure.reason,
        });
      }
      Logger.warn('AssetLoader', `"${sceneId}" selesai dengan ${failed.length}/${total} asset GAGAL:`, failed);
    }

    return { sceneId, total, succeeded, failed };
  }

  /**
   * Memuat satu asset, dengan cache check di awal dan retry 1x jika gagal.
   * @private
   * @param {string} path
   * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
   */
  async _loadOneWithRetry(path) {
    if (this._cache.has(path)) {
      Logger.debug('AssetLoader', `Cache hit: "${path}".`);
      return { ok: true };
    }

    let lastReason = 'Unknown error';

    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          this._cache.set(path, true);
          return { ok: true };
        }
        lastReason = `HTTP ${response.status} saat memuat "${path}".`;
      } catch (networkError) {
        lastReason = networkError?.message ?? 'Network error saat memuat asset.';
      }

      if (attempt < MAX_RETRY_ATTEMPTS) {
        Logger.warn('AssetLoader', `Gagal memuat "${path}" (percobaan ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1}) — mencoba ulang.`);
      }
    }

    return { ok: false, reason: lastReason };
  }

  /**
   * Mengumpulkan seluruh path asset untuk satu Scene, sudah di-dedupe.
   * @private
   * @param {object} sceneData
   * @param {string|null} levelId
   * @returns {string[]}
   */
  _collectAssetPaths(sceneData, levelId) {
    const seen = new Set();
    const add = (path) => {
      if (path && !seen.has(path)) seen.add(path);
    };

    if (sceneData.type === SCENE_TYPE.QUIZ) {
      this._collectQuestionAssets(sceneData, levelId, add);
    } else {
      // Scene cerita: 1 gambar + 1 audio
      if (sceneData.background && levelId) {
        add(resolveSceneImagePath(levelId, sceneData.background));
      }
      if (levelId && sceneData.id) {
        add(resolveSceneAudioPath(levelId, sceneData.id));
      }
    }

    return [...seen];
  }

  /**
   * @private
   * @param {object} sceneData
   * @param {string|null} levelId
   * @param {(path: string) => void} add
   */
  _collectQuestionAssets(sceneData, levelId, add) {
    if (!levelId) return;
    for (const question of sceneData.questions ?? []) {
      if (!question) continue;
      const qid = question.id;
      add(resolveQuestionAudioPath(levelId, qid, 'soal'));
      add(resolveQuestionAudioPath(levelId, qid, 'A'));
      add(resolveQuestionAudioPath(levelId, qid, 'B'));
      add(resolveQuestionAudioPath(levelId, qid, 'feedback benar'));
      add(resolveQuestionAudioPath(levelId, qid, 'feedback salah'));
    }
  }

  /**
   * Menurunkan levelId dari id Scene mengikuti pola "{levelId}_scn{seq}".
   * @private
   * @param {string} sceneId
   * @returns {string|null}
   */
  _deriveLevelId(sceneId) {
    const match = /^(.+)_scn\d+$/.exec(sceneId);
    return match ? match[1] : null;
  }
}
