import React from 'react';
import * as THREE from 'three';
import { HOOP_POSITION, RIM_RADIUS, BACKBOARD_SIZE } from './sceneConfig.ts';

interface HoopProps {
  position?: { x: number; y: number; z: number };
}

export function Hoop({ position = HOOP_POSITION }: HoopProps) {
  const rimColor = '#FF6B35'; // Orange rim
  const backboardColor = '#FFFFFF';
  const poleColor = '#808080';

  // Rim height offset from hoop center
  const rimYOffset = -0.15;
  const backboardYOffset = BACKBOARD_SIZE.height / 2 - 0.1;

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Backboard */}
      <mesh position={[0, backboardYOffset, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[BACKBOARD_SIZE.width, BACKBOARD_SIZE.height, BACKBOARD_SIZE.depth]} />
        <meshStandardMaterial
          color={backboardColor}
          transparent
          opacity={0.9}
          roughness={0.3}
        />
      </mesh>

      {/* Backboard border */}
      <BackboardBorder
        width={BACKBOARD_SIZE.width}
        height={BACKBOARD_SIZE.height}
        yOffset={backboardYOffset}
      />

      {/* Square target box on backboard */}
      <mesh position={[0, backboardYOffset - 0.1, 0.025]}>
        <planeGeometry args={[0.6, 0.45]} />
        <meshBasicMaterial color="#FF0000" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <TargetBoxLines yOffset={backboardYOffset - 0.1} />

      {/* Rim */}
      <mesh
        position={[0, rimYOffset, -RIM_RADIUS - 0.03]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[RIM_RADIUS, 0.015, 16, 32]} />
        <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Rim connector to backboard */}
      <mesh position={[0, rimYOffset, -0.03]}>
        <boxGeometry args={[0.08, 0.03, 0.08]} />
        <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Support pole */}
      <mesh position={[0, -1.5, 0.3]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 3, 16]} />
        <meshStandardMaterial color={poleColor} metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Backboard border lines
function BackboardBorder({ width, height, yOffset }: { width: number; height: number; yOffset: number }) {
  const borderWidth = 0.03;
  const borderColor = '#000000';

  return (
    <group position={[0, yOffset, 0.026]}>
      {/* Top */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, borderWidth, 0.01]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -height / 2, 0]}>
        <boxGeometry args={[width, borderWidth, 0.01]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>
      {/* Left */}
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[borderWidth, height, 0.01]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>
      {/* Right */}
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[borderWidth, height, 0.01]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>
    </group>
  );
}

// Target box lines on backboard
function TargetBoxLines({ yOffset }: { yOffset: number }) {
  const boxWidth = 0.6;
  const boxHeight = 0.45;
  const lineWidth = 0.015;
  const lineColor = '#FFFFFF';

  return (
    <group position={[0, yOffset, 0.027]}>
      {/* Top */}
      <mesh position={[0, boxHeight / 2, 0]}>
        <boxGeometry args={[boxWidth, lineWidth, 0.005]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -boxHeight / 2, 0]}>
        <boxGeometry args={[boxWidth, lineWidth, 0.005]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      {/* Left */}
      <mesh position={[-boxWidth / 2, 0, 0]}>
        <boxGeometry args={[lineWidth, boxHeight, 0.005]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      {/* Right */}
      <mesh position={[boxWidth / 2, 0, 0]}>
        <boxGeometry args={[lineWidth, boxHeight, 0.005]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    </group>
  );
}

export default Hoop;
