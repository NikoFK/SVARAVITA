/**
 * pathResolver.js
 * ---------------------------------------------------------------------------
 * Satu-satunya fungsi resolver konvensi path asset untuk struktur asset baru.
 *
 * STRUKTUR ASSET BARU (satu-satunya sumber kebenaran):
 *   images/{levelId}/{sceneId}.webp            → gambar scene (cerita)
 *   audio/{levelId}/{sceneId}.mp3              → audio scene (cerita)
 *   audio/{levelId}/soal/{questionId}/soal.mp3 → audio soal quiz
 *   audio/{levelId}/soal/{questionId}/A.mp3    → audio pilihan A
 *   audio/{levelId}/soal/{questionId}/B.mp3    → audio pilihan B
 *   audio/{levelId}/soal/{questionId}/feedback benar.mp3 → feedback benar
 *   audio/{levelId}/soal/{questionId}/feedback salah.mp3 → feedback salah
 *
 *   images/system/opening{index}.webp          → slide opening
 *   audio/system/Ketuk Layar.mp3               → tap-to-start
 *   audio/system/Lanjut atau baru.mp3          → suara menu
 *   audio/system/lanjutkan.mp3                 → pilih "Lanjutkan"
 *   audio/system/mulai baru.mp3                → pilih "Mulai Baru"
 *   images/tutorial/bgrnd_tutorial{slide}.webp → background tutorial
 *   audio/tutorial/tutorial_{slide}.mp3        → audio tutorial
 *
 * Aturan global: path mengikuti folder asset yang sudah ada. Tidak ada lagi
 * karakter/portrait/background terpisah/BGM/SFX. 1 scene = 1 gambar + 1 audio.
 */

const ASSET_ROOT = 'assets';

/** Nama-nama file khusus di folder system (tidak boleh diubah). */
const SYSTEM_AUDIO_FILES = Object.freeze({
  KETUK_LAYAR: 'Ketuk Layar.mp3',
  LANJUT_ATAU_BARU: 'Lanjut atau baru.mp3',
  LANJUTKAN: 'lanjutkan.mp3',
  MULAI_BARU: 'mulai baru.mp3',
});

/** Nama-nama file audio quiz (tidak boleh diubah). */
const QUIZ_AUDIO_FILES = Object.freeze({
  SOAL: 'soal.mp3',
  A: 'A.mp3',
  B: 'B.mp3',
  FEEDBACK_BENAR: 'feedback benar.mp3',
  FEEDBACK_SALAH: 'feedback salah.mp3',
});

/**
 * Path gambar scene cerita.
 * @param {string} levelId - mis. "level1"
 * @param {string} sceneId - mis. "level1_scn001"
 * @returns {string} "assets/images/level1/level1_scn001.webp"
 */
export function resolveSceneImagePath(levelId, sceneId) {
  return `${ASSET_ROOT}/images/${levelId}/${sceneId}.webp`;
}

/**
 * Path audio scene cerita.
 * @param {string} levelId - mis. "level1"
 * @param {string} sceneId - mis. "level1_scn001"
 * @returns {string} "assets/audio/level1/level1_scn001.mp3"
 */
export function resolveSceneAudioPath(levelId, sceneId) {
  return `${ASSET_ROOT}/audio/${levelId}/${sceneId}.mp3`;
}

/**
 * Path gambar slide opening (auto-discovery).
 * @param {number} index - 1-based, mis. 1 → "opening1.webp"
 * @returns {string} "assets/images/system/opening1.webp"
 */
export function resolveOpeningImagePath(index) {
  return `${ASSET_ROOT}/images/system/opening${index}.webp`;
}

/**
 * Path gambar background Menu Utama (halaman Mulai Baru/Lanjutkan).
 * @returns {string} "assets/images/system/tombol play.webp"
 */
export function resolveMenuImagePath() {
  return `${ASSET_ROOT}/images/system/tombol play.webp`;
}

/**
 * Path audio sistem "Ketuk Layar" (tap-to-start).
 * @returns {string} "assets/audio/system/Ketuk Layar.mp3"
 */
