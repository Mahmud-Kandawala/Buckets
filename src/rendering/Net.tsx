import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOOP_POSITION, RIM_RADIUS } from './sceneConfig.ts';
import type { NetState } from './types.ts';

interface NetProps {
  isAnimating: boolean;
  entryPoint?: 'center' | 'left' | 'right';
  onAnimationComplete?: () => void;
}

// Net physics configuration
const NET_CONFIG = {
  strands: 12,
  segments: 8,
  length: 0.45,
  stiffness: 0.3,
  damping: 0.15,
  restoreTime: 500, // ms to return to rest
};

export function Net({ isAnimating, entryPoint = 'center', onAnimationComplete }: NetProps) {
  const strandRefs = useRef<THREE.Mesh[]>([]);
  const animationStartTime = useRef<number | null>(null);
  const strandOffsets = useRef<number[]>(new Array(NET_CONFIG.strands).fill(0));

  // Calculate strand positions around rim
  const strandPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < NET_CONFIG.strands; i++) {
      const angle = (i / NET_CONFIG.strands) * Math.PI * 2;
      const x = Math.cos(angle) * (RIM_RADIUS - 0.02);
      const z = Math.sin(angle) * (RIM_RADIUS - 0.02);
      positions.push([x, 0, z]);
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (isAnimating && animationStartTime.current === null) {
      animationStartTime.current = state.clock.elapsedTime * 1000;

      // Initialize offsets based on entry point
      const entryIndex = entryPoint === 'center' ? NET_CONFIG.strands / 2
        : entryPoint === 'left' ? 0
        : NET_CONFIG.strands - 1;

      for (let i = 0; i < NET_CONFIG.strands; i++) {
        const distance = Math.abs(i - entryIndex);
        strandOffsets.current[i] = 0.1 * Math.max(0, 1 - distance / 4);
      }
    }

    if (animationStartTime.current !== null) {
      const elapsed = (state.clock.elapsedTime * 1000) - animationStartTime.current;

      if (elapsed < NET_CONFIG.restoreTime) {
        // Apply spring physics
        for (let i = 0; i < NET_CONFIG.strands; i++) {
          const targetOffset = 0;
          const currentOffset = strandOffsets.current[i] ?? 0;

          // Spring equation: F = -stiffness * x - damping * v
          const spring = -NET_CONFIG.stiffness * currentOffset;
          const dampingForce = -NET_CONFIG.damping * (currentOffset - targetOffset);

          const newOffset = currentOffset + (spring + dampingForce) * delta * 10;
          strandOffsets.current[i] = newOffset;

          // Update mesh position
          const mesh = strandRefs.current[i];
          if (mesh) {
            mesh.position.y = -NET_CONFIG.length / 2 + newOffset;
            mesh.rotation.z = newOffset * 2;
          }
        }
      } else {
        // Animation complete
        animationStartTime.current = null;
        strandOffsets.current = new Array(NET_CONFIG.strands).fill(0);
        onAnimationComplete?.();
      }
    }
  });

  // Net position relative to rim
  const netPosition: [number, number, number] = [
    HOOP_POSITION.x,
    HOOP_POSITION.y - 0.15, // Below rim
    HOOP_POSITION.z - RIM_RADIUS - 0.03,
  ];

  return (
    <group position={netPosition}>
      {strandPositions.map((pos, i) => (
        <NetStrand
          key={i}
          position={pos}
          ref={(el) => {
            if (el) strandRefs.current[i] = el;
          }}
        />
      ))}
      {/* Horizontal rings connecting strands */}
      <NetRings />
    </group>
  );
}

// Individual net strand
const NetStrand = React.forwardRef<THREE.Mesh, { position: [number, number, number] }>(
  ({ position }, ref) => {
    return (
      <mesh ref={ref} position={[position[0], -NET_CONFIG.length / 2, position[2]]}>
        <cylinderGeometry args={[0.003, 0.002, NET_CONFIG.length, 4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>
    );
  }
);

NetStrand.displayName = 'NetStrand';

// Horizontal rings connecting net strands
function NetRings() {
  const rings = 4;
  const ringSpacing = NET_CONFIG.length / (rings + 1);

  return (
    <>
      {Array.from({ length: rings }).map((_, i) => {
        const y = -ringSpacing * (i + 1);
        const radius = RIM_RADIUS - 0.02 - (i * 0.03); // Tapers inward
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.002, 4, 24]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
        );
      })}
    </>
  );
}

export default Net;
