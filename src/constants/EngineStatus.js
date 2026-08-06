/**
 * EngineStatus.js
 * ---------------------------------------------------------------------------
 * Status siklus hidup GameEngine sesuai Technical Blueprint bagian
 * "GameEngine -> State": booting | ready | error.
 */
export const ENGINE_STATUS = Object.freeze({
  BOOTING: 'booting',
  READY: 'ready',
  ERROR: 'error',
});
