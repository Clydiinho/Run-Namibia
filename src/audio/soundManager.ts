import { AnimalType } from '../types/game';
import { RUN_CONFIG } from '../game/config';

/**
 * Run Namibia Sound Manager
 * Handles both audio file loading from /sounds/ (*.mp3) and 100% self-contained
 * Web Audio API procedural synthesis fallbacks if audio files are missing or loading.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicActive: boolean = false;
  private musicInterval: number | null = null;
  private musicStep: number = 0;

  // Preloaded audio buffers from /sounds/
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private audioLoading: Set<string> = new Set();

  // Timestamp tracking to avoid same animal sound overlapping itself
  private lastAnimalPlayTime: Map<string, number> = new Map();

  // Audio file definitions
  private soundFiles: Record<string, string> = {
    lion: '/sounds/lion.mp3',
    rhino: '/sounds/rhino.mp3',
    elephant: '/sounds/elephant.mp3',
    zebra: '/sounds/zebra.mp3',
    springbok: '/sounds/springbok.mp3',
    ostrich: '/sounds/ostrich.mp3',
    crash: '/sounds/crash.mp3',
    coin: '/sounds/coin.mp3',
    gold: '/sounds/gold.mp3',
    diamond: '/sounds/diamond.mp3',
  };

  constructor() {
    const saved = localStorage.getItem('namibia_run_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  /**
   * Initializes or resumes AudioContext upon user interaction
   */
  public initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.preloadAllSounds();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Preload audio files asynchronously; silently falls back to procedural synthesizer on failure
   */
  private preloadAllSounds() {
    if (!this.ctx) return;
    Object.entries(this.soundFiles).forEach(([name, path]) => {
      this.loadSoundFile(name, path);
    });
  }

  private async loadSoundFile(name: string, url: string) {
    if (this.audioBuffers.has(name) || this.audioLoading.has(name) || !this.ctx) return;
    this.audioLoading.add(name);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Missing file is expected before user supplies MP3s; fallback synthesizers take over
        this.audioLoading.delete(name);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      if (!this.ctx) return;
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(name, audioBuffer);
    } catch {
      // Audio fallback used automatically
    } finally {
      this.audioLoading.delete(name);
    }
  }

  /**
   * Plays a preloaded audio buffer with gain, or returns false if fallback needed
   */
  private playBuffer(name: string, volumeScale: number = 1.0): boolean {
    if (this.isMuted || !this.ctx) return false;
    const buffer = this.audioBuffers.get(name);
    if (!buffer) return false;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = this.ctx.createGain();
      const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;
      gainNode.gain.setValueAtTime(masterVol * volumeScale, this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
      return true;
    } catch {
      return false;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('namibia_run_muted', String(this.isMuted));
    if (this.isMuted && this.musicActive) {
      this.stopMusic();
      this.musicActive = true;
    } else if (!this.isMuted && this.musicActive) {
      this.startMusic();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // ==========================================
  // ANIMAL SOUNDS (Files + Procedural Fallbacks)
  // ==========================================

  public playAnimalSound(type: AnimalType, isWarningCue: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Prevent identical animal sound overlapping itself within 0.8s
    const nowMs = performance.now();
    const lastPlayed = this.lastAnimalPlayTime.get(type) || 0;
    if (nowMs - lastPlayed < 850) {
      return;
    }
    this.lastAnimalPlayTime.set(type, nowMs);

    // Warning cue plays at half volume, entering road plays at full volume
    const volScale = isWarningCue ? 0.45 : 0.95;
    const soundKey = type.toLowerCase();

    // 1. Try playing external audio file from /sounds/
    if (this.playBuffer(soundKey, volScale)) {
      return;
    }

    // 2. Procedural Web Audio fallback
    const now = this.ctx.currentTime;
    const masterVol = RUN_CONFIG.audio.MASTER_VOLUME * volScale;

    try {
      switch (type) {
        case 'LION':
          // Low resonant predator roar (sawtooth + bandpass filter growl)
          this.synthLionRoar(now, masterVol);
          break;
        case 'RHINO':
          // Heavy snort / puff (burst noise + low rumble)
          this.synthRhinoSnort(now, masterVol);
          break;
        case 'ELEPHANT':
          // High-pitched brassy trumpet
          this.synthElephantTrumpet(now, masterVol);
          break;
        case 'ZEBRA':
          // Staccato whinny / bark
          this.synthZebraWhinny(now, masterVol);
          break;
        case 'SPRINGBOK':
          // Quick nasal bleat / grunt
          this.synthSpringbokBleat(now, masterVol);
          break;
        case 'OSTRICH':
          // Deep booming hollow resonance
          this.synthOstrichBoom(now, masterVol);
          break;
      }
    } catch {
      // Audio fallback silent
    }
  }

  // --- Procedural Animal Synthesizers ---

  private synthLionRoar(now: number, masterVol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.7);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28 * masterVol, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  private synthRhinoSnort(now: number, masterVol: number) {
    if (!this.ctx) return;
    // Low rumble + noise snort
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.25 * masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  }

  private synthElephantTrumpet(now: number, masterVol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(480, now + 0.2);
    osc.frequency.linearRampToValueAtTime(420, now + 0.5);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22 * masterVol, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  private synthZebraWhinny(now: number, masterVol: number) {
    if (!this.ctx) return;
    [0, 0.12, 0.24].forEach((delay, idx) => {
      if (!this.ctx) return;
      const t = now + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const freq = idx % 2 === 0 ? 380 : 490;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq - 60, t + 0.09);

      gain.gain.setValueAtTime(0.18 * masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  private synthSpringbokBleat(now: number, masterVol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(310, now + 0.08);
    osc.frequency.linearRampToValueAtTime(240, now + 0.2);

    gain.gain.setValueAtTime(0.2 * masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  private synthOstrichBoom(now: number, masterVol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);

    gain.gain.setValueAtTime(0.28 * masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // ==========================================
  // LOOT & IMPACT SOUNDS
  // ==========================================

  public playCoin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.playBuffer('coin', 0.8)) return;

    // Procedural double chime
    const now = this.ctx.currentTime;
    const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;
    [987.77, 1318.51].forEach((freq, i) => {
      if (!this.ctx) return;
      const noteTime = now + i * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18 * masterVol, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.14);
    });
  }

  public playGold() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.playBuffer('gold', 1.0)) return;

    // Radiant resonant golden shimmer chord (F#5, A#5, C#6)
    const now = this.ctx.currentTime;
    const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;
    const freqs = [739.99, 932.33, 1108.73, 1479.98];
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const noteTime = now + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.24 * masterVol, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.38);
    });
  }

  public playDiamond() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.playBuffer('diamond', 1.0)) return;

    // Brilliant crystalline arpeggio
    const now = this.ctx.currentTime;
    const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;
    const freqs = [554.37, 659.25, 830.61, 1108.73, 1318.51];
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const noteTime = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.22 * masterVol, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.32);
    });
  }

  public playHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.playBuffer('crash', 1.0)) return;

    // Powerful punch & bass drop
    const now = this.ctx.currentTime;
    const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.32);

    gain.gain.setValueAtTime(0.35 * masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.16);

      gain.gain.setValueAtTime(0.18 * RUN_CONFIG.audio.MASTER_VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio fallback
    }
  }

  public playSlide() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Sand slide swoosh sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.24);

      gain.gain.setValueAtTime(0.15 * RUN_CONFIG.audio.MASTER_VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }

  public playGameOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;
      const notes = [440, 392, 349.23, 293.66];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = now + idx * 0.18;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.18 * masterVol, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.005, noteTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    } catch {
      // Audio fallback
    }
  }

  public playMilestone() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;
      const fanfare = [523.25, 659.25, 783.99, 1046.5];
      fanfare.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.2 * masterVol, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.3);
      });
    } catch {
      // Audio fallback
    }
  }

  public startMusic() {
    this.musicActive = true;
    if (this.isMuted || this.musicInterval !== null) return;
    this.initCtx();
    if (!this.ctx) return;

    const kalimbaNotes = [220, 261.63, 329.63, 392.00, 440, 523.25];
    const rhythmPattern = [
      { note: 0, kick: true },
      { note: 2, kick: false },
      { note: 1, kick: false },
      { note: 3, kick: true },
      { note: 2, kick: false },
      { note: 4, kick: false },
      { note: 3, kick: true },
      { note: 5, kick: false },
    ];

    this.musicInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.musicActive) return;
      try {
        const now = this.ctx.currentTime;
        const masterVol = RUN_CONFIG.audio.MASTER_VOLUME;
        const step = rhythmPattern[this.musicStep % rhythmPattern.length];
        this.musicStep++;

        // Warm kick
        if (step.kick) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.frequency.setValueAtTime(110, now);
          kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
          kickGain.gain.setValueAtTime(0.12 * masterVol, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          kickOsc.connect(kickGain);
          kickGain.connect(this.ctx.destination);
          kickOsc.start(now);
          kickOsc.stop(now + 0.1);
        }

        // Kalimba tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(kalimbaNotes[step.note], now);
        gain.gain.setValueAtTime(0.045 * masterVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } catch {
        // Audio fallback
      }
    }, 180);
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sounds = new SoundManager();
