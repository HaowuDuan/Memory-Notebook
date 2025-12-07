import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

export interface UseGeminiLiveReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
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
      // The SDK might not have an explicit close method on the session object depending on version,
      // but usually the connection is closed when we drop the reference or explicitly call close on the client if available.
      // For this pattern, we rely on the server detecting the WebSocket close or just letting it GC.
      // However, the prompt mentions `onclose` callback, implying the server handles it.
      // Ideally, we would call `session.close()` if it exists.
      // Assuming `currentSessionRef.current.close()` is valid based on typical WebSocket wrappers.
      if (typeof currentSessionRef.current.close === 'function') {
        currentSessionRef.current.close();
      }
      currentSessionRef.current = null;
    }

    sessionPromiseRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      setError("API Key not found in environment variables.");
      return;
    }

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser doesn't support microphone access. Please use Chrome, Firefox, or Edge, and make sure you're accessing via localhost or HTTPS.");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "You are a helpful, witty, and concise AI assistant. Keep your responses short and conversational.",
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
                    // It is safe to call sendRealtimeInput here
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Interruption
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              console.log('Interrupted! Clearing audio queue.');
              audioSourcesRef.current.forEach(src => {
                try { src.stop(); } catch (e) { /* ignore */ }
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;

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
              });

              sourceNode.start(nextStartTimeRef.current);
              audioSourcesRef.current.add(sourceNode);
              
              // Update next start time
              nextStartTimeRef.current += audioBuffer.duration;
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