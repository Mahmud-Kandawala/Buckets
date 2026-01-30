import type { CourtPosition } from '../types/index.ts';
import type { CameraSetup } from './types.ts';

export const HOOP_POSITION = { x: 0, y: 3.05, z: 6.25 }; // 10ft high, at baseline

export const CAMERA_SETUPS: Record<CourtPosition, CameraSetup> = {
  'free-throw': {
    position: [0, 1.5, -4.5],
    target: [0, 3.05, 6.25],
    ballStart: [0, 0.8, -3.5],
    trajectoryArc: 3.0,     // INCREASED from 2.5 for better visual through hoop
  },
  'top-key': {
    position: [0, 1.5, -7.2],
    target: [0, 3.05, 6.25],
    ballStart: [0, 0.8, -6.2],
    trajectoryArc: 4.0,     // INCREASED from 3.5
  },
  'left-wing': {
    position: [-5, 1.5, -4],
    target: [0, 3.05, 6.25],
    ballStart: [-4.5, 0.8, -3],
    trajectoryArc: 3.5,     // INCREASED from 3.0
  },
  'right-wing': {
    position: [5, 1.5, -4],
    target: [0, 3.05, 6.25],
    ballStart: [4.5, 0.8, -3],
    trajectoryArc: 3.5,     // INCREASED from 3.0
  },
  'corner': {
    position: [-6.7, 1.5, 0],
    target: [0, 3.05, 6.25],
    ballStart: [-6, 0.8, 1],
    trajectoryArc: 3.7,     // INCREASED from 3.2
  },
};

export const BALL_RADIUS = 0.12; // ~9.4 inches diameter
export const RIM_RADIUS = 0.23; // 18 inch diameter
export const BACKBOARD_SIZE = { width: 1.83, height: 1.22, depth: 0.05 };
