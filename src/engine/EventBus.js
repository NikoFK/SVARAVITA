/**
 * EventBus.js
 * ---------------------------------------------------------------------------
 * Infrastruktur pub/sub generik. TIDAK mengetahui apapun tentang domain
 * SVARAVITA (tidak ada nama event/domain hardcode di sini — itu tinggal di
 * constants/Events.js).
 *
 * Aturan arsitektur (SVARAVITA_Internal_Event_Contract):
 * - Panggilan langsung antar-manager hanya boleh dari layer atas ke layer
 *   tepat di bawahnya.
 * - Komunikasi arah sebaliknya (bawah -> atas) dan antar-manager sejajar
 *   WAJIB lewat EventBus.
 * - EventBus sendiri tidak boleh memanggil siapapun secara proaktif — ia
 *   murni medium pasif.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Mendaftarkan handler untuk sebuah event.
   * @param {string} eventName - nama event, idealnya diambil dari constants/Events.js
   * @param {(payload: any) => void} handler
   * @returns {() => void} fungsi unsubscribe (shortcut, tidak wajib dipakai)
   */
  subscribe(eventName, handler) {
    this._assertEventName(eventName);
    this._assertHandler(handler);

    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(handler);

    return () => this.unsubscribe(eventName, handler);
  }

  /**
   * Menghapus handler dari sebuah event.
   * @param {string} eventName
   * @param {(payload: any) => void} handler
   */
  unsubscribe(eventName, handler) {
    const handlers = this._listeners.get(eventName);
    if (!handlers) return;

    handlers.delete(handler);
    if (handlers.size === 0) {
      this._listeners.delete(eventName);
    }
  }

  /**
   * Mendaftarkan handler yang otomatis unsubscribe setelah dipanggil sekali.
   * Berguna untuk kasus seperti "tunggu satu kali dialogue:sequenceComplete".
   * @param {string} eventName
   * @param {(payload: any) => void} handler
   * @returns {() => void} fungsi unsubscribe
   */
  once(eventName, handler) {
    this._assertHandler(handler);
    const wrapped = (payload) => {
      this.unsubscribe(eventName, wrapped);
      handler(payload);
    };
    return this.subscribe(eventName, wrapped);
  }

  /**
   * Memancarkan sebuah event ke seluruh subscriber-nya.
   * Bersifat fire-and-forget (tidak ada request-response), sesuai kontrak
   * arsitektur — inilah yang mencegah circular dependency.
   * @param {string} eventName
   * @param {any} [payload]
   */
  emit(eventName, payload) {
    this._assertEventName(eventName);
    const handlers = this._listeners.get(eventName);
    if (!handlers || handlers.size === 0) return;

    // Salin ke array dulu supaya aman jika ada handler yang subscribe/
    // unsubscribe event yang sama saat sedang diiterasi.
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (error) {
        // Satu handler yang error tidak boleh menghentikan handler lain.
        // eslint-disable-next-line no-console
        console.error(`[EventBus] Handler error pada event "${eventName}":`, error);
      }
    }
  }

  /**
   * Menghapus seluruh subscriber. Tanpa argumen = hapus semua event.
   * Berguna untuk testing atau reset total saat New Game.
   * @param {string} [eventName]
   */
  clear(eventName) {
    if (eventName) {
      this._listeners.delete(eventName);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Jumlah subscriber aktif untuk sebuah event (untuk debugging).
   * @param {string} eventName
   * @returns {number}
   */
  listenerCount(eventName) {
    return this._listeners.get(eventName)?.size ?? 0;
  }

  _assertEventName(eventName) {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new TypeError('EventBus: eventName harus berupa string non-kosong.');
    }
  }

  _assertHandler(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('EventBus: handler harus berupa function.');
    }
  }
}
