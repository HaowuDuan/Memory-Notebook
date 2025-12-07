import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

// Transcript callbacks for handling transcription events
export interface TranscriptCallbacks {
  onUserTranscriptionChunk?: (text: string) => void;
  onUserTranscriptionComplete?: (fullText: string) => void;
  onAiTranscriptionChunk?: (text: string) => void;
  onAiTranscriptionComplete?: (fullText: string) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
}

// Audio level callback for real-time visualization
export interface AudioCallbacks {
  onAudioLevel?: (level: number) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
}

// Hook configuration
export interface UseGeminiLiveConfig {
  systemInstruction?: string;
  voiceName?: string;
  photoContext?: string; // Base64 photo data for Memory-Notebook
  transcriptCallbacks?: TranscriptCallbacks;
  audioCallbacks?: AudioCallbacks;
}

export interface UseGeminiLiveReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (config?: UseGeminiLiveConfig) => Promise<void>;
  disconnect: () => void;
  audioContexts: {
    input: AudioContext | null;
    output: AudioContext | null;
  };
  analysers: {
    input: AnalyserNode | null;
    output: AnalyserNode | null;
  };
}

export const useGeminiLive = (): UseGeminiLiveReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio contexts and processing to avoid re-renders
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null); // To track the actual session object for cleanup

  // Refs for transcript accumulation
  const currentUserTextRef = useRef<string>('');
  const currentAiTextRef = useRef<string>('');
  const configRef = useRef<UseGeminiLiveConfig>({});

  // Cleanup function to stop all audio and close connections
  const cleanup = useCallback(() => {
    // Stop all playing sources
    audioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if source already stopped
      }
    });
    audioSourcesRef.current.clear();

    // Close audio contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Reset analysers
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;

    // Close Gemini session
    if (currentSessionRef.current) {
      if (typeof currentSessionRef.current.close === 'function') {
        currentSessionRef.current.close();
      }
      currentSessionRef.current = null;
    }

    // Reset transcript accumulation
    currentUserTextRef.current = '';
    currentAiTextRef.current = '';

    sessionPromiseRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async (config: UseGeminiLiveConfig = {}) => {
    if (!process.env.API_KEY) {
      setError("API Key not found in environment variables.");
      return;
    }

    // Store config for callbacks
    configRef.current = config;

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser doesn't support microphone access. Please use Chrome, Firefox, or Edge, and make sure you're accessing via localhost or HTTPS.");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Reset transcript accumulation
      currentUserTextRef.current = '';
      currentAiTextRef.current = '';

      // 1. Initialize Audio Contexts
      // Input: 16kHz for Gemini
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Your browser doesn't support Web Audio API.");
      }

      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      // Output: 24kHz for Gemini response
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // 2. Setup Analysers for Visualization
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      inputAnalyser.smoothingTimeConstant = 0.5;
      inputAnalyserRef.current = inputAnalyser;

      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyser.smoothingTimeConstant = 0.5;
      outputAnalyserRef.current = outputAnalyser;

      // 3. Get Microphone Stream
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('Microphone access granted!');

      // 4. Setup Input Pipeline
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);

      source.connect(inputAnalyser);
      inputAnalyser.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);

      // 5. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

      // 6. Define Session Callbacks
      const sessionPromise = ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName || 'Kore' } },
          },
          systemInstruction: config.systemInstruction || "You are a helpful, witty, and concise AI assistant. Keep your responses short and conversational.",
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setIsConnected(true);
            setIsConnecting(false);

            // Start processing audio input
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);

              // Send to Gemini
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            const content = message.serverContent;

            // 1. Handle User Input Transcription (NEW - fixes missing user transcripts)
            if (content?.inputTranscription?.text) {
              const userChunk = content.inputTranscription.text;
              currentUserTextRef.current += userChunk;
              configRef.current.transcriptCallbacks?.onUserTranscriptionChunk?.(userChunk);
            }

            // Note: User input transcription completion is typically indicated by modelTurn starting
            // We'll save the user text when we detect the AI is about to respond

            // 2. Handle AI Output Transcription (IMPROVED - proper accumulation)
            if (content?.outputTranscription?.text) {
              const aiChunk = content.outputTranscription.text;
              currentAiTextRef.current += aiChunk;
              configRef.current.transcriptCallbacks?.onAiTranscriptionChunk?.(aiChunk);
            }

            // 3. Handle Audio Output
            const base64Audio = content?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              // When AI starts responding, save any accumulated user text
              if (currentUserTextRef.current && audioSourcesRef.current.size === 0) {
                const fullUserText = currentUserTextRef.current;
                configRef.current.transcriptCallbacks?.onUserTranscriptionComplete?.(fullUserText);
                currentUserTextRef.current = ''; // Reset for next turn
              }
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;

              // Notify speaking state
              if (audioSourcesRef.current.size === 0) {
                configRef.current.audioCallbacks?.onSpeakingStateChange?.(true);
              }

              // Ensure we schedule after the current time
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );

              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outputAnalyserRef.current!); // Connect to analyser
              outputAnalyserRef.current!.connect(ctx.destination); // Connect analyser to speaker

              sourceNode.addEventListener('ended', () => {
                audioSourcesRef.current.delete(sourceNode);
                // Notify when all audio finished
                if (audioSourcesRef.current.size === 0) {
                  configRef.current.audioCallbacks?.onSpeakingStateChange?.(false);
                }
              });

              sourceNode.start(nextStartTimeRef.current);
              audioSourcesRef.current.add(sourceNode);

              // Update next start time
              nextStartTimeRef.current += audioBuffer.duration;

              // Calculate audio level for visualization
              const rawData = audioBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < rawData.length; i += 100) {
                sum += rawData[i] * rawData[i];
              }
              const level = Math.sqrt(sum / (rawData.length / 100)) * 5;
              configRef.current.audioCallbacks?.onAudioLevel?.(level);
            }

            // 4. Handle Turn Complete (FIXED - now uses accumulated text)
            if (content?.turnComplete) {
              const fullAiText = currentAiTextRef.current;
              configRef.current.transcriptCallbacks?.onAiTranscriptionComplete?.(fullAiText);
              configRef.current.transcriptCallbacks?.onTurnComplete?.();
              currentAiTextRef.current = ''; // Reset for next turn
            }

            // 5. Handle Interruption
            if (content?.interrupted) {
              console.log('Interrupted! Clearing audio queue.');
              audioSourcesRef.current.forEach(src => {
                try { src.stop(); } catch (e) { /* ignore */ }
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;

              // Clear current AI text as it was interrupted
              currentAiTextRef.current = '';
              configRef.current.transcriptCallbacks?.onInterrupted?.();
              configRef.current.audioCallbacks?.onSpeakingStateChange?.(false);
            }
          },
          onclose: () => {
            console.log('Gemini Live Session Closed');
            cleanup();
          },
          onerror: (err) => {
            console.error('Gemini Live Error:', err);
            setError("Connection error occurred.");
            cleanup();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      sessionPromise.then(sess => {
          currentSessionRef.current = sess;
      });

    } catch (err: any) {
      console.error("Failed to connect:", err);

      // Better error handling for different error types
      let errorMessage = "Failed to start conversation.";

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please allow microphone permission and try again.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else {
          errorMessage = `Audio error: ${err.name} - ${err.message}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
      cleanup();
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    audioContexts: {
      input: inputAudioContextRef.current,
      output: outputAudioContextRef.current
    },
    analysers: {
      input: inputAnalyserRef.current,
      output: outputAnalyserRef.current
    }
  };
};
