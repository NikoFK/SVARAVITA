/**
 * SceneManager.js
 * ---------------------------------------------------------------------------
 * Tujuan (Technical Blueprint §2 SceneManager): pemilik tunggal "scene apa
 * yang sedang aktif sekarang". Memuat data Scene dari DataManager, memicu
 * preload lewat AssetLoader, dan mengeksekusi transisi masuk/keluar — murni
 * konduktor, bukan pemain. TIDAK memainkan audio, TIDAK menjalankan animasi,
 * TIDAK mengubah UI, TIDAK mengevaluasi quiz, TIDAK menyimpan progress,
 * TIDAK memproses gesture — semua itu tanggung jawab manager lain yang
 * mendengarkan event yang dipancarkan di sini.
 *
 * ATURAN EVENT (disepakati eksplisit setelah audit inkonsistensi Sprint 4):
 * SceneManager HANYA memancarkan 4 event resmi dari Event Contract §5:
 * scene:entered, scene:exited, scene:changed, scene:notFound. Tidak ada
 * event baru di luar itu. Kegagalan DataManager (data:loadFailed/
 * data:parseError) dan AssetLoader (asset:preloadFailed) SUDAH dipancarkan
 * oleh manager masing-masing — SceneManager tidak membuat jalur pelaporan
 * duplikat, cukup menghentikan lifecycle (tidak memanggil enterScene()).
 *
 * Berdasarkan Event Flow §A/§B Event Contract: scene:changed TIDAK pernah
 * dipancarkan untuk scene pertama yang dimuat sepanjang sesi (hanya
 * scene:entered) — scene:exited/scene:changed baru muncul mulai transisi
 * kedua dan seterusnya (ada scene sebelumnya untuk "ditinggalkan").
 */

import { EVENTS, SCENE_TYPE } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';
import { hasStoryScene, scnId } from '../utils/storySceneDetector.js';
import { resolveSceneAudioPath } from '../utils/pathResolver.js';

/** Pola resmi id Scene: "{levelId}_scn{seq}" — dipakai untuk menurunkan
 * levelId tujuan saat goToNextScene() berpindah lintas-level. */
const SCENE_ID_PATTERN = /^(.+)_scn(\d+)$/;

