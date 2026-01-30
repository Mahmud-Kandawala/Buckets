// Shot Engine Module
// Main entry point for shot detection and timing

export { ShotEngine } from './ShotEngine';
export { PositionDetector } from './positionDetector';
export { ReleaseDetector } from './releaseDetector';
export { TimingMeter } from './timingMeter';
export { StateMachine } from './stateMachine';
export {
  resolveOutcome,
  isSuccessfulShot,
  getOutcomeText,
  getZoneProbability,
  getPointsForOutcome,
} from './outcomeResolver';

// Re-export types
export type {
  PositionResult,
  ReleaseResult,
  StateTransition,
  StateMachineEvent,
  EngineStatus,
} from './types';
