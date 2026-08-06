/**
 * storySceneDetector.js
 * ---------------------------------------------------------------------------
 * Deteksi jumlah scene cerita (story) per level BERDASARKAN ASSET, bukan JSON.
 *
 * Struktur asset: 1 scene = 1 gambar + 1 audio.
 *   images/{levelId}/{levelId}_scn{NNN}.webp
 *   audio/{levelId}/{levelId}_scn{NNN}.mp3
 *
 * Scene cerita dianggap "ada" jika GAMBAR dan AUDIO-nya benar-benar ada di
 * folder asset (dicek via assetExists, yang menolak fallback SPA text/html).
 * ID scene mengikuti pola sequential: {levelId}_scn001, _scn002, ...
 *
 * Tujuan: quiz TIDAK boleh muncul sebelum seluruh scene cerita dari asset
 * selesai diputar, berapa pun jumlah yang didefinisikan di JSON.
 */

import { assetExists } from './assetExists.js';
import { resolveSceneAudioPath, resolveSceneImagePath } from './pathResolver.js';

/** Batas aman anti infinite-loop saat auto-discovery. */
const MAX_SCENE_INDEX = 200;

/**
 * Membangun id scene dari levelId + index.
 * @param {string} levelId - mis. "level1"
 * @param {number} index - 1-based, mis. 22 → "level1_scn022"
 * @returns {string}
 */
export function scnId(levelId, index) {
  return `${levelId}_scn${String(index).padStart(3, '0')}`;
}

/**
 * Mengecek apakah satu scene cerita benar-benar ada di asset
 * (gambar + audio) untuk sebuah level.
 * @param {string} levelId
 * @param {number} index - 1-based
 * @returns {Promise<boolean>}
 */
export async function hasStoryScene(levelId, index) {
  const id = scnId(levelId, index);
  const [audioOk, imageOk] = await Promise.all([
    assetExists(resolveSceneAudioPath(levelId, id)),
    assetExists(resolveSceneImagePath(levelId, id)),
  ]);
  return audioOk && imageOk;
}

/**
 * Menghitung jumlah scene cerita pada sebuah level dengan menscan asset
 * secara berurutan scn001..scn{next}. Berhenti pada index pertama yang
 * tidak punya asset (baik audio maupun gambar).
 * @param {string} levelId
 * @returns {Promise<number>}
 */
export async function getStorySceneCount(levelId) {
  let count = 0;
  for (let n = 1; n <= MAX_SCENE_INDEX; n += 1) {
    if (await hasStoryScene(levelId, n)) {
      count = n;
    } else {
      break;
    }
  }
  return count;
}
