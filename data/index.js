/**
 * data/index.js
 * ---------------------------------------------------------------------------
 * Registry tunggal daftar level yang terdaftar dalam game (Technical
 * Blueprint §2.5 & §5.4). HANYA daftar ID — tidak berisi konten apapun.
 * Satu-satunya konsumen resmi: engine/DataManager.js.
 *
 * Menambah Level 6 = tambah satu baris di sini + satu file
 * data/levels/level6.json baru. Tidak menyentuh kode engine sama sekali
 * (Extension Strategy §9).
 */
export const REGISTERED_LEVEL_IDS = Object.freeze([
  'system',
  'level1',
  'level2',
  'level3',
  'level4',
  'level5',
]);
