import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  UserSettings,
  ShotState,
  TimingZone,
  ShotOutcome,
  ShotEvent,
  AppError
} from '../types/index';
import { DEFAULT_SETTINGS } from '../types/index';

// Camera & Detection
import { CameraProvider, useCameraContext } from '../camera/index';
import { MediaPipeProvider, useDetectionContext } from '../detection/index';

// Shot Engine
import { ShotEngine } from '../shot-engine/ShotEngine';

// Rendering
import { GameScene } from '../rendering/index';

// UI Components
import { LandingScreen } from './LandingScreen';
import { OnboardingFlow } from './OnboardingFlow';
import { GameScreen } from './GameScreen';
import { ErrorBoundary, ErrorDisplay } from './ErrorBoundary';

// Hooks
import { useSettings } from '../hooks/useSettings';
import { useAudio } from '../hooks/useAudio';

type AppScreen = 'landing' | 'setup' | 'game' | 'error';

// Main game controller that coordinates camera, detection, and shot engine
function GameController({
  settings,
  onSettingsChange,
  onExit,
  demoMode
}: {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onExit: () => void;
  demoMode: boolean;
}) {
  const cameraContext = useCameraContext();
  const detectionContext = useDetectionContext();
  const { play } = useAudio();

  const videoRef = useRef<HTMLVideoElement>(null);
  // Use state instead of ref so GameScreen re-renders when engine is created
  const [shotEngine, setShotEngine] = useState<ShotEngine | null>(null);
  // Ref for frame processing loop (avoids depending on lastFrame in useEffect)
  const frameProcessorRef = useRef<number | null>(null);
  const lastProcessedFrameIdRef = useRef<number>(-1);
  // Ref to hold latest detection context (fixes stale closure in RAF loop)
  const detectionContextRef = useRef(detectionContext);
  // Keep ref updated on every render
  detectionContextRef.current = detectionContext;

  // Refs to avoid stale closures in event handlers (prevents engine recreation on settings change)
  const settingsRef = useRef(settings);
  const playRef = useRef(play);
  settingsRef.current = settings;
  playRef.current = play;

  const [shotState, setShotState] = useState<ShotState>('IDLE');
  const [meterValue, setMeterValue] = useState(0);
  const [currentZone, setCurrentZone] = useState<TimingZone>('red');
  const [outcome, setOutcome] = useState<ShotOutcome | null>(null);

  // Position debug data for enhanced overlay
  const [positionDebug, setPositionDebug] = useState<{
    elbowAngle: number;
    wristAboveElbow: boolean;
    angleValid: boolean;
    stableFrames: number;
    formValid: boolean;
    confidence: number;
    engineState: ShotState;
  } | null>(null);

  // Initialize shot engine - only recreate when demoMode changes
  // Settings changes are handled by setConfig() in a separate effect
  useEffect(() => {
    const engine = new ShotEngine({
      difficulty: settingsRef.current.difficulty,
      dominantHand: settingsRef.current.dominantHand,
      courtPosition: settingsRef.current.courtPosition,
      cooldownMs: 1000,
      demoMode,
    });

    setShotEngine(engine);
    engine.start();

    // Subscribe to events - use refs to get current settings/play (avoids stale closures)
    const unsubscribe = engine.subscribe((event: ShotEvent) => {
      switch (event.type) {
        case 'STATE_CHANGE':
          setShotState(event.to);
          if (event.to === 'IDLE') {
            setOutcome(null);
            setMeterValue(0);
          }
          break;
        case 'METER_UPDATE':
          setMeterValue(event.value);
          setCurrentZone(event.zone);
          break;
        case 'RELEASE_DETECTED':
          if (settingsRef.current.soundEnabled) {
            playRef.current('whoosh');
          }
          break;
        case 'OUTCOME_DETERMINED':
          setOutcome(event.outcome);
          if (settingsRef.current.soundEnabled) {
            switch (event.outcome) {
              case 'swish':
                playRef.current('swish');
                break;
              case 'rim_in':
              case 'rim_out':
                playRef.current('rim');
                break;
              case 'airball':
                playRef.current('airball');
                break;
            }
          }
          break;
        case 'POSITION_UPDATE':
          setPositionDebug({
            elbowAngle: event.elbowAngle,
            wristAboveElbow: event.wristAboveElbow,
            angleValid: event.angleValid,
            stableFrames: event.stableFrames,
            formValid: event.formValid,
            confidence: event.confidence,
            engineState: event.engineState,
          });
          break;
      }
    });

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [demoMode]); // Only depend on demoMode - settings handled via setConfig()

  // Update engine config when settings change
  useEffect(() => {
    if (shotEngine) {
      shotEngine.setConfig({
        difficulty: settings.difficulty,
        dominantHand: settings.dominantHand,
        courtPosition: settings.courtPosition,
      });
    }
  }, [shotEngine, settings.difficulty, settings.dominantHand, settings.courtPosition]);

  // Process detection frames using requestAnimationFrame loop
  // This avoids depending on lastFrame in useEffect deps (which caused render storms)
  useEffect(() => {
    if (demoMode || !shotEngine) {
      // Cancel any existing loop
      if (frameProcessorRef.current) {
        cancelAnimationFrame(frameProcessorRef.current);
        frameProcessorRef.current = null;
      }
      return;
    }

    const processLoop = () => {
      // Use ref to get latest detection context (avoids stale closure)
      const ctx = detectionContextRef.current;
      const frame = ctx?.lastFrame;
      if (frame && frame.frameId !== lastProcessedFrameIdRef.current) {
        lastProcessedFrameIdRef.current = frame.frameId;

        // Debug logging (once per second via frame id)
        if (frame.frameId % 30 === 0) {
          console.log('[GameController] Processing frame, pose:', !!frame.landmarks.pose, 'fps:', ctx?.fps);
        }

        shotEngine.processFrame(frame.landmarks, frame.timestamp);
      }
      frameProcessorRef.current = requestAnimationFrame(processLoop);
    };

    frameProcessorRef.current = requestAnimationFrame(processLoop);

    return () => {
      if (frameProcessorRef.current) {
        cancelAnimationFrame(frameProcessorRef.current);
        frameProcessorRef.current = null;
      }
    };
  }, [demoMode, shotEngine]); // Removed lastFrame from deps - using RAF loop instead

  // Connect video element to camera stream
  useEffect(() => {
    if (videoRef.current && cameraContext?.stream) {
      videoRef.current.srcObject = cameraContext.stream;
    }
  }, [cameraContext?.stream]);

  // Request camera when entering non-demo mode
  useEffect(() => {
    console.log('[GameController] Camera status:', cameraContext?.status, 'demoMode:', demoMode);
    if (!demoMode && cameraContext?.status === 'idle') {
      cameraContext.requestCamera();
    }
  }, [demoMode, cameraContext?.status, cameraContext?.requestCamera]);

  const handleAnimationComplete = useCallback(() => {
    // Animation complete, engine will transition to cooldown automatically
  }, []);

  return (
    <>
      {/* 3D Scene */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <GameScene
          courtPosition={settings.courtPosition}
          shotState={shotState}
          meterValue={meterValue}
          outcome={outcome}
          onAnimationComplete={handleAnimationComplete}
        />
      </div>

      {/* Game UI Overlay */}
      <GameScreen
        settings={settings}
        onSettingsChange={onSettingsChange}
        onExit={onExit}
        demoMode={demoMode}
        shotEngine={shotEngine ?? undefined}
        videoRef={demoMode ? undefined : videoRef}
        debugInfo={demoMode ? undefined : {
          cameraStatus: cameraContext?.status,
          detectionStatus: detectionContext?.status,
          fps: detectionContext?.fps,
          hasPose: !!detectionContext?.lastFrame?.landmarks.pose,
          isInFrame: detectionContext?.isUserInFrame,
          positionDebug,
        }}
      />
    </>
  );
}

// Wrapper that provides camera and detection contexts
function GameWithProviders({
  settings,
  onSettingsChange,
  onExit,
  demoMode
}: {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onExit: () => void;
  demoMode: boolean;
}) {
  if (demoMode) {
    // Demo mode - no camera/detection needed
    return (
      <GameController
        settings={settings}
        onSettingsChange={onSettingsChange}
        onExit={onExit}
        demoMode={true}
      />
    );
  }

  return (
    <CameraProvider>
      <MediaPipeProvider>
        <GameController
          settings={settings}
          onSettingsChange={onSettingsChange}
          onExit={onExit}
          demoMode={false}
        />
      </MediaPipeProvider>
    </CameraProvider>
  );
}

// Main App component
export default function App() {
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  const { settings, updateSettings, resetSettings } = useSettings();

  // Check camera availability on mount
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        setCameraAvailable(hasCamera);
      } catch {
        setCameraAvailable(false);
      }
    };
    checkCamera();
  }, []);

  const handleStart = useCallback(() => {
    setScreen('setup');
    setDemoMode(false);
  }, []);

  const handleDemoMode = useCallback(() => {
    setDemoMode(true);
    setScreen('game');
  }, []);

  const handleSetupComplete = useCallback((newSettings: UserSettings) => {
    updateSettings(newSettings);
    setScreen('game');
  }, [updateSettings]);

  const handleSkipToDemo = useCallback(() => {
    setDemoMode(true);
    setScreen('game');
  }, []);

  const handleExit = useCallback(() => {
    setScreen('landing');
    setDemoMode(false);
  }, []);

  const handleSettingsChange = useCallback((newSettings: UserSettings) => {
    updateSettings(newSettings);
  }, [updateSettings]);

  const handleRetry = useCallback(() => {
    setError(null);
    setScreen('landing');
  }, []);

  // Render based on current screen
  const renderScreen = () => {
    if (error) {
      return (
        <ErrorDisplay
          error={error}
          onRetry={handleRetry}
          onDemoMode={handleDemoMode}
        />
      );
    }

    switch (screen) {
      case 'landing':
        return (
          <LandingScreen
            onStart={handleStart}
            onDemoMode={handleDemoMode}
            cameraAvailable={cameraAvailable}
          />
        );

      case 'setup':
        return (
          <OnboardingFlow
            onComplete={handleSetupComplete}
            onSkipToDemo={handleSkipToDemo}
          />
        );

      case 'game':
        return (
          <GameWithProviders
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onExit={handleExit}
            demoMode={demoMode}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary onRetry={handleRetry} onDemoMode={handleDemoMode}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        {renderScreen()}
      </div>
    </ErrorBoundary>
  );
}
