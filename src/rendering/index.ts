// Types
export type {
  CameraSetup,
  TrajectoryConfig,
  TrajectoryPoint,
  BallState,
  NetState,
} from './types';

// Configuration
export {
  HOOP_POSITION,
  CAMERA_SETUPS,
  BALL_RADIUS,
  RIM_RADIUS,
  BACKBOARD_SIZE,
} from './sceneConfig';

// Components
export { Ball } from './Ball';
export { Hoop } from './Hoop';
export { Net } from './Net';
export { Court } from './Court';
export { GameScene } from './GameScene';

// Utilities
export {
  calculateTrajectoryPoint,
  generateTrajectoryPath,
  calculateBallRotation,
  createTrajectoryConfig,
} from './Trajectory';
