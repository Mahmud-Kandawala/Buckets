import type { ShotState } from '../types/index';
import type { StateMachineEvent, StateTransition } from './types';

type StateHandler = (event: StateMachineEvent) => ShotState | null;
type TransitionCallback = (transition: StateTransition) => void;

/**
 * State machine for shot flow:
 * IDLE -> READY -> CHARGING -> RELEASE -> RESULT -> COOLDOWN -> IDLE
 */
export class StateMachine {
  private state: ShotState = 'IDLE';
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;
  private resultTimer: ReturnType<typeof setTimeout> | null = null;
  private cooldownMs: number;
  private resultDisplayMs: number;
  private listeners: Set<TransitionCallback> = new Set();

  constructor(cooldownMs = 2500, resultDisplayMs = 1500) {
    this.cooldownMs = cooldownMs;
    this.resultDisplayMs = resultDisplayMs;
  }

  /**
   * State transition handlers
   */
  private transitions: Record<ShotState, StateHandler> = {
    IDLE: (event) => {
      if (event === 'POSITION_DETECTED' || event === 'DEMO_PRESS') {
        return 'READY';
      }
      return null;
    },

    READY: (event) => {
      if (event === 'POSITION_DETECTED' || event === 'DEMO_PRESS') {
        return 'CHARGING';
      }
      if (event === 'POSITION_LOST' || event === 'RESET') {
        return 'IDLE';
      }
      return null;
    },

    CHARGING: (event) => {
      if (event === 'RELEASE_DETECTED' || event === 'DEMO_RELEASE') {
        return 'RELEASE';
      }
      if (event === 'POSITION_LOST' || event === 'RESET') {
        return 'IDLE';
      }
      return null;
    },

    RELEASE: (event) => {
      if (event === 'RESULT_SHOWN') {
        return 'RESULT';
      }
      if (event === 'RESET') {
        return 'IDLE';
      }
      return null;
    },

    RESULT: (event) => {
      if (event === 'COOLDOWN_COMPLETE') {
        return 'COOLDOWN';
      }
      if (event === 'RESET') {
        return 'IDLE';
      }
      return null;
    },

    COOLDOWN: (event) => {
      if (event === 'COOLDOWN_COMPLETE') {
        return 'IDLE';
      }
      if (event === 'RESET') {
        return 'IDLE';
      }
      return null;
    },
  };

  /**
   * Process an event and potentially transition state
   */
  dispatch(event: StateMachineEvent): ShotState {
    const handler = this.transitions[this.state];
    const nextState = handler(event);

    if (nextState && nextState !== this.state) {
      const transition: StateTransition = {
        from: this.state,
        to: nextState,
        timestamp: performance.now(),
      };

      this.state = nextState;
      this.notifyListeners(transition);

      // Handle automatic transitions
      this.handleAutoTransitions(nextState);
    }

    return this.state;
  }

  /**
   * Handle states that auto-transition after a delay
   */
  private handleAutoTransitions(state: ShotState): void {
    // Clear any existing timers
    this.clearTimers();

    if (state === 'RELEASE') {
      // Auto-transition to RESULT after brief moment
      this.resultTimer = setTimeout(() => {
        this.dispatch('RESULT_SHOWN');
      }, 100);
    }

    if (state === 'RESULT') {
      // Start cooldown after showing result
      this.resultTimer = setTimeout(() => {
        this.startCooldown();
      }, this.resultDisplayMs);
    }
  }

  /**
   * Start cooldown timer
   */
  private startCooldown(): void {
    const transition: StateTransition = {
      from: this.state,
      to: 'COOLDOWN',
      timestamp: performance.now(),
    };

    this.state = 'COOLDOWN';
    this.notifyListeners(transition);

    this.cooldownTimer = setTimeout(() => {
      this.dispatch('COOLDOWN_COMPLETE');
    }, this.cooldownMs);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    if (this.resultTimer) {
      clearTimeout(this.resultTimer);
      this.resultTimer = null;
    }
  }

  /**
   * Notify all listeners of state transition
   */
  private notifyListeners(transition: StateTransition): void {
    this.listeners.forEach((callback) => callback(transition));
  }

  /**
   * Get current state
   */
  getState(): ShotState {
    return this.state;
  }

  /**
   * Force reset to IDLE
   */
  reset(): void {
    this.clearTimers();
    if (this.state !== 'IDLE') {
      const transition: StateTransition = {
        from: this.state,
        to: 'IDLE',
        timestamp: performance.now(),
      };
      this.state = 'IDLE';
      this.notifyListeners(transition);
    }
  }

  /**
   * Subscribe to state transitions
   */
  subscribe(callback: TransitionCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Set cooldown duration
   */
  setCooldownMs(ms: number): void {
    this.cooldownMs = ms;
  }

  /**
   * Set result display duration
   */
  setResultDisplayMs(ms: number): void {
    this.resultDisplayMs = ms;
  }

  /**
   * Check if in a state that allows position detection
   */
  canDetectPosition(): boolean {
    return this.state === 'IDLE' || this.state === 'READY';
  }

  /**
   * Check if in a state that allows release detection
   */
  canDetectRelease(): boolean {
    return this.state === 'CHARGING';
  }

  /**
   * Check if meter should be active
   */
  shouldUpdateMeter(): boolean {
    return this.state === 'CHARGING';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearTimers();
    this.listeners.clear();
  }
}
