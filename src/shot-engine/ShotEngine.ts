import type {
  HolisticLandmarks,
  ShotState,
  ShotEvent,
  ShotEngineConfig,
  TimingZone,
  IShotEngine,
} from '../types/index.ts';
import { DEFAULT_SHOT_ENGINE_CONFIG } from '../types/index.ts';
import { PositionDetector } from './positionDetector.ts';
import { MLPositionDetector } from './mlPositionDetector.ts';
import { HybridPositionDetector } from './hybridPositionDetector.ts';
import { ReleaseDetector } from './releaseDetector.ts';
import { TimingMeter } from './timingMeter.ts';
import { StateMachine } from './stateMachine.ts';
import { resolveOutcome, isSuccessfulShot } from './outcomeResolver.ts';
import type { PositionResult } from './types.ts';

// Common interface for all position detectors
interface IPositionDetector {
  update(landmarks: HolisticLandmarks): PositionResult;
  reset(): void;
  setDominantHand(hand: 'left' | 'right'): void;
}

type EventCallback = (event: ShotEvent) => void;

/**
 * Main Shot Engine - coordinates all shot detection and timing
 * Implements IShotEngine interface
 */
export class ShotEngine implements IShotEngine {
  private config: ShotEngineConfig;
  private positionDetector: IPositionDetector;
  private releaseDetector: ReleaseDetector;
  private timingMeter: TimingMeter;
  private stateMachine: StateMachine;
  private subscribers: Set<EventCallback> = new Set();
  private isRunning = false;
  private lastPositionResult: PositionResult | null = null;
  private wasInPosition = false;
  private requiresPositionReset = false;
  private initialized = false;
  private lastPositionUpdateTime = 0; // Throttle POSITION_UPDATE events
  private positionLostFrames = 0; // Grace frames counter for CHARGING state stability
  private readonly POSITION_LOST_GRACE_FRAMES = 10; // ~333ms at 30fps before aborting

  constructor(config: Partial<ShotEngineConfig> = {}) {
    const hasMeterOverride = Object.prototype.hasOwnProperty.call(config, 'meterFillDurationMs');
    this.config = { ...DEFAULT_SHOT_ENGINE_CONFIG, ...config };

    // Initialize position detector based on config.detectorType
    if (this.config.detectorType === 'ml') {
      this.positionDetector = new MLPositionDetector({}, this.config.dominantHand);
    } else if (this.config.detectorType === 'hybrid') {
      this.positionDetector = new HybridPositionDetector({}, this.config.dominantHand);
    } else {
      // Default to rules-based detector
      this.positionDetector = new PositionDetector({}, this.config.dominantHand);
    }

    this.releaseDetector = new ReleaseDetector({}, this.config.dominantHand);
    this.timingMeter = new TimingMeter(this.config.difficulty);
    if (hasMeterOverride) {
      this.timingMeter.setConfig({ fillDurationMs: this.config.meterFillDurationMs });
    } else {
      this.config.meterFillDurationMs = this.timingMeter.getConfig().fillDurationMs;
    }
    this.stateMachine = new StateMachine(this.config.cooldownMs);

    // Subscribe to state machine transitions
    this.stateMachine.subscribe((transition) => {
      this.emit({
        type: 'STATE_CHANGE',
        from: transition.from,
        to: transition.to,
        timestamp: transition.timestamp,
      });

      // Handle state-specific logic
      this.handleStateChange(transition.from, transition.to);
    });
  }

  /**
   * Initialize async components (required for ML/hybrid detectors)
   * Call this before start() when using ML or hybrid detectorType
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize ML or Hybrid detector if applicable
    if (this.config.detectorType === 'ml') {
      await (this.positionDetector as MLPositionDetector).initialize();
    } else if (this.config.detectorType === 'hybrid') {
      await (this.positionDetector as HybridPositionDetector).initialize();
    }

    this.initialized = true;
  }

  /**
   * Check if the engine is initialized (ML models loaded if applicable)
   */
  isInitialized(): boolean {
    return this.initialized || this.config.detectorType === 'rules';
  }

