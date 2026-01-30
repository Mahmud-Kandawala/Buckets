import type { TimingZone, ShotOutcome } from '../types/index.ts';

/**
 * Resolve shot outcome based on timing zone
 * Green = guaranteed swish
 * Yellow = 50% rim_in, 50% rim_out
 * Red = airball
 */
export function resolveOutcome(zone: TimingZone): ShotOutcome {
  switch (zone) {
    case 'green':
      return 'swish';
    case 'yellow':
      return Math.random() < 0.5 ? 'rim_in' : 'rim_out';
    case 'red':
      return 'airball';
  }
}

/**
 * Check if a shot outcome is a successful make
 */
export function isSuccessfulShot(outcome: ShotOutcome): boolean {
  return outcome === 'swish' || outcome === 'rim_in';
}

/**
 * Get descriptive text for outcome
 */
export function getOutcomeText(outcome: ShotOutcome): string {
  switch (outcome) {
    case 'swish':
      return 'Swish!';
    case 'rim_in':
      return 'Good!';
    case 'rim_out':
      return 'Rim Out';
    case 'airball':
      return 'Airball';
  }
}

/**
 * Get outcome probability description for a zone
 */
export function getZoneProbability(zone: TimingZone): { make: number; miss: number } {
  switch (zone) {
    case 'green':
      return { make: 1.0, miss: 0.0 };
    case 'yellow':
      return { make: 0.5, miss: 0.5 };
    case 'red':
      return { make: 0.0, miss: 1.0 };
  }
}

/**
 * Calculate points earned for an outcome
 */
export function getPointsForOutcome(outcome: ShotOutcome): number {
  switch (outcome) {
    case 'swish':
      return 3; // Bonus for perfect timing
    case 'rim_in':
      return 2;
    case 'rim_out':
    case 'airball':
      return 0;
  }
}
