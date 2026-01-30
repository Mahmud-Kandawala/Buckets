import { useState, useCallback, useEffect } from 'react';
import type {
  AppScreen,
  SessionStats,
  UserSettings,
  AppError,
  ShotEvent,
  ShotOutcome,
  TimingZone,
} from '../types/index';
import { DEFAULT_STATS } from '../types/index';
import { useSettings } from './useSettings';

interface UseGameStateReturn {
  screen: AppScreen;
  stats: SessionStats;
  settings: UserSettings;
  error: AppError | null;
  startGame: () => void;
  endGame: () => void;
  goToSetup: () => void;
  goToLanding: () => void;
  setError: (error: AppError | null) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
  resetStats: () => void;
  handleShotEvent: (event: ShotEvent) => void;
}

export function useGameState(): UseGameStateReturn {
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS);
  const [error, setError] = useState<AppError | null>(null);

  const { settings, updateSettings, resetSettings } = useSettings();

  const startGame = useCallback(() => {
    setScreen('game');
    setError(null);
  }, []);

  const endGame = useCallback(() => {
    setScreen('landing');
  }, []);

  const goToSetup = useCallback(() => {
    setScreen('setup');
  }, []);

  const goToLanding = useCallback(() => {
    setScreen('landing');
    setError(null);
  }, []);

  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS);
  }, []);

  // Handle shot engine events to update stats
  const handleShotEvent = useCallback((event: ShotEvent) => {
    if (event.type === 'OUTCOME_DETERMINED') {
      const outcome = event.outcome;
      const isMake = outcome === 'swish' || outcome === 'rim_in';

      setStats((prev) => {
        const newStreak = isMake ? prev.currentStreak + 1 : 0;
        return {
          ...prev,
          totalShots: prev.totalShots + 1,
          makes: prev.makes + (isMake ? 1 : 0),
          misses: prev.misses + (isMake ? 0 : 1),
          currentStreak: newStreak,
          bestStreak: Math.max(prev.bestStreak, newStreak),
        };
      });
    }

    if (event.type === 'SHOT_EVALUATED') {
      const zone = event.timing;
      setStats((prev) => ({
        ...prev,
        greenReleases: prev.greenReleases + (zone === 'green' ? 1 : 0),
        yellowReleases: prev.yellowReleases + (zone === 'yellow' ? 1 : 0),
        redReleases: prev.redReleases + (zone === 'red' ? 1 : 0),
      }));
    }
  }, []);

  // Handle error state - switch to error screen
  useEffect(() => {
    if (error && error.recoverable === false) {
      setScreen('error');
    }
  }, [error]);

  return {
    screen,
    stats,
    settings,
    error,
    startGame,
    endGame,
    goToSetup,
    goToLanding,
    setError,
    updateSettings,
    resetSettings,
    resetStats,
    handleShotEvent,
  };
}
