/**
 * debug/verify-reset.mjs
 * ---------------------------------------------------------------------------
 * MEMBUKTIKAN ProgressManager.reset() bekerja: dengan save lama vitaPoint=300,
 * setelah reset() maka vitaPoint = 0 dan jawaban benar pertama = 10.
 */
import { EVENTS } from '../src/constants/index.js';
import { ProgressManager } from '../src/engine/ProgressManager.js';

class MiniBus {
  constructor() { this._m = new Map(); this.log = []; }
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

function makeSaveManager(initialData) {
  let store = initialData ? JSON.stringify({ saveVersion: 1, data: initialData }) : null;
  return {
    load() {
      if (!store) return null;
      try { return JSON.parse(store).data; } catch { return null; }
    },
    save(snapshot) { store = JSON.stringify({ saveVersion: 1, data: snapshot }); },
    clear() { store = null; },
  };
}

const makeDataManager = () => ({ async getLevelData() { return null; } });

// Skenario: save lama vitaPoint=300 terbawa, lalu "Mulai Baru" memanggil reset()
const bus = new MiniBus();
const saveMgr = makeSaveManager({ vitaPoint: 300, unlockedLevels: ['level1', 'level2'], lastCompletedScene: { levelId: 'level2', sceneId: 'level2_scn005' }, levelStars: { level1: 1 } });
const pm = new ProgressManager(bus, saveMgr, makeDataManager());

console.log('Sebelum reset (save lama): vitaPoint =', pm.getVitaPoint(), '(300)');
console.log('  unlocked:', pm.getUnlockedLevels().join(','));
console.log('  lastCompleted:', JSON.stringify(pm.getLastCompletedScene()));

// Router.startNewGame() memanggil reset()
pm.reset();

console.log('\nSetelah reset(): vitaPoint =', pm.getVitaPoint(), '(harap 0)');
console.log('  unlocked:', pm.getUnlockedLevels().join(','), '(harap level1 saja)');
console.log('  lastCompleted:', JSON.stringify(pm.getLastCompletedScene()), '(harap null)');

// 1 jawaban benar setelah reset
bus.emit(EVENTS.QUIZ.ANSWER_EVALUATED, { pointsAwarded: 10 });
const hudPayload = bus.log.find(([e]) => e === EVENTS.PROGRESS.VITA_POINT_CHANGED)?.[1];
console.log('\nSetelah 1 benar (+10): vitaPoint =', pm.getVitaPoint(), '(harap 10)');
console.log('HUD render newTotal:', hudPayload?.newTotal, '(harap 10)');

const ok = pm.getVitaPoint() === 10 && hudPayload?.newTotal === 10;
console.log('\n=== ' + (ok ? 'PASS ✅' : 'FAIL ❌') + ' ===');