export function resolveKetukLayarAudioPath() {
  return `${ASSET_ROOT}/audio/system/${SYSTEM_AUDIO_FILES.KETUK_LAYAR}`;
}

/**
 * Path audio sistem menu (Lanjut atau baru / lanjutkan / mulai baru).
 * @param {string} name - salah satu dari SYSTEM_AUDIO_FILES
 * @returns {string} "assets/audio/system/{name}"
 */
export function resolveSystemAudioPath(name) {
  return `${ASSET_ROOT}/audio/system/${name}`;
}

/**
 * Path gambar background tutorial (auto-discovery).
 * @param {number} slide - 1-based, mis. 1 → "bgrnd_tutorial1.webp"
 * @returns {string} "assets/images/tutorial/bgrnd_tutorial1.webp"
 */
export function resolveTutorialImagePath(slide) {
  return `${ASSET_ROOT}/images/tutorial/bgrnd_tutorial${slide}.webp`;
}

/**
 * Path audio tutorial (auto-discovery).
 * @param {number} slide - 1-based, mis. 1 → "tutorial_1.mp3"
 * @returns {string} "assets/audio/tutorial/tutorial_1.mp3"
 */
export function resolveTutorialAudioPath(slide) {
  return `${ASSET_ROOT}/audio/tutorial/tutorial_${slide}.mp3`;
}

/**
 * Path audio backsound Loading/Opening slideshow.
 * @returns {string} "assets/audio/system/loading_screen.mp3"
 */
export function resolveLoadingScreenAudioPath() {
  return `${ASSET_ROOT}/audio/system/loading_screen.mp3`;
}

/**
 * Path audio backsound kemenangan (Ending / Result Screen).
 * @returns {string} "assets/audio/system/win_game.mp3"
 */
export function resolveWinGameAudioPath() {
  return `${ASSET_ROOT}/audio/system/win_game.mp3`;
}

/**
 * Direktori base untuk aset audio satu soal quiz.
 *
 * [BUG FIX — Penyesuaian struktur folder aktual]
 * Data JSON memakai questionId panjang ("level1_scn008_q01"), tetapi folder
 * aset aktual memakai id pendek ("level1_q01"). Struktur folder aktual adalah
 * source of truth (sesuai persetujuan), jadi di sini id panjang dipetakan ke
 * id pendek (ambil bagian `_q\d+$`) sebelum membangun path.
 *
 * @param {string} levelId - mis. "level1"
 * @param {string} questionId - mis. "level1_scn008_q01" ATAU "level1_q01"
 * @returns {string} "assets/audio/level1/soal/level1_q01"
 */
export function resolveQuestionDir(levelId, questionId) {
  const shortId = questionId.replace(/^.*_q(\d+)$/i, (m, num) => `${levelId}_q${num}`);
  return `${ASSET_ROOT}/audio/${levelId}/soal/${shortId}`;
}

/**
 * Path satu file audio quiz dalam direktori soal.
 * @param {string} levelId - mis. "level1"
 * @param {string} questionId - mis. "level1_q01"
 * @param {'soal'|'A'|'B'|'feedback benar'|'feedback salah'} type
 * @returns {string} "assets/audio/level1/soal/level1_q01/{filename}"
 *
 * [BUG FIX] Sebelumnya selalu menempelkan ".mp3" di akhir, padahal nilai
 * QUIZ_AUDIO_FILES (mis. "A.mp3", "B.mp3", "soal.mp3") SUDAH mengandung
 * ekstensi. Akibatnya path jadi ".mp3.mp3" untuk A/B (key lookup cocok),
 * sehingga audio pilihan tidak pernah dimuat. Sekarang ekstensi cukup
 * ditambahkan bila filename belum memilikinya.
 */
export function resolveQuestionAudioPath(levelId, questionId, type) {
  const base = QUIZ_AUDIO_FILES[type] ?? type;
  const filename = base.toLowerCase().endsWith('.mp3') ? base : `${base}.mp3`;
  return `${resolveQuestionDir(levelId, questionId)}/${filename}`;
}

export { SYSTEM_AUDIO_FILES, QUIZ_AUDIO_FILES };
