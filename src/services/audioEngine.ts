/**
 * 晴愈 (QingYu) - 严肃向心理疗愈程序音频引擎
 * 纯 Web Audio API 程序化合成，无外部音频文件依赖，避免 404 并支持实时平滑过渡
 */

import { WeatherType } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.7;
  private tempoMultiplier: number = 1.0;
  private currentWeather: WeatherType = 'sunny';
  private bgmIntervalId: number | null = null;
  private ambienceNode: AudioNode | null = null;

  // Bilateral Panner for EMDR
  private emdrPanner: StereoPannerNode | null = null;

  // Individual white noise gains
  private noiseNodes: Map<string, { gainNode: GainNode; source: AudioNode }> = new Map();

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.ambienceGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public init() {
    this.ensureContext();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setTempoMultiplier(multiplier: number) {
    this.tempoMultiplier = Math.max(0.5, Math.min(2.0, multiplier));
    // Restart BGM loop with updated tempo if running
    if (this.bgmIntervalId !== null) {
      this.startWeatherBgm(this.currentWeather);
    }
  }

  public getTempoMultiplier(): number {
    return this.tempoMultiplier;
  }

  /**
   * 切换天气时平滑过渡音乐风格与环境音
   */
  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;
    this.ensureContext();
    this.startWeatherBgm(weather);
    this.updateWeatherAmbience(weather);
  }

  public startWeatherBgm(weather: WeatherType) {
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }

    const ctx = this.ensureContext();

    // Notes mapping (Pentatonic & Modulations for therapeutic calm)
    const sunnyChords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 392.0],  // G
    ];

    const rainbowChords = [
      [329.63, 392.0, 493.88, 587.33], // Em7
      [174.61, 220.0, 261.63, 392.0],  // Fadd9
      [261.63, 329.63, 392.0, 523.25], // C/E
      [293.66, 369.99, 440.0, 587.33], // Dadd9
    ];

    const tornadoChords = [
      [146.83, 174.61, 220.0, 277.18], // Dm/C#
      [138.59, 164.81, 207.65, 261.63],
      [130.81, 155.56, 196.0, 246.94],
    ];

    const rainyChords = [
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 207.65, 261.63, 311.13], // Fm7
      [196.0, 233.08, 293.66, 349.23], // Gm7
      [164.81, 196.0, 246.94, 293.66], // Em7
    ];

    const thunderChords = [
      [110.0, 130.81, 155.56, 220.0],  // A dim
      [98.0, 116.54, 138.59, 196.0],   // G dim
      [123.47, 146.83, 174.61, 246.94],// B dim
    ];

    let chordProgression = sunnyChords;
    let baseStepMs = 2800;
    let waveType: OscillatorType = 'sine';

    if (weather === 'rainbow') {
      chordProgression = rainbowChords;
      baseStepMs = 2400;
      waveType = 'triangle';
    } else if (weather === 'tornado') {
      chordProgression = tornadoChords;
      baseStepMs = 1800;
      waveType = 'sawtooth';
    } else if (weather === 'rainy') {
      chordProgression = rainyChords;
      baseStepMs = 3200;
      waveType = 'sine';
    } else if (weather === 'thunder') {
      chordProgression = thunderChords;
      baseStepMs = 2200;
      waveType = 'triangle';
    }

    let chordIndex = 0;
    const playNextChord = () => {
      if (!this.ctx || !this.bgmGain) return;
      const notes = chordProgression[chordIndex % chordProgression.length];
      chordIndex++;

      const now = this.ctx.currentTime;
      const duration = (baseStepMs / 1000) * 1.5;

      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        // Low-pass filter for soft warm tone
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(weather === 'tornado' ? 1200 : 750, now);
        filter.Q.setValueAtTime(2, now);

        const noteVol = (weather === 'tornado' || weather === 'thunder') ? 0.08 : 0.14;
        noteGain.gain.setValueAtTime(0, now + i * 0.12);
        noteGain.gain.linearRampToValueAtTime(noteVol, now + i * 0.12 + 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + duration);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.bgmGain!);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + duration + 0.2);
      });
    };

    // Play first immediately
    playNextChord();
    const intervalMs = Math.round(baseStepMs / this.tempoMultiplier);
    this.bgmIntervalId = window.setInterval(playNextChord, intervalMs);
  }

  private updateWeatherAmbience(weather: WeatherType) {
    if (!this.ctx || !this.ambienceGain) return;

    // Disconnect old ambience if any
    if (this.ambienceNode) {
      try {
        (this.ambienceNode as AudioScheduledSourceNode).stop?.();
        this.ambienceNode.disconnect();
      } catch {
        // ignore
      }
      this.ambienceNode = null;
    }

    if (weather === 'rainy' || weather === 'thunder') {
      // Pink/Brown noise rain generator
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.15;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(weather === 'thunder' ? 800 : 1200, this.ctx.currentTime);

      const rainGain = this.ctx.createGain();
      rainGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      noiseSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(this.ambienceGain);

      noiseSource.start();
      this.ambienceNode = noiseSource;
    } else if (weather === 'sunny' || weather === 'rainbow') {
      // Gentle warm drone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130.81, this.ctx.currentTime); // C3 warm drone
      oscGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(this.ambienceGain);
      osc.start();
      this.ambienceNode = osc;
    }
  }

  /**
   * SFX: 空灵鼓 / 钢舌鼓音符 (用于 "空灵音律")
   */
  public playEtherealNote(freqIndex: number = 0) {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    // Pentatonic scale frequencies (C4, D4, E4, G4, A4, C5, D5, E5, G5)
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    const freq = scale[Math.abs(freqIndex) % scale.length];

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscHarmonic = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Harmonic for resonant metallic bowl/kalimba tone
    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(freq * 2.76, now); // Metallic partial

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(4, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(filter);
    oscHarmonic.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + 2.3);
    oscHarmonic.stop(now + 2.3);
  }

  /**
   * SFX: 种子发芽与花朵绽放 (用于 "指尖生花")
   */
  public playPlantSeedSound() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playBloomSound() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const now = ctx.currentTime;
    // Ascending sparkle arpeggio
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 1.3);
    });
  }

  public playWaterDropSound() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.12);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playFruitPopSound() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playLightningCrackSound() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  public playWindGustSound() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(750, ctx.currentTime + 0.3);
    filter.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }


  /**
   * SFX: 呼吸指引音效 (吸气升调，屏息恒定，呼气降调)
   */
  public playBreathCue(type: 'inhale' | 'hold' | 'exhale', durationSeconds: number) {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    if (type === 'inhale') {
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + durationSeconds);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + durationSeconds);
    } else if (type === 'hold') {
      osc.frequency.setValueAtTime(340, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.12, now + durationSeconds);
    } else {
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + durationSeconds);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + durationSeconds);
  }

  /**
   * EMDR 双侧声效 (伴随视线追踪，左耳右耳交替柔和轻响)
   */
  public playEmdrPulse(panPosition: number) { // panPosition: -1 (left) to 1 (right)
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let panner: StereoPannerNode;
    try {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panPosition)), now);
    } catch {
      // Fallback if StereoPanner is not supported
      this.playEtherealNote(0);
      return;
    }

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4 soft chime

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  /**
   * 白噪音独立声轨发生器 (雨声、海浪、风声、颂钵、篝火)
   */
  public setTrackVolume(trackId: string, volume: number) {
    const ctx = this.ensureContext();
    let track = this.noiseNodes.get(trackId);

    if (volume <= 0.01) {
      if (track) {
        try {
          (track.source as AudioScheduledSourceNode).stop?.();
          track.gainNode.disconnect();
        } catch {
          // ignore
        }
        this.noiseNodes.delete(trackId);
      }
      return;
    }

    if (!track) {
      // Create new track
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.connect(this.ambienceGain!);

      let sourceNode: AudioNode;

      if (trackId === 'rain' || trackId === 'ocean' || trackId === 'wind' || trackId === 'fire') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.2;
        }
        const bufferSrc = ctx.createBufferSource();
        bufferSrc.buffer = buffer;
        bufferSrc.loop = true;

        const filter = ctx.createBiquadFilter();
        if (trackId === 'rain') {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1000, ctx.currentTime);
        } else if (trackId === 'ocean') {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, ctx.currentTime);
        } else if (trackId === 'wind') {
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(350, ctx.currentTime);
          filter.Q.setValueAtTime(3, ctx.currentTime);
        } else if (trackId === 'fire') {
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(800, ctx.currentTime);
        }

        bufferSrc.connect(filter);
        filter.connect(gainNode);
        bufferSrc.start();
        sourceNode = bufferSrc;
      } else {
        // Singing bowl harmonic drone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(216, ctx.currentTime); // 432Hz half harmonic
        osc.connect(gainNode);
        osc.start();
        sourceNode = osc;
      }

      this.noiseNodes.set(trackId, { gainNode, source: sourceNode });
    } else {
      track.gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    }
  }

  public stopAllTracks() {
    this.noiseNodes.forEach(track => {
      try {
        (track.source as AudioScheduledSourceNode).stop?.();
        track.gainNode.disconnect();
      } catch {
        // ignore
      }
    });
    this.noiseNodes.clear();
  }

  /**
   * SFX: 社交互动 - 互送暖心礼物声音
   */
  public playGiftSentSound() {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }
}

export const audioEngine = new AudioEngine();
