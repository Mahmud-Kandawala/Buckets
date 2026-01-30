// Import types needed for local interfaces
import type {
  ShotState,
  TimingZone,
} from '../types/index.ts';

// Re-export all types from the main types module
export type {
  ShotState,
  Difficulty,
  DominantHand,
  CourtPosition,
  TimingZone,
  ShotOutcome,
  NormalizedLandmark,
  HolisticLandmarks,
  DetectionFrame,
  ShotEvent,
  ShotEngineConfig,
  PositionDetectorConfig,
  ReleaseDetectorConfig,
  TimingMeterConfig,
  IShotEngine,
} from '../types/index.ts';

export {
  DIFFICULTY_CONFIGS,
  DEFAULT_SHOT_ENGINE_CONFIG,
  DEFAULT_POSITION_CONFIG,
  DEFAULT_RELEASE_CONFIG,
  POSE_LANDMARKS,
  HAND_LANDMARKS,
} from '../types/index.ts';

// Engine-specific types

export interface PositionResult {
  inPosition: boolean;
  elbowAngle: number;
  wristHeight: number;
  confidence: number;
  // Debug fields for UI overlay
  angleValid?: boolean;
  wristAboveElbow?: boolean;
  stableFrames?: number;
}

export interface ReleaseResult {
  detected: boolean;
  confidence: number;
  velocity: number;
  method: 'separation' | 'velocity' | 'hybrid' | 'none';
}

export interface StateTransition {
  from: ShotState;
  to: ShotState;
  timestamp: number;
}

export type StateMachineEvent =
  | 'POSITION_DETECTED'
  | 'POSITION_LOST'
  | 'RELEASE_DETECTED'
  | 'RESULT_SHOWN'
  | 'COOLDOWN_COMPLETE'
  | 'DEMO_PRESS'
  | 'DEMO_RELEASE'
  | 'RESET';

export interface EngineStatus {
  state: ShotState;
  meterValue: number;
  zone: TimingZone;
  positionResult: PositionResult | null;
  isRunning: boolean;
}
