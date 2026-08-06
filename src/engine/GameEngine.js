/**
 * GameEngine.js
 * ---------------------------------------------------------------------------
 * Composition root. HANYA menginisialisasi manager sesuai urutan dependensi
 * dan menjaga status boot — tidak pernah berisi logic gameplay, tidak
 * menyimpan state gameplay (bukan level saat ini, bukan Vita Point).
 *
 * Lifecycle resmi (Technical Blueprint):
 *   bootstrap()
 *     -> initCoreServices()          EventBus, DataManager, AssetLoader
 *     -> initDomainServices()        ProgressManager, SaveManager
 *     -> initPresentationServices()  AudioManager, UIManager, AnimationManager
 *     -> initInteractionServices()   GestureManager, ChoiceManager
 *     -> initOrchestrationServices() DialogueManager, QuizManager
 *     -> initFlowControl()           SceneManager, Router
 *     -> start()
 *
 * [COMPLETION] Seluruh 13 manager sudah di-wiring penuh (Project Completion
 * Mode). UIManager/DialogueManager/QuizManager sengaja diinstansiasi di
 * initFlowControl() (bukan di tahap "aslinya" 3 & 5) karena ketiganya butuh
 * SceneManager read-only yang baru ada di tahap 6 — pola yang sama seperti
 * disepakati eksplisit saat UIManager pertama kali dibangun. Bentuk 6 tahap
 * itu sendiri TIDAK diubah, hanya urutan instansiasi internal di dalamnya.
 */

import { EventBus } from './EventBus.js';
import { Logger } from '../utils/Logger.js';
import { ENGINE_STATUS, EVENTS } from '../constants/index.js';
import { DataManager } from './DataManager.js';
import { AssetLoader } from './AssetLoader.js';
import { ProgressManager } from './ProgressManager.js';
import { SaveManager } from './SaveManager.js';
import { AudioManager } from './AudioManager.js';
import { UIManager } from './UIManager.js';
import { AnimationManager } from './AnimationManager.js';
import { GestureManager } from './GestureManager.js';
import { ChoiceManager } from './ChoiceManager.js';
import { DialogueManager } from './DialogueManager.js';
import { QuizManager } from './QuizManager.js';
import { SceneManager } from './SceneManager.js';
import { OpeningManager } from './OpeningManager.js';
import { TutorialManager } from './TutorialManager.js';
import { Router } from './Router.js';

export class GameEngine {
  constructor() {
    /** @type {EventBus} satu-satunya instance EventBus untuk seluruh aplikasi */
    this.eventBus = new EventBus();

    /** Logger singleton, dipakai apa adanya (bukan instance baru per manager) */
    this.logger = Logger;

    /** @type {string} salah satu nilai ENGINE_STATUS */
    this.status = ENGINE_STATUS.BOOTING;

    /**
     * Registry manager yang sudah diinisialisasi. Sprint berikutnya akan
     * mengisi ini lewat registerManager() di dalam masing-masing tahap init.
     * @type {Map<string, any>}
     */
    this._managers = new Map();
  }

  /**
   * Mendaftarkan sebuah manager ke registry supaya bisa diambil manager lain
   * lewat getManager(). Dipanggil oleh GameEngine sendiri di masing-masing
   * tahap init*Services(), bukan dari luar.
   * @param {string} name - nama manager, contoh: "SceneManager"
   * @param {any} instance
   * @returns {any} instance yang sama (memudahkan pola `const x = this.registerManager(...)`)
   */
  registerManager(name, instance) {
    if (this._managers.has(name)) {
      this.logger.warn('GameEngine', `Manager "${name}" sudah terdaftar sebelumnya, akan ditimpa.`);
    }
    this._managers.set(name, instance);
    return instance;
  }

  /**
   * Mengambil manager yang sudah terdaftar. Mengembalikan undefined jika
   * manager tersebut belum dibangun di sprint saat ini.
   * @param {string} name
   * @returns {any}
   */
  getManager(name) {
    return this._managers.get(name);
  }

  /**
   * Titik masuk siklus hidup aplikasi. Dipanggil sekali oleh main.js.
   * @returns {Promise<void>}
   */
  async bootstrap() {
    try {
      this.logger.info('GameEngine', 'Bootstrap dimulai...');

      this._initCoreServices();
      this._initDomainServices();
      this._initPresentationServices();
      this._initInteractionServices();
      this._initOrchestrationServices();
      this._initFlowControl();

      this.status = ENGINE_STATUS.READY;
      this.eventBus.emit(EVENTS.ENGINE.READY, { timestamp: Date.now() });
      this.logger.info('GameEngine', 'Bootstrap selesai. Status: ready.');
    } catch (error) {
      this.status = ENGINE_STATUS.ERROR;
      this.logger.error('GameEngine', 'Bootstrap gagal:', error);
      this.eventBus.emit(EVENTS.ENGINE.FATAL_ERROR, {
        // [Bug fix] Payload sebelumnya {message, error} tidak sesuai
        // Internal Event Contract §Engine Events, yang mendefinisikan
        // payload resmi sebagai {stage, reason} (keduanya string).
        // Subscriber manapun yang membaca payload.stage/payload.reason
        // sesuai dokumentasi akan mendapat undefined dengan payload lama.
        stage: 'bootstrap',
        reason: error?.message ?? 'Unknown bootstrap error',
      });
    }
  }

