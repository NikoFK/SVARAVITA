/**
 * validators.js
 * ---------------------------------------------------------------------------
 * Validasi skema data JSON level/scene, sesuai Technical Blueprint §5.2–5.3
 * dan checklist §10 poin "Validator dev-time": (a) setiap nextScene valid,
 * (b) setiap speaker termasuk enum, (c) setiap correctAnswer bernilai
 * left/right, (d) id unik.
 *
 * Fungsi murni, tanpa state, tanpa efek samping — hanya mengimpor dari
 * constants/ (sesuai aturan §2.4: "utils/*.js hanya boleh mengimpor dari
 * constants/*.js"). TIDAK mengimpor engine/*.js apapun.
 */

import { SCENE_TYPE, SPEAKER, CHOICE_SIDE } from '../constants/index.js';

const VALID_CHOICE_SIDES = Object.freeze([CHOICE_SIDE.LEFT, CHOICE_SIDE.RIGHT]);
const VALID_SCENE_TYPES = Object.freeze(Object.values(SCENE_TYPE));
const VALID_SPEAKERS = Object.freeze(Object.values(SPEAKER));

/**
 * Memvalidasi seluruh struktur satu file level JSON.
 * @param {any} levelData - hasil JSON.parse() dari data/levels/{levelId}.json
 * @param {string} [expectedLevelId] - levelId yang seharusnya (dari nama file/registry),
 *   dicocokkan terhadap `levelData.levelId` jika diberikan.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateLevelData(levelData, expectedLevelId) {
  const errors = [];
  const warnings = [];

  if (!levelData || typeof levelData !== 'object' || Array.isArray(levelData)) {
    return { valid: false, errors: ['Level data bukan object valid (hasil JSON.parse harus berupa object).'], warnings };
  }

  if (!_isNonEmptyString(levelData.levelId)) {
    errors.push('Field root "levelId" wajib string non-kosong.');
  } else if (expectedLevelId && levelData.levelId !== expectedLevelId) {
    errors.push(`Field root "levelId" ("${levelData.levelId}") tidak cocok dengan level yang diminta ("${expectedLevelId}").`);
  }

  if (!_isNonEmptyString(levelData.bloomLevel)) {
    errors.push('Field root "bloomLevel" wajib string non-kosong.');
  }
  if (!_isNonEmptyString(levelData.displayTitle)) {
    errors.push('Field root "displayTitle" wajib string non-kosong.');
  }
  if (!Array.isArray(levelData.scenes) || levelData.scenes.length === 0) {
    errors.push('Field root "scenes" wajib array dan tidak boleh kosong.');
    return { valid: false, errors, warnings };
  }

  const levelId = levelData.levelId;
  const sceneIds = new Set();

  // Pass 1: validasi struktural tiap scene + kumpulkan id untuk pass 2.
  levelData.scenes.forEach((scene, index) => {
    _validateScene(scene, index, levelId, sceneIds, errors, warnings);
  });

  // Pass 2: verifikasi referensi nextScene (hanya bisa dipastikan penuh untuk
  // scene di dalam level yang sama — referensi lintas-level tidak bisa
  // diverifikasi dari satu file saja, jadi diturunkan jadi warning).
  levelData.scenes.forEach((scene, index) => {
    _validateNextSceneReference(scene, index, levelId, sceneIds, errors, warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
}

function _validateScene(scene, index, levelId, sceneIds, errors, warnings) {
  const label = `scenes[${index}]`;

  if (!scene || typeof scene !== 'object') {
    errors.push(`${label}: bukan object valid.`);
    return;
  }

  if (!_isNonEmptyString(scene.id)) {
    errors.push(`${label}: field "id" wajib string non-kosong.`);
  } else {
    if (levelId && !scene.id.startsWith(`${levelId}_scn`)) {
      warnings.push(`${label} (id="${scene.id}"): id tidak mengikuti pola "{levelId}_scn{seq}" sesuai konvensi penamaan.`);
    }
    if (sceneIds.has(scene.id)) {
      errors.push(`${label}: id "${scene.id}" duplikat — id Scene wajib unik dalam satu level.`);
    } else {
      sceneIds.add(scene.id);
    }
  }

  const sceneRef = scene.id ? ` (id="${scene.id}")` : '';

  if (!VALID_SCENE_TYPES.includes(scene.type)) {
    errors.push(`${label}${sceneRef}: field "type" ("${scene.type}") bukan nilai SCENE_TYPE yang valid (${VALID_SCENE_TYPES.join(' | ')}).`);
  }

  if (!_isStringOrNull(scene.background)) {
    errors.push(`${label}${sceneRef}: field "background" harus string atau null.`);
  }

  if (scene.type === SCENE_TYPE.ENDING) {
    if (scene.nextScene !== null && !_isNonEmptyString(scene.nextScene)) {
      errors.push(`${label}${sceneRef}: field "nextScene" untuk scene tipe "ending" harus null atau string non-kosong.`);
    }
  } else if (!_isNonEmptyString(scene.nextScene)) {
    errors.push(`${label}${sceneRef}: field "nextScene" wajib string non-kosong untuk scene tipe selain "ending".`);
  }

  if (scene.type === SCENE_TYPE.QUIZ) {
    _validateQuestions(scene, label, sceneRef, errors, warnings);
  } else {
    // Sesuai Blueprint §5.3.1 & §5.3.3: seluruh tipe scene selain "quiz"
    // (narration, dialogue, feedback, reward, level_unlock, menu, tutorial,
    // opening, ending) reuse struktur "lines" yang sama.
    _validateLines(scene, label, sceneRef, errors, warnings);
  }
}

function _validateNextSceneReference(scene, index, levelId, sceneIds, errors, warnings) {
  const label = `scenes[${index}]`;
  if (!scene || !_isNonEmptyString(scene.nextScene)) return;

  if (sceneIds.has(scene.nextScene)) return;

  const sceneRef = scene.id ? ` (id="${scene.id}")` : '';
  if (levelId && scene.nextScene.startsWith(`${levelId}_scn`)) {
    // Polanya jelas menunjuk scene di level yang sama tapi tidak ditemukan —
    // ini benar-benar dead-end, bukan sekadar referensi lintas-level.
    errors.push(`${label}${sceneRef}: "nextScene" ("${scene.nextScene}") menunjuk id yang tidak ditemukan di dalam level "${levelId}" ini.`);
  } else {
    warnings.push(`${label}${sceneRef}: "nextScene" ("${scene.nextScene}") tidak ditemukan di level ini — kemungkinan referensi lintas-level (mis. scene pertama level berikutnya), tidak dapat diverifikasi penuh tanpa memuat level tujuan.`);
  }
}

function _validateLines(scene, sceneLabel, sceneRef, errors, warnings) {
  if (!Array.isArray(scene.lines) || scene.lines.length === 0) {
    errors.push(`${sceneLabel}${sceneRef}: scene tipe "${scene.type}" wajib punya field "lines" (array, tidak kosong).`);
    return;
  }

  const lineIds = new Set();
  scene.lines.forEach((line, i) => {
    const label = `${sceneLabel}.lines[${i}]`;

    if (!line || typeof line !== 'object') {
      errors.push(`${label}: bukan object valid.`);
      return;
    }

    if (!_isNonEmptyString(line.id)) {
      errors.push(`${label}: field "id" wajib string non-kosong.`);
    } else if (lineIds.has(line.id)) {
      errors.push(`${label} (id="${line.id}"): id duplikat — id Line wajib unik dalam satu scene.`);
    } else {
      lineIds.add(line.id);
    }

    const lineRef = line.id ? ` (id="${line.id}")` : '';

    if (!VALID_SPEAKERS.includes(line.speaker)) {
      errors.push(`${label}${lineRef}: field "speaker" ("${line.speaker}") bukan nilai SPEAKER yang valid (${VALID_SPEAKERS.join(' | ')}).`);
    }
    if (!_isNonEmptyString(line.text)) {
      errors.push(`${label}${lineRef}: field "text" wajib string non-kosong.`);
    }
    if (!_isStringOrNull(line.audio)) {
      errors.push(`${label}${lineRef}: field "audio" harus string atau null.`);
    }
    if (!_isStringOrNull(line.animation)) {
      errors.push(`${label}${lineRef}: field "animation" harus string atau null.`);
    }
  });
}

function _validateQuestions(scene, sceneLabel, sceneRef, errors, warnings) {
  if (!Array.isArray(scene.questions) || scene.questions.length === 0) {
    errors.push(`${sceneLabel}${sceneRef}: scene tipe "quiz" wajib punya field "questions" (array, tidak kosong).`);
    return;
  }

  const questionIds = new Set();
  scene.questions.forEach((question, i) => {
    const label = `${sceneLabel}.questions[${i}]`;

    if (!question || typeof question !== 'object') {
      errors.push(`${label}: bukan object valid.`);
      return;
    }

    if (!_isNonEmptyString(question.id)) {
      errors.push(`${label}: field "id" wajib string non-kosong.`);
    } else if (questionIds.has(question.id)) {
      errors.push(`${label} (id="${question.id}"): id duplikat — id Question wajib unik dalam satu scene.`);
    } else {
      questionIds.add(question.id);
    }

    const qRef = question.id ? ` (id="${question.id}")` : '';

    if (!_isNonEmptyString(question.questionText)) {
      errors.push(`${label}${qRef}: field "questionText" wajib string non-kosong.`);
    }
    if (!_isStringOrNull(question.questionAudio)) {
      errors.push(`${label}${qRef}: field "questionAudio" harus string atau null.`);
    }

    _validateChoiceObject(question.choiceLeft, `${label}${qRef}.choiceLeft`, errors);
    _validateChoiceObject(question.choiceRight, `${label}${qRef}.choiceRight`, errors);
    _validateTextAudioObject(question.feedbackCorrect, `${label}${qRef}.feedbackCorrect`, errors);
    _validateTextAudioObject(question.feedbackWrong, `${label}${qRef}.feedbackWrong`, errors);

    if (!VALID_CHOICE_SIDES.includes(question.correctAnswer)) {
      errors.push(
        `${label}${qRef}: field "correctAnswer" ("${question.correctAnswer}") harus salah satu dari ${VALID_CHOICE_SIDES.join('/')} — TIDAK boleh mewarisi label A/B atau 1/2 dari naskah asli (lihat Data-Driven Design).`
      );
    }
  });
}

function _validateChoiceObject(choice, label, errors) {
  _validateTextAudioObject(choice, label, errors);
}

function _validateTextAudioObject(obj, label, errors) {
  if (!obj || typeof obj !== 'object') {
    errors.push(`${label}: bukan object valid (harus { text, audio }).`);
    return;
  }
  if (!_isNonEmptyString(obj.text)) {
    errors.push(`${label}: field "text" wajib string non-kosong.`);
  }
  if (!_isStringOrNull(obj.audio)) {
    errors.push(`${label}: field "audio" harus string atau null.`);
  }
}

function _isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function _isStringOrNull(value) {
  return value === null || typeof value === 'string';
}
