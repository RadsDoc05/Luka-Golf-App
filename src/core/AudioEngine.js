/**
 * AudioEngine.js
 * Hybrid 3-Tier Audio & Procedural Sound Effects Engine for Luka's 18-Hole Golf Adventure.
 *
 * Includes strict concurrency tokens (`this.speechToken`), `waitForCurrentSpeech()` synchronization,
 * and sequential speech queuing (`speakSequence`) so voice clips NEVER overlap or cut each other off.
 */

const VOICE_CACHE_NAME = 'luka-golf-voice-cache-v4';

export class AudioEngine {
  constructor(storage) {
    this.storage = storage;
    this.ctx = null;
    this.preferredVoice = null;
    this.knownMissingLocalClips = new Set();
    this.activeAudio = null;
    this.speechToken = 0;
    this.currentSpeechPromise = Promise.resolve(true);
    this.assetPrefix = this._detectAssetPrefix();

    this._purgeOldVoiceCaches();
    this._initSpeechVoices();
  }

  _detectAssetPrefix() {
    const path = window.location.pathname || '';
    return path.includes('/src/') ? '../assets' : './assets';
  }

  async _purgeOldVoiceCaches() {
    if (!('caches' in window)) return;
    try {
      const keys = await window.caches.keys();
      for (const k of keys) {
        if (k.startsWith('luka-golf-voice-cache') && k !== VOICE_CACHE_NAME) {
          await window.caches.delete(k);
        }
      }
    } catch {}
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _initSpeechVoices() {
    if (!('speechSynthesis' in window)) return;

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || !voices.length) return;

      const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      const priorityKeywords = [
        'natural',
        'online',
        'neural',
        'aria',
        'ana',
        'jenny',
        'andrew',
        'emma',
        'ava',
        'google us english',
        'google',
        'samantha'
      ];

      for (const keyword of priorityKeywords) {
        const match = englishVoices.find(v => v.name.toLowerCase().includes(keyword));
        if (match) {
          this.preferredVoice = match;
          return;
        }
      }

      const nonDavid = englishVoices.find(v => !v.name.toLowerCase().includes('david'));
      this.preferredVoice = nonDavid || englishVoices[0] || voices[0];
    };

    selectVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectVoice;
    }
  }

  /**
   * Immediately cancels any active or pending speech when explicitly requested (e.g. opening menu).
   */
  stopSpeech() {
    this.speechToken += 1;
    if (this.activeAudio) {
      try {
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentSpeechPromise = Promise.resolve(true);
    return this.speechToken;
  }

  /**
   * Waits for any currently playing speech (such as a button press readout) to finish naturally
   * without cutting it off!
   */
  async waitForCurrentSpeech(extraPauseMs = 150) {
    try {
      await this.currentSpeechPromise;
    } catch {}
    if (extraPauseMs > 0) {
      await new Promise(r => setTimeout(r, extraPauseMs));
    }
  }

  /**
   * Speaks a single phrase and stores the promise so subsequent actions can wait for it to finish.
   */
  speak(text, clipKey = null) {
    const token = this.stopSpeech();
    const p = this._speakInternal(text, clipKey, token);
    this.currentSpeechPromise = p;
    return p;
  }

  /**
   * Speaks instantly using browser SpeechSynthesis with ZERO network delay (perfect for talking calculators!).
   */
  speakInstant(text) {
    const settings = this.storage ? this.storage.getSettings() : { voiceEnabled: true };
    if (!settings.voiceEnabled || !text) return Promise.resolve(false);
    const token = this.stopSpeech();
    const p = this._speakWithSynthesizer(text, token);
    this.currentSpeechPromise = p;
    return p;
  }

  /**
   * Speaks a phrase AFTER waiting for any active speech to finish first (never interrupts!).
   */
  async speakAfterCurrent(text, clipKey = null, pauseBeforeMs = 180) {
    await this.waitForCurrentSpeech(pauseBeforeMs);
    return this.speak(text, clipKey);
  }

  /**
   * Speaks an array of `{ text, key, pauseMs }` items one after another without overlapping.
   * Waits for any currently playing button-press speech to finish first if `waitForActive` is true.
   */
  async speakSequence(items, waitForActive = true) {
    if (waitForActive) {
      await this.waitForCurrentSpeech(180);
    }
    const token = this.stopSpeech();
    const seqPromise = (async () => {
      for (const item of items) {
        if (this.speechToken !== token) return;
        if (!item || !item.text) continue;
        await this._speakInternal(item.text, item.key || null, token);
        if (this.speechToken !== token) return;
        if (item.pauseMs) {
          await new Promise(r => setTimeout(r, item.pauseMs));
        }
      }
    })();
    this.currentSpeechPromise = seqPromise;
    return seqPromise;
  }

  async _speakInternal(text, clipKey, token) {
    const settings = this.storage ? this.storage.getSettings() : { voiceEnabled: true };
    if (!settings.voiceEnabled || !text || this.speechToken !== token) return false;

    // Never play static files for dynamic calculator speech or instant synthesis
    if (clipKey && clipKey.startsWith('calc_')) {
      return await this._speakWithSynthesizer(text, token);
    }

    // Always derive a unique key from the exact spoken text if clipKey is generic
    const resolvedKey = clipKey || this._slugify(text);
    const localUrl = `${this.assetPrefix}/audio/voice/${resolvedKey}.mp3`;

    // LEVEL 1: Try Local Pre-Rendered Neural MP3 File in `assets/audio/voice/`
    if (!this.knownMissingLocalClips.has(resolvedKey)) {
      const playedLocal = await this._tryPlayLocalFile(localUrl, resolvedKey, token);
      if (playedLocal || this.speechToken !== token) return playedLocal;
    }

    // LEVEL 2: Check / Populate Wi-Fi CacheStorage & Dynamic `/api/tts` Endpoint
    if (settings.wifiCacheEnabled && this.speechToken === token) {
      const playedFromCache = await this._tryPlayOrPopulateWifiCache(localUrl, resolvedKey, text, token);
      if (playedFromCache || this.speechToken !== token) return playedFromCache;
    }

    // LEVEL 3: Offline SpeechSynthesis Fallback
    if (this.speechToken === token) {
      return await this._speakWithSynthesizer(text, token);
    }
    return false;
  }

  async _tryPlayLocalFile(url, key, token) {
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      if (this.speechToken !== token) return false;
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && (contentType.includes('audio') || contentType.includes('octet-stream'))) {
        return await this._playAudioUrlWaitEnd(url, token);
      }
      this.knownMissingLocalClips.add(key);
      return false;
    } catch {
      this.knownMissingLocalClips.add(key);
      return false;
    }
  }

  async _tryPlayOrPopulateWifiCache(localUrl, key, text, token) {
    try {
      if ('caches' in window) {
        const cache = await window.caches.open(VOICE_CACHE_NAME);
        const cachedResp = await cache.match(localUrl);
        if (this.speechToken !== token) return false;
        if (cachedResp) {
          const blob = await cachedResp.blob();
          if (this.speechToken !== token) return false;
          const blobUrl = URL.createObjectURL(blob);
          return await this._playAudioUrlWaitEnd(blobUrl, token, () => URL.revokeObjectURL(blobUrl));
        }
      }

      if (navigator.onLine && this.speechToken === token) {
        const ttsApiUrl = `/api/tts?key=${encodeURIComponent(key)}&text=${encodeURIComponent(text)}`;
        const netResp = await fetch(ttsApiUrl);
        if (this.speechToken !== token) return false;
        const contentType = netResp.headers.get('content-type') || '';
        if (netResp.ok && contentType.includes('audio')) {
          this.knownMissingLocalClips.delete(key);
          if ('caches' in window) {
            const cache = await window.caches.open(VOICE_CACHE_NAME);
            await cache.put(localUrl, netResp.clone());
          }
          const blob = await netResp.blob();
          if (this.speechToken !== token) return false;
          const blobUrl = URL.createObjectURL(blob);
          return await this._playAudioUrlWaitEnd(blobUrl, token, () => URL.revokeObjectURL(blobUrl));
        }
      }
    } catch {
      // Fall through cleanly to Level 3 offline synthesizer
    }
    return false;
  }

  _playAudioUrlWaitEnd(url, token, onCleanup) {
    return new Promise(resolve => {
      if (this.speechToken !== token) {
        if (onCleanup) onCleanup();
        resolve(false);
        return;
      }

      const audio = new Audio(url);
      audio.playbackRate = 1.14;
      this.activeAudio = audio;
      let settled = false;

      const finish = ok => {
        if (settled) return;
        settled = true;
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
        if (onCleanup) onCleanup();
        resolve(ok);
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    });
  }

  _speakWithSynthesizer(text, token) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || this.speechToken !== token) {
        resolve(false);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.04;
        utterance.rate = 1.08;
        utterance.volume = 1.0;
        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis error:', err);
        resolve(false);
      }
    });
  }

  /**
   * Procedural Web Audio SFX synthesizer — 100% offline, zero external files required.
   */
  playSfx(type) {
    const settings = this.storage ? this.storage.getSettings() : { sfxEnabled: true };
    if (!settings.sfxEnabled) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (type) {
      case 'tap':
      case 'pop':
        this._synthTone(ctx, 520, 780, 0.09, 'sine', 0.25);
        break;

      case 'count_step':
        this._synthTone(ctx, 440, 660, 0.12, 'triangle', 0.3);
        break;

      case 'subtract_step':
        this._synthTone(ctx, 620, 340, 0.14, 'triangle', 0.3);
        break;

      case 'coin':
        this._synthTone(ctx, 987.77, 1318.51, 0.18, 'sine', 0.32, now);
        break;

      case 'turbo':
        this._synthArpeggio(ctx, [440, 554.37, 659.25, 880, 1108.73], 0.055, 'sawtooth', 0.24);
        break;

      case 'merge':
        this._synthArpeggio(ctx, [392, 523.25, 659.25, 783.99], 0.07, 'triangle', 0.28);
        break;

      case 'swing':
        this._synthNoiseFilter(ctx, 0.22, 300, 1400, 0.32, now);
        this._synthTone(ctx, 1600, 320, 0.06, 'triangle', 0.45, now + 0.16);
        break;

      case 'putt':
        this._synthTone(ctx, 900, 380, 0.05, 'sine', 0.35, now);
        break;

      case 'cup':
        this._synthTone(ctx, 320, 180, 0.08, 'sine', 0.4, now);
        this._synthTone(ctx, 1180, 1420, 0.11, 'triangle', 0.35, now + 0.08);
        break;

      case 'boing':
        this._synthBoing(ctx, now);
        break;

      case 'splash':
        this._synthNoiseFilter(ctx, 0.55, 900, 180, 0.45, now);
        this._synthTone(ctx, 260, 580, 0.18, 'sine', 0.25, now + 0.05);
        break;

      case 'sizzle':
        this._synthNoiseFilter(ctx, 0.65, 2200, 3800, 0.38, now);
        this._synthTone(ctx, 190, 95, 0.25, 'sawtooth', 0.2, now);
        break;

      case 'dino':
      case 'dino_roar':
        this._synthTone(ctx, 780, 420, 0.18, 'sawtooth', 0.28, now);
        this._synthTone(ctx, 860, 390, 0.22, 'sawtooth', 0.28, now + 0.2);
        break;

      case 'hovercar':
        this._synthTone(ctx, 1950, 880, 0.12, 'square', 0.25, now);
        this._synthTone(ctx, 660, 660, 0.11, 'sawtooth', 0.25, now + 0.18);
        this._synthTone(ctx, 660, 660, 0.16, 'sawtooth', 0.25, now + 0.33);
        break;

      case 'bridge':
        this._synthTone(ctx, 220, 140, 0.12, 'square', 0.3, now);
        this._synthBoing(ctx, now + 0.1);
        break;

      case 'cheer':
        this._synthArpeggio(ctx, [523.25, 659.25, 783.99, 1046.5], 0.11, 'triangle', 0.32);
        this._synthNoiseFilter(ctx, 0.65, 600, 1600, 0.18, now + 0.1);
        break;

      case 'firework_burst':
        this._synthTone(ctx, 280, 980, 0.18, 'sine', 0.25, now);
        this._synthNoiseFilter(ctx, 0.45, 1800, 420, 0.38, now + 0.14);
        break;

      case 'volcano_eruption':
        // Deep volcano rumble + triumphant fanfare + firework crackles
        this._synthNoiseFilter(ctx, 1.3, 180, 90, 0.5, now);
        this._synthArpeggio(ctx, [523.25, 659.25, 783.99, 1046.5, 1318.5], 0.12, 'triangle', 0.35);
        this._synthNoiseFilter(ctx, 0.5, 2200, 500, 0.4, now + 0.4);
        this._synthNoiseFilter(ctx, 0.5, 2400, 600, 0.4, now + 0.85);
        break;

      case 'siren':
        this._synthTone(ctx, 440, 880, 0.35, 'sawtooth', 0.25, now);
        this._synthTone(ctx, 880, 440, 0.35, 'sawtooth', 0.25, now + 0.35);
        this._synthTone(ctx, 440, 1046.5, 0.4, 'sawtooth', 0.28, now + 0.7);
        this._synthNoiseFilter(ctx, 0.4, 1200, 400, 0.35, now + 0.25);
        break;

      case 'mega_drive':
        // Thunderous sonic crack + hyper-speed rocket booster rising whoosh!
        this._synthNoiseFilter(ctx, 0.65, 140, 60, 0.65, now);
        this._synthTone(ctx, 120, 45, 0.45, 'sawtooth', 0.45, now);
        this._synthTone(ctx, 380, 1850, 0.85, 'sine', 0.4, now + 0.1);
        this._synthArpeggio(ctx, [523.25, 783.99, 1046.5, 1318.5, 1567.98, 2093], 0.07, 'triangle', 0.32);
        break;

      case 'dbz_charge':
        // Dragon Ball Z Super Saiyan rising energy aura charging hum with electric crackles!
        this._synthTone(ctx, 110, 440, 0.9, 'sawtooth', 0.35, now);
        this._synthTone(ctx, 220, 880, 0.9, 'triangle', 0.3, now);
        this._synthNoiseFilter(ctx, 0.8, 600, 2400, 0.28, now + 0.1);
        this._synthTone(ctx, 1760, 3520, 0.08, 'square', 0.15, now + 0.35);
        this._synthTone(ctx, 1980, 3960, 0.08, 'square', 0.15, now + 0.55);
        break;

      case 'dbz_boom':
        // Massive Dragon Ball Z Kamehameha impact explosion!
        this._synthNoiseFilter(ctx, 1.1, 120, 40, 0.7, now);
        this._synthTone(ctx, 95, 30, 0.65, 'sawtooth', 0.55, now);
        this._synthNoiseFilter(ctx, 0.7, 3200, 400, 0.45, now + 0.05);
        this._synthArpeggio(ctx, [659.25, 880, 1318.5, 1760, 2637], 0.06, 'sawtooth', 0.35);
        break;

      case 'calc_beep':
        // Friendly calculator digital key click
        this._synthTone(ctx, 980, 1180, 0.045, 'sine', 0.25, now);
        break;

      case 'calc_equals':
        // Triumphant calculator answer chime
        this._synthArpeggio(ctx, [523.25, 659.25, 783.99, 1046.5], 0.08, 'triangle', 0.35);
        break;

      case 'car_vroom':
        // Racing car zooming by with Doppler pitch drop
        this._synthNoiseFilter(ctx, 0.7, 800, 250, 0.35, now);
        this._synthTone(ctx, 420, 180, 0.6, 'sawtooth', 0.3, now);
        break;

      case 'target_smash':
        // High-energy arcade smash + metallic reward chime
        this._synthNoiseFilter(ctx, 0.35, 1800, 320, 0.5, now);
        this._synthTone(ctx, 880, 1760, 0.15, 'square', 0.3, now);
        this._synthTone(ctx, 1318.5, 2637, 0.22, 'sine', 0.35, now + 0.08);
        break;

      case 'slide_whistle':
        // Comedic cartoon falling slide whistle (whoop-whoop-doink!)
        this._synthTone(ctx, 580, 1200, 0.14, 'sine', 0.3, now);
        this._synthTone(ctx, 1200, 210, 0.48, 'sine', 0.35, now + 0.14);
        this._synthTone(ctx, 190, 80, 0.12, 'triangle', 0.35, now + 0.62);
        break;

      case 'splat':
        // Wet cartoon mud / sand squelch
        this._synthNoiseFilter(ctx, 0.35, 500, 110, 0.52, now);
        this._synthTone(ctx, 160, 55, 0.24, 'triangle', 0.4, now + 0.04);
        break;

      case 'clown_horn':
        // Comedic double honk-honk!
        this._synthTone(ctx, 430, 430, 0.11, 'sawtooth', 0.3, now);
        this._synthTone(ctx, 430, 430, 0.16, 'sawtooth', 0.32, now + 0.15);
        break;

      case 'spring_twang':
        // Bouncy cartoon metal spring twang
        this._synthTone(ctx, 160, 840, 0.2, 'sawtooth', 0.32, now);
        this._synthBoing(ctx, now + 0.05);
        break;

      case 'squeak':
        // Funny high-pitched animal squeak
        this._synthTone(ctx, 1400, 2400, 0.08, 'sine', 0.26, now);
        this._synthTone(ctx, 2400, 1500, 0.1, 'sine', 0.26, now + 0.08);
        break;

      default:
        this._synthTone(ctx, 440, 660, 0.1, 'sine', 0.2);
    }
  }

  _synthTone(ctx, startFreq, endFreq, duration, waveType = 'sine', gainVal = 0.3, startTime = ctx.currentTime) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  _synthArpeggio(ctx, freqs, noteDuration, waveType = 'triangle', gainVal = 0.28) {
    const now = ctx.currentTime;
    freqs.forEach((f, idx) => {
      this._synthTone(ctx, f, f * 1.01, noteDuration * 1.6, waveType, gainVal, now + idx * noteDuration);
    });
  }

  _synthBoing(ctx, startTime) {
    const duration = 0.48;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const mainGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, startTime);
    osc.frequency.exponentialRampToValueAtTime(540, startTime + duration * 0.5);
    osc.frequency.exponentialRampToValueAtTime(240, startTime + duration);

    lfo.frequency.setValueAtTime(22, startTime);
    lfoGain.gain.setValueAtTime(85, startTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    mainGain.gain.setValueAtTime(0.38, startTime);
    mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(mainGain);
    mainGain.connect(ctx.destination);

    osc.start(startTime);
    lfo.start(startTime);
    osc.stop(startTime + duration);
    lfo.stop(startTime + duration);
  }

  _synthNoiseFilter(ctx, duration, startCutoff, endCutoff, gainVal, startTime) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startCutoff, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, endCutoff), startTime + duration);
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  _slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);
  }
}