export class SceneManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   * @param {import('./DataManager.js').DataManager} dataManager
   * @param {import('./AssetLoader.js').AssetLoader} assetLoader
   */
  constructor(eventBus, dataManager, assetLoader) {
    if (!eventBus) throw new TypeError('SceneManager membutuhkan instance EventBus.');
    if (!dataManager) throw new TypeError('SceneManager membutuhkan instance DataManager.');
    if (!assetLoader) throw new TypeError('SceneManager membutuhkan instance AssetLoader.');

    this._eventBus = eventBus;
    this._dataManager = dataManager;
    this._assetLoader = assetLoader;

    /** @type {string|null} */
    this._currentLevelId = null;
    /** @type {string|null} */
    this._currentSceneId = null;
    /** @type {object|null} */
    this._currentScene = null;
    /** @type {boolean} */
    this._isSceneLoaded = false;

    // [COMPLETION] Auto-advance sesuai Technical Blueprint §2 SceneManager:
    // "Tidak pernah memanggil DialogueManager.next() secara paksa; sebaliknya
    // SceneManager mendengarkan event selesai dari manager konten." Ini
    // murni penyelesaian kontrak yang sempat tertunda di Sprint 4 (yang
    // hanya expose goToNextScene() manual) — bukan behavior baru di luar
    // Blueprint. Backward-compatible: tidak mengubah goToNextScene() itu
    // sendiri, hanya menambah pemicu otomatis.
    //
    // [BUG FIX] Scene bertipe "menu" DIKECUALIKAN dari auto-advance ini —
    // ditemukan lewat smoke test integrasi penuh: begitu satu-satunya Line
    // narasi menu "selesai dibaca" (dialogue:sequenceComplete), auto-advance
    // langsung melompat ke nextScene ("level1_scn001") TANPA menunggu pemain
    // benar-benar menekan Mulai Baru/Lanjutkan — menggagalkan Main Menu
    // sebagai titik keputusan sama sekali. Menu HANYA boleh berpindah lewat
    // Router.startNewGame()/resumeGame() (dipicu klik tombol), bukan otomatis.
    this._eventBus.subscribe(EVENTS.DIALOGUE.SEQUENCE_COMPLETE, () => {
      if (this._currentScene?.type === SCENE_TYPE.MENU) return;
      this.goToNextScene();
    });
    this._eventBus.subscribe(EVENTS.QUIZ.COMPLETED, (payload) => this._onQuizCompleted(payload));
  }

  /** @returns {object|null} data Scene aktif saat ini */
  getCurrentScene() {
    return this._currentScene;
  }

  /** @returns {string|null} */
  getCurrentSceneId() {
    return this._currentSceneId;
  }

  /** @returns {string|null} */
  getCurrentLevelId() {
    return this._currentLevelId;
  }

  /** @returns {boolean} true jika ada Scene aktif yang sudah lolos load+preload */
  hasSceneLoaded() {
    return this._isSceneLoaded;
  }

  /**
   * Memuat satu Scene: ambil data dari DataManager, preload aset lewat
   * AssetLoader, lalu resmikan sebagai Scene aktif jika keduanya sukses.
   * Tidak pernah crash — kegagalan di tahap manapun menghentikan lifecycle
   * dan mengembalikan null, dengan kegagalan sudah dilaporkan oleh manager
   * sumbernya sendiri (DataManager/AssetLoader) atau oleh scene:notFound.
   *
   * @param {string} levelId
   * @param {string} sceneId
   * @returns {Promise<object|null>} data Scene yang baru aktif, atau null jika gagal
   * @fires scene:exited - hanya jika sebelumnya sudah ada Scene aktif
   * @fires scene:entered
   * @fires scene:changed - hanya jika sebelumnya sudah ada Scene aktif
   * @fires scene:notFound - jika sceneId tidak ditemukan di level yang berhasil dimuat
   */
async loadScene(levelId, sceneId) {
    console.log(`[DEBUG] SceneManager.loadScene('${levelId}', '${sceneId}') DIPANGGIL`);
    if (typeof levelId !== 'string' || !levelId) {
      throw new TypeError('SceneManager.loadScene: "levelId" harus string non-kosong.');
    }
    if (typeof sceneId !== 'string' || !sceneId) {
      throw new TypeError('SceneManager.loadScene: "sceneId" harus string non-kosong.');
    }

    const sceneData = await this._resolveSceneData(levelId, sceneId);
    console.log(`[DEBUG] SceneManager.loadScene -> sceneData untuk '${sceneId}':`, sceneData ? 'DITEMUKAN' : 'TIDAK DITEMUKAN');
    if (!sceneData) {
      return null;
    }

    return this._enterLoadedScene(levelId, sceneData);
  }

  /**
   * Memuat scene (sudah ter-resolve) dengan preload asset lalu meresmikannya
   * sebagai scene aktif. Dipakai oleh loadScene() dan goToNextScene()
   * (chain cerita asset). Dipisah supaya scene cerita sintetis bisa masuk
   * lewat jalur yang sama (preload + enter) tanpa lookup JSON.
   * @private
   * @param {string} levelId
   * @param {object} sceneData
   * @returns {object|null}
   */
  async _enterLoadedScene(levelId, sceneData) {
    const preloadResult = await this._assetLoader.preloadScene(sceneData);
    if (preloadResult.failed.length > 0) {
      // [Kebijakan Asset Policy] AssetLoader sudah memancarkan
      // asset:preloadFailed per asset yang gagal — SceneManager TIDAK LAGI
      // membatalkan masuk scene karena ini. Kebijakan resmi: tanpa aset asli
      // (belum diunggah), game TETAP HARUS jalan penuh — background tampil
      // kosong (BackgroundView pakai CSS background-image, otomatis blank
      // saat 404, tanpa perlu logic tambahan), portrait tidak tampil (sama
      // alasannya), dan audio di-skip (AudioManager sudah punya silent
      // fallback sejak Batch 3 — audio:playbackFailed dianggap "selesai",
      // dialog tetap lanjut). Ini BUKAN lagi dianggap kegagalan fatal.
      Logger.warn(
        'SceneManager',
        `Scene "${sceneData.id}": ${preloadResult.failed.length}/${preloadResult.total} asset tidak tersedia (lihat asset:preloadFailed) — tetap masuk scene dengan degradasi graceful.`
      );
    }

    this._enterScene(levelId, sceneData.id, sceneData);
    return this._currentScene;
  }

  /**
   * Berpindah ke Scene berikutnya berdasarkan `currentScene.nextScene`.
   * Murni mengikuti data — tidak ada decision tree/routing tambahan.
   * Jika `nextScene` bernilai null (scene tipe "ending"), ini adalah akhir
   * rantai yang SAH (bukan error), jadi tidak ada event yang dipancarkan
   * (bukan scene:notFound — itu khusus untuk ID yang seharusnya ada tapi
   * tidak ditemukan, bukan untuk akhir cerita yang memang disengaja).
   *
   * @returns {Promise<object|null>} data Scene berikutnya, atau null jika tidak ada transisi
   */
