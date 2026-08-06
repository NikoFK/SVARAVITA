/**
 * Logger.js
 * ---------------------------------------------------------------------------
 * Utilitas logging terpusat. Tujuannya supaya seluruh manager tidak
 * memanggil console.log secara langsung dan tersebar tanpa format —
 * terutama penting untuk game audio-first ini, di mana bug sering kali
 * tidak punya gejala visual sama sekali dan console adalah alat debug utama.
 *
 * Tidak bergantung pada manager/domain apapun — aman dipakai oleh layer manapun.
 */

export const LOG_LEVEL = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
});

const LEVEL_LABEL = Object.freeze({
  [LOG_LEVEL.DEBUG]: 'DEBUG',
  [LOG_LEVEL.INFO]: 'INFO',
  [LOG_LEVEL.WARN]: 'WARN',
  [LOG_LEVEL.ERROR]: 'ERROR',
});

class LoggerService {
  constructor() {
    /** @type {number} level minimum yang akan ditampilkan */
    this._level = LOG_LEVEL.INFO;
  }

  /**
   * Mengubah ambang level log yang ditampilkan.
   * Contoh: Logger.setLevel(LOG_LEVEL.DEBUG) saat development,
   * Logger.setLevel(LOG_LEVEL.WARN) saat build production di InfinityFree.
   * @param {number} level - salah satu nilai LOG_LEVEL
   */
  setLevel(level) {
    this._level = level;
  }

  /**
   * @param {string} scope - nama manager/modul pemanggil, contoh: "GameEngine"
   * @param {...any} args
   */
  debug(scope, ...args) {
    this._log(LOG_LEVEL.DEBUG, scope, args);
  }

  /**
   * @param {string} scope
   * @param {...any} args
   */
  info(scope, ...args) {
    this._log(LOG_LEVEL.INFO, scope, args);
  }

  /**
   * @param {string} scope
   * @param {...any} args
   */
  warn(scope, ...args) {
    this._log(LOG_LEVEL.WARN, scope, args);
  }

  /**
   * @param {string} scope
   * @param {...any} args
   */
  error(scope, ...args) {
    this._log(LOG_LEVEL.ERROR, scope, args);
  }

  _log(level, scope, args) {
    if (level < this._level) return;

    const label = LEVEL_LABEL[level];
    const prefix = `[SVARAVITA][${label}][${scope ?? 'unknown'}]`;
    const method = level >= LOG_LEVEL.ERROR ? 'error' : level >= LOG_LEVEL.WARN ? 'warn' : 'log';

    // eslint-disable-next-line no-console
    console[method](prefix, ...args);
  }
}

/**
 * Singleton — cukup satu instance logger untuk seluruh aplikasi.
 * Import langsung: import { Logger } from '.../Logger.js'
 */
export const Logger = new LoggerService();
