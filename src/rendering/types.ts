import type { CourtPosition, ShotOutcome } from '../types/index';

export interface CameraSetup {
  position: [number, number, number];
  target: [number, number, number];
  ballStart: [number, number, number];
  trajectoryArc: number;
}

export interface TrajectoryConfig {
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
  arcHeight: number;
  startScale: number;
  endScale: number;
}

export interface TrajectoryPoint {
  position: [number, number, number];
  scale: number;
  t: number;
}

export interface BallState {
  isAnimating: boolean;
  trajectoryProgress: number;
  outcome: ShotOutcome | null;
}

export interface NetState {
  isAnimating: boolean;
  entryPoint: 'center' | 'left' | 'right';
}
