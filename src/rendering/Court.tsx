import React from 'react';
import * as THREE from 'three';
import type { CourtPosition } from '../types/index';

interface CourtProps {
  showPositionMarkers?: boolean;
  highlightedPosition?: CourtPosition | null;
}

// Court dimensions (half court, scaled for visual appeal)
const COURT_WIDTH = 15;
const COURT_LENGTH = 14;
const LINE_WIDTH = 0.05;

// Position marker locations
const POSITION_MARKERS: Record<CourtPosition, [number, number, number]> = {
  'free-throw': [0, 0.01, -3.6],
  'top-key': [0, 0.01, -6.25],
  'left-wing': [-4.5, 0.01, -3],
  'right-wing': [4.5, 0.01, -3],
  'corner': [-6, 0.01, 1],
};

export function Court({ showPositionMarkers = true, highlightedPosition }: CourtProps) {
  const courtColor = '#B8632B'; // Basketball court brown
  const lineColor = '#FFFFFF';
  const keyColor = '#8B4513'; // Darker brown for key area

  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[COURT_WIDTH, COURT_LENGTH]} />
        <meshStandardMaterial color={courtColor} roughness={0.8} />
      </mesh>

      {/* Key/Paint area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 2.4]}>
        <planeGeometry args={[4.9, 5.8]} />
        <meshStandardMaterial color={keyColor} roughness={0.8} />
      </mesh>

      {/* Court lines */}
      <CourtLines lineColor={lineColor} lineWidth={LINE_WIDTH} />

      {/* Three-point arc */}
      <ThreePointArc lineColor={lineColor} />

      {/* Position markers */}
      {showPositionMarkers && (
        <PositionMarkers highlightedPosition={highlightedPosition} />
      )}
    </group>
  );
}

// Court lines component
function CourtLines({ lineColor, lineWidth }: { lineColor: string; lineWidth: number }) {
  return (
    <group position={[0, 0.002, 0]}>
      {/* Free throw line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.5]}>
        <planeGeometry args={[4.9, lineWidth]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>

      {/* Key sidelines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.45, 0, 2.4]}>
        <planeGeometry args={[lineWidth, 5.8]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.45, 0, 2.4]}>
        <planeGeometry args={[lineWidth, 5.8]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>

      {/* Baseline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 5.3]}>
        <planeGeometry args={[COURT_WIDTH, lineWidth]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>

      {/* Free throw circle */}
      <FreeThrowCircle lineColor={lineColor} />
    </group>
  );
}

// Free throw circle
function FreeThrowCircle({ lineColor }: { lineColor: string }) {
  const segments = 32;
  const radius = 1.8;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments / 2; i++) {
    const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: lineColor });
  const line = new THREE.Line(geometry, material);

  return (
    <group position={[0, 0.003, -0.5]}>
      <primitive object={line} />
    </group>
  );
}

// Three-point arc
function ThreePointArc({ lineColor }: { lineColor: string }) {
  const arcRadius = 6.75; // NBA three-point distance
  const segments = 64;

  // Arc points (from corner to corner)
  const points: THREE.Vector3[] = [];
  const startAngle = -Math.PI / 2 - Math.asin(0.9); // Adjusted for corner three
  const endAngle = -Math.PI / 2 + Math.asin(0.9);

  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (i / segments) * (endAngle - startAngle);
    points.push(new THREE.Vector3(
      Math.cos(angle) * arcRadius,
      0,
      Math.sin(angle) * arcRadius + 5.3
    ));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: lineColor });
  const line = new THREE.Line(geometry, material);

  return (
    <group position={[0, 0.003, 0]}>
      <primitive object={line} />
      {/* Corner three lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.7, 0, 2.65]}>
        <planeGeometry args={[0.05, 5.3]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.7, 0, 2.65]}>
        <planeGeometry args={[0.05, 5.3]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    </group>
  );
}

// Position markers for the 5 shooting spots
function PositionMarkers({ highlightedPosition }: { highlightedPosition?: CourtPosition | null }) {
  const positions = Object.entries(POSITION_MARKERS) as [CourtPosition, [number, number, number]][];

  return (
    <group>
      {positions.map(([name, pos]) => (
        <PositionMarker
          key={name}
          position={pos}
          isHighlighted={highlightedPosition === name}
          label={name}
        />
      ))}
    </group>
  );
}

// Individual position marker
function PositionMarker({
  position,
  isHighlighted,
  label
}: {
  position: [number, number, number];
  isHighlighted: boolean;
  label: string;
}) {
  const normalColor = '#4169E1'; // Royal blue
  const highlightColor = '#FFD700'; // Gold

  return (
    <group position={position}>
      {/* Marker circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 32]} />
        <meshStandardMaterial
          color={isHighlighted ? highlightColor : normalColor}
          emissive={isHighlighted ? highlightColor : normalColor}
          emissiveIntensity={isHighlighted ? 0.5 : 0.2}
        />
      </mesh>
      {/* Inner circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

export default Court;
