import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioManager } from '../audio/AudioManager';
import type { SoundEffect } from '../audio/types';

interface UseAudioReturn {
  play: (sound: SoundEffect) => void;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => void;
  isInitialized: boolean;
}

export function useAudio(): UseAudioReturn {
  const managerRef = useRef<AudioManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // Lazy initialization - create manager on first use
  const getManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new AudioManager();
    }
    return managerRef.current;
  }, []);

  // Initialize audio context on first user interaction
  const ensureInitialized = useCallback(async () => {
    if (isInitialized) return;

    if (!initPromiseRef.current) {
      const manager = getManager();
      initPromiseRef.current = manager.initialize().then(() => {
        setIsInitialized(true);
      });
    }

    return initPromiseRef.current;
  }, [isInitialized, getManager]);

  const play = useCallback((sound: SoundEffect) => {
    const manager = getManager();

    // Initialize on first play (requires user interaction)
    if (!isInitialized) {
      ensureInitialized().then(() => {
        manager.play(sound);
      });
    } else {
      manager.play(sound);
    }
  }, [getManager, isInitialized, ensureInitialized]);

  const setVolume = useCallback((volume: number) => {
    getManager().setVolume(volume);
  }, [getManager]);

  const setEnabled = useCallback((enabled: boolean) => {
    getManager().setEnabled(enabled);
  }, [getManager]);

  return {
    play,
    setVolume,
    setEnabled,
    isInitialized,
  };
}
