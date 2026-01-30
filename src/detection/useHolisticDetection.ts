import { useState, useCallback, useEffect, useRef } from 'react';
import type { DetectionState, DetectionStatus } from './types';
import type { DetectionFrame, HolisticLandmarks, NormalizedLandmark } from '../types/index';
import { POSE_LANDMARKS } from '../types/index';
import { isLandmarkVisible } from './landmarkUtils';

// MediaPipe Holistic types
interface HolisticResults {
  poseLandmarks?: { x: number; y: number; z: number; visibility?: number }[];
  leftHandLandmarks?: { x: number; y: number; z: number }[];
  rightHandLandmarks?: { x: number; y: number; z: number }[];
}

interface HolisticInstance {
  setOptions(options: Record<string, unknown>): void;
  onResults(callback: (results: HolisticResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

interface HolisticConstructor {
  new (config: { locateFile: (file: string) => string }): HolisticInstance;
}

declare global {
  interface Window {
    Holistic?: HolisticConstructor;
  }
}

export interface UseHolisticDetectionResult {
  status: DetectionStatus;
  fps: number;
  lastFrame: DetectionFrame | null;
  error: string | null;
  isUserInFrame: boolean;
}

interface UseHolisticDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
}

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function useHolisticDetection({
  videoRef,
  enabled = true,
}: UseHolisticDetectionOptions): UseHolisticDetectionResult {
  const [state, setState] = useState<DetectionState>({
    status: 'idle',
    fps: 0,
    lastFrame: null,
    error: null,
  });
  const [isUserInFrame, setIsUserInFrame] = useState(false);

  const holisticRef = useRef<HolisticInstance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsCounterRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const lastLogSecondRef = useRef<number>(0);
  const lastVideoDebugRef = useRef<number>(0);
  // Ref to hold processResults callback - prevents infinite loop from dependency array
  const processResultsRef = useRef<((results: HolisticResults) => void) | null>(null);

  const checkUserInFrame = useCallback((pose: NormalizedLandmark[] | null): boolean => {
    if (!pose || pose.length === 0) return false;

    // Check if key landmarks are visible
    const leftShoulder = pose[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = pose[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftElbow = pose[POSE_LANDMARKS.LEFT_ELBOW];
    const rightElbow = pose[POSE_LANDMARKS.RIGHT_ELBOW];
    const leftWrist = pose[POSE_LANDMARKS.LEFT_WRIST];
    const rightWrist = pose[POSE_LANDMARKS.RIGHT_WRIST];

    // Need at least one shoulder and one arm visible
    const hasLeftArm = isLandmarkVisible(leftShoulder) && isLandmarkVisible(leftElbow) && isLandmarkVisible(leftWrist);
    const hasRightArm = isLandmarkVisible(rightShoulder) && isLandmarkVisible(rightElbow) && isLandmarkVisible(rightWrist);

    return hasLeftArm || hasRightArm;
  }, []);

  const processResults = useCallback((results: HolisticResults) => {
    const now = performance.now();
    const processingStart = now;

    // Debug logging (once per second)
    const currentSecond = Math.floor(now / 1000);
    if (currentSecond !== lastLogSecondRef.current) {
      console.log('[MediaPipe] Got results, pose:', !!results.poseLandmarks, 'leftHand:', !!results.leftHandLandmarks, 'rightHand:', !!results.rightHandLandmarks);
      lastLogSecondRef.current = currentSecond;
    }

    // Convert landmarks to our format
    const pose: NormalizedLandmark[] | null = results.poseLandmarks
      ? results.poseLandmarks.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
        }))
      : null;

    const leftHand: NormalizedLandmark[] | null = results.leftHandLandmarks
      ? results.leftHandLandmarks.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: 1, // Hand landmarks don't have visibility
        }))
      : null;

