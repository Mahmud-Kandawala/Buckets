/**
 * FeatureExtractor - Converts MediaPipe landmarks to 42 ML features
 *
 * Extracts normalized features from pose and hand landmarks for
 * shot classification model input.
 */

import type { HolisticLandmarks, NormalizedLandmark, DominantHand } from '../types/index';
import { POSE_LANDMARKS, HAND_LANDMARKS } from '../types/index';
import type { MLFeatures } from './types';

// Vector3 helper type
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Previous frame data for velocity calculations
interface PreviousFrameData {
  wristPos: Vector3;
  elbowPos: Vector3;
  wristVelocity: Vector3;
  elbowVelocity: Vector3;
  timestamp: number;
}

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
 * Normalize angle to 0-1 range (0-180 degrees mapped to 0-1)
 */
function normalizeAngle(angle: number): number {
  return Math.max(0, Math.min(1, angle / 180));
}

/**
 * Calculate distance between two 3D points
 */
function distance3D(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate velocity magnitude
 */
function velocityMagnitude(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Clamp value to -1 to 1 range
 */
function clamp(value: number, min: number = -1, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get landmark position safely, returns zero vector if missing
 */
function getLandmarkPos(landmarks: NormalizedLandmark[] | null, index: number): Vector3 {
  if (!landmarks || !landmarks[index]) {
    return { x: 0, y: 0, z: 0 };
  }
  const lm = landmarks[index];
  return { x: lm.x, y: lm.y, z: lm.z };
}

/**
 * Get landmark with visibility check
 */
function getLandmark(landmarks: NormalizedLandmark[] | null, index: number): NormalizedLandmark | null {
  if (!landmarks || !landmarks[index]) {
    return null;
  }
  return landmarks[index];
}

/**
 * Create zero features (used when landmarks are missing)
 */
function createZeroFeatures(): MLFeatures {
  return {
    shoulderMidpoint: { x: 0.5, y: 0.5, z: 0 },
    elbowRelative: { x: 0, y: 0, z: 0 },
    wristRelative: { x: 0, y: 0, z: 0 },
    elbowAngle: 0.5,
    shoulderAngle: 0.5,
    wristElevation: 0,
    armExtension: 0,
    wristVelocity: { x: 0, y: 0, z: 0, magnitude: 0 },
    elbowVelocity: { x: 0, y: 0, z: 0, magnitude: 0 },
    wristAcceleration: 0,
    elbowAcceleration: 0,
    wristJerk: 0,
    elbowJerk: 0,
    fingerTips: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fingerSpread: 0,
    handOpenness: 0,
    thumbAngle: 0.5,
    palmOrientation: { x: 0, y: 0 },
    confidence: 0,
    frameTimeDelta: 0,
  };
}

/**
 * FeatureExtractor class
 *
 * Converts MediaPipe HolisticLandmarks to 42-dimensional feature vectors
 * suitable for ML model input.
 */
export class FeatureExtractor {
  private dominantHand: DominantHand;
  private prevFrame: PreviousFrameData | null = null;
  private prevWristAccel: number = 0;
  private prevElbowAccel: number = 0;

  constructor(dominantHand: DominantHand = 'right') {
    this.dominantHand = dominantHand;
  }

  /**
   * Extract ML features from landmarks
   *
   * @param landmarks - MediaPipe holistic landmarks
   * @param prevFeatures - Previous frame's features (optional, for velocity)
   * @param timeDelta - Time since last frame in seconds
   * @returns MLFeatures object with 42 normalized features
   */
  extractFeatures(
    landmarks: HolisticLandmarks,
    prevFeatures: MLFeatures | null,
    timeDelta: number
  ): MLFeatures {
    const { pose, leftHand, rightHand } = landmarks;

    // Check for valid pose landmarks
    if (!pose || pose.length === 0) {
      return createZeroFeatures();
    }

    // Get dominant side landmarks
    const isRight = this.dominantHand === 'right';
    const shoulderIdx = isRight ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;
    const elbowIdx = isRight ? POSE_LANDMARKS.RIGHT_ELBOW : POSE_LANDMARKS.LEFT_ELBOW;
    const wristIdx = isRight ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST;
    const hipIdx = isRight ? POSE_LANDMARKS.RIGHT_HIP : POSE_LANDMARKS.LEFT_HIP;
    const handLandmarks = isRight ? rightHand : leftHand;

    // Get opposite side for shoulder midpoint
    const otherShoulderIdx = isRight ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;

    // Extract key landmarks
    const shoulder = getLandmark(pose, shoulderIdx);
    const elbow = getLandmark(pose, elbowIdx);
    const wrist = getLandmark(pose, wristIdx);
    const hip = getLandmark(pose, hipIdx);
    const otherShoulder = getLandmark(pose, otherShoulderIdx);

    // Check required landmarks exist
    if (!shoulder || !elbow || !wrist) {
      return createZeroFeatures();
    }

    // Calculate minimum confidence
    const confidence = Math.min(
      shoulder.visibility ?? 0,
      elbow.visibility ?? 0,
      wrist.visibility ?? 0
    );

    // 1. Calculate shoulder midpoint
    const shoulderMidpoint: Vector3 = otherShoulder
      ? {
          x: (shoulder.x + otherShoulder.x) / 2,
          y: (shoulder.y + otherShoulder.y) / 2,
          z: (shoulder.z + otherShoulder.z) / 2,
        }
      : { x: shoulder.x, y: shoulder.y, z: shoulder.z };

    // 2. Calculate relative positions (normalized to -1 to 1)
    const elbowRelative: Vector3 = {
      x: clamp((elbow.x - shoulderMidpoint.x) * 2),
      y: clamp((elbow.y - shoulderMidpoint.y) * 2),
      z: clamp((elbow.z - shoulderMidpoint.z) * 2),
    };

    const wristRelative: Vector3 = {
      x: clamp((wrist.x - shoulderMidpoint.x) * 2),
      y: clamp((wrist.y - shoulderMidpoint.y) * 2),
      z: clamp((wrist.z - shoulderMidpoint.z) * 2),
    };

    // 3. Calculate joint angles
    const elbowAngle = normalizeAngle(calculateAngle(shoulder, elbow, wrist));

    // Shoulder angle (hip-shoulder-elbow if hip available)
    let shoulderAngle = 0.5;
    if (hip) {
      shoulderAngle = normalizeAngle(calculateAngle(hip, shoulder, elbow));
    }

    // Wrist elevation (relative to shoulder, positive is above)
    const wristElevation = clamp((shoulder.y - wrist.y) * 2);

    // Arm extension (0 = bent, 1 = fully extended)
    const maxArmLength = distance3D(
      { x: shoulder.x, y: shoulder.y, z: shoulder.z },
      { x: elbow.x, y: elbow.y, z: elbow.z }
    ) + distance3D(
      { x: elbow.x, y: elbow.y, z: elbow.z },
      { x: wrist.x, y: wrist.y, z: wrist.z }
    );
    const directArmLength = distance3D(
      { x: shoulder.x, y: shoulder.y, z: shoulder.z },
      { x: wrist.x, y: wrist.y, z: wrist.z }
    );
    const armExtension = maxArmLength > 0 ? Math.min(1, directArmLength / maxArmLength) : 0;

    // 4. Calculate velocities
    const currentWristPos = getLandmarkPos(pose, wristIdx);
    const currentElbowPos = getLandmarkPos(pose, elbowIdx);

    let wristVelocity: Vector3 & { magnitude: number } = { x: 0, y: 0, z: 0, magnitude: 0 };
    let elbowVelocity: Vector3 & { magnitude: number } = { x: 0, y: 0, z: 0, magnitude: 0 };
    let wristAcceleration = 0;
    let elbowAcceleration = 0;
    let wristJerk = 0;
    let elbowJerk = 0;

    if (this.prevFrame && timeDelta > 0) {
      const dt = timeDelta;

      // Wrist velocity
      wristVelocity = {
        x: clamp((currentWristPos.x - this.prevFrame.wristPos.x) / dt),
        y: clamp((currentWristPos.y - this.prevFrame.wristPos.y) / dt),
        z: clamp((currentWristPos.z - this.prevFrame.wristPos.z) / dt),
        magnitude: 0,
      };
      wristVelocity.magnitude = clamp(velocityMagnitude(wristVelocity), 0, 1);

      // Elbow velocity
      elbowVelocity = {
        x: clamp((currentElbowPos.x - this.prevFrame.elbowPos.x) / dt),
        y: clamp((currentElbowPos.y - this.prevFrame.elbowPos.y) / dt),
        z: clamp((currentElbowPos.z - this.prevFrame.elbowPos.z) / dt),
        magnitude: 0,
      };
      elbowVelocity.magnitude = clamp(velocityMagnitude(elbowVelocity), 0, 1);

      // Acceleration (change in velocity magnitude)
      const prevWristVelMag = velocityMagnitude(this.prevFrame.wristVelocity);
      const prevElbowVelMag = velocityMagnitude(this.prevFrame.elbowVelocity);
      wristAcceleration = clamp((wristVelocity.magnitude - prevWristVelMag) / dt);
      elbowAcceleration = clamp((elbowVelocity.magnitude - prevElbowVelMag) / dt);

      // Jerk (change in acceleration)
      wristJerk = clamp((wristAcceleration - this.prevWristAccel) / dt);
      elbowJerk = clamp((elbowAcceleration - this.prevElbowAccel) / dt);
    }

    // Update previous frame data
    this.prevFrame = {
      wristPos: currentWristPos,
      elbowPos: currentElbowPos,
      wristVelocity: { x: wristVelocity.x, y: wristVelocity.y, z: wristVelocity.z },
      elbowVelocity: { x: elbowVelocity.x, y: elbowVelocity.y, z: elbowVelocity.z },
      timestamp: Date.now(),
    };
    this.prevWristAccel = wristAcceleration;
    this.prevElbowAccel = elbowAcceleration;

    // 5. Extract hand features
    const handFeatures = this.extractHandFeatures(handLandmarks, wrist);

    return {
      shoulderMidpoint,
      elbowRelative,
      wristRelative,
      elbowAngle,
      shoulderAngle,
      wristElevation,
      armExtension,
      wristVelocity,
      elbowVelocity,
      wristAcceleration,
      elbowAcceleration,
      wristJerk,
      elbowJerk,
      ...handFeatures,
      confidence,
      frameTimeDelta: timeDelta,
    };
  }

  /**
   * Extract hand-specific features
   */
  private extractHandFeatures(
    handLandmarks: NormalizedLandmark[] | null,
    wrist: NormalizedLandmark
  ): {
    fingerTips: number[];
    fingerSpread: number;
    handOpenness: number;
    thumbAngle: number;
    palmOrientation: { x: number; y: number };
  } {
    const defaultFeatures = {
      fingerTips: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      fingerSpread: 0,
      handOpenness: 0,
      thumbAngle: 0.5,
      palmOrientation: { x: 0, y: 0 },
    };

    if (!handLandmarks || handLandmarks.length < 21) {
      return defaultFeatures;
    }

    // Finger tip indices
    const tipIndices = [
      HAND_LANDMARKS.THUMB_TIP,
      HAND_LANDMARKS.INDEX_TIP,
      HAND_LANDMARKS.MIDDLE_TIP,
      HAND_LANDMARKS.RING_TIP,
      HAND_LANDMARKS.PINKY_TIP,
    ];

    // Get hand wrist position for relative calculations
    const handWrist = getLandmark(handLandmarks, HAND_LANDMARKS.WRIST);
    const refPoint = handWrist || wrist;

    // Extract finger tip positions relative to wrist (y and extension)
    const fingerTips: number[] = [];
    const tipPositions: Vector3[] = [];

    for (const tipIdx of tipIndices) {
      const tip = getLandmark(handLandmarks, tipIdx);
      if (tip) {
        // Y position relative to wrist (negative = above wrist in screen coords)
        const relY = clamp((tip.y - refPoint.y) * 2);
        // Extension (distance from wrist)
        const extension = clamp(
          distance3D(
            { x: tip.x, y: tip.y, z: tip.z },
            { x: refPoint.x, y: refPoint.y, z: refPoint.z }
          ) * 3,
          0,
          1
        );
        fingerTips.push(relY, extension);
        tipPositions.push({ x: tip.x, y: tip.y, z: tip.z });
      } else {
        fingerTips.push(0, 0);
        tipPositions.push({ x: 0, y: 0, z: 0 });
      }
    }

    // Finger spread (average distance between adjacent fingertips)
    let totalSpread = 0;
    let spreadCount = 0;
    for (let i = 1; i < tipPositions.length; i++) {
      const current = tipPositions[i];
      const prev = tipPositions[i - 1];
      if (current && prev) {
        const dist = distance3D(current, prev);
        if (dist > 0) {
          totalSpread += dist;
          spreadCount++;
        }
      }
    }
    const fingerSpread = spreadCount > 0 ? clamp(totalSpread / spreadCount * 5, 0, 1) : 0;

    // Hand openness (average finger extension)
    const avgExtension = fingerTips.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / 5;
    const handOpenness = clamp(avgExtension, 0, 1);

    // Thumb angle (angle between thumb and index finger)
    let thumbAngle = 0.5;
    const thumbTip = getLandmark(handLandmarks, HAND_LANDMARKS.THUMB_TIP);
    const indexTip = getLandmark(handLandmarks, HAND_LANDMARKS.INDEX_TIP);
    if (thumbTip && indexTip && handWrist) {
      thumbAngle = normalizeAngle(calculateAngle(thumbTip, handWrist, indexTip));
    }

    // Palm orientation (simplified - using middle finger direction)
    const middleTip = getLandmark(handLandmarks, HAND_LANDMARKS.MIDDLE_TIP);
    let palmOrientation = { x: 0, y: 0 };
    if (middleTip && handWrist) {
      palmOrientation = {
        x: clamp((middleTip.x - handWrist.x) * 2),
        y: clamp((middleTip.y - handWrist.y) * 2),
      };
    }

    return {
      fingerTips,
      fingerSpread,
      handOpenness,
      thumbAngle,
      palmOrientation,
    };
  }

  /**
   * Set dominant hand for feature extraction
   */
  setDominantHand(hand: DominantHand): void {
    this.dominantHand = hand;
    this.reset();
  }

  /**
   * Reset internal state (clears velocity history)
   */
  reset(): void {
    this.prevFrame = null;
    this.prevWristAccel = 0;
    this.prevElbowAccel = 0;
  }

  /**
   * Get current dominant hand setting
   */
  getDominantHand(): DominantHand {
    return this.dominantHand;
  }
}