  /**
   * Tahap 1: EventBus (sudah ada di constructor), DataManager, AssetLoader.
   * @private
   */
  _initCoreServices() {
    this.registerManager('DataManager', new DataManager(this.eventBus));
    this.registerManager('AssetLoader', new AssetLoader(this.eventBus));
    this.logger.debug('GameEngine', 'initCoreServices selesai: DataManager, AssetLoader siap.');
  }

  /**
   * Tahap 2: ProgressManager, SaveManager.
   * @private
   */
_initDomainServices() {
    const saveManager = this.registerManager('SaveManager', new SaveManager(this.eventBus));
    const dataManager = this.getManager('DataManager');
    this.registerManager('ProgressManager', new ProgressManager(this.eventBus, saveManager, dataManager));
    this.logger.debug('GameEngine', 'initDomainServices selesai: SaveManager, ProgressManager siap.');
  }

  /**
   * Tahap 3: AudioManager, UIManager, AnimationManager.
   * UIManager butuh SceneManager (read-only) — tapi SceneManager baru
   * dibuat di initFlowControl() (tahap 6). Untuk menghormati urutan
   * dependensi asli tanpa mengubah bentuknya, UIManager di-instantiate di
   * initFlowControl() setelah SceneManager ada (lihat catatan di sana).
   * @private
   */
  _initPresentationServices() {
    this.registerManager('AudioManager', new AudioManager(this.eventBus));
    this.registerManager('AnimationManager', new AnimationManager(this.eventBus));
    this.logger.debug('GameEngine', 'initPresentationServices selesai: AudioManager, AnimationManager siap (UIManager menyusul).');
  }

  /**
   * Tahap 4: GestureManager, ChoiceManager.
   * @private
   */
  _initInteractionServices() {
    this.registerManager('GestureManager', new GestureManager(this.eventBus));
    this.registerManager('ChoiceManager', new ChoiceManager(this.eventBus));
    this.logger.debug('GameEngine', 'initInteractionServices selesai: GestureManager, ChoiceManager siap.');
  }

  /**
   * Tahap 5: DialogueManager, QuizManager.
   * Sama seperti UIManager, keduanya butuh SceneManager read-only —
   * di-instantiate di initFlowControl() setelah SceneManager ada.
   * @private
   */
  _initOrchestrationServices() {
    this.logger.debug('GameEngine', 'initOrchestrationServices: DialogueManager & QuizManager menyusul di initFlowControl (butuh SceneManager read-only).');
  }

  /**
   * Tahap 6: SceneManager, Router — plus UIManager/DialogueManager/QuizManager
   * yang ditunda dari tahap 3 & 5 karena ketiganya butuh SceneManager
   * read-only (pola yang sama seperti disepakati eksplisit di Sprint 5).
   * @private
   */
  _initFlowControl() {
    const dataManager = this.getManager('DataManager');
    const assetLoader = this.getManager('AssetLoader');
    const audioManager = this.getManager('AudioManager');
    const progressManager = this.getManager('ProgressManager');

    const sceneManager = this.registerManager('SceneManager', new SceneManager(this.eventBus, dataManager, assetLoader));
    const uiManager = this.registerManager('UIManager', new UIManager(this.eventBus, sceneManager, progressManager, audioManager));
    this.registerManager('DialogueManager', new DialogueManager(this.eventBus, sceneManager, audioManager, uiManager));
    this.registerManager('QuizManager', new QuizManager(this.eventBus, sceneManager, audioManager, uiManager));
    this.registerManager('OpeningManager', new OpeningManager(this.eventBus, sceneManager, audioManager));
    this.registerManager('TutorialManager', new TutorialManager(this.eventBus, audioManager, sceneManager));
    this.registerManager('Router', new Router(this.eventBus, sceneManager, progressManager, this.getManager('OpeningManager'), this.getManager('TutorialManager'), audioManager));

    this.logger.debug('GameEngine', 'initFlowControl selesai: SceneManager, UIManager, DialogueManager, QuizManager, OpeningManager, TutorialManager, Router siap.');
  }

  /**
   * Memulai aplikasi setelah bootstrap() selesai dengan status ready.
   * Menyerahkan kendali ke Router, yang memuat Scene Opening pertama.
   */
  start() {
    if (this.status !== ENGINE_STATUS.READY) {
      this.logger.warn('GameEngine', 'start() dipanggil sebelum engine berstatus ready. Diabaikan.');
      return;
    }
    const router = this.getManager('Router');
    if (!router) {
      this.logger.error('GameEngine', 'start() dipanggil tapi Router belum terdaftar.');
      return;
    }
    console.log('[DEBUG] GameEngine.start() -> memanggil router.start()');
    router.start();
    this.logger.info('GameEngine', 'start() dipanggil — Router mengambil alih dari Scene Opening.');
  }
}
