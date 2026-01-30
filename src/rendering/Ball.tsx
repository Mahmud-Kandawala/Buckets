import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BALL_RADIUS, CAMERA_SETUPS } from './sceneConfig';
import { calculateTrajectoryPoint, calculateBallRotation } from './Trajectory.tsx';
import type { TrajectoryConfig } from './types';
import type { ShotOutcome, CourtPosition } from '../types/index';

interface BallProps {
  isAnimating: boolean;
  trajectoryProgress: number;
  trajectoryConfig: TrajectoryConfig | null;
  outcome: ShotOutcome | null;
  courtPosition: CourtPosition;
  onAnimationComplete?: () => void;
}

export function Ball({
  isAnimating,
  trajectoryProgress,
  trajectoryConfig,
  outcome,
  courtPosition,
  onAnimationComplete
}: BallProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rotationRef = useRef(0);

  // Basketball texture colors
  const orangeColor = useMemo(() => new THREE.Color('#E85D04'), []);
  const brownColor = useMemo(() => new THREE.Color('#8B4513'), []);

  // Create basketball material with stripes
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: orangeColor,
      roughness: 0.8,
      metalness: 0.1,
    });
  }, [orangeColor]);

  useFrame((state, delta) => {
    if (!meshRef.current || !trajectoryConfig) return;

    if (isAnimating && trajectoryProgress < 1) {
      // Calculate position along trajectory
      const point = calculateTrajectoryPoint(trajectoryProgress, trajectoryConfig);
      meshRef.current.position.set(...point.position);
      meshRef.current.scale.setScalar(point.scale);

      // Apply backspin rotation (around X axis for forward spin)
      rotationRef.current = calculateBallRotation(trajectoryProgress, 3);
      meshRef.current.rotation.x = -rotationRef.current; // Negative for backspin
    } else if (trajectoryProgress >= 1 && onAnimationComplete) {
      // Animation complete
      onAnimationComplete();
    }
  });

  // Initial position from trajectory config or court-specific ball start
  const initialPosition = useMemo(() => {
    if (trajectoryConfig) {
      return [
        trajectoryConfig.startPosition.x,
        trajectoryConfig.startPosition.y,
        trajectoryConfig.startPosition.z
      ] as [number, number, number];
    }
    // Use court-specific ball start position
    const setup = CAMERA_SETUPS[courtPosition];
    return [setup.ballStart[0], setup.ballStart[1], setup.ballStart[2]] as [number, number, number];
  }, [trajectoryConfig, courtPosition]);

  // Ensure the ball resets back to the start position between shots
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (trajectoryConfig) {
      const start = trajectoryConfig.startPosition;
      mesh.position.set(start.x, start.y, start.z);
    } else {
      mesh.position.set(initialPosition[0], initialPosition[1], initialPosition[2]);
    }

    mesh.scale.setScalar(1);
    mesh.rotation.set(0, 0, 0);
    rotationRef.current = 0;
  }, [trajectoryConfig, initialPosition]);

  return (
    <mesh ref={meshRef} position={initialPosition} scale={1} castShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <primitive object={material} attach="material" />
      {/* Basketball lines */}
      <BallLines />
    </mesh>
  );
}

// Basketball seam lines
function BallLines() {
  const lineColor = '#1a1a1a';
  const lineWidth = 0.003;

  return (
    <group>
      {/* Horizontal line */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[BALL_RADIUS + 0.001, lineWidth, 8, 32]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      {/* Vertical line */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[BALL_RADIUS + 0.001, lineWidth, 8, 32]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      {/* Curved lines */}
      <mesh rotation={[0, Math.PI / 4, Math.PI / 2]}>
        <torusGeometry args={[BALL_RADIUS + 0.001, lineWidth, 8, 16, Math.PI]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 4, Math.PI / 2]}>
        <torusGeometry args={[BALL_RADIUS + 0.001, lineWidth, 8, 16, Math.PI]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    </group>
  );
}

export default Ball;
