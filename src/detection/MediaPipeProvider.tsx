import React, { createContext, useContext, useRef, useEffect, type ReactNode } from 'react';
import { useHolisticDetection, type UseHolisticDetectionResult } from './useHolisticDetection';
import { useCameraContext } from '../camera/CameraProvider';
import type { DetectionStatus } from './types';
import type { DetectionFrame } from '../types/index';

interface DetectionContextValue extends UseHolisticDetectionResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const DetectionContext = createContext<DetectionContextValue | null>(null);

export interface MediaPipeProviderProps {
  children: ReactNode;
}

export function MediaPipeProvider({ children }: MediaPipeProviderProps): React.ReactElement {
  const cameraContext = useCameraContext();
  const stream = cameraContext?.stream ?? null;
  const cameraStatus = cameraContext?.status ?? 'inactive';
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      console.log('[Camera] Video play() called, stream attached');
      video.play().catch((err) => {
        console.error('Failed to play video:', err);
      });
    } else {
      video.srcObject = null;
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  const detectionEnabled = cameraStatus === 'active' && stream !== null;
  // Note: Removed per-render logging - was causing console spam during render storms

  const detection = useHolisticDetection({
    videoRef,
    enabled: detectionEnabled,
  });

  const contextValue: DetectionContextValue = {
    ...detection,
    videoRef,
  };

  return (
    <DetectionContext.Provider value={contextValue}>
      {/* Hidden video element for processing */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          width: 320,      // Large enough for browsers to decode frames
          height: 240,     // Large enough for browsers to decode frames
          left: -9999,     // Off-screen (hidden but still decoded)
          top: -9999,
          pointerEvents: 'none',
        }}
        playsInline
        muted
      />
      {children}
    </DetectionContext.Provider>
  );
}

export function useDetectionContext(): DetectionContextValue | null {
  return useContext(DetectionContext);
}

// Re-export types for convenience
export type { DetectionStatus, DetectionFrame };
