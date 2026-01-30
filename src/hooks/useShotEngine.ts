import { useState, useCallback, useRef, useEffect } from 'react';
import { ShotEngine } from '../shot-engine/ShotEngine';
import type {
  ShotState,
  ShotEvent,
  ShotEngineConfig,
  TimingZone,
  HolisticLandmarks,
} from '../types/index';

interface UseShotEngineReturn {
  state: ShotState;
  meterValue: number;
  zone: TimingZone;
  events: ShotEvent[];
  processFrame: (landmarks: HolisticLandmarks, timestamp: number) => void;
  processDemoInput: (action: 'press' | 'release') => void;
  setConfig: (config: Partial<ShotEngineConfig>) => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getZoneBoundaries: () => {
    greenStart: number;
    greenEnd: number;
    yellowStart: number;
    yellowEnd: number;
  };
}

interface UseShotEngineOptions {
  initialConfig?: Partial<ShotEngineConfig>;
  maxEvents?: number;
  onEvent?: (event: ShotEvent) => void;
}

export function useShotEngine(options: UseShotEngineOptions = {}): UseShotEngineReturn {
  const { initialConfig, maxEvents = 100, onEvent } = options;

  const engineRef = useRef<ShotEngine | null>(null);
  const [state, setState] = useState<ShotState>('IDLE');
  const [meterValue, setMeterValue] = useState(0);
  const [zone, setZone] = useState<TimingZone>('red');
  const [events, setEvents] = useState<ShotEvent[]>([]);

  // Initialize engine on mount
  useEffect(() => {
    const engine = new ShotEngine(initialConfig);
    engineRef.current = engine;

    // Subscribe to engine events
    const unsubscribe = engine.subscribe((event) => {
      // Update state based on events
      if (event.type === 'STATE_CHANGE') {
        setState(event.to);
      }

      if (event.type === 'METER_UPDATE') {
        setMeterValue(event.value);
        setZone(event.zone);
      }

      // Store event in history
      setEvents((prev) => {
        const updated = [...prev, event];
        // Trim to max events
        if (updated.length > maxEvents) {
          return updated.slice(-maxEvents);
        }
        return updated;
      });

      // Call external event handler
      if (onEvent) {
        onEvent(event);
      }
    });

    return () => {
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
    };
  }, [initialConfig, maxEvents, onEvent]);

  const processFrame = useCallback((landmarks: HolisticLandmarks, timestamp: number) => {
    engineRef.current?.processFrame(landmarks, timestamp);
  }, []);

  const processDemoInput = useCallback((action: 'press' | 'release') => {
    engineRef.current?.processDemoInput(action);
  }, []);

  const setConfig = useCallback((config: Partial<ShotEngineConfig>) => {
    engineRef.current?.setConfig(config);
  }, []);

  const start = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
    setState('IDLE');
    setMeterValue(0);
    setZone('red');
  }, []);

  const getZoneBoundaries = useCallback(() => {
    return engineRef.current?.getZoneBoundaries() ?? {
      greenStart: 0.375,
      greenEnd: 0.625,
      yellowStart: 0.225,
      yellowEnd: 0.775,
    };
  }, []);

  return {
    state,
    meterValue,
    zone,
    events,
    processFrame,
    processDemoInput,
    setConfig,
    start,
    stop,
    reset,
    getZoneBoundaries,
  };
}
