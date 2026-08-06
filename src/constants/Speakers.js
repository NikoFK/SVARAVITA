/**
 * Speakers.js
 * ---------------------------------------------------------------------------
 * Enum tetap untuk identitas pengisi suara. WAJIB sama persis dengan nama
 * folder audio (assets/audio/{speakerId}/...). Ini yang mencegah bug typo
 * seperti "Zae" (ditemukan di skrip mentah) merembet ke path aset — salah
 * ketik pada import akan error saat build/runtime, bukan silent failure
 * seperti string bebas di JSON.
 */
export const SPEAKER = Object.freeze({
  NARRATOR: 'narrator',
  VARA: 'vara',
  ZEA: 'zea',
  EXPERT: 'expert',
  // [Extension] Karakter baru dari konten Tahap 4 (teman di UKS) dan Tahap 5
  // (Stefany, teman di kantin) — ditambahkan sesuai Technical Blueprint §9
  // Extension Strategy: "menambah karakter baru = tambah 1 nilai enum di
  // Speaker.js + folder aset baru", satu-satunya sentuhan kode yang legal
  // untuk penambahan karakter.
  FRIEND: 'friend',
  STEFANY: 'stefany',
});
