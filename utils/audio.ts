import { Blob } from '@google/genai';

// Sample rates for audio processing
export const PCM_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

/**
 * Convert base64 string to Uint8Array
 * Used for decoding audio data from Gemini API
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Alias for base64ToUint8Array (used by live-chat-main)
 */
export const decode = base64ToUint8Array;

/**
 * Convert ArrayBuffer to base64 string
 * Used for encoding audio data to send to Gemini API
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Alias for arrayBufferToBase64 (used by live-chat-main)
 */
export function encode(bytes: Uint8Array): string {
  return arrayBufferToBase64(bytes.buffer);
}

/**
 * Create PCM blob from Float32Array audio data
 * This is the Memory-Notebook version
 */
export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] range to prevent distortion
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: `audio/pcm;rate=${PCM_SAMPLE_RATE}`,
  };
}

/**
 * Create PCM blob from Float32Array audio data
 * This is the live-chat-main version (simpler clamping)
 */
export function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling to avoid wrapping artifacts
    const clamped = Math.max(-1, Math.min(1, data[i]));
    int16[i] = clamped * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Decode PCM audio data to AudioBuffer
 * Works with both Memory-Notebook and live-chat-main
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = OUTPUT_SAMPLE_RATE,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
