/**
 * Events.js
 * ---------------------------------------------------------------------------
 * Single source of truth untuk NAMA event yang lewat EventBus. Manager tidak
 * boleh menulis string event secara bebas ("scene:changed" langsung di kode)
 * — selalu rujuk EVENTS.SCENE.CHANGED, supaya salah ketik jadi error import,
 * bukan silent failure (prinsip yang sama seperti enum SPEAKER).
 *
 * SINKRONISASI (Sprint 1.5): Disinkronkan penuh terhadap
 * SVARAVITA_Internal_Event_Contract.md — 42/42 event resmi di 14 domain
 * sudah tercakup. Nama & value setiap event mengikuti persis konvensi
 * `{domain}:{eventName}` di dokumen tsb (lihat §0 Naming Convention pada
 * Event Contract). Perubahan nama event di masa depan = breaking change,
 * harus didiskusikan ulang, bukan diedit langsung di sini.
 *
 * Beberapa event ditandai di Event Contract sebagai "tidak wajib punya
 * subscriber" (disediakan untuk kelengkapan dokumentasi/kompatibilitas
 * arsitektur, bukan berarti tidak terpakai). Event tersebut TETAP
 * dipertahankan di sini sesuai instruksi — lihat komentar per event.
 */
export const EVENTS = Object.freeze({
  ENGINE: Object.freeze({
    BOOT_STARTED: 'engine:bootStarted',
    READY: 'engine:ready',
    FATAL_ERROR: 'engine:fatalError',
  }),

  ROUTER: Object.freeze({
    MODE_CHANGED: 'router:modeChanged',
    NAVIGATE_REQUESTED: 'router:navigateRequested',
  }),

  DATA: Object.freeze({
    LEVEL_LOADED: 'data:levelLoaded',
    LOAD_FAILED: 'data:loadFailed',
    PARSE_ERROR: 'data:parseError',
  }),

  ASSET: Object.freeze({
    PRELOAD_STARTED: 'asset:preloadStarted',
    PRELOAD_PROGRESS: 'asset:preloadProgress',
    LOADED: 'asset:loaded',
    PRELOAD_FAILED: 'asset:preloadFailed',
  }),

  SCENE: Object.freeze({
    ENTERED: 'scene:entered',
    EXITED: 'scene:exited',
    CHANGED: 'scene:changed',
    NOT_FOUND: 'scene:notFound',
  }),

  DIALOGUE: Object.freeze({
    SEQUENCE_STARTED: 'dialogue:sequenceStarted',
    LINE_STARTED: 'dialogue:lineStarted',
    LINE_ENDED: 'dialogue:lineEnded',
    SEQUENCE_COMPLETE: 'dialogue:sequenceComplete',
  }),

  AUDIO: Object.freeze({
    PLAYBACK_STARTED: 'audio:playbackStarted',
    PLAYBACK_COMPLETE: 'audio:playbackComplete',
    PLAYBACK_FAILED: 'audio:playbackFailed',
  }),

  GESTURE: Object.freeze({
    READ_INTENT: 'gesture:readIntent',
    READ_LEFT_INTENT: 'gesture:readLeftIntent',
    READ_RIGHT_INTENT: 'gesture:readRightIntent',
    READ_QUESTION_INTENT: 'gesture:readQuestionIntent',
    SELECT_LEFT_INTENT: 'gesture:selectLeftIntent',
    SELECT_RIGHT_INTENT: 'gesture:selectRightIntent',
  }),

  CHOICE: Object.freeze({
    SELECTED: 'choice:selected',
    READ_LEFT: 'choice:readLeft',
    READ_RIGHT: 'choice:readRight',
    // Disediakan untuk kompatibilitas arsitektur: dipancarkan saat intent
    // gesture kiri/kanan diterima tapi konteks aktif bukan "quiz". Tidak
    // wajib punya subscriber (berguna untuk debug/logging jika dibutuhkan).
    IGNORED: 'choice:ignored',
  }),

  QUIZ: Object.freeze({
    SEQUENCE_STARTED: 'quiz:sequenceStarted',
    QUESTION_STARTED: 'quiz:questionStarted',
    ANSWER_EVALUATED: 'quiz:answerEvaluated',
    COMPLETED: 'quiz:completed',
  }),

  PROGRESS: Object.freeze({
    VITA_POINT_CHANGED: 'progress:vitaPointChanged',
    LEVEL_UNLOCKED: 'progress:levelUnlocked',
    // Disediakan untuk kompatibilitas arsitektur: ProgressManager memanggil
    // SaveManager.save() secara LANGSUNG (satu layer di bawahnya), bukan
    // lewat EventBus. Event ini hanya relevan jika kelak ada subscriber lain
    // di luar SaveManager (mis. analytics) yang perlu tahu checkpoint berubah.
    SCENE_CHECKPOINT_UPDATED: 'progress:sceneCheckpointUpdated',
  }),

  SAVE: Object.freeze({
    WRITTEN: 'save:written',
    WRITE_FAILED: 'save:writeFailed',
    LOAD_FAILED: 'save:loadFailed',
  }),

  UI: Object.freeze({
    RENDER_COMPLETE: 'ui:renderComplete',
    // Disediakan untuk kompatibilitas arsitektur: menurut Event Flow §D,
    // navigasi tingkat-aplikasi (tombol menu/replay) dikirim ulang oleh
    // UIManager sebagai ROUTER.NAVIGATE_REQUESTED ke Router. Tetap
    // didaftarkan di sini agar UIManager punya nama resmi untuk sinyal
    // internalnya sebelum diterjemahkan ke event Router.
    NAVIGATION_TAPPED: 'ui:navigationTapped',
  }),

  ANIMATION: Object.freeze({
    // Disediakan untuk kompatibilitas arsitektur: menurut Event Contract,
    // umumnya tidak ada subscriber wajib untuk event ini — tersedia untuk
    // kasus di masa depan yang butuh tahu kapan sebuah preset animasi mulai.
    STARTED: 'animation:started',
    COMPLETE: 'animation:complete',
  }),
});
