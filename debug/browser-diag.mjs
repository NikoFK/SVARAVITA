/**
 * debug/browser-diag.mjs
 * ---------------------------------------------------------------------------
 * Diagnostik REAL BROWSER: menangkap SEMUA console (log/info/warn/error),
 * network, dan state DOM/scene setelah klik loading, untuk menemukan di mana
 * flow berhenti di browser sungguhan.
 */
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const logs = [];
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    logs.push(`[pageerror] ${err.message}`);
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400) logs.push(`[network ${resp.status()}] ${resp.url()}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(800);

  // Inject helper untuk membaca state engine
  await page.evaluate(() => {
    window.__dumpState = () => {
      const engine = window.__SVARAVITA_ENGINE__;
      if (!engine) return { engine: 'null' };
      const sm = engine.getManager('SceneManager');
      const router = engine.getManager('Router');
      const om = engine.getManager('OpeningManager');
      return {
        status: engine.status,
        sceneId: sm?.getCurrentSceneId ? sm.getCurrentSceneId() : '(no getCurrentSceneId)',
        sceneType: sm?.getCurrentScene()?.type,
        sceneExists: !!sm?.getCurrentScene(),
        routerMode: router?.getCurrentMode ? router.getCurrentMode() : '(no mode)',
        openingRunning: om?._isRunning,
        openingSlide: om?._slide,
        managers: Array.from(engine._managers.keys()),
        quizChoicesCount: document.querySelectorAll('#quiz-choices .choice-btn').length,
        openingOverlayDisplay: document.getElementById('opening-overlay')?.style.display,
      };
    };
  });

  // Tap loading
  await page.locator('#loading-screen').click({ force: true });
  await page.waitForTimeout(500);
  logs.push('[diag] after click loading: ' + JSON.stringify(await page.evaluate(() => window.__dumpState())));

  // Cek tiap 2.5s selama 15s
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(2500);
    logs.push(`[diag +${(i + 1) * 2.5}s] ` + JSON.stringify(await page.evaluate(() => window.__dumpState())));
  }

  await page.screenshot({ path: 'debug/screenshots/diag-final.png' });

  console.log('===== DIAGNOSTIC LOG ====');
  logs.forEach((l) => console.log(l));

  await browser.close();
}

main().catch((err) => {
  console.error('DIAG FAILED:', err.message);
  process.exit(1);
});