  /**
   * Handle state change side effects
   */
  private handleStateChange(from: ShotState, to: ShotState): void {
    if (to === 'CHARGING') {
      this.timingMeter.start();
      this.releaseDetector.startPrep();
      this.positionLostFrames = 0; // Reset grace counter when entering CHARGING
    }

    if (to === 'RELEASE') {
      this.requiresPositionReset = true;
      const value = this.timingMeter.getValue();
      const zone = this.timingMeter.getZone();

      this.emit({
        type: 'SHOT_EVALUATED',
        timing: zone,
        meterValue: value,
        timestamp: performance.now(),
      });

      const outcome = resolveOutcome(zone);
      this.emit({
        type: 'OUTCOME_DETERMINED',
        outcome,
        timestamp: performance.now(),
      });
    }

    if (to === 'COOLDOWN') {
      this.emit({
        type: 'COOLDOWN_START',
        durationMs: this.config.cooldownMs,
        timestamp: performance.now(),
      });
    }

    if (from === 'COOLDOWN' && to === 'IDLE') {
      this.emit({
        type: 'COOLDOWN_END',
        timestamp: performance.now(),
      });
    }

    if (to === 'IDLE') {
      this.timingMeter.reset();
      this.releaseDetector.reset();
    }
  }

  /**
   * Start the engine
   */
  start(): void {
    this.isRunning = true;
  }

  /**
   * Stop the engine
   */
  stop(): void {
    this.isRunning = false;
    this.reset();
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.stateMachine.reset();
    this.positionDetector.reset();
    this.releaseDetector.reset();
    this.timingMeter.reset();
    this.lastPositionResult = null;
    this.wasInPosition = false;
    this.requiresPositionReset = false;
    this.positionLostFrames = 0;
  }

  /**
   * Process a detection frame
   */
  processFrame(landmarks: HolisticLandmarks, timestamp: number): void {
    console.log('[ShotEngine] processFrame called, isRunning:', this.isRunning,
      'demoMode:', this.config.demoMode, 'hasPose:', !!landmarks.pose);

    if (!this.isRunning) return;

    // Skip processing during demo mode (use processDemoInput instead)
    if (this.config.demoMode) return;

    const state = this.stateMachine.getState();

    // Check if user is in frame (has pose landmarks)
    if (!landmarks.pose) {
      if (this.wasInPosition) {
        this.emit({ type: 'USER_OUT_OF_FRAME', timestamp });
        this.stateMachine.dispatch('POSITION_LOST');
      }
      return;
    }

    // Position detection for IDLE/READY states
    if (this.stateMachine.canDetectPosition()) {
      const posResult = this.positionDetector.update(landmarks);
      this.lastPositionResult = posResult;

      // Emit POSITION_UPDATE for debug overlay (throttled to ~10 FPS to prevent render storm)
      if (timestamp - this.lastPositionUpdateTime > 100) {
        this.lastPositionUpdateTime = timestamp;
        this.emit({
          type: 'POSITION_UPDATE',
          elbowAngle: posResult.elbowAngle,
          wristAboveElbow: posResult.wristAboveElbow ?? false,
          angleValid: posResult.angleValid ?? false,
          stableFrames: posResult.stableFrames ?? 0,
          formValid: posResult.inPosition,
          confidence: posResult.confidence,
          engineState: state,
          timestamp,
        });
      }

      if (this.requiresPositionReset) {
        if (!posResult.inPosition) {
          // User dropped out of position; allow new shot detection
          this.requiresPositionReset = false;
          this.wasInPosition = false;
        } else {
          // Still in position from previous shot; skip transitions
          return;
        }
      }

      if (posResult.inPosition && !this.wasInPosition) {
        this.emit({
          type: 'POSITION_DETECTED',
          elbowAngle: posResult.elbowAngle,
          wristHeight: posResult.wristHeight,
          timestamp,
        });
        this.wasInPosition = true;

        // Transition based on current state
        // Double-dispatch to go IDLE → READY → CHARGING (matches demo mode behavior)
        if (state === 'IDLE') {
          console.log('[ShotEngine] Position detected, transitioning IDLE → READY → CHARGING');
          this.stateMachine.dispatch('POSITION_DETECTED'); // IDLE → READY
          this.stateMachine.dispatch('POSITION_DETECTED'); // READY → CHARGING
        }
      } else if (!posResult.inPosition && this.wasInPosition) {
        this.emit({ type: 'POSITION_LOST', timestamp });
        this.wasInPosition = false;
        this.stateMachine.dispatch('POSITION_LOST');
      }
    }

    // Release detection during CHARGING
    if (this.stateMachine.canDetectRelease()) {
      // Update meter
      const meterValue = this.timingMeter.update();
      const zone = this.timingMeter.getZone();

      this.emit({
        type: 'METER_UPDATE',
        value: meterValue,
        zone,
        timestamp,
      });

      // Check for release
      const releaseResult = this.releaseDetector.update(landmarks, timestamp);

      if (releaseResult.detected) {
        this.emit({
          type: 'RELEASE_DETECTED',
          confidence: releaseResult.confidence,
          velocity: releaseResult.velocity,
          timestamp,
        });
        this.stateMachine.dispatch('RELEASE_DETECTED');
      }

      // Check if position is lost during charging (abort shot)
      // Use grace period to avoid aborting on momentary glitches
      const posResult = this.positionDetector.update(landmarks);
      if (!posResult.inPosition && posResult.confidence < 0.5) {
        this.positionLostFrames++;
        if (this.positionLostFrames >= this.POSITION_LOST_GRACE_FRAMES) {
          this.emit({ type: 'POSITION_LOST', timestamp });
          this.wasInPosition = false;
          this.stateMachine.dispatch('POSITION_LOST');
          this.positionLostFrames = 0;
        }
      } else {
        // Reset counter when position is valid
        this.positionLostFrames = 0;
      }
    }
  }

