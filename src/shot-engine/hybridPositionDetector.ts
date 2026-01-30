import type { HolisticLandmarks, DominantHand, PositionDetectorConfig } from '../types/index.ts';
import { DEFAULT_POSITION_CONFIG } from '../types/index.ts';
import type { PositionResult } from './types.ts';
import { PositionDetector } from './positionDetector.ts';
import { MLPositionDetector } from './mlPositionDetector.ts';

export interface HybridConfig {
  mlWeight: number; // 0-1, weight for ML vs rules
  fallbackToRules: boolean; // Use rules if ML fails
  requireBothAgree: boolean; // Both must agree for position
}

const DEFAULT_HYBRID_CONFIG: HybridConfig = {
  mlWeight: 0.7,
  fallbackToRules: true,
  requireBothAgree: false,
};

export class HybridPositionDetector {
  private rulesDetector: PositionDetector;
  private mlDetector: MLPositionDetector;
  private config: HybridConfig;
  private mlReady = false;

  constructor(
    positionConfig: Partial<PositionDetectorConfig> = {},
    dominantHand: DominantHand = 'right',
    hybridConfig: Partial<HybridConfig> = {}
  ) {
    this.config = { ...DEFAULT_HYBRID_CONFIG, ...hybridConfig };
    this.rulesDetector = new PositionDetector(positionConfig, dominantHand);
    this.mlDetector = new MLPositionDetector({}, dominantHand);
  }

  async initialize(): Promise<void> {
    try {
      await this.mlDetector.initialize();
      this.mlReady = true;
    } catch (e) {
      console.warn('[HybridDetector] ML init failed, using rules only:', e);
      this.mlReady = false;
    }
  }

  update(landmarks: HolisticLandmarks): PositionResult {
    const rulesResult = this.rulesDetector.update(landmarks);

    if (!this.mlReady) {
      return rulesResult; // Fallback to rules
    }

    const mlResult = this.mlDetector.update(landmarks);

    if (this.config.requireBothAgree) {
      return {
        inPosition: rulesResult.inPosition && mlResult.inPosition,
        elbowAngle: rulesResult.elbowAngle,
        wristHeight: rulesResult.wristHeight,
        confidence: Math.min(rulesResult.confidence, mlResult.confidence),
      };
    }

    // Weighted combination
    const w = this.config.mlWeight;
    const combinedConfidence = w * mlResult.confidence + (1 - w) * rulesResult.confidence;
    const inPosition = combinedConfidence > 0.6 && (mlResult.inPosition || rulesResult.inPosition);

    return {
      inPosition,
      elbowAngle: rulesResult.elbowAngle,
      wristHeight: rulesResult.wristHeight,
      confidence: combinedConfidence,
    };
  }

  reset(): void {
    this.rulesDetector.reset();
    this.mlDetector.reset();
  }

  setDominantHand(hand: DominantHand): void {
    this.rulesDetector.setDominantHand(hand);
    this.mlDetector.setDominantHand(hand);
  }

  isMLReady(): boolean { return this.mlReady; }
}
