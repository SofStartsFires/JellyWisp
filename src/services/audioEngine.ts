import { DspSettings, PerformanceMetrics, Track } from '../types/index.ts';
import { dbToGain, calculateBufferHealth, EQ_FREQUENCIES } from '../utils/audioMath.ts';

export const DEFAULT_DSP_SETTINGS: DspSettings = {
  enabled: true,
  preampDb: 0,
  eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bassBoostDb: 2.0,
  stereoWidth: 1.15,
  crossfadeSeconds: 2.0,
  replayGainMode: 'track',
  pitchSpeed: 1.0,
};

const STORAGE_KEY_DSP = 'finamp_dsp_settings';

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private preampGainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostFilter: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private masterGainNode: GainNode | null = null;
  private splitterNode: ChannelSplitterNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private delayNodeL: DelayNode | null = null;
  private delayNodeR: DelayNode | null = null;

  private dspSettings: DspSettings;
  private currentTrack: Track | null = null;
  private isMuted = false;
  private volume = 0.85;
  private underrunCount = 0;
  private isCrossfading = false;

  private metricsInterval: any = null;
  private onMetricsCallback?: (metrics: PerformanceMetrics) => void;
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onTrackEndedCallback?: () => void;
  private onPlayStateChangeCallback?: (isPlaying: boolean) => void;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    const savedDsp = localStorage.getItem(STORAGE_KEY_DSP);
    if (savedDsp) {
      try {
        this.dspSettings = JSON.parse(savedDsp);
      } catch {
        this.dspSettings = { ...DEFAULT_DSP_SETTINGS };
      }
    } else {
      this.dspSettings = { ...DEFAULT_DSP_SETTINGS };
    }

    this.bindAudioEvents();
  }

  private initAudioContext() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
    this.preampGainNode = this.audioCtx.createGain();

    // Create 10 EQ Biquad filters
    this.eqFilters = EQ_FREQUENCIES.map((freq) => {
      const filter = this.audioCtx!.createBiquadFilter();
      filter.type = freq <= 64 ? 'lowshelf' : freq >= 8000 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });

    // Bass boost filter at 80Hz
    this.bassBoostFilter = this.audioCtx.createBiquadFilter();
    this.bassBoostFilter.type = 'lowshelf';
    this.bassBoostFilter.frequency.value = 80;
    this.bassBoostFilter.gain.value = this.dspSettings.bassBoostDb;

    // Stereo widening setup
    this.splitterNode = this.audioCtx.createChannelSplitter(2);
    this.mergerNode = this.audioCtx.createChannelMerger(2);
    this.delayNodeL = this.audioCtx.createDelay();
    this.delayNodeR = this.audioCtx.createDelay();
    this.delayNodeL.delayTime.value = 0.0005; // 0.5ms Haas micro-delay for realistic stereo width
    this.delayNodeR.delayTime.value = 0.001;

    // Analyser node for FFT and waveform visualizers
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.minDecibels = -90;
    this.analyserNode.maxDecibels = -10;
    this.analyserNode.smoothingTimeConstant = 0.82;

    this.masterGainNode = this.audioCtx.createGain();
    this.masterGainNode.gain.value = this.volume;

    // Connect node chain:
    // source -> preamp -> EQ filters -> bass boost -> stereo matrix -> analyser -> masterGain -> destination
    let current: AudioNode = this.sourceNode;
    current.connect(this.preampGainNode);
    current = this.preampGainNode;

    // Chain EQ filters
    for (const filter of this.eqFilters) {
      current.connect(filter);
      current = filter;
    }

    current.connect(this.bassBoostFilter);
    current = this.bassBoostFilter;

    // Stereo widening routing
    current.connect(this.splitterNode);
    this.splitterNode.connect(this.delayNodeL, 0);
    this.splitterNode.connect(this.delayNodeR, 1);
    this.delayNodeL.connect(this.mergerNode, 0, 0);
    this.delayNodeR.connect(this.mergerNode, 0, 1);

    this.mergerNode.connect(this.analyserNode);
    this.analyserNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.audioCtx.destination);

    this.applyDspSettings();
    this.startMetricsMonitor();
  }

  private bindAudioEvents() {
    this.audioElement.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audioElement.currentTime, this.audioElement.duration || 0);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      if (this.onTrackEndedCallback) {
        this.onTrackEndedCallback();
      }
    });

    this.audioElement.addEventListener('play', () => {
      this.onPlayStateChangeCallback?.(true);
    });

    this.audioElement.addEventListener('pause', () => {
      this.onPlayStateChangeCallback?.(false);
    });

    this.audioElement.addEventListener('waiting', () => {
      this.underrunCount++;
    });

    this.audioElement.addEventListener('stalled', () => {
      this.underrunCount++;
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
    });
  }

  public async playTrack(track: Track, startTime = 0) {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.currentTrack = track;

    // Crossfade handling if enabled
    if (this.dspSettings.crossfadeSeconds > 0 && !this.audioElement.paused && this.masterGainNode) {
      await this.fadeOut(this.dspSettings.crossfadeSeconds * 500);
    }

    this.audioElement.src = track.streamUrl;
    this.audioElement.playbackRate = this.dspSettings.pitchSpeed;
    this.audioElement.currentTime = startTime;

    this.applyReplayGain();

    try {
      await this.audioElement.play();
      if (this.dspSettings.crossfadeSeconds > 0 && this.masterGainNode) {
        this.fadeIn(this.dspSettings.crossfadeSeconds * 500);
      }
    } catch (err) {
      console.warn('Auto-play blocked or failed, waiting for user gesture:', err);
    }
  }

  public togglePlay() {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.audioElement.paused) {
      this.audioElement.play().catch(console.warn);
    } else {
      this.audioElement.pause();
    }
  }

  public pause() {
    this.audioElement.pause();
  }

  public seek(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return;
    this.audioElement.currentTime = Math.min(seconds, this.audioElement.duration || 9999);
  }

  public seekRelative(deltaSeconds: number) {
    this.seek(this.audioElement.currentTime + deltaSeconds);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGainNode && !this.isMuted) {
      this.masterGainNode.gain.setValueAtTime(this.volume, this.audioCtx?.currentTime || 0);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(
        this.isMuted ? 0 : this.volume,
        this.audioCtx?.currentTime || 0
      );
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isPlaying(): boolean {
    return !this.audioElement.paused;
  }

  public getCurrentTime(): number {
    return this.audioElement.currentTime || 0;
  }

  public getDuration(): number {
    return this.audioElement.duration || 0;
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  // DSP and Equalizer management
  public getDspSettings(): DspSettings {
    return { ...this.dspSettings };
  }

  public updateDspSettings(settings: Partial<DspSettings>) {
    this.dspSettings = { ...this.dspSettings, ...settings };
    localStorage.setItem(STORAGE_KEY_DSP, JSON.stringify(this.dspSettings));
    this.applyDspSettings();
    this.applyReplayGain();

    if (settings.pitchSpeed !== undefined) {
      this.audioElement.playbackRate = this.dspSettings.pitchSpeed;
    }
  }

  private applyDspSettings() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Apply preamp
    if (this.preampGainNode) {
      const preampGain = this.dspSettings.enabled ? dbToGain(this.dspSettings.preampDb) : 1.0;
      this.preampGainNode.gain.setValueAtTime(preampGain, now);
    }

    // Apply 10 EQ bands
    this.eqFilters.forEach((filter, idx) => {
      const gainDb = this.dspSettings.enabled ? this.dspSettings.eqBands[idx] || 0 : 0;
      filter.gain.setValueAtTime(gainDb, now);
    });

    // Apply bass boost
    if (this.bassBoostFilter) {
      const bassGain = this.dspSettings.enabled ? this.dspSettings.bassBoostDb : 0;
      this.bassBoostFilter.gain.setValueAtTime(bassGain, now);
    }

    // Stereo width delay modulation
    if (this.delayNodeL && this.delayNodeR) {
      const width = this.dspSettings.enabled ? this.dspSettings.stereoWidth : 1.0;
      const baseDelay = 0.0004 * width;
      this.delayNodeL.delayTime.setValueAtTime(baseDelay, now);
      this.delayNodeR.delayTime.setValueAtTime(baseDelay * 2, now);
    }
  }

  private applyReplayGain() {
    if (!this.preampGainNode || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    let targetGainDb = this.dspSettings.preampDb;
    if (this.dspSettings.replayGainMode !== 'off' && this.currentTrack?.replayGain) {
      targetGainDb += this.currentTrack.replayGain;
    }
    // Clamping to avoid harsh clipping
    const clampedGain = Math.min(12, Math.max(-24, targetGainDb));
    this.preampGainNode.gain.setValueAtTime(dbToGain(clampedGain), now);
  }

  private fadeOut(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.masterGainNode || !this.audioCtx) return resolve();
      const now = this.audioCtx.currentTime;
      const durSec = durationMs / 1000;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setValueAtTime(this.volume, now);
      this.masterGainNode.gain.linearRampToValueAtTime(0.001, now + durSec);
      setTimeout(resolve, durationMs);
    });
  }

  private fadeIn(durationMs: number) {
    if (!this.masterGainNode || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const durSec = durationMs / 1000;
    this.masterGainNode.gain.cancelScheduledValues(now);
    this.masterGainNode.gain.setValueAtTime(0.001, now);
    this.masterGainNode.gain.linearRampToValueAtTime(this.volume, now + durSec);
  }

  // Visualizer data methods
  public getFrequencyData(array: Uint8Array): void {
    if (this.analyserNode) {
      (this.analyserNode as any).getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyserNode) {
      (this.analyserNode as any).getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }

  // High-fidelity performance metrics
  private startMetricsMonitor() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    const freqData = new Uint8Array(64);

    this.metricsInterval = setInterval(() => {
      if (!this.onMetricsCallback) return;

      const track = this.currentTrack;
      const buffered = this.audioElement.buffered;
      let bufferedAhead = 0;
      const current = this.audioElement.currentTime;

      for (let i = 0; i < buffered.length; i++) {
        if (buffered.start(i) <= current && buffered.end(i) >= current) {
          bufferedAhead = buffered.end(i) - current;
          break;
        }
      }

      const bufferStatus = calculateBufferHealth(bufferedAhead, 15);
      const latency = this.audioCtx
        ? ((this.audioCtx.baseLatency || 0.005) + ((this.audioCtx as any).outputLatency || 0.01)) * 1000
        : 12;

      this.getFrequencyData(freqData);
      let sumL = 0;
      let sumR = 0;
      for (let i = 0; i < 32; i++) sumL += freqData[i];
      for (let i = 32; i < 64; i++) sumR += freqData[i];

      const metrics: PerformanceMetrics = {
        sampleRate: track?.sampleRate || 96000,
        bitDepth: track?.bitDepth || 24,
        codec: track?.codec || 'FLAC',
        bitrate: track?.bitrate || 1411,
        bufferSeconds: Math.round(bufferedAhead * 10) / 10,
        bufferHealthPct: bufferStatus.pct,
        underrunCount: this.underrunCount,
        latencyMs: Math.round(latency * 10) / 10,
        audioContextState: this.audioCtx?.state || 'uninitialized',
        peakLevelL: Math.min(100, Math.round((sumL / (32 * 255)) * 100)),
        peakLevelR: Math.min(100, Math.round((sumR / (32 * 255)) * 100)),
      };

      this.onMetricsCallback(metrics);
    }, 250);
  }

  // Event listener registers
  public onTimeUpdate(cb: (currentTime: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onTrackEnded(cb: () => void) {
    this.onTrackEndedCallback = cb;
  }

  public onPlayStateChange(cb: (isPlaying: boolean) => void) {
    this.onPlayStateChangeCallback = cb;
  }

  public onMetrics(cb: (metrics: PerformanceMetrics) => void) {
    this.onMetricsCallback = cb;
  }
}

export const audioEngine = new AudioEngine();
