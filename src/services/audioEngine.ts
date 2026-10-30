import { DspSettings, PerformanceMetrics, Track } from '../types/index.ts';
import { dbToGain, calculateBufferHealth, EQ_FREQUENCIES } from '../utils/audioMath.ts';

export const DEFAULT_DSP_SETTINGS: DspSettings = {
  enabled: true,
  preampDb: 0,
  eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bassBoostDb: 2.0,
  stereoWidth: 1.15,
  crossfadeSeconds: 0,
  replayGainMode: 'track',
  pitchSpeed: 1.0,
};

const STORAGE_KEY_DSP = 'finamp_dsp_settings';

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement;
  private usingWebAudioGraph = false;
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
  private fallbackAttempt = 0;

  private metricsInterval: any = null;
  private onMetricsCallback?: (metrics: PerformanceMetrics) => void;
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onTrackEndedCallback?: () => void;
  private onPlayStateChangeCallback?: (isPlaying: boolean) => void;

  constructor() {
    this.audioElement = this.createAudioElement(false);

    const savedDsp = localStorage.getItem(STORAGE_KEY_DSP);
    if (savedDsp) {
      try {
        this.dspSettings = { ...DEFAULT_DSP_SETTINGS, ...JSON.parse(savedDsp) };
      } catch {
        this.dspSettings = { ...DEFAULT_DSP_SETTINGS };
      }
    } else {
      this.dspSettings = { ...DEFAULT_DSP_SETTINGS };
    }

    this.startMetricsMonitor();
  }

  /**
   * Creates and binds an HTMLAudioElement.
   * Note: For direct Jellyfin streams, avoiding crossOrigin="anonymous" prevents
   * CORS preflight/redirect failures and WebAudio zero-output silencing when a Jellyfin
   * server or reverse proxy does not emit Access-Control-Allow-Origin on 206 Range streams.
   */
  private createAudioElement(useCrossOrigin: boolean): HTMLAudioElement {
    const el = new Audio();
    if (useCrossOrigin) {
      el.crossOrigin = 'anonymous';
    }
    el.preload = 'auto';
    el.volume = this.isMuted ? 0 : this.volume;
    this.bindAudioEvents(el);
    return el;
  }

  private initWebAudioGraph() {
    if (this.audioCtx && this.usingWebAudioGraph) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
      this.preampGainNode = this.audioCtx.createGain();

      this.eqFilters = EQ_FREQUENCIES.map((freq) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = freq <= 64 ? 'lowshelf' : freq >= 8000 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = 0;
        return filter;
      });

      this.bassBoostFilter = this.audioCtx.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.value = 80;
      this.bassBoostFilter.gain.value = this.dspSettings.bassBoostDb;

      this.splitterNode = this.audioCtx.createChannelSplitter(2);
      this.mergerNode = this.audioCtx.createChannelMerger(2);
      this.delayNodeL = this.audioCtx.createDelay();
      this.delayNodeR = this.audioCtx.createDelay();
      this.delayNodeL.delayTime.value = 0.0005;
      this.delayNodeR.delayTime.value = 0.001;

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.minDecibels = -90;
      this.analyserNode.maxDecibels = -10;
      this.analyserNode.smoothingTimeConstant = 0.82;

      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = this.isMuted ? 0 : this.volume;

      let current: AudioNode = this.sourceNode;
      current.connect(this.preampGainNode);
      current = this.preampGainNode;

      for (const filter of this.eqFilters) {
        current.connect(filter);
        current = filter;
      }

      current.connect(this.bassBoostFilter);
      current = this.bassBoostFilter;

      current.connect(this.splitterNode);
      this.splitterNode.connect(this.delayNodeL, 0);
      this.splitterNode.connect(this.delayNodeR, 1);
      this.delayNodeL.connect(this.mergerNode, 0, 0);
      this.delayNodeR.connect(this.mergerNode, 0, 1);

      this.mergerNode.connect(this.analyserNode);
      this.analyserNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.audioCtx.destination);

      this.usingWebAudioGraph = true;
      this.applyDspSettings();
    } catch (err) {
      console.warn('WebAudio graph init skipped, using native HTML5 audio:', err);
      this.usingWebAudioGraph = false;
    }
  }

  private bindAudioEvents(el: HTMLAudioElement) {
    el.addEventListener('timeupdate', () => {
      if (el !== this.audioElement) return;
      if (this.onTimeUpdateCallback) {
        const dur =
          el.duration && isFinite(el.duration) && el.duration > 0
            ? el.duration
            : this.currentTrack?.duration || 0;
        this.onTimeUpdateCallback(el.currentTime, dur);
      }
    });

    el.addEventListener('loadedmetadata', () => {
      if (el !== this.audioElement) return;
      if (this.onTimeUpdateCallback) {
        const dur =
          el.duration && isFinite(el.duration) && el.duration > 0
            ? el.duration
            : this.currentTrack?.duration || 0;
        this.onTimeUpdateCallback(el.currentTime, dur);
      }
    });

    el.addEventListener('ended', () => {
      if (el !== this.audioElement) return;
      this.onTrackEndedCallback?.();
    });

    el.addEventListener('play', () => {
      if (el !== this.audioElement) return;
      this.onPlayStateChangeCallback?.(true);
    });

    el.addEventListener('playing', () => {
      if (el !== this.audioElement) return;
      this.onPlayStateChangeCallback?.(true);
    });

    el.addEventListener('pause', () => {
      if (el !== this.audioElement) return;
      this.onPlayStateChangeCallback?.(false);
    });

    el.addEventListener('waiting', () => {
      if (el !== this.audioElement) return;
      this.underrunCount++;
    });

    el.addEventListener('error', () => {
      if (el !== this.audioElement) return;
      this.handleStreamFallback();
    });
  }

  /**
   * Multi-stage stream recovery if a codec, container, or CORS error occurs:
   * Attempt 1: Direct static stream (?static=true)
   * Attempt 2: Jellyfin real-time transcoded MP3 stream (/Audio/{id}/stream.mp3?AudioCodec=mp3)
   * Attempt 3: Built-in backend stream proxy (/api/jellyfin/stream?target=...)
   */
  private handleStreamFallback() {
    if (!this.currentTrack) return;
    const fallbacks = this.currentTrack.fallbackStreamUrls || [];

    if (this.fallbackAttempt < fallbacks.length) {
      const nextUrl = fallbacks[this.fallbackAttempt];
      this.fallbackAttempt++;
      console.info(
        `Stream fallback #${this.fallbackAttempt} for "${this.currentTrack.title}":`,
        nextUrl
      );

      // Ensure we use a clean non-CORS-restricted audio element if WebAudio tainted the previous one
      if (this.usingWebAudioGraph) {
        try {
          this.audioElement.pause();
          this.audioElement.removeAttribute('src');
        } catch {
          // ignore
        }
        this.usingWebAudioGraph = false;
        this.audioElement = this.createAudioElement(false);
      }

      this.audioElement.src = nextUrl;
      this.audioElement.playbackRate = this.dspSettings.pitchSpeed;
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
      this.audioElement.play().catch((err) => {
        console.warn('Fallback play attempt error:', err);
      });
    } else {
      console.error('All audio stream URLs failed for track:', this.currentTrack.title);
      this.onPlayStateChangeCallback?.(false);
    }
  }

  public async playTrack(track: Track, startTime = 0) {
    this.currentTrack = track;
    this.fallbackAttempt = 0;

    // Determine whether this stream is safe for WebAudio crossOrigin="anonymous"
    const isDesktop = typeof window !== 'undefined' && Boolean((window as any).jellywispDesktop?.isDesktop);
    const isSameOriginProxy = track.streamUrl.startsWith('/api/jellyfin/stream');
    const isDemoStream = track.streamUrl.includes('soundhelix.com');
    const canUseWebAudio = isDesktop || isSameOriginProxy || isDemoStream;

    if (canUseWebAudio && !this.usingWebAudioGraph) {
      try {
        this.audioElement.pause();
      } catch {
        // ignore
      }
      this.audioElement = this.createAudioElement(true);
      this.initWebAudioGraph();
    } else if (!canUseWebAudio && this.usingWebAudioGraph) {
      // Switch to native non-CORS HTMLAudioElement so direct Jellyfin streams are never blocked or silenced by CORS
      try {
        this.audioElement.pause();
        this.audioElement.removeAttribute('src');
      } catch {
        // ignore
      }
      this.usingWebAudioGraph = false;
      this.audioElement = this.createAudioElement(false);
    }

    if (this.usingWebAudioGraph && this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    try {
      this.audioElement.pause();
    } catch {
      // ignore
    }

    this.audioElement.src = track.streamUrl;
    this.audioElement.playbackRate = this.dspSettings.pitchSpeed;
    this.audioElement.volume = this.isMuted ? 0 : this.volume;
    if (startTime > 0) {
      this.audioElement.currentTime = startTime;
    }

    if (this.usingWebAudioGraph) {
      this.applyReplayGain();
    }

    try {
      await this.audioElement.play();
    } catch (err: any) {
      // Ignore AbortError when user rapidly clicks multiple tracks
      if (err?.name === 'AbortError') return;
      console.warn('Primary stream play error, trying fallback stream:', err);
      this.handleStreamFallback();
    }
  }

  public togglePlay() {
    if (!this.audioElement.src || this.audioElement.src === window.location.href) {
      if (this.currentTrack) {
        this.playTrack(this.currentTrack);
      }
      return;
    }

    if (this.usingWebAudioGraph && this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.audioElement.paused) {
      this.audioElement.play().catch((err) => {
        console.warn('Play failed on toggle, attempting fallback:', err);
        this.handleStreamFallback();
      });
    } else {
      this.audioElement.pause();
    }
  }

  public setInitialTrack(track: Track | null) {
    this.currentTrack = track;
  }

  public pause() {
    this.audioElement.pause();
  }

  public seek(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return;
    const maxDur =
      this.audioElement.duration && isFinite(this.audioElement.duration)
        ? this.audioElement.duration
        : this.currentTrack?.duration || 9999;
    try {
      this.audioElement.currentTime = Math.min(seconds, maxDur);
    } catch {
      // ignore if stream not seekable yet
    }
  }

  public seekRelative(deltaSeconds: number) {
    this.seek((this.audioElement.currentTime || 0) + deltaSeconds);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audioElement.volume = this.isMuted ? 0 : this.volume;
    if (this.usingWebAudioGraph && this.masterGainNode && !this.isMuted) {
      this.masterGainNode.gain.setValueAtTime(this.volume, this.audioCtx?.currentTime || 0);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.audioElement.volume = this.isMuted ? 0 : this.volume;
    if (this.usingWebAudioGraph && this.masterGainNode) {
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
    if (this.audioElement.duration && isFinite(this.audioElement.duration)) {
      return this.audioElement.duration;
    }
    return this.currentTrack?.duration || 0;
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public getDspSettings(): DspSettings {
    return { ...this.dspSettings };
  }

  public updateDspSettings(settings: Partial<DspSettings>) {
    this.dspSettings = { ...this.dspSettings, ...settings };
    localStorage.setItem(STORAGE_KEY_DSP, JSON.stringify(this.dspSettings));
    if (this.usingWebAudioGraph) {
      this.applyDspSettings();
      this.applyReplayGain();
    }

    if (settings.pitchSpeed !== undefined) {
      this.audioElement.playbackRate = this.dspSettings.pitchSpeed;
    }
  }

  private applyDspSettings() {
    if (!this.audioCtx || !this.usingWebAudioGraph) return;
    const now = this.audioCtx.currentTime;

    if (this.preampGainNode) {
      const preampGain = this.dspSettings.enabled ? dbToGain(this.dspSettings.preampDb) : 1.0;
      this.preampGainNode.gain.setValueAtTime(preampGain, now);
    }

    this.eqFilters.forEach((filter, idx) => {
      const gainDb = this.dspSettings.enabled ? this.dspSettings.eqBands[idx] || 0 : 0;
      filter.gain.setValueAtTime(gainDb, now);
    });

    if (this.bassBoostFilter) {
      const bassGain = this.dspSettings.enabled ? this.dspSettings.bassBoostDb : 0;
      this.bassBoostFilter.gain.setValueAtTime(bassGain, now);
    }

    if (this.delayNodeL && this.delayNodeR) {
      const width = this.dspSettings.enabled ? this.dspSettings.stereoWidth : 1.0;
      const baseDelay = 0.0004 * width;
      this.delayNodeL.delayTime.setValueAtTime(baseDelay, now);
      this.delayNodeR.delayTime.setValueAtTime(baseDelay * 2, now);
    }
  }

  private applyReplayGain() {
    if (!this.preampGainNode || !this.audioCtx || !this.usingWebAudioGraph) return;
    const now = this.audioCtx.currentTime;

    let targetGainDb = this.dspSettings.preampDb;
    if (this.dspSettings.replayGainMode !== 'off' && this.currentTrack?.replayGain) {
      targetGainDb += this.currentTrack.replayGain;
    }
    const clampedGain = Math.min(12, Math.max(-24, targetGainDb));
    this.preampGainNode.gain.setValueAtTime(dbToGain(clampedGain), now);
  }

  // Visualizer data methods (uses real FFT when WebAudio graph is active, or smooth rhythmic synthesis for direct non-CORS streams)
  public getFrequencyData(array: Uint8Array): void {
    if (this.usingWebAudioGraph && this.analyserNode && !this.audioElement.paused) {
      (this.analyserNode as any).getByteFrequencyData(array);
      return;
    }

    if (this.audioElement.paused) {
      array.fill(0);
      return;
    }

    // Smooth reactive visualizer synthesis when playing direct cross-origin streams
    const t = performance.now() / 1000;
    const bpm = this.currentTrack?.bpm || 120;
    const beatFreq = (bpm / 60) * Math.PI * 2;
    const beatPulse = (Math.sin(t * beatFreq) + 1) * 0.5;
    const energy = this.currentTrack?.moodTags?.energy || 0.7;

    for (let i = 0; i < array.length; i++) {
      const normIdx = i / array.length;
      const bassWeight = Math.max(0, 1 - normIdx * 1.4);
      const midWave = Math.sin(t * 7 + i * 0.35) * 0.5 + 0.5;
      const highShimmer = Math.cos(t * 13 + i * 0.9) * 0.5 + 0.5;
      const level =
        (bassWeight * beatPulse * 0.55 + midWave * 0.3 + highShimmer * 0.15) *
        energy *
        235 *
        (this.isMuted ? 0 : this.volume);
      array[i] = Math.min(255, Math.max(8, Math.round(level)));
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.usingWebAudioGraph && this.analyserNode && !this.audioElement.paused) {
      (this.analyserNode as any).getByteTimeDomainData(array);
      return;
    }

    if (this.audioElement.paused) {
      array.fill(128);
      return;
    }

    const t = performance.now() / 1000;
    for (let i = 0; i < array.length; i++) {
      const wave =
        Math.sin(t * 18 + i * 0.18) * 36 +
        Math.cos(t * 9 - i * 0.09) * 20;
      array[i] = Math.min(255, Math.max(0, Math.round(128 + wave * (this.isMuted ? 0 : this.volume))));
    }
  }

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
        sampleRate: Math.round(track?.sampleRate || 44100),
        bitDepth: Math.round(track?.bitDepth || 16),
        codec: track?.codec || 'FLAC',
        bitrate: Math.round(track?.bitrate || 1411),
        bufferSeconds: Math.round(bufferedAhead),
        bufferHealthPct: Math.round(bufferStatus.pct),
        underrunCount: Math.round(this.underrunCount),
        latencyMs: Math.round(latency),
        audioContextState: this.usingWebAudioGraph
          ? this.audioCtx?.state || 'running'
          : 'direct-stream',
        peakLevelL: Math.min(100, Math.round((sumL / (32 * 255)) * 100)),
        peakLevelR: Math.min(100, Math.round((sumR / (32 * 255)) * 100)),
      };

      this.onMetricsCallback(metrics);
    }, 350);
  }

  public async setOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if ('setSinkId' in this.audioElement) {
        await (this.audioElement as any).setSinkId(deviceId);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to set audio sink ID:', err);
      return false;
    }
  }

  public async getAudioOutputDevices(): Promise<{ deviceId: string; label: string }[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [{ deviceId: 'default', label: 'Default System Audio Device' }];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, idx) => ({
          deviceId: d.deviceId || `device-${idx}`,
          label: d.label || `Audio Output Device ${idx + 1}`,
        }));
      return audioOutputs.length > 0
        ? audioOutputs
        : [{ deviceId: 'default', label: 'Default System Audio Device' }];
    } catch {
      return [{ deviceId: 'default', label: 'Default System Audio Device' }];
    }
  }

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
