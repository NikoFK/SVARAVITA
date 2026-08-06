/**
 * AudioManager.js
 * ---------------------------------------------------------------------------
 * Satu-satunya pemilik "apa yang sedang berbunyi sekarang". Dipanggil
 * LANGSUNG oleh layer di atasnya (bukan lewat event, sesuai Blueprint —
 * ini pengecualian yang disengaja karena AudioManager adalah layanan
 * sinkron sederhana). Memisahkan channel voice (sekali putar, satu aktif)
 * dari bgm (loop) dan sfx (sekali putar, boleh singkat tumpang tindih).
 *
 * [PROVISIONAL IMPLEMENTATION] Silent fallback: jika file audio gagal
 * dimuat (placeholder kosong/belum ada), `audio:playbackFailed` tetap
 * dipancarkan TAPI DialogueManager/QuizManager dirancang untuk tetap maju
 * (lihat komentar di DialogueManager) — sesuai requirement "AudioManager
 * tetap harus bekerja" walau asetnya placeholder.
 */

import { EVENTS, AUDIO_CHANNEL } from '../constants/index.js';
import { Logger } from '../utils/Logger.js';

export class AudioManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    if (!eventBus) throw new TypeError('AudioManager membutuhkan instance EventBus.');
    this._eventBus = eventBus;

    /** @type {Record<string, HTMLAudioElement|null>} */
    this._elements = { voice: null, bgm: null, sfx: null };
  }

  /**
   * Memutar audio voice (Line/soal/feedback). Menghentikan voice sebelumnya
   * jika masih berjalan (aturan "hanya satu audio aktif").
   * @param {string} path
   * @param {string} trackId
   */
  playVoice(path, trackId) {
    this._play(AUDIO_CHANNEL.VOICE, path, trackId, false);
  }

  /**
   * @param {string} path
   * @param {string} trackId
   */
  playSfx(path, trackId) {
    this._play(AUDIO_CHANNEL.SFX, path, trackId, false);
  }

  /**
   * @param {string} path
   * @param {string} trackId
   */
  playBgm(path, trackId) {
    this._play(AUDIO_CHANNEL.BGM, path, trackId, true);
  }

  stopVoice() {
    this._stop(AUDIO_CHANNEL.VOICE);
  }

  stopBgm() {
    this._stop(AUDIO_CHANNEL.BGM);
  }

  stopAll() {
    this._stop(AUDIO_CHANNEL.VOICE);
    this._stop(AUDIO_CHANNEL.BGM);
    this._stop(AUDIO_CHANNEL.SFX);
  }

  /** @private */
  _stop(channel) {
    const el = this._elements[channel];
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }

  /** @private */
  _play(channel, path, trackId, loop) {
    this._stop(channel);

    if (typeof Audio === 'undefined') {
      // Lingkungan tanpa DOM audio (mis. SSR/test) — silent fallback langsung.
      Logger.warn('AudioManager', `Audio API tidak tersedia di lingkungan ini — "${trackId}" dilewati (silent fallback).`);
      this._eventBus.emit(EVENTS.AUDIO.PLAYBACK_COMPLETE, { trackId, channel });
      return;
    }

    const audio = new Audio(path);
    audio.loop = loop;
    this._elements[channel] = audio;

    audio.addEventListener('ended', () => {
      this._eventBus.emit(EVENTS.AUDIO.PLAYBACK_COMPLETE, { trackId, channel });
    });

    audio.addEventListener('error', () => {
      Logger.warn('AudioManager', `Gagal memuat/memutar "${path}" (trackId: "${trackId}").`);
      this._eventBus.emit(EVENTS.AUDIO.PLAYBACK_FAILED, { trackId, channel });
    });

    const playResult = audio.play();

    if (playResult && typeof playResult.then === 'function') {
      playResult
        .then(() => {
          this._eventBus.emit(EVENTS.AUDIO.PLAYBACK_STARTED, { trackId, channel });
        })
        .catch(() => {
          // Kebijakan autoplay browser mobile mungkin memblokir play() sebelum
          // gesture pertama — dilaporkan sebagai failed, bukan crash.
          Logger.warn('AudioManager', `play() ditolak browser untuk "${trackId}" (kemungkinan autoplay policy).`);
          this._eventBus.emit(EVENTS.AUDIO.PLAYBACK_FAILED, { trackId, channel });
        });
    } else {
      // play() tidak mengembalikan Promise (browser sangat lama, atau
      // lingkungan test seperti jsdom yang play()-nya "not implemented" dan
      // mengembalikan undefined). Jangan crash — anggap optimis berhasil dan
      // andalkan event native 'ended'/'error' untuk kelanjutannya.
      this._eventBus.emit(EVENTS.AUDIO.PLAYBACK_STARTED, { trackId, channel });
    }
  }
}
