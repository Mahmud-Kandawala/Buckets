import React, { useState, useCallback, useEffect } from 'react';
import type {
  UserSettings,
  SessionStats,
  ShotState,
  TimingZone,
  ShotEvent,
  IShotEngine,
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../types';
import { TimingMeter } from './TimingMeter';
import { SettingsPanel } from './SettingsPanel';
import { DemoModeInput } from './DemoModeInput';

interface PositionDebugInfo {
  elbowAngle: number;
  wristAboveElbow: boolean;
  angleValid: boolean;
  stableFrames: number;
  formValid: boolean;
  confidence: number;
  engineState: string;
}

interface DebugInfo {
  cameraStatus?: string;
  detectionStatus?: string;
  fps?: number;
  hasPose?: boolean;
  isInFrame?: boolean;
  positionDebug?: PositionDebugInfo | null;
}

interface GameScreenProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onExit: () => void;
  demoMode: boolean;
  shotEngine?: IShotEngine;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  debugInfo?: DebugInfo;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    zIndex: 5,
  },
  canvasContainer: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  },
  videoPreview: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    width: '160px',
    height: '120px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid rgba(196, 147, 74, 0.12)',
    backgroundColor: '#000',
    zIndex: 50,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  videoLabel: {
    position: 'absolute',
    bottom: '6px',
    left: '6px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'rgba(245, 240, 232, 0.7)',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 10,
  },
  statsContainer: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '24px',
    padding: '12px 24px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '16px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(196, 147, 74, 0.12)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f5f0e8',
  },
  statLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'rgba(245, 240, 232, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  streakBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: '#e85d26',
    borderRadius: '20px',
    marginTop: '2px',
  },
  streakText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#f5f0e8',
  },
  settingsButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: '1px solid rgba(196, 147, 74, 0.12)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#f5f0e8',
    zIndex: 50,
    pointerEvents: 'auto',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(8px)',
  },
  stateIndicator: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    padding: '12px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(196, 147, 74, 0.12)',
  },
  stateText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f5f0e8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  resultOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '64px',
    fontWeight: 800,
    textShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
    animation: 'resultPop 0.5s ease-out',
    zIndex: 100,
  },
  demoIndicator: {
    position: 'absolute',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(232, 93, 38, 0.8)',
    backgroundColor: 'rgba(232, 93, 38, 0.15)',
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(232, 93, 38, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  exitButton: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    padding: '10px 20px',
    backgroundColor: 'rgba(245, 240, 232, 0.1)',
    border: '1px solid rgba(196, 147, 74, 0.12)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: 'rgba(245, 240, 232, 0.7)',
    zIndex: 50,
    pointerEvents: 'auto',
    transition: 'all 0.2s ease',
  },
  debugOverlay: {
    position: 'absolute',
    top: '150px',
    left: '16px',
    background: 'rgba(0, 0, 0, 0.9)',
    color: '#fff',
    padding: '12px',
    fontSize: '11px',
    fontFamily: 'monospace',
    borderRadius: '8px',
    zIndex: 100,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    minWidth: '160px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  debugRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  debugLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  debugValue: {
    fontWeight: 600,
  },
  debugOk: {
    color: '#4ade80',
  },
  debugWarn: {
    color: '#fbbf24',
  },
  debugError: {
    color: '#f87171',
  },
  timingOverlay: {
    position: 'absolute',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 120,
  },
  timingLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'rgba(245, 240, 232, 0.6)',
  },
  timingBar: {
    width: '240px',
    height: '12px',
    backgroundColor: 'rgba(245, 240, 232, 0.12)',
    borderRadius: '999px',
    overflow: 'hidden',
    border: '1px solid rgba(245, 240, 232, 0.2)',
    position: 'relative',
  },
  timingFill: {
    height: '100%',
    width: '0%',
    borderRadius: '999px',
    transition: 'width 16ms linear',
  },
  timingMarker: {
    position: 'absolute',
    top: '-3px',
    width: '8px',
    height: '18px',
    borderRadius: '6px',
    transform: 'translateX(-50%)',
    boxShadow: '0 0 12px rgba(245, 240, 232, 0.6)',
  },
  timingHint: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(245, 240, 232, 0.7)',
  },
};

const STATE_MESSAGES: Record<ShotState, string> = {
  IDLE: 'Get Ready',
  READY: 'In Position',
  CHARGING: 'Charging...',
  RELEASE: 'Release!',
  RESULT: 'Result',
  COOLDOWN: 'Reset...',
};

