import { useState, useCallback, useEffect, useRef } from 'react';
import type { CameraState, CameraStatus, CameraConstraints } from './types';
import { DEFAULT_CAMERA_CONSTRAINTS } from './types';
import { requestCameraAccess } from './permissions';

export interface UseCameraStreamResult {
  status: CameraStatus;
  stream: MediaStream | null;
  error: string | null;
  requestCamera: (constraints?: Partial<CameraConstraints>) => Promise<void>;
  stopCamera: () => void;
}

export function useCameraStream(): UseCameraStreamResult {
  const [state, setState] = useState<CameraState>({
    status: 'idle',
    stream: null,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setState({
      status: 'idle',
      stream: null,
      error: null,
    });
  }, []);

  const requestCamera = useCallback(async (constraints?: Partial<CameraConstraints>) => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: 'requesting',
      error: null,
    }));

    const mergedConstraints: CameraConstraints = {
      ...DEFAULT_CAMERA_CONSTRAINTS,
      ...constraints,
    };

    const mediaConstraints: MediaStreamConstraints = {
      video: {
        width: { ideal: mergedConstraints.width },
        height: { ideal: mergedConstraints.height },
        frameRate: { ideal: mergedConstraints.frameRate },
        facingMode: mergedConstraints.facingMode,
      },
      audio: false,
    };

    try {
      const stream = await requestCameraAccess(mediaConstraints);
      streamRef.current = stream;

      setState({
        status: 'active',
        stream,
        error: null,
      });
    } catch (err) {
      const error = err as Error;
      let status: CameraStatus = 'error';
      let errorMessage = 'Failed to access camera';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        status = 'denied';
        errorMessage = 'Camera permission denied';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support requested settings';
      }

      setState({
        status,
        stream: null,
        error: errorMessage,
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
    };
  }, []);

  return {
    status: state.status,
    stream: state.stream,
    error: state.error,
    requestCamera,
    stopCamera,
  };
}
