/**
 * assetExists.js
 * ---------------------------------------------------------------------------
 * Helper untuk mengecek keberadaan asset file secara akurat DI BROWSER.
 *
 * [PENTING — Bug fix Vite SPA fallback]
 * Di Vite dev server (dan banyak static host), meminta file yang TIDAK ada
 * sering mengembalikan HTTP 200 + isi index.html (SPA fallback / history
 * fallback), BUKAN 404. Akibatnya pola `fetch(path).then(r => r.ok)` selalu
 * bernilai `true` untuk file apa pun, sehingga auto-discovery (opening,
 * tutorial) tidak pernah berhenti dan berputar tanpa akhir.
 *
 * Solusi: selain memeriksa `res.ok`, kita juga memeriksa `Content-Type`
 * respons. File aset yang benar (gambar/audio) punya content-type seperti
 * `image/webp`, `audio/mpeg`, dst. — sedangkan fallback index.html punya
 * `text/html`. Jika `Content-Type` adalah `text/html`, berarti file aset
 * TIDAK benar-benar ada (hanya fallback SPA), jadi dianggap tidak ada.
 *
 * Catatan: di beberapa host, header Content-Type mungkin tidak disertakan
 * (mis. disajikan sebagai `application/octet-stream`). Untuk kasus itu kita
 * tetap menerima `res.ok` sebagai sinyal keberadaan, dengan pengecualian
 * tegas pada `text/html` yang selalu identik dengan fallback SPA.
 */

/**
 * Mengecek apakah sebuah file aset benar-benar ada.
 * @param {string} path - path relatif aset (mis. "assets/images/system/opening1.webp")
 * @returns {Promise<boolean>}
 */
export async function assetExists(path) {
  try {
    const res = await fetch(path, { method: 'GET' });
    if (!res.ok) return false;

    const contentType = res.headers.get('content-type') ?? '';
    // Vite/host SPA-fallback: file yang tidak ada disajikan sebagai index.html
    // (text/html) dengan status 200 → dianggap TIDAK ada.
    if (contentType.startsWith('text/html')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
