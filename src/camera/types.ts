export type CameraStatus = 'idle' | 'requesting' | 'active' | 'error' | 'denied';

export interface CameraState {
  status: CameraStatus;
  stream: MediaStream | null;
  error: string | null;
}

export interface CameraConstraints {
  width: number;
  height: number;
  frameRate: number;
  facingMode: 'user' | 'environment';
}

export const DEFAULT_CAMERA_CONSTRAINTS: CameraConstraints = {
  width: 640,
  height: 480,
  frameRate: 30,
  facingMode: 'user',
};
