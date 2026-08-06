/**
 * main.js
 * ---------------------------------------------------------------------------
 * Entry point tunggal aplikasi. Dimuat dari index.html lewat:
 *   <script type="module" src="/js/main.js"></script>
 *
 * Tanggung jawab file ini (composition root, bukan gameplay logic):
 * 1. Gerbang wajib "tap-to-start" — SEBELUM GameEngine dibuat sama sekali,
 *    menunggu satu tap/klik pengguna. Ini wajib karena kebijakan autoplay
 *    browser mobile memblokir audio.play() tanpa gesture pengguna
 *    (Technical Blueprint §Lifecycle Game poin 5). bootstrap()+start()
 *    dipanggil di DALAM handler tap ini (bukan di DOMContentLoaded),
 *    supaya "user activation" browser masih berlaku saat Scene Opening
 *    pertama kali mencoba memutar audio.
 * 2. Wiring tombol Main Menu (Mulai Baru/Lanjutkan) — TIDAK lewat
 *    ChoiceManager (keputusan Event Flow §D: menu bukan konteks "quiz"),
 *    jadi di-wire langsung di sini sebagai composition-root glue.
 */

import { GameEngine } from './engine/GameEngine.js';
import { EVENTS, SCENE_TYPE } from './constants/index.js';
import { resolveKetukLayarAudioPath, resolveSystemAudioPath } from './utils/pathResolver.js';

/** @type {GameEngine|null} */
let engine = null;

/**
 * Menempelkan ulang click handler ke tombol Mulai Baru/Lanjutkan setiap
 * kali scene bertipe "menu" masuk — tombolnya di-render ulang tiap kali
 * oleh UIManager/ChoiceView (elemen DOM lama dibuang), jadi listener lama
 * ikut hilang bersamanya dan perlu dipasang ulang.
 *
 * FLOW MENU (sekali-tap, tanpa double-tap):
 *   - Begitu menu masuk, putar "Lanjut atau baru.mp3" (prompt).
 *   - Tap kiri  → putar "mulai baru.mp3" → selesai → router.startNewGame()
 *   - Tap kanan → putar "lanjutkan.mp3"  → selesai → router.resumeGame()
 */
function wireMenuButtons() {
  engine.eventBus.subscribe(EVENTS.SCENE.ENTERED, ({ sceneType }) => {
    if (sceneType !== SCENE_TYPE.MENU) return;

    // Putar audio prompt menu saat menu muncul.
    playAudioThen(resolveSystemAudioPath('Lanjut atau baru.mp3'), 'menu_prompt', () => {
      // Audio prompt selesai — tidak ada aksi otomatis, tinggal menunggu pilihan.
    });

    const router = engine.getManager('Router');
    // requestAnimationFrame: menunggu UIManager (subscriber scene:entered
    // lain) selesai me-render tombol secara sinkron di frame yang sama,
    // sebelum kita mengambil elemennya dari DOM.
    requestAnimationFrame(() => {
      const newGameBtn = document.getElementById('choice-left');
      const resumeBtn = document.getElementById('choice-right');

      // Kiri = Mulai Baru: putar "mulai baru.mp3", lalu startNewGame.
      if (newGameBtn) {
        newGameBtn.addEventListener(
          'click',
          () => {
            playAudioThen(resolveSystemAudioPath('mulai baru.mp3'), 'menu_start_new', () => {
              router.startNewGame();
            });
          },
          { once: true }
        );
      }

      // Kanan = Lanjutkan: putar "lanjutkan.mp3", lalu resumeGame.
      if (resumeBtn) {
        resumeBtn.addEventListener(
          'click',
          () => {
            playAudioThen(resolveSystemAudioPath('lanjutkan.mp3'), 'menu_resume', () => {
              router.resumeGame();
            });
          },
          { once: true }
        );
      }
    });
  });
}

/**
 * Memutar satu file audio lalu memanggil callback setelah selesai/gagal.
 * Fallback aman: tanpa Audio API, langsung panggil callback.
 * @param {string} path
 * @param {string} trackId
 * @param {() => void} onDone
 */
function playAudioThen(path, trackId, onDone) {
  if (typeof Audio === 'undefined') {
    onDone();
    return;
  }

  const audio = new Audio(path);
  audio.addEventListener('ended', () => onDone(), { once: true });
  audio.addEventListener('error', () => onDone(), { once: true });

  const playResult = audio.play();
  if (playResult && typeof playResult.then === 'function') {
    playResult.catch(() => onDone()); // autoplay diblokir / gagal → tetap lanjut
  }
}

/** Dipanggil sekali, di dalam handler tap gerbang awal. */
function startGame() {
  engine = new GameEngine();
  window.__SVARAVITA_ENGINE__ = engine; // debug handle, lihat catatan di bawah

  wireMenuButtons();

  engine.bootstrap().then(() => {
    engine.start();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('loading-screen');
  if (!gate) {
    // Fallback jika struktur index.html tak terduga — tetap jalankan game
    // daripada macet total tanpa penjelasan.
    startGame();
    return;
  }

  gate.style.cursor = 'pointer';
  gate.addEventListener(
    'click',
    function onGateTap() {
      gate.removeEventListener('click', onGateTap);

      // Urutan startup yang benar (perbaikan bug):
      // 1. User meng-klik gate → MULAI putar "Ketuk Layar.mp3" (baru boleh
      //    memutar audio, karena browser memblokir autoplay tanpa gesture).
      // 2. Selama audio diputar, layar tetap hitam (loading-screen tetap
      //    tampil sebagai penutup).
      // 3. Setelah audio selesai (atau gagal dimuat), sembunyikan
      //    loading-screen barulah mulai Opening slideshow lewat bootstrap.
      playKetukLayarThen(() => {
        hideLoadingScreen();
        startGame();
      });
    },
    { once: true }
  );
});

/**
 * Memutar "Ketuk Layar.mp3" lalu memanggil callback setelah selesai/gagal.
 * Dibuat di dalam handler klik, jadi "user activation" browser masih aktif.
 * @param {() => void} onDone
 */
function playKetukLayarThen(onDone) {
  // Fallback aman: tanpa Audio API, langsung selesaikan.
  if (typeof Audio === 'undefined') {
    onDone();
    return;
  }

  const audio = new Audio(resolveKetukLayarAudioPath());
  audio.addEventListener('ended', () => onDone(), { once: true });
  audio.addEventListener('error', () => onDone(), { once: true });

  const playResult = audio.play();
  if (playResult && typeof playResult.then === 'function') {
    playResult.catch(() => onDone()); // autoplay diblokir / gagal → tetap lanjut
  }
}

/** Menyembunyikan gate loading — dipanggil SETELAH audio selesai. */
function hideLoadingScreen() {
  const gate = document.getElementById('loading-screen');
  if (gate) gate.style.display = 'none';
}

// Debug handle untuk inspeksi manual lewat browser console selama development
// (mis. window.__SVARAVITA_ENGINE__.eventBus.listenerCount('scene:changed')).
// Diisi di dalam startGame() begitu instance GameEngine benar-benar ada.
window.__SVARAVITA_ENGINE__ = null;
