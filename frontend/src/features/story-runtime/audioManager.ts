import { env } from "../../shared/config/env";

class AudioManager {
  private static instance: AudioManager;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmName: string | null = null;
  private volume: number = 0.5; // Default volume 50%
  private isAutoPlayFailed: boolean = false;
  private lastSfxPlayedAt = 0;
  private lastSfxName: string | null = null;
  private globalClickSfxEnabled = false;
  private globalClickSfxName: string | null = null;
  private isStoryVideoPlaying = false;

  private readonly handleInteraction = () => {
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
  }

  public getVolume(): number {
    return this.volume;
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

    const url = `${env.cdnUrl}/audios/${soundName}`;
    const sfxAudio = new Audio(url);
    sfxAudio.volume = this.volume;
    sfxAudio.play().catch((error) => {
      console.warn("[AudioManager] SFX play failed:", error);
    });
  }
}

export const audioManager = AudioManager.getInstance();
