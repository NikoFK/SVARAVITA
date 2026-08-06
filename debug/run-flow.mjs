/**
 * debug/run-flow.mjs
 * ---------------------------------------------------------------------------
 * Harness debugging runtime (BUKAN unit test). Menjalankan GameEngine ASLI
 * end-to-end di Node dengan environment browser yang di-mock (DOM, fetch,
 * Audio, localStorage), lalu menangkap urutan console.log yang benar-benar
 * terjadi — persis seperti yang akan tampil di browser console.
 *
 * Tujuan: membuktikan flow game berjalan / menemukan titik berhenti
 * berdasarkan RUNTIME, bukan asumsi.
 *
 * Jalankan: node debug/run-flow.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// ---------------------------------------------------------------------------
// 1. MOCK DOM
// ---------------------------------------------------------------------------
function makeElement(id) {
  const classes = new Set();
  return {
    id,
    style: {},
    innerHTML: '',
    textContent: '',
    children: [],
    childNodes: [],
    _listeners: {},
    classList: {
      add(...cs) { cs.forEach((c) => classes.add(c)); },
      remove(...cs) { cs.forEach((c) => classes.delete(c)); },
      contains(c) { return classes.has(c); },
    },
    appendChild(child) {
      this.children.push(child);
      this.childNodes.push(child);
      return child;
    },
    addEventListener(evt, fn) {
      this._listeners[evt] = this._listeners[evt] || [];
      this._listeners[evt].push(fn);
    },
    removeEventListener() {},
    setAttribute() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

const ELEMENT_IDS = [
  'loading-screen',
  'loading-screen-text',
  'scene-background',
  'scene-portrait',
  'scene-speaker-name',
  'scene-subtitle-text',
  'scene-subtitle-box',
  'quiz-choices',
  'hud',
  'progress-info',
  'opening-overlay',
  'tutorial-overlay',
  'choice-left',
  'choice-right',
];

const elements = {};
for (const id of ELEMENT_IDS) elements[id] = makeElement(id);

globalThis.document = {
  getElementById(id) {
    if (!elements[id]) elements[id] = makeElement(id);
    return elements[id];
  },
  createElement() { return makeElement('created'); },
  body: makeElement('body'),
};

// ---------------------------------------------------------------------------
// 2. MOCK FETCH (baca dari public/)
// ---------------------------------------------------------------------------
globalThis.fetch = async (path) => {
  const clean = String(path).replace(/^\//, '').replace(/^\.\//, '');
  const abs = join(PUBLIC_DIR, clean);
  if (existsSync(abs)) {
    const data = readFileSync(abs);
    return {
      ok: true,
      status: 200,
      async json() {
        return JSON.parse(data.toString('utf-8'));
      },
      arrayBuffer: async () => data.buffer,
    };
  }
  return { ok: false, status: 404, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
};

// ---------------------------------------------------------------------------
// 3. MOCK AUDIO — meniru HTMLAudioElement browser (memiliki addEventListener)
// ---------------------------------------------------------------------------
const audioInstances = [];
globalThis.Audio = class {
  constructor(path) {
    this.path = path;
    this.loop = false;
    this.currentTime = 0;
    this._listeners = {};
    audioInstances.push(this);
  }
  addEventListener(evt, fn) {
    this._listeners[evt] = this._listeners[evt] || [];
    this._listeners[evt].push(fn);
  }
  removeEventListener() {}
  pause() { this.currentTime = 0; }
  play() {
    // Simulasikan audio selesai setelah 50ms (silent playback size nol)
    setTimeout(() => {
      for (const fn of this._listeners['ended'] || []) fn();
    }, 50);
    return Promise.resolve();
  }
};

// ---------------------------------------------------------------------------
// 4. MOCK localStorage
// ---------------------------------------------------------------------------
const storage = {};
globalThis.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
};

// ---------------------------------------------------------------------------
// 5. MOCK window
// ---------------------------------------------------------------------------
globalThis.window = {};
Object.defineProperty(globalThis.window, 'innerWidth', { get() { return 1280; } });
Object.defineProperty(globalThis.window, 'innerHeight', { get() { return 720; } });

// ---------------------------------------------------------------------------
// 6. INTERCEPT console.log — beri awalan [FLOW] dan tambahkan timestamp
// ---------------------------------------------------------------------------
const originalLog = console.log;
const logLines = [];
console.log = (...args) => {
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const line = `[${Date.now()}] ${msg}`;
  logLines.push(line);
  originalLog(line);
};

// ---------------------------------------------------------------------------
// 7. JALANKAN GAME ENGINE ASLI
// ---------------------------------------------------------------------------
const { GameEngine } = await import('../src/engine/GameEngine.js');

const engine = new GameEngine();

// Setelah engine siap, simulasikan interaksi:
//   - Saat MENU muncul → panggil router.startNewGame() (sama seperti klik
//     tombol "Mulai Baru" di main.js).
//   - Saat QUIZ muncul → jawab otomatis dengan memicu click listener body
//     (GestureManager) pada #choice-left / #choice-right.
let menuHandled = false;
let lastQuizAnswerTime = 0;
let quizAnswerCount = 0;

// Pantau event CHOICE.SELECTED untuk membuktikan jawaban benar2 masuk engine
const { EVENTS } = await import('../src/constants/index.js');
engine.eventBus.subscribe(EVENTS.CHOICE.SELECTED, ({ side }) => {
  console.log(`[FLOW] ✔ CHOICE.SELECTED diterima engine (side='${side}')`);
});
engine.eventBus.subscribe(EVENTS.QUIZ.QUESTION_STARTED, (p) => {
  console.log(`[FLOW] 📝 QUESTION_STARTED idx=${p.questionIndex}/${p.totalQuestions}`);
});
engine.eventBus.subscribe(EVENTS.QUIZ.COMPLETED, (p) => {
  console.log(`[FLOW] 🏁 QUIZ.COMPLETED (benar=${p.correctCount}/${p.totalQuestions})`);
});
engine.eventBus.subscribe(EVENTS.QUIZ.ANSWER_EVALUATED, (p) => {
  console.log(`[FLOW] 🎯 jawaban ${p.selectedSide} -> ${p.isCorrect ? 'BENAR' : 'SALAH'} +${p.pointsAwarded} poin`);
});
engine.eventBus.subscribe(EVENTS.SCENE.ENTERED, (p) => {
  console.log(`[FLOW] 🏔 SCENE.ENTERED '${p.sceneId}' (type='${p.sceneType}')`);
});

function clickButton(id) {
  const bodyListeners = globalThis.document.body._listeners?.click || [];
  console.log(`[FLOW] 👆 SIMULASI KLIK #${id}`);
  for (const fn of bodyListeners) {
    fn({ target: { id }, clientX: 640, clientY: 360 });
  }
}

setInterval(() => {
  const sm = engine.getManager('SceneManager');
  if (!sm) return;
  const scene = sm.getCurrentScene();
  const sceneId = sm.getCurrentSceneId();
  if (!scene) return;

  // MENU
  if (scene.type === 'menu' && !menuHandled) {
    menuHandled = true;
    console.log('[FLOW] 🎯 MENU muncul — klik "Mulai Baru" (router.startNewGame)');
    setTimeout(() => {
      const router = engine.getManager('Router');
      router.startNewGame();
    }, 500);
    return;
  }

// QUIZ — jawab otomatis dengan meng-Emit gesture intent langsung ke
  // EventBus (persis seperti yang dilakukan GestureManager saat pengguna
  // double-tap di separuh kiri/kanan layar). Ini membuktikan rantai
  // QuizManager (soal -> jawab -> feedback -> advance) berjalan utuh.
  if (scene.type === 'quiz') {
    const now = Date.now();
    if (now - lastQuizAnswerTime > 1500) {
      lastQuizAnswerTime = now;
      quizAnswerCount += 1;
      const side = (quizAnswerCount % 2 === 0)
        ? EVENTS.GESTURE.SELECT_RIGHT_INTENT
        : EVENTS.GESTURE.SELECT_LEFT_INTENT;
      console.log(`[FLOW] 👆 EMIT ${side}`);
      engine.eventBus.emit(side, {});
    }
  }
}, 400);

engine.bootstrap().then(() => {
  console.log('[FLOW] ===== bootstrap selesai, panggil engine.start() =====');
  engine.start();
});

// Catat transisi scene di level manager
process.on('exit', () => {
  console.log('\n[FLOW] ===== AKHIR DARI RUN (event loop sudah kosong) =====');
  console.log('[FLOW] Total baris log:', logLines.length);
});

// Biarkan berjalan sampai even loop kosong
setTimeout(() => {
  console.log('[FLOW] ===== TIMEOUT 120 detik — hentikan harness =====');
  process.exit(0);
}, 120000);
