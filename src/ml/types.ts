// Shot classification classes
export type ShotClass = 'idle' | 'ready' | 'shooting';

// 42 features per frame for ML input
export interface MLFeatures {
  // Positions relative to shoulder midpoint (9)
  shoulderMidpoint: { x: number; y: number; z: number };
  elbowRelative: { x: number; y: number; z: number };
  wristRelative: { x: number; y: number; z: number };

  // Joint angles normalized 0-1 (4)
  elbowAngle: number;
  shoulderAngle: number;
  wristElevation: number;
  armExtension: number;

  // Velocities (8)
  wristVelocity: { x: number; y: number; z: number; magnitude: number };
  elbowVelocity: { x: number; y: number; z: number; magnitude: number };

  // Accelerations (4) - just magnitudes
  wristAcceleration: number;
  elbowAcceleration: number;
  wristJerk: number;
  elbowJerk: number;

  // Hand features (15)
  fingerTips: number[]; // 5 fingers x 2 coords (y relative to wrist, extension) = 10
  fingerSpread: number;
  handOpenness: number;
  thumbAngle: number;
  palmOrientation: { x: number; y: number };

  // Metadata (2)
  confidence: number;
  frameTimeDelta: number;
}

// Classification result
export interface ClassificationResult {
  class: ShotClass;
  confidence: number;
  probabilities: {
    idle: number;
    ready: number;
    shooting: number;
  };
}

// Model configuration
export interface ModelConfig {
  modelPath: string;
  inputShape: [number, number];
  outputClasses: number;
}

// Classifier configuration
export interface ShotClassifierConfig {
  windowSize: number;
  minConfidence: number;
  modelConfig: ModelConfig;
}

// Default configs
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelPath: '/models/shot-classifier/model.json',
  inputShape: [30, 42],
  outputClasses: 3,
};

export const DEFAULT_CLASSIFIER_CONFIG: ShotClassifierConfig = {
  windowSize: 30,
  minConfidence: 0.7,
  modelConfig: DEFAULT_MODEL_CONFIG,
};

// Helper to convert MLFeatures to flat array (42 values)
export function featuresToArray(features: MLFeatures): number[] {
  return [
    features.shoulderMidpoint.x, features.shoulderMidpoint.y, features.shoulderMidpoint.z,
    features.elbowRelative.x, features.elbowRelative.y, features.elbowRelative.z,
    features.wristRelative.x, features.wristRelative.y, features.wristRelative.z,
    features.elbowAngle, features.shoulderAngle, features.wristElevation, features.armExtension,
    features.wristVelocity.x, features.wristVelocity.y, features.wristVelocity.z, features.wristVelocity.magnitude,
    features.elbowVelocity.x, features.elbowVelocity.y, features.elbowVelocity.z, features.elbowVelocity.magnitude,
    features.wristAcceleration, features.elbowAcceleration, features.wristJerk, features.elbowJerk,
    ...features.fingerTips,
    features.fingerSpread, features.handOpenness, features.thumbAngle,
    features.palmOrientation.x, features.palmOrientation.y,
    features.confidence, features.frameTimeDelta,
  ];
}
