import type { HolisticLandmarks, DominantHand, PositionDetectorConfig, NormalizedLandmark } from '../types/index.ts';
import { POSE_LANDMARKS, DEFAULT_POSITION_CONFIG } from '../types/index.ts';
import type { PositionResult } from './types.ts';

/**
 * Calculate angle between three points in degrees
 * Returns angle at point b (the vertex)
 */
function calculateAngle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Detects when user is in shooting position
 * Monitors elbow angle and wrist height relative to shoulder
 */
export class PositionDetector {
  private config: PositionDetectorConfig;
  private dominantHand: DominantHand;
  private stableFrameCount = 0;

  // Angle smoothing to reduce noise
  private smoothedAngle = 0;
  private readonly ALPHA = 0.3;       // EMA smoothing factor (0.3 = responsive but smooth)
  private readonly NOISE_MIN = 15;    // Angles below this are physically impossible noise
  private readonly NOISE_MAX = 170;   // Angles above this are unrealistic
  private readonly WRIST_ELBOW_TOLERANCE = 0.06; // Allow slight wrist drop below elbow

  constructor(config: Partial<PositionDetectorConfig> = {}, dominantHand: DominantHand = 'right') {
    this.config = { ...DEFAULT_POSITION_CONFIG, ...config };
    this.dominantHand = dominantHand;
  }

  /**
   * Update detector with new landmarks
   * Returns position detection result
   */
  update(landmarks: HolisticLandmarks): PositionResult {
    const pose = landmarks.pose;
    if (!pose) {
      console.log('[PositionDetector] No pose landmarks');
      this.stableFrameCount = 0;
      return { inPosition: false, elbowAngle: 0, wristHeight: 0, confidence: 0 };
    }

    const [shoulderIdx, elbowIdx, wristIdx] = this.dominantHand === 'right'
      ? [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST]
      : [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST];

    const shoulder = pose[shoulderIdx];
    const elbow = pose[elbowIdx];
    const wrist = pose[wristIdx];

    if (!shoulder || !elbow || !wrist) {
      this.stableFrameCount = 0;
      return { inPosition: false, elbowAngle: 0, wristHeight: 0, confidence: 0 };
    }

    const confidence = Math.min(
      shoulder.visibility ?? 0,
      elbow.visibility ?? 0,
      wrist.visibility ?? 0
    );

    if (confidence < this.config.minConfidence) {
      console.log('[PositionDetector] Low confidence:', confidence.toFixed(2),
        '< required:', this.config.minConfidence);
      this.stableFrameCount = 0;
      return { inPosition: false, elbowAngle: 0, wristHeight: 0, confidence };
    }

    let rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
    // Positive if wrist above shoulder (y increases downward in screen coords)
    const wristHeight = shoulder.y - wrist.y;

    // Filter noise - reject physically impossible angles
    if (rawElbowAngle < this.NOISE_MIN || rawElbowAngle > this.NOISE_MAX) {
      console.log('[PositionDetector] Noise filtered:', rawElbowAngle.toFixed(1), '(outside valid range)');
      // Keep previous smoothed value, don't update with noisy data
    } else {
      // Apply EMA smoothing for stable angle tracking
      if (this.smoothedAngle === 0) {
        this.smoothedAngle = rawElbowAngle;
      } else {
        this.smoothedAngle = this.ALPHA * rawElbowAngle + (1 - this.ALPHA) * this.smoothedAngle;
      }
    }

    const elbowAngle = this.smoothedAngle;
    const angleValid = elbowAngle >= this.config.minElbowAngle && elbowAngle <= this.config.maxElbowAngle;
    const heightValid = !this.config.wristAboveShoulderRequired || wristHeight > 0;

    // Allow slight tolerance for wrist position to reduce false negatives
    const wristAboveElbow = wrist.y <= elbow.y + this.WRIST_ELBOW_TOLERANCE;

    // Form is valid when: proper elbow angle AND wrist is above elbow (raised arm)
    const formValid = angleValid && heightValid && wristAboveElbow;

    // Log every check result for debugging
    console.log('[PositionDetector] Check:', {
      elbowAngle: elbowAngle.toFixed(1),
      angleValid,
      wristHeight: wristHeight.toFixed(3),
      heightValid,
      wristAboveElbow,
      formValid,
      stableFrames: this.stableFrameCount,
      required: this.config.stabilityFrames
    });

    if (formValid) {
      this.stableFrameCount++;
    } else {
      this.stableFrameCount = 0;
    }

    const inPosition = this.stableFrameCount >= this.config.stabilityFrames;

    return {
      inPosition,
      elbowAngle,
      wristHeight,
      confidence,
      angleValid,
      wristAboveElbow,
      stableFrames: this.stableFrameCount,
    };
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.stableFrameCount = 0;
    this.smoothedAngle = 0;
  }

  /**
   * Set dominant hand for detection
   */
  setDominantHand(hand: DominantHand): void {
    this.dominantHand = hand;
    this.reset();
  }

  /**
   * Get current configuration
   */
  getConfig(): PositionDetectorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<PositionDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
