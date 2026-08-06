/**
 * SceneTypes.js
 * ---------------------------------------------------------------------------
 * Discriminator resmi untuk field `scene.type`.
 * Sesuai kontrak data (bagian "Standar Penamaan ID"): enum ini hanya
 * bertambah saat benar-benar ada renderer/handler baru di SceneManager.
 * Jangan gunakan string bebas di data JSON — selalu rujuk enum ini saat
 * menulis validator maupun kode engine.
 */
export const SCENE_TYPE = Object.freeze({
  OPENING: 'opening',
  TUTORIAL: 'tutorial',
  MENU: 'menu',
  NARRATION: 'narration',
  DIALOGUE: 'dialogue',
  QUIZ: 'quiz',
  FEEDBACK: 'feedback',
  REWARD: 'reward',
  LEVEL_UNLOCK: 'level_unlock',
  ENDING: 'ending',
});
