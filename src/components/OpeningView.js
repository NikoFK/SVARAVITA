/**
 * OpeningView.js
 * ---------------------------------------------------------------------------
 * Komponen render murni untuk sequence Opening (slideshow logo/sambutan).
 * Data deriven dari file asset, bukan hardcode jumlah slide.
 *
 * Fungsi diekspor:
 *   - showOpeningSlide(slideIndex, imagePath)  → tampilkan slide
 *   - hideOpening()                                  → sembunyikan overlay opening
 */

const OVERLAY_ID = 'opening-overlay';

/**
 * Menampilkan satu slide opening.
 * @param {number} slideIndex - index slide (1-based)
 * @param {string} imagePath  - path gambar (assets/images/system/opening{n}.webp)
 */
export function showOpeningSlide(slideIndex, imagePath) {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="opening-slide">
      <div class="opening-image" style="background-image:url('${imagePath}')"></div>
      <div class="opening-dots">
        <span class="opening-dot active"></span>
      </div>
    </div>
  `;
}

/**
 * Menyembunyikan overlay opening.
 */
export function hideOpening() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }
}

