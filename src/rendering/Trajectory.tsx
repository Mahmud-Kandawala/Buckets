import type { TrajectoryConfig, TrajectoryPoint } from './types';

/**
 * Calculate a point along the ball trajectory using parabolic arc
 * @param t - Progress along trajectory (0 to 1)
 * @param config - Trajectory configuration
 * @returns TrajectoryPoint with position, scale, and t value
 */
export function calculateTrajectoryPoint(t: number, config: TrajectoryConfig): TrajectoryPoint {
  const { startPosition, endPosition, arcHeight } = config;

  // Linear interpolation for x and z
  const x = startPosition.x + (endPosition.x - startPosition.x) * t;
  const z = startPosition.z + (endPosition.z - startPosition.z) * t;

  // Base y interpolation
  const baseY = startPosition.y + (endPosition.y - startPosition.y) * t;

  // Parabolic arc offset (peaks at t=0.5)
  const arcOffset = arcHeight * Math.sin(t * Math.PI);
  const y = baseY + arcOffset;

  // Ball gets slightly smaller with distance (perspective effect)
  const scale = 1 - (t * 0.3);

  return { position: [x, y, z], scale, t };
}

/**
 * Generate an array of points along the trajectory for visualization
 * @param config - Trajectory configuration
 * @param segments - Number of segments to generate
 * @returns Array of TrajectoryPoints
 */
export function generateTrajectoryPath(config: TrajectoryConfig, segments: number = 20): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(calculateTrajectoryPoint(t, config));
  }
  return points;
}

/**
 * Calculate rotation for backspin effect
 * @param t - Progress along trajectory (0 to 1)
 * @param totalRotations - Number of full rotations during flight
 * @returns Rotation in radians
 */
export function calculateBallRotation(t: number, totalRotations: number = 2): number {
  return t * totalRotations * Math.PI * 2;
}

/**
 * Create trajectory config from camera setup
 */
export function createTrajectoryConfig(
  ballStart: [number, number, number],
  targetPosition: { x: number; y: number; z: number },
  arcHeight: number
): TrajectoryConfig {
  return {
    startPosition: { x: ballStart[0], y: ballStart[1], z: ballStart[2] },
    endPosition: targetPosition,
    arcHeight,
    startScale: 1,
    endScale: 0.7,
  };
}
