import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

import { createPcmBlob, decodeAudioData, base64ToUint8Array, PCM_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from '../services/audioStreamer';


export interface UseGeminiLiveReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  connect: (systemInstruction?: string) => Promise<void>;

  disconnect: () => void;
  audioContexts: {
    input: AudioContext | null;
    output: AudioContext | null;
  };
  analysers: {
    input: AnalyserNode | null;
    output: AnalyserNode | null;
  };
  onTranscript?: (text: string) => void;
  onTurnComplete?: () => void;
  setAudioLevel?: (level: number) => void;
}

export const useGeminiLive = (
  onTranscript?: (text: string) => void,
  onTurnComplete?: () => void,
  setAudioLevel?: (level: number) => void
): UseGeminiLiveReturn => {

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

  const currentSessionRef = useRef<any>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);


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


    // Disconnect and clean up script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio contexts
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
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

    sessionPromiseRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    nextStartTimeRef.current = 0;
  }, []);


  const connect = useCallback(async (systemInstruction?: string) => {

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

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Your browser doesn't support Web Audio API.");
      }


      const inputCtx = new AudioContextClass({ sampleRate: PCM_SAMPLE_RATE });
      const outputCtx = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

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

      streamRef.current = stream;


      // 4. Setup Input Pipeline
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);

      scriptProcessorRef.current = scriptProcessor;


      source.connect(inputAnalyser);
      inputAnalyser.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);

      // 5. Initialize Gemini Client

      console.log('🔑 Initializing Gemini with API key:', process.env.API_KEY?.substring(0, 20) + '...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
      console.log('📡 Using model:', model);

      // 6. Define Session Callbacks
      console.log('🔗 Attempting to connect to Gemini Live...');

      const sessionPromise = ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {

            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction || "You are a helpful, witty, and concise AI assistant. Keep your responses short and conversational.",
        },
        callbacks: {
          onopen: () => {
            console.log('✅ Gemini Live Session Opened - Connection successful!');

            setIsConnected(true);
            setIsConnecting(false);

            // Start processing audio input
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);


              // Calculate audio level for visualization
              if (setAudioLevel) {
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                if (rms > 0.05) setAudioLevel(Math.min(rms * 5, 0.5));
              }

              const pcmBlob = createPcmBlob(inputData);


              // Send to Gemini
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
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

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                OUTPUT_SAMPLE_RATE,
                1
              );

              // Visualize output audio
              if (setAudioLevel) {
                const rawData = audioBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < rawData.length; i += 100) sum += rawData[i] * rawData[i];
                setAudioLevel(Math.sqrt(sum / (rawData.length / 100)) * 5);
              }

              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outputAnalyserRef.current!);
              outputAnalyserRef.current!.connect(ctx.destination);

              sourceNode.addEventListener('ended', () => {
                audioSourcesRef.current.delete(sourceNode);

              });

              sourceNode.start(nextStartTimeRef.current);
              audioSourcesRef.current.add(sourceNode);


              nextStartTimeRef.current += audioBuffer.duration;
            }

            // Handle transcription
            if (message.serverContent?.outputTranscription?.text && onTranscript) {
              onTranscript(message.serverContent.outputTranscription.text);
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete && onTurnComplete) {
              onTurnComplete();
            }
          },
          onclose: () => {
            console.log('🔌 Gemini Live Session Closed');
            console.trace('Session close stack trace');
            cleanup();
          },
          onerror: (err) => {
            console.error('💥 Gemini Live Error:', err);
            console.error('Error details:', JSON.stringify(err, null, 2));
            setError(err?.message || "Connection error occurred.");

            cleanup();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

      sessionPromise
        .then(sess => {
          console.log('✅ Session promise resolved successfully');
          currentSessionRef.current = sess;
        })
        .catch(err => {
          console.error('💥 Session promise rejected:', err);
          setError(err?.message || 'Failed to establish connection');
          setIsConnecting(false);
        });


    } catch (err: any) {
      console.error("Failed to connect:", err);


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

  }, [cleanup, onTranscript, onTurnComplete, setAudioLevel]);


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
