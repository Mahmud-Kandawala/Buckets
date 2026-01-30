import type { HolisticLandmarks, ReleaseDetectorConfig, NormalizedLandmark, DominantHand } from '../types/index';
import { POSE_LANDMARKS, DEFAULT_RELEASE_CONFIG } from '../types/index';
import type { ReleaseResult } from './types';

interface VelocityFrame {
  position: { x: number; y: number };
  timestamp: number;
}

/**
 * Detects shot release using hybrid approach:
 * - Hand separation tracking (left vs right wrist)
 * - Wrist velocity with EMA smoothing
 */
export class ReleaseDetector {
  private config: ReleaseDetectorConfig;
  private dominantHand: DominantHand;
  private velocityWindow: VelocityFrame[] = [];
  private smoothedVelocity = 0;
  private peakVelocity = 0;
  private lastReleaseTime = 0;
  private prepStartTime = 0;
  private isPrepped = false;
  private readonly EMA_ALPHA = 0.3;
  private readonly WINDOW_SIZE = 5;
  private readonly VELOCITY_ONLY_MIN_PEAK = 0.18; // Higher threshold when separation isn't available
  private readonly VELOCITY_DROP_RATIO = 0.35; // Relative drop required to confirm release
  private readonly EARLY_RELEASE_THRESHOLD_WITH_SEPARATION = 0.22; // Instant release when velocity spikes
  private readonly EARLY_RELEASE_THRESHOLD_VELOCITY_ONLY = 0.3;

  constructor(config: Partial<ReleaseDetectorConfig> = {}, dominantHand: DominantHand = 'right') {
    this.config = { ...DEFAULT_RELEASE_CONFIG, ...config };
    this.dominantHand = dominantHand;
  }

  /**
   * Calculate velocity from frame window
   */
  private calculateVelocity(): number {
    if (this.velocityWindow.length < 2) return 0;

    const first = this.velocityWindow[0]!;
    const last = this.velocityWindow[this.velocityWindow.length - 1]!;
    const dt = (last.timestamp - first.timestamp) / 1000; // Convert to seconds

    if (dt <= 0) return 0;

    const dx = last.position.x - first.position.x;
    const dy = last.position.y - first.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance / dt;
  }

  /**
   * Apply EMA smoothing to velocity
   */
  private smoothVelocity(rawVelocity: number): number {
    this.smoothedVelocity = this.EMA_ALPHA * rawVelocity + (1 - this.EMA_ALPHA) * this.smoothedVelocity;
    return this.smoothedVelocity;
  }

