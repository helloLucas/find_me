import { env } from "../../shared/config/env";

type AudioContextConstructor = typeof AudioContext;

class AudioManager {
  private static instance: AudioManager;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmName: string | null = null;
  private volume: number = 0.3; // Default volume 50%
  private isAutoPlayFailed: boolean = false;
  private lastSfxPlayedAt = 0;
  private lastSfxName: string | null = null;
  private globalClickSfxEnabled = false;
  private globalClickSfxName: string | null = null;
  private isStoryVideoPlaying = false;
  private audioContext: AudioContext | null = null;
  private sfxBuffers = new Map<string, AudioBuffer>();
  private sfxBufferPromises = new Map<string, Promise<AudioBuffer>>();
  private fallbackSfxAudio = new Map<string, HTMLAudioElement>();

  private readonly handleInteraction = () => {
    if (this.audioContext?.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }

    if (this.isAutoPlayFailed && this.bgmAudio) {
      this.bgmAudio
        .play()
        .then(() => {
          console.log("[AudioManager] BGM resumed after user interaction.");
          this.isAutoPlayFailed = false;
        })
        .catch(() => {
          // Still failing or already playing
        });
    }
  };

  private readonly handleGlobalPointerDown = (event: PointerEvent) => {
    if (!this.globalClickSfxEnabled || !this.globalClickSfxName) return;
    if (this.isStoryVideoPlaying) return;
    if (!event.isPrimary || event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-disable-click-sfx="true"]')) return;

    this.playSfx(this.globalClickSfxName);
  };

  private constructor() {
    // Attempt to resume audio on user interaction if autoplay was blocked.
    window.addEventListener("click", this.handleInteraction);
    window.addEventListener("keydown", this.handleInteraction);
    // Global click SFX hook (enabled only in story runtime).
    window.addEventListener("pointerdown", this.handleGlobalPointerDown);
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    const windowWithWebkitAudio = window as Window & {
      webkitAudioContext?: AudioContextConstructor;
    };
    const AudioContextClass = window.AudioContext ?? windowWithWebkitAudio.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    this.audioContext = new AudioContextClass();
    return this.audioContext;
  }

  private loadSfxBuffer(soundName: string): Promise<AudioBuffer> {
    const cachedBuffer = this.sfxBuffers.get(soundName);
    if (cachedBuffer) {
      return Promise.resolve(cachedBuffer);
    }

    const pendingPromise = this.sfxBufferPromises.get(soundName);
    if (pendingPromise) {
      return pendingPromise;
    }

    const audioContext = this.getAudioContext();
    if (!audioContext) {
      return Promise.reject(new Error("AudioContext is not available."));
    }

    const url = `${env.cdnUrl}/audios/${soundName}`;
    const loadPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load SFX: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        this.sfxBuffers.set(soundName, buffer);
        this.sfxBufferPromises.delete(soundName);
        return buffer;
      })
      .catch((error) => {
        this.sfxBufferPromises.delete(soundName);
        throw error;
      });

    this.sfxBufferPromises.set(soundName, loadPromise);
    return loadPromise;
  }

  private preloadSfx(soundName: string) {
    void this.loadSfxBuffer(soundName).catch((error) => {
      console.warn("[AudioManager] SFX preload failed, fallback will be used:", error);
      this.ensureFallbackSfxAudio(soundName);
    });
  }

  private playSfxBuffer(buffer: AudioBuffer) {
    const audioContext = this.getAudioContext();
    if (!audioContext) {
      return;
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    gain.gain.value = this.volume;
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(0);
  }

  private ensureFallbackSfxAudio(soundName: string) {
    const cachedAudio = this.fallbackSfxAudio.get(soundName);
    if (cachedAudio) {
      return cachedAudio;
    }

    const audio = new Audio(`${env.cdnUrl}/audios/${soundName}`);
    audio.preload = "auto";
    audio.volume = this.volume;
    audio.load();
    this.fallbackSfxAudio.set(soundName, audio);
    return audio;
  }

  private playFallbackSfx(soundName: string) {
    const audio = this.ensureFallbackSfxAudio(soundName);
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Some browsers can reject seeking until metadata is ready.
    }
    audio.volume = this.volume;
    audio.play().catch((error) => {
      console.warn("[AudioManager] fallback SFX play failed:", error);
    });
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.volume;
    }
    this.fallbackSfxAudio.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentBgmName(): string | null {
    return this.currentBgmName;
  }

  public playBgm(bgmName: string | undefined | null) {
    console.log("[AudioManager] playBgm called with:", bgmName);
    if (!bgmName) {
      console.log("[AudioManager] No bgmName provided, stopping current BGM.");
      this.stopBgm();
      return;
    }

    if (this.currentBgmName === bgmName && this.bgmAudio) {
      console.log("[AudioManager] Already playing this BGM:", bgmName);
      // Same BGM: recover if paused/ended/autoplay previously blocked.
      if (this.isAutoPlayFailed || this.bgmAudio.paused || this.bgmAudio.ended) {
        this.bgmAudio.play().then(() => { this.isAutoPlayFailed = false; }).catch(() => {});
      }
      return;
    }

    this.stopBgm();

    const url = `${env.cdnUrl}/audios/${bgmName}`;
    console.log("[AudioManager] Loading new BGM from URL:", url);
    this.bgmAudio = new Audio(url);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = this.volume;
    
    this.bgmAudio.play()
      .then(() => {
        console.log("[AudioManager] BGM play started successfully.");
        this.isAutoPlayFailed = false;
      })
      .catch((err) => {
        console.warn("[AudioManager] BGM Auto-play failed:", err);
        this.isAutoPlayFailed = true;
      });
    
    this.currentBgmName = bgmName;
  }

  public stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.src = "";
      this.bgmAudio = null;
    }
    this.currentBgmName = null;
    this.isAutoPlayFailed = false;
  }

  public enableGlobalClickSfx(soundName: string) {
    this.globalClickSfxEnabled = true;
    this.globalClickSfxName = soundName;
    this.preloadSfx(soundName);
  }

  public disableGlobalClickSfx() {
    this.globalClickSfxEnabled = false;
    this.globalClickSfxName = null;
  }

  public setStoryVideoPlaying(isPlaying: boolean) {
    this.isStoryVideoPlaying = isPlaying;
  }

  public playSfx(soundName: string | undefined | null) {
    if (!soundName) return;

    // Guard against accidental duplicate trigger in same render/transition tick.
    const now = Date.now();
    if (this.lastSfxName === soundName && now - this.lastSfxPlayedAt < 120) {
      return;
    }
    this.lastSfxName = soundName;
    this.lastSfxPlayedAt = now;

    const cachedBuffer = this.sfxBuffers.get(soundName);
    if (cachedBuffer) {
      this.playSfxBuffer(cachedBuffer);
      return;
    }

    void this.loadSfxBuffer(soundName)
      .then((buffer) => {
        this.playSfxBuffer(buffer);
      })
      .catch((error) => {
        console.warn("[AudioManager] SFX buffer play failed, using fallback:", error);
        this.playFallbackSfx(soundName);
      });
  }
}

export const audioManager = AudioManager.getInstance();
