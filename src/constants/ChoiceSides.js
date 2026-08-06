/**
 * ChoiceSides.js
 * ---------------------------------------------------------------------------
 * Dua nilai tetap untuk sisi pilihan kuis, dipetakan langsung ke gesture
 * (double-tap kiri/kanan). Sengaja TIDAK mengikuti label A/B atau 1/2 dari
 * skrip asli (yang tidak konsisten) — lihat ANALISIS ARSITEKTUR bagian 5.
 *
 * KOREKSI Sprint 2: nilai di bawah ini ("left"/"right") mengikuti persis
 * SVARAVITA_Technical_Blueprint.md §5.3.2 (`Question.correctAnswer`) dan
 * Internal_Event_Contract.md (payload `choice:selected.side`,
 * `quiz:answerEvaluated.selectedSide`) — kedua dokumen tsb adalah sumber
 * kebenaran final. Draft Sprint 1 sebelumnya sempat memakai
 * "choice_left"/"choice_right" yang TIDAK cocok dengan Blueprint final.
 */
export const CHOICE_SIDE = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});
