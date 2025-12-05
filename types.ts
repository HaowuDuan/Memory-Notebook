
export type AppState = 'LANDING' | 'UPLOAD' | 'RENDERING' | 'SESSION' | 'REVIEW';

export type SessionState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export interface MemoryTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface PhotoData {
  file: File;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

export interface Particle {
  x: number;      // World Space X
  y: number;      // World Space Y
  z: number;      // World Space Z
  originX: number;
  originY: number;
  originZ: number;
  color: string;  // rgb(r,g,b) string
  baseSize: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;   // For sparkles/fading
}
