/**
 * AudioChannel.js
 * ---------------------------------------------------------------------------
 * Channel audio internal AudioManager: voice (narasi/dialog/soal, sekali
 * putar, satu aktif), bgm (loop, volume rendah), sfx (sekali putar, boleh
 * tumpang tindih singkat dengan voice untuk feedback benar/salah).
 */
export const AUDIO_CHANNEL = Object.freeze({
  VOICE: 'voice',
  BGM: 'bgm',
  SFX: 'sfx',
});
