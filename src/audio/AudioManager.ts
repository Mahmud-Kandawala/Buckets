import type { SoundEffect, AudioConfig, AudioState } from './types.ts';
import { createAudioContext, playWhoosh, playSwish, playRim, playAirball } from './sounds.ts';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private config: AudioConfig = { enabled: true, volume: 0.7 };

  async initialize(): Promise<void> {
    if (this.ctx) return;
    this.ctx = createAudioContext();
    // Resume on user interaction
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  play(sound: SoundEffect): void {
    if (!this.config.enabled || !this.ctx) return;
    const volume = this.config.volume;
    switch (sound) {
      case 'whoosh': playWhoosh(this.ctx, volume); break;
      case 'swish': playSwish(this.ctx, volume); break;
      case 'rim': playRim(this.ctx, volume); break;
      case 'airball': playAirball(this.ctx, volume); break;
    }
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  getState(): AudioState {
    return {
      initialized: this.ctx !== null,
      muted: !this.config.enabled,
      volume: this.config.volume,
    };
  }
}
