import { env } from "../../shared/config/env";

class AudioManager {
  private static instance: AudioManager;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmName: string | null = null;
  private volume: number = 0.5; // Default volume 50%
  private isAutoPlayFailed: boolean = false;

  private constructor() {
    // Attempt to resume audio on any user click if autoplay was blocked
    const handleInteraction = () => {
      if (this.isAutoPlayFailed && this.bgmAudio) {
        this.bgmAudio.play()
          .then(() => {
            console.log("[AudioManager] BGM resumed after user interaction.");
            this.isAutoPlayFailed = false;
          })
          .catch(() => {
            // Still failing or already playing
          });
      }
    };
    
    // Listen to common interaction events
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
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
      // Even if it's the same BGM, if it failed previously, try playing again
      if (this.isAutoPlayFailed) {
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
}

export const audioManager = AudioManager.getInstance();
