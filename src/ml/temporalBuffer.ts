import type { MLFeatures } from './types.ts';
import { featuresToArray } from './types.ts';

/**
 * Ring buffer for storing temporal sequences of ML features.
 * Used to maintain a sliding window of frames for LSTM/temporal model input.
 */
export class TemporalBuffer {
  private buffer: MLFeatures[] = [];
  private timestamps: number[] = [];
  private readonly maxSize: number;

  /**
   * Create a new temporal buffer.
   * @param windowSize - Maximum number of frames to store (default: 30)
   */
  constructor(windowSize: number = 30) {
    this.maxSize = windowSize;
  }

  /**
   * Add a new frame of features to the buffer.
   * If buffer is full, oldest frame is removed (ring buffer behavior).
   * @param features - ML features for this frame
   * @param timestamp - Timestamp of the frame
   */
  push(features: MLFeatures, timestamp: number): void {
    this.buffer.push(features);
    this.timestamps.push(timestamp);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
      this.timestamps.shift();
    }
  }

  /**
   * Check if buffer has enough frames for model inference.
   * @returns true if buffer contains maxSize frames
   */
  isReady(): boolean {
    return this.buffer.length >= this.maxSize;
  }

  /**
   * Get the feature window as a 2D array for TensorFlow input.
   * @returns [windowSize, 42] array - zero-padded if buffer not full
   */
  getWindow(): number[][] {
    if (this.buffer.length < this.maxSize) {
      // Pad with zeros at the beginning
      const padding = Array(this.maxSize - this.buffer.length)
        .fill(null)
        .map(() => new Array(42).fill(0));
      return [...padding, ...this.buffer.map((f) => featuresToArray(f))];
    }
    return this.buffer.map((f) => featuresToArray(f));
  }

  /**
   * Get all timestamps in the buffer.
   * @returns Copy of timestamps array
   */
  getTimestamps(): number[] {
    return [...this.timestamps];
  }

  /**
   * Get current number of frames in buffer.
   * @returns Frame count (0 to maxSize)
   */
  getFrameCount(): number {
    return this.buffer.length;
  }

  /**
   * Clear all frames from the buffer.
   */
  clear(): void {
    this.buffer = [];
    this.timestamps = [];
  }

  /**
   * Get the most recently added frame.
   * @returns Latest MLFeatures or null if buffer is empty
   */
  getLatest(): MLFeatures | null {
    return this.buffer[this.buffer.length - 1] ?? null;
  }

  /**
   * Get a frame from N frames ago.
   * @param framesAgo - How many frames back (0 = latest)
   * @returns MLFeatures at that position or null if out of range
   */
  getFrameAt(framesAgo: number): MLFeatures | null {
    const idx = this.buffer.length - 1 - framesAgo;
    return idx >= 0 ? (this.buffer[idx] ?? null) : null;
  }
}
