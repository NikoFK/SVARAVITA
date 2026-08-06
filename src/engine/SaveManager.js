/**
 * SaveManager.js
 * ---------------------------------------------------------------------------
 * Satu-satunya kode yang menyentuh LocalStorage. Dipanggil langsung
 * (bukan lewat event) oleh ProgressManager. Menyertakan `saveVersion`
 * sejak awal untuk migrasi di masa depan (Sprint 1 review).
 */

import { EVENTS } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';

const SAVE_KEY = 'svaravita_save_v1';
const SAVE_VERSION = 1;

export class SaveManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    if (!eventBus) throw new TypeError('SaveManager membutuhkan instance EventBus.');
    this._eventBus = eventBus;
  }

  /**
   * @param {object} snapshot - data progres murni (vitaPoint, unlockedLevels, dst)
   * @returns {boolean}
   */
  save(snapshot) {
    try {
      const timestamp = Date.now();
      const payload = { saveVersion: SAVE_VERSION, timestamp, data: snapshot };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this._eventBus.emit(EVENTS.SAVE.WRITTEN, { saveVersion: SAVE_VERSION, timestamp });
      return true;
    } catch (error) {
      Logger.error('SaveManager', 'Gagal menyimpan ke LocalStorage:', error);
      this._eventBus.emit(EVENTS.SAVE.WRITE_FAILED, { reason: error?.message ?? 'unknown error' });
      return false;
    }
  }

  /**
   * @returns {object|null} data snapshot, atau null jika tidak ada/korup/versi tidak cocok
   */
  load() {
    let raw;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (error) {
      this._eventBus.emit(EVENTS.SAVE.LOAD_FAILED, { reason: error?.message ?? 'LocalStorage tidak bisa diakses.' });
      return null;
    }
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.saveVersion !== SAVE_VERSION) {
        Logger.warn('SaveManager', `saveVersion tidak cocok (${parsed.saveVersion} != ${SAVE_VERSION}) — dianggap New Game.`);
        this._eventBus.emit(EVENTS.SAVE.LOAD_FAILED, { reason: 'saveVersion tidak cocok.' });
        return null;
      }
      return parsed.data ?? null;
    } catch (error) {
      Logger.error('SaveManager', 'Data save korup, tidak bisa di-parse:', error);
      this._eventBus.emit(EVENTS.SAVE.LOAD_FAILED, { reason: error?.message ?? 'JSON.parse gagal.' });
      return null;
    }
  }

  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (error) {
      Logger.warn('SaveManager', 'Gagal menghapus save:', error);
    }
  }
}
