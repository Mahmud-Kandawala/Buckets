export type SoundEffect = 'whoosh' | 'swish' | 'rim' | 'airball';

export interface AudioConfig {
  enabled: boolean;
  volume: number;
}

export interface AudioState {
  initialized: boolean;
  muted: boolean;
  volume: number;
}
