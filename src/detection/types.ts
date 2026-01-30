import type { DetectionFrame } from '../types/index';

export type DetectionStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'error';

export interface DetectionState {
  status: DetectionStatus;
  fps: number;
  lastFrame: DetectionFrame | null;
  error: string | null;
}