    const rightHand: NormalizedLandmark[] | null = results.rightHandLandmarks
      ? results.rightHandLandmarks.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: 1,
        }))
      : null;

    const landmarks: HolisticLandmarks = {
      pose,
      leftHand,
      rightHand,
    };

    const processingTimeMs = performance.now() - processingStart;
    frameIdRef.current += 1;

    const frame: DetectionFrame = {
      landmarks,
      timestamp: now,
      frameId: frameIdRef.current,
      processingTimeMs,
    };

    // Update FPS counter
    fpsCounterRef.current += 1;

    // THROTTLE: Only update React state once per second (for FPS) or every 3rd frame
    // This prevents the "Maximum update depth exceeded" error from cascading state updates
    const shouldUpdateState = now - lastFpsUpdateRef.current >= 1000 || frameIdRef.current % 3 === 0;

    if (now - lastFpsUpdateRef.current >= 1000) {
      const fps = fpsCounterRef.current;
      fpsCounterRef.current = 0;
      lastFpsUpdateRef.current = now;

      setState((prev) => ({
        ...prev,
        fps,
        lastFrame: frame,
        status: 'ready',
      }));
    } else if (shouldUpdateState) {
      // Update lastFrame at ~10 FPS (every 3rd frame) instead of 30 FPS
      setState((prev) => ({
        ...prev,
        lastFrame: frame,
        status: 'ready',
      }));
    }

    // Check if user is in frame (also throttled)
    if (shouldUpdateState) {
      const userVisible = checkUserInFrame(pose);
      setIsUserInFrame(userVisible);
    }

    processingRef.current = false;
  }, [checkUserInFrame]);

  // Keep ref updated with latest callback (avoids stale closure in MediaPipe handler)
  processResultsRef.current = processResults;

  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const holistic = holisticRef.current;

    if (!video || !holistic || !enabled || video.paused || video.ended) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();

    // Check if video has actual data to process
    if (video.readyState < 2) {  // HAVE_CURRENT_DATA = 2
      const currentSecond = Math.floor(now / 1000);
      if (currentSecond !== lastVideoDebugRef.current) {
        console.log('[MediaPipe] Video not ready, readyState:', video.readyState);
        lastVideoDebugRef.current = currentSecond;
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Debug logging for video state (once per second)
    const currentSecond = Math.floor(now / 1000);
    if (currentSecond !== lastVideoDebugRef.current) {
      console.log('[MediaPipe] Video state:', {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
      });
      lastVideoDebugRef.current = currentSecond;
    }

    // Throttle to target FPS
    if (now - lastFrameTimeRef.current < FRAME_INTERVAL) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Skip if still processing previous frame
    if (processingRef.current) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    lastFrameTimeRef.current = now;
    processingRef.current = true;

    try {
      await holistic.send({ image: video });
    } catch (err) {
      console.error('MediaPipe processing error:', err);
      processingRef.current = false;
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, enabled]);

  // Load and initialize MediaPipe Holistic
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const loadHolistic = async () => {
      console.log('[MediaPipe] Loading holistic model...');
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        // Check if already loaded
        if (!window.Holistic) {
          // Load the MediaPipe Holistic script
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load MediaPipe Holistic'));
            document.head.appendChild(script);
          });
        }

        if (!mounted) return;

        if (!window.Holistic) {
          throw new Error('MediaPipe Holistic not available');
        }

        const holistic = new window.Holistic({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
          },
        });

        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          refineFaceLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // Use ref to avoid recreating MediaPipe when callback changes
        holistic.onResults((results) => {
          processResultsRef.current?.(results);
        });

        holisticRef.current = holistic;

        if (mounted) {
          console.log('[MediaPipe] Holistic model ready');
          setState((prev) => ({ ...prev, status: 'ready', error: null }));
        }
      } catch (err) {
        if (mounted) {
          const error = err as Error;
          setState({
            status: 'error',
            fps: 0,
            lastFrame: null,
            error: error.message || 'Failed to initialize MediaPipe',
          });
        }
      }
    };

    loadHolistic();

    return () => {
      mounted = false;
    };
  }, [enabled]); // Removed processResults - using ref instead to prevent infinite loop

  // Fix race condition: Start frame loop when holistic becomes ready and video is already playing
  useEffect(() => {
    const video = videoRef.current;

    // When holistic becomes ready and video is already playing, start the loop
    if (state.status === 'ready' && holisticRef.current && enabled && video && !video.paused && !video.ended) {
      console.log('[MediaPipe] Status ready and video playing, ensuring frame loop starts');
      if (animationFrameRef.current === null) {
        lastFrameTimeRef.current = performance.now();
        lastFpsUpdateRef.current = performance.now();
        fpsCounterRef.current = 0;
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    }
  }, [state.status, enabled, processFrame, videoRef]);

  // Start/stop processing loop
  useEffect(() => {
    const video = videoRef.current;
    const holistic = holisticRef.current;

    if (!video || !holistic || !enabled || state.status !== 'ready') {
      return;
    }

    // Start processing when video is playing
    const handlePlay = () => {
      console.log('[MediaPipe] Video play detected, starting frame loop');
      if (animationFrameRef.current === null) {
        lastFrameTimeRef.current = performance.now();
        lastFpsUpdateRef.current = performance.now();
        fpsCounterRef.current = 0;
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    const handlePause = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    // Start if video is already playing
    if (!video.paused && !video.ended) {
      handlePlay();
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      handlePause();
    };
  }, [videoRef, enabled, state.status, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (holisticRef.current) {
        holisticRef.current.close();
        holisticRef.current = null;
      }
    };
  }, []);

  return {
    status: state.status,
    fps: state.fps,
    lastFrame: state.lastFrame,
    error: state.error,
    isUserInFrame,
  };
}