const getStateColor = (state: ShotState): string => {
  switch (state) {
    case 'IDLE':
      return 'rgba(245, 240, 232, 0.5)';
    case 'READY':
      return '#00cc44';
    case 'CHARGING':
      return '#e85d26';
    case 'RELEASE':
      return '#ffcc00';
    case 'RESULT':
      return '#00ff55';
    case 'COOLDOWN':
      return 'rgba(245, 240, 232, 0.3)';
  }
};

const getZoneColor = (zone: TimingZone): string => {
  switch (zone) {
    case 'green':
      return '#00ff55';
    case 'yellow':
      return '#ffcc00';
    case 'red':
      return '#ff3333';
  }
};

export const GameScreen: React.FC<GameScreenProps> = ({
  settings,
  onSettingsChange,
  onExit,
  demoMode,
  shotEngine,
  videoRef,
  debugInfo,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [shotState, setShotState] = useState<ShotState>('IDLE');
  const [meterValue, setMeterValue] = useState(0);
  const [currentZone, setCurrentZone] = useState<TimingZone>('red');
  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS);
  const [lastResult, setLastResult] = useState<{ zone: TimingZone; made: boolean } | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);

  // Subscribe to shot engine events
  useEffect(() => {
    if (!shotEngine) return;

    const unsubscribe = shotEngine.subscribe((event: ShotEvent) => {
      switch (event.type) {
        case 'STATE_CHANGE':
          setShotState(event.to);
          if (event.to === 'IDLE' || event.to === 'READY') {
            setMeterValue(0);
            setLastResult(null);
            setCooldownEndsAt(null);
            setCooldownRemainingMs(0);
          }
          break;
        case 'METER_UPDATE':
          setMeterValue(event.value);
          setCurrentZone(event.zone);
          break;
        case 'SHOT_EVALUATED':
          setLastResult({ zone: event.timing, made: false });
          break;
        case 'OUTCOME_DETERMINED':
          const made = event.outcome === 'swish' || event.outcome === 'rim_in';
          setLastResult(prev => prev ? { ...prev, made } : null);
          setStats(prev => ({
            ...prev,
            totalShots: prev.totalShots + 1,
            makes: prev.makes + (made ? 1 : 0),
            misses: prev.misses + (made ? 0 : 1),
            currentStreak: made ? prev.currentStreak + 1 : 0,
            bestStreak: made ? Math.max(prev.bestStreak, prev.currentStreak + 1) : prev.bestStreak,
          }));
          break;
        case 'COOLDOWN_START': {
          const endsAt = event.timestamp + event.durationMs;
          setCooldownEndsAt(endsAt);
          setCooldownRemainingMs(event.durationMs);
          break;
        }
        case 'COOLDOWN_END':
          setCooldownEndsAt(null);
          setCooldownRemainingMs(0);
          break;
      }
    });

    // Sync initial state in case we subscribed mid-state
    setShotState(shotEngine.getState());
    setMeterValue(shotEngine.getMeterValue());
    setCurrentZone(shotEngine.getCurrentZone());

    return unsubscribe;
  }, [shotEngine]);

  // Demo mode meter updates (no camera frames to drive METER_UPDATE events)
  useEffect(() => {
    if (!demoMode || !shotEngine) return;
    const meterActive = shotState === 'CHARGING' || shotState === 'RELEASE';
    if (!meterActive) return;

    let rafId: number | null = null;
    const loop = () => {
      const update = shotEngine.updateMeter?.();
      if (update) {
        setMeterValue(update.value);
        setCurrentZone(update.zone);
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [demoMode, shotEngine, shotState]);

  // Update cooldown countdown while active
  useEffect(() => {
    if (cooldownEndsAt === null) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, cooldownEndsAt - performance.now());
      setCooldownRemainingMs(remaining);
      if (remaining <= 0) {
        setCooldownEndsAt(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  const handleDemoPress = useCallback(() => {
    shotEngine?.processDemoInput('press');
  }, [shotEngine]);

  const handleDemoRelease = useCallback(() => {
    shotEngine?.processDemoInput('release');
  }, [shotEngine]);

  const isMeterActive = shotState === 'CHARGING' || shotState === 'RELEASE';
  const timingProgress = Math.max(0, Math.min(1, meterValue));
  const timingPercent = `${Math.round(timingProgress * 100)}%`;
  const zoneColor = getZoneColor(currentZone);
  const cooldownSeconds = cooldownRemainingMs > 0 ? (cooldownRemainingMs / 1000).toFixed(1) : '0.0';
  const stateMessage = shotState === 'COOLDOWN' && cooldownRemainingMs > 0
    ? `Resetting ${cooldownSeconds}s`
    : STATE_MESSAGES[shotState];
  const shootingPct = stats.totalShots > 0
    ? Math.round((stats.makes / stats.totalShots) * 100)
    : 0;

  return (
    <div style={styles.container}>
      {/* 3D Canvas would go here */}
      <div style={styles.canvasContainer} id="game-canvas">
        {/* Three.js canvas will be rendered here */}
      </div>

      {/* Camera preview (only if not demo mode) */}
      {!demoMode && videoRef && (
        <div style={styles.videoPreview}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
          <span style={styles.videoLabel}>Camera</span>
        </div>
      )}

      {/* UI Overlay */}
      <div style={styles.overlay}>
        {/* Stats bar */}
        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.makes}/{stats.totalShots}</span>
            <span style={styles.statLabel}>Shots</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{shootingPct}%</span>
            <span style={styles.statLabel}>Accuracy</span>
          </div>
          {stats.currentStreak > 0 && (
            <div style={styles.statItem}>
              <div style={styles.streakBadge}>
                <span style={styles.streakText}>{stats.currentStreak}</span>
                <span style={{ fontSize: '14px' }}>&#128293;</span>
              </div>
              <span style={styles.statLabel}>Streak</span>
            </div>
          )}
        </div>

        {/* Demo mode indicator */}
        {demoMode && (
          <div style={styles.demoIndicator}>
            Demo Mode Active
          </div>
        )}

        {/* State indicator */}
        <div style={styles.stateIndicator}>
          <span style={{ ...styles.stateText, color: getStateColor(shotState) }}>
            {stateMessage}
          </span>
        </div>

        {/* Shot timing overlay */}
        <div style={{ ...styles.timingOverlay, opacity: isMeterActive ? 1 : 0.45 }}>
          <div style={styles.timingLabel}>Shot Timing</div>
          <div style={styles.timingBar}>
            <div
              style={{
                ...styles.timingFill,
                width: timingPercent,
                backgroundColor: zoneColor,
                boxShadow: `0 0 16px ${zoneColor}`,
              }}
            />
            <div
              style={{
                ...styles.timingMarker,
                left: timingPercent,
                backgroundColor: zoneColor,
              }}
            />
          </div>
          <div style={{ ...styles.timingHint, color: zoneColor }}>
            {isMeterActive ? `Release in ${currentZone.toUpperCase()}` : 'Get set'}
          </div>
        </div>

        {/* Result overlay */}
        {lastResult && shotState === 'RESULT' && (
          <div
            style={{
              ...styles.resultOverlay,
              color: lastResult.made ? '#00ff55' : '#ff5555',
            }}
          >
            {lastResult.made ? 'SWISH!' : 'MISS'}
          </div>
        )}
      </div>

      {/* Timing meter */}
      <TimingMeter
        value={meterValue}
        zone={currentZone}
        isActive={isMeterActive}
      />

      {/* Demo mode input */}
      <DemoModeInput
        onPress={handleDemoPress}
        onRelease={handleDemoRelease}
        isActive={demoMode}
      />

      {/* Settings button */}
      <button
        style={styles.settingsButton}
        onClick={() => setShowSettings(true)}
        aria-label="Open settings"
      >
        &#9881;
      </button>

      {/* Exit button */}
      <button
        style={styles.exitButton}
        onClick={onExit}
      >
        Exit
      </button>

      {/* Debug overlay - shows detection pipeline status */}
      {!demoMode && debugInfo && (
        <div style={styles.debugOverlay as React.CSSProperties}>
          {/* Pipeline Status */}
          <div style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '6px' }}>
            <div style={styles.debugRow as React.CSSProperties}>
              <span style={styles.debugLabel as React.CSSProperties}>Camera:</span>
              <span style={{
                ...(styles.debugValue as React.CSSProperties),
                ...(debugInfo.cameraStatus === 'active' ? styles.debugOk : styles.debugWarn) as React.CSSProperties
              }}>
                {debugInfo.cameraStatus || 'unknown'}
              </span>
            </div>
            <div style={styles.debugRow as React.CSSProperties}>
              <span style={styles.debugLabel as React.CSSProperties}>Detection:</span>
              <span style={{
                ...(styles.debugValue as React.CSSProperties),
                ...(debugInfo.detectionStatus === 'ready' ? styles.debugOk : styles.debugWarn) as React.CSSProperties
              }}>
                {debugInfo.detectionStatus || 'unknown'}
              </span>
            </div>
            <div style={styles.debugRow as React.CSSProperties}>
              <span style={styles.debugLabel as React.CSSProperties}>FPS:</span>
              <span style={{
                ...(styles.debugValue as React.CSSProperties),
                ...((debugInfo.fps ?? 0) > 0 ? styles.debugOk : styles.debugError) as React.CSSProperties
              }}>
                {debugInfo.fps ?? 0}
              </span>
            </div>
            <div style={styles.debugRow as React.CSSProperties}>
              <span style={styles.debugLabel as React.CSSProperties}>Pose:</span>
              <span style={{
                ...(styles.debugValue as React.CSSProperties),
                ...(debugInfo.hasPose ? styles.debugOk : styles.debugError) as React.CSSProperties
              }}>
                {debugInfo.hasPose ? '✓' : '✗'}
              </span>
            </div>
            <div style={styles.debugRow as React.CSSProperties}>
              <span style={styles.debugLabel as React.CSSProperties}>In Frame:</span>
              <span style={{
                ...(styles.debugValue as React.CSSProperties),
                ...(debugInfo.isInFrame ? styles.debugOk : styles.debugWarn) as React.CSSProperties
              }}>
                {debugInfo.isInFrame ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Position Detection Debug */}
          {debugInfo.positionDebug && (
            <div>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', fontWeight: 600 }}>FORM DETECTION</div>
              <div style={styles.debugRow as React.CSSProperties}>
                <span style={styles.debugLabel as React.CSSProperties}>Engine:</span>
                <span style={{
                  ...(styles.debugValue as React.CSSProperties),
                  ...(debugInfo.positionDebug.engineState === 'CHARGING' ? styles.debugOk : styles.debugWarn) as React.CSSProperties
                }}>
                  {debugInfo.positionDebug.engineState}
                </span>
              </div>
              <div style={styles.debugRow as React.CSSProperties}>
                <span style={styles.debugLabel as React.CSSProperties}>Elbow°:</span>
                <span style={{
                  ...(styles.debugValue as React.CSSProperties),
                  ...(debugInfo.positionDebug.angleValid ? styles.debugOk : styles.debugError) as React.CSSProperties
                }}>
                  {debugInfo.positionDebug.elbowAngle.toFixed(0)}° {debugInfo.positionDebug.angleValid ? '✓' : '✗'}
                </span>
              </div>
              <div style={{ fontSize: '9px', color: '#666', marginLeft: '4px', marginBottom: '2px' }}>
                (need 15-160°)
              </div>
              <div style={styles.debugRow as React.CSSProperties}>
                <span style={styles.debugLabel as React.CSSProperties}>Wrist↑:</span>
                <span style={{
                  ...(styles.debugValue as React.CSSProperties),
                  ...(debugInfo.positionDebug.wristAboveElbow ? styles.debugOk : styles.debugError) as React.CSSProperties
                }}>
                  {debugInfo.positionDebug.wristAboveElbow ? '✓ above elbow' : '✗ below elbow'}
                </span>
              </div>
              <div style={styles.debugRow as React.CSSProperties}>
                <span style={styles.debugLabel as React.CSSProperties}>Stable:</span>
                <span style={{
                  ...(styles.debugValue as React.CSSProperties),
                  ...(debugInfo.positionDebug.stableFrames >= 4 ? styles.debugOk :
                      debugInfo.positionDebug.stableFrames >= 2 ? styles.debugWarn : styles.debugError) as React.CSSProperties
                }}>
                  {debugInfo.positionDebug.stableFrames}/4
                </span>
              </div>
              <div style={styles.debugRow as React.CSSProperties}>
                <span style={styles.debugLabel as React.CSSProperties}>Conf:</span>
                <span style={{
                  ...(styles.debugValue as React.CSSProperties),
                  ...(debugInfo.positionDebug.confidence >= 0.5 ? styles.debugOk : styles.debugError) as React.CSSProperties
                }}>
                  {(debugInfo.positionDebug.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{
                marginTop: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: debugInfo.positionDebug.formValid ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                color: debugInfo.positionDebug.formValid ? '#4ade80' : '#f87171',
                fontWeight: 600,
                textAlign: 'center',
                fontSize: '10px',
              }}>
                {debugInfo.positionDebug.formValid ? 'FORM VALID ✓' : 'FORM INVALID ✗'}
              </div>
            </div>
          )}

          {/* No position data indicator */}
          {!debugInfo.positionDebug && debugInfo.hasPose && (
            <div style={{ color: '#fbbf24', fontSize: '10px', marginTop: '4px' }}>
              Waiting for position data...
            </div>
          )}
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={onSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default GameScreen;
