import * as tf from '@tensorflow/tfjs';
import type { HolisticLandmarks } from '../types/index.ts';
import type { ShotClass, ClassificationResult, ShotClassifierConfig, MLFeatures } from './types.ts';
import { DEFAULT_CLASSIFIER_CONFIG } from './types.ts';
import { FeatureExtractor } from './featureExtractor.ts';
import { TemporalBuffer } from './temporalBuffer.ts';
import { loadModel, getLoadedModel, isModelLoaded, disposeModel } from './modelLoader.ts';

export class ShotClassifier {
  private config: ShotClassifierConfig;
  private featureExtractor: FeatureExtractor;
  private temporalBuffer: TemporalBuffer;
  private isReady = false;
  private lastFeatures: MLFeatures | null = null;
  private lastTimestamp = 0;

  constructor(config: Partial<ShotClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CLASSIFIER_CONFIG, ...config };
    this.featureExtractor = new FeatureExtractor();
    this.temporalBuffer = new TemporalBuffer(this.config.windowSize);
  }

  async initialize(): Promise<void> {
    await loadModel(this.config.modelConfig);
    this.isReady = true;
  }

  processFrame(landmarks: HolisticLandmarks, timestamp: number): ClassificationResult | null {
    if (!this.isReady) return null;

    const timeDelta = this.lastTimestamp > 0 ? timestamp - this.lastTimestamp : 33;
    const features = this.featureExtractor.extractFeatures(landmarks, this.lastFeatures, timeDelta);

    this.temporalBuffer.push(features, timestamp);
    this.lastFeatures = features;
    this.lastTimestamp = timestamp;

    if (!this.temporalBuffer.isReady()) return null;

    return this.classify();
  }

  private classify(): ClassificationResult {
    const window = this.temporalBuffer.getWindow();
    const input = tf.tensor3d([window]); // [1, 30, 42]

    const loadedModel = getLoadedModel();
    const prediction = loadedModel!.model.predict(input) as tf.Tensor;
    const probs = prediction.dataSync();

    input.dispose();
    prediction.dispose();

    const idle = probs[0] ?? 0;
    const ready = probs[1] ?? 0;
    const shooting = probs[2] ?? 0;
    const maxProb = Math.max(idle, ready, shooting);
    const shotClass: ShotClass = maxProb === shooting ? 'shooting' : maxProb === ready ? 'ready' : 'idle';

    return {
      class: shotClass,
      confidence: maxProb,
      probabilities: { idle, ready, shooting },
    };
  }

  reset(): void {
    this.temporalBuffer.clear();
    this.lastFeatures = null;
    this.lastTimestamp = 0;
  }

  destroy(): void {
    disposeModel();
    this.isReady = false;
  }

  getIsReady(): boolean {
    return this.isReady;
  }
}
