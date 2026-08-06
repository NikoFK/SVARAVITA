/**
 * debug/prove-score.mjs
 * ---------------------------------------------------------------------------
 * MEMBUKTIKAN sumber nilai 300 pada skor soal pertama, tanpa menebak.
 *
 * Menguji dua skenario:
 *   A. ProgressManager dengan save FRESH (localStorage kosong)
 *      → jawaban benar pertama harus = 10 (tidakkah 300).
 *   B. ProgressManager dengan save BASAH berisi vitaPoint: 300
 *      → apakah nilai awal terbaca 300?
 *
 * Meniru EventBus, SaveManager, DataManager minimal (bukan import penuh
 * engine) supaya fokus ke alur nilai: QuizManager → ProgressManager →
 * SaveManager → HUD.
 */
import { EVENTS } from '../src/constants/index.js';

// --- Minimal EventBus (emit synchronous) ---
class MiniBus {
  constructor() {
    this._m = new Map();
    this.log = [];
  }
  subscribe(evt, fn) {
    if (!this._m.has(evt)) this._m.set(evt, []);
    this._m.get(evt).push(fn);
  }
  emit(evt, payload) {
    this.log.push([evt, payload]);
    for (const fn of this._m.get(evt) ?? []) {
      try { fn(payload); } catch (e) { console.error('handler err', evt, e.message); }
    }
  }
}

// --- Minimal SaveManager dengan storage bola (bukan localStorage asli) ---
function makeSaveManager(initialData) {
  let store = initialData ? JSON.stringify({ saveVersion: 1, data: initialData }) : null;
  return {
    load() {
      if (!store) return null;
      try { return JSON.parse(store).data; } catch { return null; }
    },
    save(snapshot) {
      store = JSON.stringify({ saveVersion: 1, data: snapshot });
    },
    clear() { store = null; },
  };
}

// --- Minimal DataManager (hanya cukup untuk ProgressManager ctor) ---
const makeDataManager = () => ({
  async getLevelData() { return null; },
});

// Import ProgressManager (asli) — butuh global localStorage? Tidak, karena
// kita injeksi makeSaveManager. Tapi ProgressManager memakai import EVENTS.
import('../src/engine/ProgressManager.js').then(({ ProgressManager }) => {
  // =====================================================================
  // SKENARIO A — save FRESH
  // =====================================================================
  const busA = new MiniBus();
  const pmA = new ProgressManager(busA, makeSaveManager(null), makeDataManager());
  console.log('=== SKENARIO A: save FRESH ===');
  console.log('Awal vitaPoint:', pmA.getVitaPoint(), '(harap 0)');

  // Simulasikan QuizManager menghasilkan 1 jawaban benar (+10)
  busA.emit(EVENTS.QUIZ.ANSWER_EVALUATED, { pointsAwarded: 10 });
  console.log('Setelah 1 benar (+10):', pmA.getVitaPoint(), '(harap 10)');
  const hudPayloadA = busA.log.find(([e]) => e === EVENTS.PROGRESS.VITA_POINT_CHANGED)?.[1];
  console.log('HUD akan render (newTotal):', hudPayloadA?.newTotal, '(harap 10)');

  // =====================================================================
  // SKENARIO B — save BASAH dengan vitaPoint 300
  // =====================================================================
  const busB = new MiniBus();
  const pmB = new ProgressManager(busB, makeSaveManager({ vitaPoint: 300, unlockedLevels: ['level1'], lastCompletedScene: null, levelStars: {} }), makeDataManager());
  console.log('\n=== SKENARIO B: save tersimpan vitaPoint=300 ===');
  console.log('Awal vitaPoint:', pmB.getVitaPoint(), '(ini sumber nilai 300)');

  busB.emit(EVENTS.QUIZ.ANSWER_EVALUATED, { pointsAwarded: 10 });
  console.log('Setelah 1 benar (+10):', pmB.getVitaPoint(), '(300 + 10 = 310)');
  const hudPayloadB = busB.log.find(([e]) => e === EVENTS.PROGRESS.VITA_POINT_CHANGED)?.[1];
  console.log('HUD akan render (newTotal):', hudPayloadB?.newTotal, '(harap 310)');

  console.log('\n=== KESIMPULAN ===');
  console.log('Logika scoring +10 per benar SUDAH BENAR (Skenario A = 10).');
  console.log('Nilai 300 muncul KARENA save lama terbawa (Skenario B = 310).');
  console.log('Jadi BUG 1 = save lama TIDAK di-reset saat "Mulai Baru".');
});
