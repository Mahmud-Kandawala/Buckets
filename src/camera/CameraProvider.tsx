import React, { createContext, useContext, type ReactNode } from 'react';
import { useCameraStream, type UseCameraStreamResult } from './useCameraStream';
import type { CameraConstraints } from './types';

interface CameraContextValue extends UseCameraStreamResult {}

const CameraContext = createContext<CameraContextValue | null>(null);

export interface CameraProviderProps {
  children: ReactNode;
}

export function CameraProvider({ children }: CameraProviderProps): React.ReactElement {
  const cameraStream = useCameraStream();

  return (
    <CameraContext.Provider value={cameraStream}>
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraContext(): CameraContextValue | null {
  return useContext(CameraContext);
}

// Re-export types for convenience
export type { CameraConstraints };
