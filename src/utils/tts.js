/**
 * tts.js
 * ---------------------------------------------------------------------------
 * Helper Text-To-Speech memakai SpeechSynthesis API browser.
 *
 * Dipakai untuk membacakan hasil akhir permainan (skor Vita Point & bintang)
 * secara DINAMIS — tidak memakai file MP3 statis, karena nilainya berubah-ubah
 * tergantung hasil permainan.
 *
 * Fungsi diekspor:
 *   - speak(text[, onEnd])  → membacakan teks; onEnd dipanggil saat selesai
 *   - stopSpeaking()        → menghentikan semua ucapan yang sedang berjalan
 */

/**
 * Membacakan sebuah teks via SpeechSynthesis.
 * @param {string} text - teks yang akan diucapkan
 * @param {() => void} [onEnd] - dipanggil setelah selesai berbicara
 */
export function speak(text, onEnd) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  // Hentikan ucapan yang sedang berjalan sebelumnya.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  utterance.rate = 1;
  utterance.pitch = 1;

  // Pilih suara Indonesia jika tersedia.
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find((v) => /^id[-_]ID/i.test(v.lang));
  if (idVoice) utterance.voice = idVoice;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    if (onEnd) onEnd();
  };

  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.speak(utterance);

  // Fallback: SpeechSynthesis kadang tidak memicu onend di beberapa browser.
  // Estimasi durasi baca sebagai jaring pengaman.
  const estimateMs = Math.max(2000, text.length * 90);
  setTimeout(finish, estimateMs);
}

/**
 * Menghentikan semua ucapan yang sedang berjalan.
 */
export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
