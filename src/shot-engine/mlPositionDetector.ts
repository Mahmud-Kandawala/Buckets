import type { HolisticLandmarks, DominantHand } from '../types/index';
import type { PositionResult } from './types';
import { ShotClassifier } from '../ml/shotClassifier';

/**
 * ML-based position detector using the shot classifier
 * Same interface as PositionDetector but uses ML classification
 */
export class MLPositionDetector {
  private classifier: ShotClassifier;
  private dominantHand: DominantHand;
  private isInitialized = false;
  private stableFrameCount = 0;
  private readonly stabilityFrames = 3;

  constructor(config: {} = {}, dominantHand: DominantHand = 'right') {
    this.dominantHand = dominantHand;
    this.classifier = new ShotClassifier();
  }

  async initialize(): Promise<void> {
    await this.classifier.initialize();
    this.isInitialized = true;
  }

  update(landmarks: HolisticLandmarks): PositionResult {
    if (!this.isInitialized) {
      return { inPosition: false, elbowAngle: 0, wristHeight: 0, confidence: 0 };
    }

    const result = this.classifier.processFrame(landmarks, performance.now());

    if (!result) {
      return { inPosition: false, elbowAngle: 0, wristHeight: 0, confidence: 0 };
    }

    // Map ML classes to position detection
    const isReady = result.class === 'ready' || result.class === 'shooting';

    if (isReady && result.confidence >= 0.7) {
      this.stableFrameCount++;
    } else {
      this.stableFrameCount = 0;
    }

    return {
      inPosition: this.stableFrameCount >= this.stabilityFrames,
      elbowAngle: 90, // Placeholder - could extract from features
      wristHeight: 0.1,
      confidence: result.confidence,
    };
  }

  reset(): void {
    this.classifier.reset();
    this.stableFrameCount = 0;
  }

  setDominantHand(hand: DominantHand): void {
    this.dominantHand = hand;
    this.reset();
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