  /**
   * Calculate hand separation distance
   */
  private calculateSeparation(leftWrist: NormalizedLandmark, rightWrist: NormalizedLandmark): number {
    const dx = rightWrist.x - leftWrist.x;
    const dy = rightWrist.y - leftWrist.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Start prep phase (called when position detected)
   */
  startPrep(): void {
    this.prepStartTime = performance.now();
    this.isPrepped = false;
  }

  private resetVelocityTracking(): void {
    this.velocityWindow = [];
    this.smoothedVelocity = 0;
    this.peakVelocity = 0;
  }

  /**
   * Update detector with new landmarks
   */
  update(landmarks: HolisticLandmarks, timestamp: number): ReleaseResult {
    const pose = landmarks.pose;
    const noDetection: ReleaseResult = { detected: false, confidence: 0, velocity: 0, method: 'none' };

    if (!pose) {
      this.reset();
      return noDetection;
    }

    // Check debounce
    if (timestamp - this.lastReleaseTime < this.config.debounceMs) {
      return noDetection;
    }

    // Check minimum prep time
    const prepElapsed = performance.now() - this.prepStartTime;
    if (prepElapsed < this.config.minPrepTimeMs) {
      this.isPrepped = false;
      return noDetection;
    }
    this.isPrepped = true;

    const leftWrist = pose[POSE_LANDMARKS.LEFT_WRIST];
    const rightWrist = pose[POSE_LANDMARKS.RIGHT_WRIST];

    const dominantWrist = this.dominantHand === 'right' ? rightWrist : leftWrist;
    const nonDominantWrist = this.dominantHand === 'right' ? leftWrist : rightWrist;

    if (!dominantWrist) {
      this.resetVelocityTracking();
      return noDetection;
    }

    // Calculate hand separation
    const separationAvailable = !!nonDominantWrist;
    const separation = separationAvailable ? this.calculateSeparation(leftWrist!, rightWrist!) : 0;
    const hasSeparation = separationAvailable && separation > this.config.separationThreshold;

    // Track dominant wrist for velocity detection
    const currentPosition = { x: dominantWrist.x, y: dominantWrist.y };

    // Add to velocity window
    this.velocityWindow.push({ position: currentPosition, timestamp });

    // Maintain window size
    while (this.velocityWindow.length > this.WINDOW_SIZE) {
      this.velocityWindow.shift();
    }

    // Calculate and smooth velocity
    const rawVelocity = this.calculateVelocity();
    const velocity = this.smoothVelocity(rawVelocity);

    // Track peak velocity
    if (velocity > this.peakVelocity) {
      this.peakVelocity = velocity;
    }

    // Check for velocity inflection (peak reached + deceleration)
    const deceleration = velocity - this.peakVelocity;
    const minPeak = hasSeparation ? 0.1 : this.VELOCITY_ONLY_MIN_PEAK;
    const hasPeaked = this.peakVelocity > minPeak; // Minimum peak threshold
    const dropRatio = this.peakVelocity > 0 ? (this.peakVelocity - velocity) / this.peakVelocity : 0;
    const isDecelerating = deceleration < this.config.decelerationThreshold || dropRatio >= this.VELOCITY_DROP_RATIO;
    const hasVelocityInflection = hasPeaked && isDecelerating;

    const allowVelocityOnly = !hasSeparation;

    // Instant release: trigger as soon as velocity spikes (reduces latency)
    const earlyThreshold = hasSeparation
      ? this.EARLY_RELEASE_THRESHOLD_WITH_SEPARATION
      : this.EARLY_RELEASE_THRESHOLD_VELOCITY_ONLY;
    if (velocity >= earlyThreshold && (hasSeparation || allowVelocityOnly)) {
      this.lastReleaseTime = timestamp;
      const separationConfidence = hasSeparation ? Math.min(1, separation / (this.config.separationThreshold * 2)) : 0;
      const velocityConfidence = Math.min(1, velocity / (earlyThreshold * 2));
      const result: ReleaseResult = {
        detected: true,
        confidence: hasSeparation ? (separationConfidence + velocityConfidence) / 2 : velocityConfidence,
        velocity,
        method: hasSeparation ? 'hybrid' : 'velocity',
      };
      this.peakVelocity = 0; // Reset for next detection
      return result;
    }

    // Require separation when available; otherwise fall back to velocity-only
    if (hasVelocityInflection && (hasSeparation || allowVelocityOnly)) {
      this.lastReleaseTime = timestamp;
      const separationConfidence = hasSeparation ? Math.min(1, separation / (this.config.separationThreshold * 2)) : 0;
      const velocityConfidence = Math.min(1, Math.abs(deceleration) / Math.abs(this.config.decelerationThreshold * 2));
      const result: ReleaseResult = {
        detected: true,
        confidence: hasSeparation ? (separationConfidence + velocityConfidence) / 2 : velocityConfidence,
        velocity: this.peakVelocity,
        method: hasSeparation ? 'hybrid' : 'velocity',
      };
      this.peakVelocity = 0; // Reset for next detection
      return result;
    }

    return noDetection;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.resetVelocityTracking();
    this.isPrepped = false;
    this.prepStartTime = 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): ReleaseDetectorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ReleaseDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set dominant hand for detection
   */
  setDominantHand(hand: DominantHand): void {
    this.dominantHand = hand;
    this.resetVelocityTracking();
  }

  /**
   * Check if detector is ready (past prep time)
   */
  isReady(): boolean {
    return this.isPrepped;
  }

  /**
   * Get current smoothed velocity
   */
  getVelocity(): number {
    return this.smoothedVelocity;
  }
}
