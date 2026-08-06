/**
 * debug/browser-test.mjs
 * ---------------------------------------------------------------------------
 * REAL BROWSER TEST SVARAVITA menggunakan Playwright (bukan mock/harness).
 *
 * Membuka aplikasi asli lewat `npm run dev`, lalu menelusuri urutan:
 *   Website terbuka → loading screen → klik loading → audio Ketuk Layar
 *   → Opening1 → Opening2 → Main Menu → klik Mulai Baru → Tutorial
 *   → Level 1 → Cerita → Quiz
 *
 * Merekam: screenshot per tahap, console error, network error (404/500),
 * dan JavaScript exception. Jika berhenti di tahap mana pun, laporkan tahap
 * terakhir yang berhasil + penyebabnya.
 *
 * Jalankan: node debug/browser-test.mjs
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173/';
const SHOT_DIR = 'debug/screenshots';
const OUT = {
  lastStage: 'belum mulai',
  consoleErrors: [],
  networkErrors: [],
  jsExceptions: [],
  stages: [],
};

function logStage(name) {
  OUT.stages.push(name);
  OUT.lastStage = name;
  console.log(`\n=== ✅ TAHAP: ${name} ===`);
}

async function screenshot(page, name) {
  const fs = await import('node:fs');
  const path = `${SHOT_DIR}/${name}.png`;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot: ${path}`);
}

async function waitForChoices(page, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await page.locator('#quiz-choices .choice-btn').count();
    if (count >= 2) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

async function main() {
  const fs = await import('node:fs');
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });

  // --- Tangkap console error ---
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      OUT.consoleErrors.push(msg.text());
      console.log(`🚨 [console.error] ${msg.text()}`);
    }
  });

  // --- Tangkap kesalahan jaringan (404/500) ---
  page.on('response', (resp) => {
    const status = resp.status();
    if (status >= 400) {
      OUT.networkErrors.push({ status, url: resp.url() });
      console.log(`🌐 [network ${status}] ${resp.url()}`);
    }
  });

  // --- Tangkap JavaScript exception (halaman) ---
  page.on('pageerror', (err) => {
    OUT.jsExceptions.push(err.message);
    console.log(`💥 [pageerror] ${err.message}`);
  });

  // --- 1. Website terbuka ---
  logStage('Website terbuka');
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1000);
  await screenshot(page, '01-website');

  // --- 2. Loading screen muncul ---
  logStage('Loading screen muncul');
  const loadingVisible = await page.locator('#loading-screen').isVisible();
  const loadingText = await page.locator('#loading-screen-text').textContent().catch(() => '');
  console.log(`   loading-screen visible=${loadingVisible}, text="${loadingText}"`);
  await screenshot(page, '02-loading-screen');

  // --- 3. Klik loading screen (tap-to-start) ---
  logStage('Klik loading screen');
  await page.locator('#loading-screen').click({ force: true });
  await page.waitForTimeout(500);
  await screenshot(page, '03-after-click-loading');

  // --- 4. Ketuk Layar.mp3 dimutar (cek audio dimulai) ---
  logStage('Audio "Ketuk Layar" diputar');
  await page.waitForTimeout(1500);
  await screenshot(page, '04-audio-ketuk-layar');

  // --- 5. Opening1 muncul ---
  logStage('Opening1 muncul');
  await page.waitForTimeout(1800);
  await screenshot(page, '05-opening1');

  // --- 6. Opening2 muncul ---
  logStage('Opening2 muncul');
  await page.waitForTimeout(2500);
  await screenshot(page, '06-opening2');

  // --- 7. Main Menu tampil ---
  logStage('Menunggu Main Menu');
  const menuFound = await waitForChoices(page);
  await screenshot(page, '07-main-menu');
  console.log(`   menuFound=${menuFound}`);
  if (!menuFound) {
    console.log('❌ BERHENTI: Main Menu tidak muncul.');
    await finish(browser, OUT);
    return;
  }

  // --- 8. Klik "Mulai Baru" (#choice-left) ---
  logStage('Klik Mulai Baru');
  await page.locator('#choice-left').click({ force: true });
  await page.waitForTimeout(1500);
  await screenshot(page, '08-after-mulai-baru');

  // --- 9. Tutorial tampil ---
  logStage('Tutorial tampil');
  await page.waitForTimeout(4000);
  await screenshot(page, '09-tutorial');

  // --- 10. Masuk Level 1 ---
  logStage('Masuk Level 1');
  await page.waitForTimeout(4000);
  await screenshot(page, '10-level1');

  // --- 11. Cerita tampil ---
  logStage('Cerita tampil');
  await page.waitForTimeout(4000);
  await screenshot(page, '11-cerita');

// --- 12. Quiz tampil ---
  logStage('Tunggu Quiz tampil');
  let quizFound = false;
  const quizStart = Date.now();
  // Level 1 punya 7 scene cerita sebelum quiz (scn001–scn007), masing-masing
  // memutar audio .mp3 asli yang panjangnya beberapa detik. Beri waktu cukup
  // (maks ~3 menit) agar audio benar-benar selesai di browser sungguhan.
  while (Date.now() - quizStart < 180000) {
    await page.waitForTimeout(1500);
    const choices = await page.locator('#quiz-choices .choice-btn').count();
    const badges = await page.locator('#quiz-choices .choice-badge').count();
    // Quiz punya badge A & B; menu juga punya badge, jadi cek ada badge "A".
    if (choices >= 2 && badges >= 2) {
      const badgeTexts = await page.locator('#quiz-choices .choice-badge').allTextContents();
      if (badgeTexts.includes('A') && badgeTexts.includes('B')) {
        quizFound = true;
        break;
      }
    }
  }
  await screenshot(page, '12-quiz');
  console.log(`   quizFound=${quizFound}`);

  await finish(browser, OUT);
}

async function finish(browser, out) {
  await browser.close();
  const fs = await import('node:fs');
  console.log('\n\n========== RINGKASAN REAL BROWSER TEST ==========');
  console.log(`Tahap terakhir berhasil: ${out.lastStage}`);
  console.log(`Stage yang tercapai: ${out.stages.join(' → ')}`);
  console.log(`\nConsole errors (${out.consoleErrors.length}):`);
  out.consoleErrors.forEach((e) => console.log('   -', e));
  console.log(`\nNetwork errors (${out.networkErrors.length}):`);
  out.networkErrors.forEach((e) => console.log(`   - ${e.status} ${e.url}`));
  console.log(`\nJS exceptions (${out.jsExceptions.length}):`);
  out.jsExceptions.forEach((e) => console.log('   -', e));

  fs.writeFileSync('debug/browser-test-report.json', JSON.stringify(out, null, 2));
  console.log('\n📄 Laporan lengkap: debug/browser-test-report.json');
}

main().catch((err) => {
  console.error('❌ Browser test gagal:', err);
  console.log(`Tahap terakhir berhasil: ${OUT.lastStage}`);
  process.exit(1);
});