async goToNextScene() {
    if (!this._isSceneLoaded || !this._currentScene) {
      Logger.warn('SceneManager', 'goToNextScene() dipanggil tanpa Scene aktif — diabaikan.');
      return null;
    }

    // [BUG FIX] Quiz muncul terlalu cepat — story harus diputar sampai HABIS
    // berdasarkan ASSET, bukan JSON. JSON (level1) punya quiz di scn008,
    // padahal story asset berlanjut sampai scn022. Karena itu, selama masih
    // ada scene cerita berikutnya di asset, kita teruskan chain story —
    // quiz baru muncul setelah scene cerita asset terakhir.
    const currentSceneType = this._currentScene?.type;
    const isStoryScene =
      currentSceneType === SCENE_TYPE.NARRATION || currentSceneType === SCENE_TYPE.DIALOGUE;

    if (isStoryScene && this._currentLevelId) {
      const currentSeq = this._extractSceneSeq(this._currentSceneId);
      if (currentSeq !== null) {
        const nextSeq = currentSeq + 1;
        const shouldStopBeforeLevel5Quiz = this._currentLevelId === 'level5' && currentSeq >= 4;
        const nextAssetSceneId = scnId(this._currentLevelId, nextSeq);
        if (!shouldStopBeforeLevel5Quiz && await hasStoryScene(this._currentLevelId, nextSeq)) {
          Logger.info(
            'SceneManager',
            `Story "${this._currentSceneId}" selesai → lanjut ke scene cerita asset "${nextAssetSceneId}" (masih ada story).`
          );
// Muat langsung sebagai scene cerita sintetis (tanpa lookup JSON,
          // supaya tidak tertangkap quiz JSON yang "menyela" di tengah story).
          const synthetic = await this._buildStoryScene(this._currentLevelId, nextAssetSceneId);
          if (synthetic) {
            return this._enterLoadedScene(this._currentLevelId, synthetic);
          }
          return this.loadScene(this._currentLevelId, nextAssetSceneId);
        }
      }
    }

    const nextSceneId = this._currentScene.nextScene;
    if (nextSceneId === null) {
      Logger.info(
        'SceneManager',
        `Scene "${this._currentSceneId}" tidak punya nextScene (akhir rantai, mis. scene tipe "ending") — tidak ada transisi lebih lanjut.`
      );
      return null;
    }

    // [ASSUMPTION (temporary)] nextScene bisa menunjuk scene di level lain
    // (transisi lintas-level). levelId tujuan diturunkan dari prefix ID-nya
    // sendiri; jika ID tidak mengikuti pola "{levelId}_scn{seq}" (mis. scene
    // sistem seperti "logo"/"tutorial" — lihat gap yang sama dicatat di
    // Sprint 3 AssetLoader), fallback ke levelId Scene saat ini. HAPUS
    // fallback ini begitu Blueprint mendefinisikan secara eksplisit di mana
    // data scene sistem tanpa prefix level disimpan.
    const targetLevelId = this._deriveLevelIdFromSceneId(nextSceneId) ?? this._currentLevelId;

    return this.loadScene(targetLevelId, nextSceneId);
  }

  /** @private */
  _onQuizCompleted({ sceneId }) {
    const levelId = this._deriveLevelIdFromSceneId(sceneId);
    const nextSceneByLevel = {
      level1: ['level2', 'level2_scn001'],
      level2: ['level2', 'level2_scn006'],
      level3: ['level4', 'level4_scn001'],
      level4: ['level5', 'level5_scn001'],
    };
    const target = nextSceneByLevel[levelId];
    if (target) {
      this.loadScene(target[0], target[1]);
      return;
    }

    this.goToNextScene();
  }

  /**
   * Mengosongkan Scene aktif tanpa memancarkan event apapun (murni reset
   * state internal — bukan transisi gameplay). Tidak menyentuh cache
   * AssetLoader sama sekali; cache asset sengaja tetap hidup lintas-scene.
   */
  clearCurrentScene() {
    this._currentLevelId = null;
    this._currentSceneId = null;
    this._currentScene = null;
    this._isSceneLoaded = false;
    Logger.debug('SceneManager', 'Scene aktif dikosongkan (clearCurrentScene).');
  }

  /**
   * Mengambil data Scene dari DataManager, membedakan dua jenis kegagalan:
   * (a) level itu sendiri gagal dimuat — DataManager sudah memancarkan
   *     data:loadFailed/data:parseError sendiri, SceneManager diam saja.
   * (b) level berhasil dimuat tapi sceneId tidak ada di dalamnya — ini
   *     tanggung jawab SceneManager untuk melaporkan lewat scene:notFound.
   * @private
   * @param {string} levelId
   * @param {string} sceneId
   * @returns {Promise<object|null>}
   */
