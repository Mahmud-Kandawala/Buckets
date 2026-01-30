import type { Difficulty, TimingZone, TimingMeterConfig } from '../types/index';
import { DIFFICULTY_CONFIGS } from '../types/index';

/**
 * Manages the timing meter for shot release
 * Tracks fill progress and determines timing zone
 */
export class TimingMeter {
  private config: TimingMeterConfig;
  private startTime: number | null = null;
  private currentValue = 0;

  constructor(difficulty: Difficulty = 'medium') {
    this.config = DIFFICULTY_CONFIGS[difficulty];
  }

  /**
   * Start the meter fill
   */
  start(): void {
    this.startTime = performance.now();
    this.currentValue = 0;
  }

  /**
   * Update meter value based on elapsed time
   * Returns current value (0-1)
   */
  update(): number {
    if (this.startTime === null) return 0;

    const elapsed = performance.now() - this.startTime;
    this.currentValue = Math.min(1, elapsed / this.config.fillDurationMs);

    return this.currentValue;
  }

  /**
   * Get current meter value (0-1)
   */
  getValue(): number {
    return this.currentValue;
  }

  /**
   * Determine timing zone for a given value
   */
  getZone(value?: number): TimingZone {
    const v = value ?? this.currentValue;

    // Check green zone first
    if (v >= this.config.greenStart && v <= this.config.greenEnd) {
      return 'green';
    }

    // Check yellow zones (before and after green)
    const yellowStart = this.config.greenStart - this.config.yellowWidth;
    const yellowEnd = this.config.greenEnd + this.config.yellowWidth;

    if ((v >= yellowStart && v < this.config.greenStart) ||
        (v > this.config.greenEnd && v <= yellowEnd)) {
      return 'yellow';
    }

    // Everything else is red
    return 'red';
  }

  /**
   * Reset meter to initial state
   */
  reset(): void {
    this.startTime = null;
    this.currentValue = 0;
  }

  /**
   * Check if meter is currently active
   */
  isActive(): boolean {
    return this.startTime !== null;
  }

  /**
   * Set difficulty level
   */
  setDifficulty(difficulty: Difficulty): void {
    this.config = DIFFICULTY_CONFIGS[difficulty];
    this.reset();
  }

  /**
   * Get current configuration
   */
  getConfig(): TimingMeterConfig {
    return { ...this.config };
  }

  /**
   * Set custom configuration
   */
  setConfig(config: Partial<TimingMeterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedMs(): number {
    if (this.startTime === null) return 0;
    return performance.now() - this.startTime;
  }

  /**
   * Get remaining time before meter is full
   */
  getRemainingMs(): number {
    if (this.startTime === null) return this.config.fillDurationMs;
    const elapsed = performance.now() - this.startTime;
    return Math.max(0, this.config.fillDurationMs - elapsed);
  }

  /**
   * Get zone boundaries for rendering
   */
  getZoneBoundaries(): {
    greenStart: number;
    greenEnd: number;
    yellowStart: number;
    yellowEnd: number;
  } {
    return {
      greenStart: this.config.greenStart,
      greenEnd: this.config.greenEnd,
      yellowStart: this.config.greenStart - this.config.yellowWidth,
      yellowEnd: this.config.greenEnd + this.config.yellowWidth,
    };
  }
}