  /**
   * Process demo input (spacebar simulation)
   */
  processDemoInput(action: 'press' | 'release'): void {
    if (!this.isRunning) return;
    if (!this.config.demoMode) return;

    const timestamp = performance.now();

    this.emit({
      type: 'DEMO_INPUT',
      action,
      timestamp,
    });

    if (action === 'press') {
      const state = this.stateMachine.getState();
      if (state === 'IDLE') {
        this.stateMachine.dispatch('DEMO_PRESS');
        // Immediately start charging on press in demo mode
        this.stateMachine.dispatch('DEMO_PRESS');
      }
    } else if (action === 'release') {
      const state = this.stateMachine.getState();
      if (state === 'CHARGING') {
        const meterValue = this.timingMeter.getValue();
        const zone = this.timingMeter.getZone();

        this.emit({
          type: 'RELEASE_DETECTED',
          confidence: 1,
          velocity: 0,
          timestamp,
        });

        this.stateMachine.dispatch('DEMO_RELEASE');
      }
    }
  }

  /**
   * Update meter value (call in animation loop during CHARGING)
   */
  updateMeter(): { value: number; zone: TimingZone } | null {
    if (!this.stateMachine.shouldUpdateMeter()) {
      return null;
    }

    const value = this.timingMeter.update();
    const zone = this.timingMeter.getZone();

    return { value, zone };
  }

  /**
   * Get current state
   */
  getState(): ShotState {
    return this.stateMachine.getState();
  }

  /**
   * Get current meter value
   */
  getMeterValue(): number {
    return this.timingMeter.getValue();
  }

  /**
   * Get current timing zone
   */
  getCurrentZone(): TimingZone {
    return this.timingMeter.getZone();
  }

  /**
   * Update configuration
   * Only calls setters when values actually change (avoids unnecessary resets)
   */
  setConfig(config: Partial<ShotEngineConfig>): void {
    const hasMeterOverride = Object.prototype.hasOwnProperty.call(config, 'meterFillDurationMs');
    const nextConfig: ShotEngineConfig = { ...this.config, ...config };

    // Check for changes BEFORE updating config
    if (config.difficulty && config.difficulty !== this.config.difficulty) {
      this.timingMeter.setDifficulty(config.difficulty);
      if (!hasMeterOverride) {
        nextConfig.meterFillDurationMs = this.timingMeter.getConfig().fillDurationMs;
      }
    }

    if (config.dominantHand && config.dominantHand !== this.config.dominantHand) {
      this.positionDetector.setDominantHand(config.dominantHand);
      this.releaseDetector.setDominantHand(config.dominantHand);
    }

    if (config.cooldownMs && config.cooldownMs !== this.config.cooldownMs) {
      this.stateMachine.setCooldownMs(config.cooldownMs);
    }

    if (hasMeterOverride && config.meterFillDurationMs && config.meterFillDurationMs !== this.config.meterFillDurationMs) {
      this.timingMeter.setConfig({ fillDurationMs: config.meterFillDurationMs });
    }

    // Update config AFTER comparisons
    this.config = nextConfig;
  }

  /**
   * Get current configuration
   */
  getConfig(): ShotEngineConfig {
    return { ...this.config };
  }

  /**
   * Subscribe to engine events
   */
  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: ShotEvent): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Shot engine event handler error:', error);
      }
    });
  }

  /**
   * Get last position detection result
   */
  getPositionResult(): PositionResult | null {
    return this.lastPositionResult;
  }

  /**
   * Check if engine is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get meter zone boundaries for UI rendering
   */
  getZoneBoundaries(): {
    greenStart: number;
    greenEnd: number;
    yellowStart: number;
    yellowEnd: number;
  } {
    return this.timingMeter.getZoneBoundaries();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.stateMachine.destroy();
    this.subscribers.clear();
  }
}
