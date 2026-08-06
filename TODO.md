# TODO — SVARAVITA Bug Fix & UX (11 items)

## 1. Star Level (data-driven)
- [ ] `ProgressManager`: inject DataManager, track `_levelStars`, subscribe `dialogue:sequenceComplete` (count narration/dialogue only)
- [ ] `HUD.js`: `renderProgressInfo` render totalStars + earnedStars
- [ ] `UIManager`: inject DataManager, compute totalStars = story scene count, pass to HUD
- [ ] `DialogueManager`: include `sceneType` in sequenceComplete payload

## 2. Audio Soal → A → B otomatis
- [ ] `pathResolver`: fix `resolveQuestionDir` to map `level1_scn008_q01` → `level1_q01`
- [ ] `QuizManager`: sequential pipeline soal → A → B → enable input

## 3. Interaksi A/B (tap1 preview, tap2 select)
- [ ] `GestureManager`: remove direct-select on `#choice-left/#choice-right`
- [ ] `QuizManager`: add `_previewSide` gate on select

## 4. Cerita tanpa subtitle
- [ ] `UIManager.renderScene`: only background, clear subtitle
- [ ] `DialogueManager`: skip ENDING scenes

## 5. Tutorial layout
- [ ] `TutorialView`: BG fullscreen image, popup = text only
- [ ] `style.css`: tutorial overlay BG + card

## 6. Vita Point warna
- [ ] `style.css`: `#hud` color → mint/turquoise

## 7. Intro autoplay
- [ ] `main.js`: try autoplay Ketuk Layar on load; fallback to click gate

## 8. Ending screen
- [ ] `EndingView.js` (new)
- [ ] `UIManager`: render ending on ENDING scene
- [ ] `Router`: ending → menu after TTS

## 9. Total star & vita point on ending
- [ ] `ProgressManager.getTotalStars()`, `getVitaPoint()`

## 10. TTS score
- [ ] `utils/tts.js` (new) — SpeechSynthesis
- [ ] Ending speaks dynamic results

## 11. Regression test
- [ ] Update `debug/browser-test.mjs` full flow to Ending
