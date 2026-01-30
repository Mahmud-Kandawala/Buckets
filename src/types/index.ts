// Shot states and enums
export type ShotState = 'IDLE' | 'READY' | 'CHARGING' | 'RELEASE' | 'RESULT' | 'COOLDOWN';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'pro';
export type DominantHand = 'left' | 'right';
export type CourtPosition = 'free-throw' | 'top-key' | 'left-wing' | 'right-wing' | 'corner';
export type TimingZone = 'green' | 'yellow' | 'red';
export type ShotOutcome = 'swish' | 'rim_in' | 'rim_out' | 'airball';

// Landmark types
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HolisticLandmarks {
  pose: NormalizedLandmark[] | null;
  leftHand: NormalizedLandmark[] | null;
  rightHand: NormalizedLandmark[] | null;
}

export interface DetectionFrame {
  landmarks: HolisticLandmarks;
  timestamp: number;
  frameId: number;
  processingTimeMs: number;
}

// Event types
export type ShotEvent =
  | { type: 'STATE_CHANGE'; from: ShotState; to: ShotState; timestamp: number }
  | { type: 'POSITION_DETECTED'; elbowAngle: number; wristHeight: number; timestamp: number }
  | { type: 'POSITION_LOST'; timestamp: number }
  | { type: 'POSITION_UPDATE'; elbowAngle: number; wristAboveElbow: boolean; angleValid: boolean; stableFrames: number; formValid: boolean; confidence: number; engineState: ShotState; timestamp: number }
  | { type: 'METER_UPDATE'; value: number; zone: TimingZone; timestamp: number }
  | { type: 'RELEASE_DETECTED'; confidence: number; velocity: number; timestamp: number }
  | { type: 'SHOT_EVALUATED'; timing: TimingZone; meterValue: number; timestamp: number }
  | { type: 'OUTCOME_DETERMINED'; outcome: ShotOutcome; timestamp: number }
  | { type: 'COOLDOWN_START'; durationMs: number; timestamp: number }
  | { type: 'COOLDOWN_END'; timestamp: number }
  | { type: 'USER_OUT_OF_FRAME'; timestamp: number }
  | { type: 'USER_IN_FRAME'; timestamp: number }
  | { type: 'DEMO_INPUT'; action: 'press' | 'release'; timestamp: number };

// Detector types
export type DetectorType = 'rules' | 'ml' | 'hybrid';

// Configuration types
export interface ShotEngineConfig {
  difficulty: Difficulty;
  dominantHand: DominantHand;
  courtPosition: CourtPosition;
  cooldownMs: number;
  meterFillDurationMs: number;
  demoMode: boolean;
  detectorType?: DetectorType;
}

export interface PositionDetectorConfig {
  minElbowAngle: number;
  maxElbowAngle: number;
  wristAboveShoulderRequired: boolean;
  minConfidence: number;
  stabilityFrames: number;
}

export interface ReleaseDetectorConfig {
  separationThreshold: number;
  velocityWindowMs: number;
  decelerationThreshold: number;
  debounceMs: number;
  minPrepTimeMs: number;
}

export interface TimingMeterConfig {
  fillDurationMs: number;
  greenStart: number;
  greenEnd: number;
  yellowWidth: number;
}

// Difficulty presets
export const DIFFICULTY_CONFIGS: Record<Difficulty, TimingMeterConfig> = {
  easy: { fillDurationMs: 6000, greenStart: 0.30, greenEnd: 0.70, yellowWidth: 0.20 },
  medium: { fillDurationMs: 4000, greenStart: 0.375, greenEnd: 0.625, yellowWidth: 0.15 },
  hard: { fillDurationMs: 2500, greenStart: 0.425, greenEnd: 0.575, yellowWidth: 0.10 },
  pro: { fillDurationMs: 2000, greenStart: 0.46, greenEnd: 0.54, yellowWidth: 0.06 },
};

// Default configs
export const DEFAULT_SHOT_ENGINE_CONFIG: ShotEngineConfig = {
  difficulty: 'medium',
  dominantHand: 'right',
  courtPosition: 'free-throw',
  cooldownMs: 1000,
  meterFillDurationMs: DIFFICULTY_CONFIGS.medium.fillDurationMs,
  demoMode: false,
  detectorType: 'rules',
};

export const DEFAULT_POSITION_CONFIG: PositionDetectorConfig = {
  minElbowAngle: 15,              // Lowered from 30 - noise filter removes <15° anyway
  maxElbowAngle: 160,             // Allow extended arm positions
  wristAboveShoulderRequired: false, // Disabled - hard to achieve with phone at chest height
  minConfidence: 0.15,            // Lowered from 0.3 - MediaPipe returns 0.2-0.3 visibility
  stabilityFrames: 4,             // Faster response while keeping some stability
};

export const DEFAULT_RELEASE_CONFIG: ReleaseDetectorConfig = {
  separationThreshold: 0.12,
  velocityWindowMs: 100,
  decelerationThreshold: -0.35,
  debounceMs: 250,
  minPrepTimeMs: 150,             // Faster readiness for instant release
};

// UI State types
export type AppScreen = 'landing' | 'setup' | 'game' | 'error';

export interface SessionStats {
  totalShots: number;
  makes: number;
  misses: number;
  greenReleases: number;
  yellowReleases: number;
  redReleases: number;
  currentStreak: number;
  bestStreak: number;
}

export interface UserSettings {
  dominantHand: DominantHand;
  difficulty: Difficulty;
  courtPosition: CourtPosition;
  soundEnabled: boolean;
  soundVolume: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  dominantHand: 'right',
  difficulty: 'medium',
  courtPosition: 'free-throw',
  soundEnabled: true,
  soundVolume: 0.7,
};

export const DEFAULT_STATS: SessionStats = {
  totalShots: 0,
  makes: 0,
  misses: 0,
  greenReleases: 0,
  yellowReleases: 0,
  redReleases: 0,
  currentStreak: 0,
  bestStreak: 0,
};

// Landmark constants
export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
} as const;

// Error types
export type CameraErrorCode = 'PERMISSION_DENIED' | 'NOT_FOUND' | 'IN_USE' | 'STREAM_ERROR';
export type MediaPipeErrorCode = 'LOAD_FAILED' | 'INIT_FAILED' | 'PROCESSING_ERROR' | 'TIMEOUT';

export interface AppError {
  code: CameraErrorCode | MediaPipeErrorCode | 'UNKNOWN';
  message: string;
  recoverable: boolean;
  action?: 'retry' | 'demo_mode' | 'refresh';
}

// Engine interface
export interface IShotEngine {
  start(): void;
  stop(): void;
  reset(): void;
  processFrame(landmarks: HolisticLandmarks, timestamp: number): void;
  processDemoInput(action: 'press' | 'release'): void;
  updateMeter?(): { value: number; zone: TimingZone } | null;
  getState(): ShotState;
  getMeterValue(): number;
  getCurrentZone(): TimingZone;
  setConfig(config: Partial<ShotEngineConfig>): void;
  getConfig(): ShotEngineConfig;
  subscribe(callback: (event: ShotEvent) => void): () => void;
}
