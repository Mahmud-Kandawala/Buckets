import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ball } from './Ball';
import { Hoop } from './Hoop';
import { Net } from './Net';
import { Court } from './Court';
import { createTrajectoryConfig } from './Trajectory';
import { CAMERA_SETUPS, HOOP_POSITION, RIM_RADIUS } from './sceneConfig';
import type { CourtPosition, ShotState, ShotOutcome, TimingZone } from '../types/index';
import type { TrajectoryConfig } from './types';

interface GameSceneProps {
  courtPosition: CourtPosition;
  shotState: ShotState;
  meterValue: number;
  outcome: ShotOutcome | null;
  onAnimationComplete?: () => void;
}

// Camera controller component
function CameraController({ courtPosition }: { courtPosition: CourtPosition }) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    const setup = CAMERA_SETUPS[courtPosition];
    targetPosition.current.set(...setup.position);
    targetLookAt.current.set(...setup.target);
  }, [courtPosition]);

  useFrame((state, delta) => {
    // Smooth camera transition
    camera.position.lerp(targetPosition.current, delta * 3);

    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.add(camera.position);
    currentLookAt.lerp(targetLookAt.current, delta * 3);
    camera.lookAt(currentLookAt);
  });

  return null;
}

// Lighting setup
function Lighting() {
  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.4} />

      {/* Main directional light (sun-like) */}
      <directionalLight
        position={[10, 20, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Point light near hoop for highlight */}
      <pointLight
        position={[0, 5, 6]}
        intensity={0.3}
        distance={15}
        decay={2}
      />

      {/* Fill light from opposite side */}
      <pointLight
        position={[-5, 3, -5]}
        intensity={0.2}
        distance={20}
        decay={2}
      />
    </>
  );
}

// Main scene content
function SceneContent({
  courtPosition,
  shotState,
  meterValue,
  outcome,
  onAnimationComplete,
}: GameSceneProps) {
  const [trajectoryProgress, setTrajectoryProgress] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [netAnimating, setNetAnimating] = React.useState(false);
  const animationStartRef = useRef<number | null>(null);

  // Create trajectory config based on court position
  const trajectoryConfig = useMemo((): TrajectoryConfig | null => {
    if (shotState !== 'RESULT' || !outcome) return null;

    const setup = CAMERA_SETUPS[courtPosition];

    // All shot outcomes should target the HOOP center X/Z, only Y varies
    // This ensures ball properly aligns with the hoop regardless of court position
    const rimY = HOOP_POSITION.y - 0.15; // Matches rim offset in Hoop
    const rimZ = HOOP_POSITION.z - RIM_RADIUS - 0.03; // Matches rim offset in Hoop
    let endX = HOOP_POSITION.x;  // Always center X (0)
    let endZ = rimZ;             // Aim for actual rim center
    let endY = rimY;

    if (outcome === 'swish') {
      endY = rimY - 0.75;  // Drop well through net for clear swish
    } else if (outcome === 'rim_in') {
      endY = rimY - 0.6;  // Drop through net after bounce
    } else if (outcome === 'airball') {
      endY = rimY + 1.0;  // Miss high - goes OVER the hoop
      endZ = rimZ + 1.0;  // Miss behind backboard
    } else if (outcome === 'rim_out') {
      endY = rimY + 0.3;  // Bounces UP off rim then falls
      // Keep X/Z at hoop center so ball hits the rim properly
    }

    return createTrajectoryConfig(
      setup.ballStart,
      { x: endX, y: endY, z: endZ },
      setup.trajectoryArc
    );
  }, [courtPosition, shotState, outcome]);

  // Animation duration based on outcome
  const animationDuration = useMemo(() => {
    switch (outcome) {
      case 'swish': return 1200;
      case 'rim_in': return 1500;
      case 'rim_out': return 1400;
      case 'airball': return 1000;
      default: return 1200;
    }
  }, [outcome]);

  // Start animation only on transition into RESULT to avoid double shots
  const prevShotStateRef = useRef<ShotState>(shotState);

  useEffect(() => {
    const prevState = prevShotStateRef.current;
    if (shotState === 'RESULT' && prevState !== 'RESULT' && outcome) {
      setIsAnimating(true);
      setTrajectoryProgress(0);
      animationStartRef.current = performance.now();
    }
    prevShotStateRef.current = shotState;
  }, [shotState, outcome]);

  // Reset animation state when leaving RESULT to avoid stale ball positions
  useEffect(() => {
    if (shotState !== 'RESULT') {
      setIsAnimating(false);
      setTrajectoryProgress(0);
      setNetAnimating(false);
      animationStartRef.current = null;
    }
  }, [shotState]);

  // Animation frame
  useFrame(() => {
    if (!isAnimating || animationStartRef.current === null) return;

    const elapsed = performance.now() - animationStartRef.current;
    const progress = Math.min(elapsed / animationDuration, 1);
    setTrajectoryProgress(progress);

    // Trigger net animation when ball reaches hoop
    if (progress > 0.85 && !netAnimating && (outcome === 'swish' || outcome === 'rim_in')) {
      setNetAnimating(true);
    }

    // Animation complete
    if (progress >= 1) {
      setIsAnimating(false);
      animationStartRef.current = null;
    }
  });

  // Handle animation complete
  const handleBallAnimationComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  const handleNetAnimationComplete = useCallback(() => {
    setNetAnimating(false);
  }, []);

  // Determine net entry point based on ball trajectory
  const netEntryPoint = useMemo((): 'center' | 'left' | 'right' => {
    if (!trajectoryConfig) return 'center';
    const startX = trajectoryConfig.startPosition.x;
    if (startX < -1) return 'left';
    if (startX > 1) return 'right';
    return 'center';
  }, [trajectoryConfig]);

  return (
    <>
      <CameraController courtPosition={courtPosition} />
      <Lighting />

      {/* Court floor */}
      <Court
        showPositionMarkers={shotState === 'IDLE' || shotState === 'READY'}
        highlightedPosition={shotState === 'IDLE' ? courtPosition : null}
      />

      {/* Basketball hoop */}
      <Hoop />

      {/* Net */}
      <Net
        isAnimating={netAnimating}
        entryPoint={netEntryPoint}
        onAnimationComplete={handleNetAnimationComplete}
      />

      {/* Basketball */}
      <Ball
        isAnimating={isAnimating}
        trajectoryProgress={trajectoryProgress}
        trajectoryConfig={trajectoryConfig}
        outcome={outcome}
        courtPosition={courtPosition}
        onAnimationComplete={handleBallAnimationComplete}
      />
    </>
  );
}

// Main GameScene component with Canvas
export function GameScene(props: GameSceneProps) {
  return (
    <Canvas
      shadows
      camera={{
        fov: 60,
        near: 0.1,
        far: 100,
        position: CAMERA_SETUPS[props.courtPosition].position,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ background: 'linear-gradient(180deg, #1c1410 0%, #2a1f17 100%)' }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}

export default GameScene;