async _resolveSceneData(levelId, sceneId) {
    const levelData = await this._dataManager.getLevelData(levelId);
    if (!levelData) {
      Logger.warn(
        'SceneManager',
        `Level "${levelId}" gagal dimuat — lihat event data:loadFailed/data:parseError dari DataManager.`
      );
      return null;
    }

let sceneData = levelData.scenes.find((scene) => scene?.id === sceneId) ?? null;

    // [BUG FIX] Scene cerita yang HANYA ada di asset (audio + gambar) tapi
    // belum/bukan bagian dari JSON (mis. level1_scn008..scn022 lanjutan
    // cerita sebelum quiz) — buat scene sintetis transparan agar asset
    // tetap diputar. Scene ini dianggap "narration" (tipe cerita) sehingga
    // auto-advance & audio pipeline tetap berjalan seperti scene cerita lain.
if (!sceneData && sceneId && levelId) {
      const synthetic = await this._buildStoryScene(levelId, sceneId);
      if (synthetic) {
        Logger.info(
          'SceneManager',
          `Scene "${sceneId}" tidak ada di JSON, tapi ada di asset — dibuat scene sintetis tipe "${synthetic.type}".`
        );
        sceneData = synthetic;
      }
    }

    if (!sceneData) {
      this._eventBus.emit(EVENTS.SCENE.NOT_FOUND, {
        expectedSceneId: sceneId,
        fromSceneId: this._currentSceneId,
      });
      Logger.error('SceneManager', `Scene "${sceneId}" tidak ditemukan di dalam level "${levelId}".`);
    }

    return sceneData;
  }

