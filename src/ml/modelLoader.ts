import * as tf from '@tensorflow/tfjs';
import type { ModelConfig } from './types';
import { DEFAULT_MODEL_CONFIG } from './types';

export interface LoadedModel {
  model: tf.LayersModel;
  config: ModelConfig;
}

let cachedModel: LoadedModel | null = null;

export async function loadModel(config: ModelConfig = DEFAULT_MODEL_CONFIG): Promise<LoadedModel> {
  if (cachedModel && cachedModel.config.modelPath === config.modelPath) {
    return cachedModel;
  }

  try {
    // Ensure WebGL backend is ready
    await tf.ready();

    const model = await tf.loadLayersModel(config.modelPath);

    // Warm up the model with a dummy prediction
    const dummyInput = tf.zeros([1, ...config.inputShape]);
    model.predict(dummyInput);
    dummyInput.dispose();

    cachedModel = { model, config };
    return cachedModel;
  } catch (error) {
    console.error('[ModelLoader] Failed to load model:', error);
    throw new Error(`Failed to load shot classifier model: ${error}`);
  }
}

export function getLoadedModel(): LoadedModel | null {
  return cachedModel;
}

export function disposeModel(): void {
  if (cachedModel) {
    cachedModel.model.dispose();
    cachedModel = null;
  }
}

export function isModelLoaded(): boolean {
  return cachedModel !== null;
}