/**
   * Membangun scene cerita sintetis untuk id "{levelId}_scn{seq}" yang asetnya
   * ada (audio + gambar) tapi tidak terdefinisi di JSON. Dipakai supaya story
   * dari asset bisa diputar sampai habis sebelum quiz (lihat goToNextScene).
   * @private
   * @param {string} levelId - mis. "level1"
   * @param {string} sceneId - mis. "level1_scn008"
   * @returns {Promise<object|null>} scene sintetis, atau null jika asset tidak ada
   */
  async _buildStoryScene(levelId, sceneId) {
    // Pastikan scene ini MENGIKUTI pola "{levelId}_scn{seq}" dan asetnya
    // benar-benar ada sebelum dibuatkan sintetis.
    const seq = this._extractSceneSeq(sceneId);
    if (seq === null) return null;
    if (!levelId || !(await hasStoryScene(levelId, seq))) return null;

    return {
      id: sceneId,
      type: SCENE_TYPE.NARRATION,
      background: sceneId,
      nextScene: this._findQuizSceneId(levelId),
      lines: [
        {
          id: `${sceneId}_L01`,
          speaker: 'narrator',
          text: '',
          audio: resolveSceneAudioPath(levelId, sceneId),
          animation: null,
        },
      ],
    };
  }

  /**
   * Mencari id scene bertipe quiz di dalam sebuah level (dari JSON).
   * Dipakai sebagai `nextScene` scene cerita sintetis — setelah story
   * asset habis, engine lanjut ke quiz JSON.
   * @private
   * @param {string} levelId
   * @returns {string|null}
   */
  _findQuizSceneId(levelId) {
    const levelData = this._dataManager.getCachedLevelData(levelId);
    if (!levelData?.scenes) return null;
    const quizScene = levelData.scenes.find((s) => s?.type === SCENE_TYPE.QUIZ);
    return quizScene?.id ?? null;
  }

  /**
   * Meresmikan Scene baru sebagai Scene aktif dan memancarkan event
   * transisi sesuai urutan Event Contract.
   * @private
   * @param {string} levelId
   * @param {string} sceneId
   * @param {object} sceneData
   */
  _enterScene(levelId, sceneId, sceneData) {
    console.log(`[DEBUG] SceneManager._enterScene('${levelId}', '${sceneId}') -> scene:entered akan dipancarkan`);
    const previousSceneId = this._currentSceneId;

    if (previousSceneId !== null) {
      this._eventBus.emit(EVENTS.SCENE.EXITED, { sceneId: previousSceneId });
    }

    this._currentLevelId = levelId;
    this._currentSceneId = sceneId;
    this._currentScene = sceneData;
    this._isSceneLoaded = true;

    this._eventBus.emit(EVENTS.SCENE.ENTERED, {
      sceneId,
      levelId,
      sceneType: sceneData.type,
    });

    if (previousSceneId !== null) {
      this._eventBus.emit(EVENTS.SCENE.CHANGED, {
        fromSceneId: previousSceneId,
        toSceneId: sceneId,
      });
    }

    Logger.info('SceneManager', `Scene aktif sekarang: "${sceneId}" (level "${levelId}", tipe "${sceneData.type}").`);
  }

/**
   * @private
   * @param {string} sceneId
   * @returns {string|null}
   */
  _deriveLevelIdFromSceneId(sceneId) {
    const match = SCENE_ID_PATTERN.exec(sceneId);
    return match ? match[1] : null;
  }

  /**
   * Mengekstrak urutan (nomor) scene dari id berbentuk "{levelId}_scn{seq}".
   * @private
   * @param {string} sceneId - mis. "level1_scn007"
   * @returns {number|null} nomor urut (7), atau null jika tidak cocok pola
   */
  _extractSceneSeq(sceneId) {
    const match = SCENE_ID_PATTERN.exec(sceneId ?? '');
    return match ? Number(match[2]) : null;
  }
}
