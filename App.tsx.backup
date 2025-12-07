import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Mic, MicOff, Save, Share2, Sparkles, X, RotateCcw, Volume2, Volume1, Download } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

import { AppState, SessionState, PhotoData, MemoryTurn } from './types';
import { SYSTEM_INSTRUCTION } from './constants';
import ParticleCanvas from './components/ParticleCanvas';
import AmbiencePlayer from './components/AmbiencePlayer';
import VoiceSubtitle from './components/VoiceSubtitle';
import MicButton from './components/MicButton';
import VoiceWaveform from './components/VoiceWaveform';
import VoiceStatusIndicator, { VoiceConnectionStatus } from './components/VoiceStatusIndicator';
import { PCM_SAMPLE_RATE, createPcmBlob, decodeAudioData, base64ToUint8Array } from './services/audioStreamer';

export default function App() {
  // State
  const [appState, setAppState] = useState<AppState>('LANDING');
  const [sessionState, setSessionState] = useState<SessionState>('IDLE');
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [transcript, setTranscript] = useState<MemoryTurn[]>([]);
  const [currentText, setCurrentText] = useState<string>('');
  
  // Audio Controls
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isMicActive, setIsMicActive] = useState(false);
  
  // Visual Reactivity
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 - 1.0 for visuals
  
  // Voice UI States
  const [voiceStatus, setVoiceStatus] = useState<VoiceConnectionStatus>('idle');

  // Refs for API & Audio
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // --- Helpers ---

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Output sample rate
      });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Extract base64 part
        const base64Data = result.split(',')[1];
        setPhotoData({
          file,
          previewUrl: result,
          base64Data,
          mimeType: file.type
        });
        setAppState('UPLOAD');
      };
      reader.readAsDataURL(file);
    }
  };

  const startMemoryProcess = () => {
     setAppState('RENDERING');
     // Simulate rendering time for effect
     setTimeout(() => {
         setAppState('SESSION');
         startSession();
     }, 2500);
  };

  const downloadMemory = () => {
    const content = transcript.map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.role.toUpperCase()}: ${t.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Gemini Live Integration ---

  const startSession = async () => {
    if (!process.env.API_KEY) {
        alert("API Key missing. Please check configuration.");
        return;
    }
    if (!photoData) return;

    initAudioContext();
    setIsMusicPlaying(true);
    setSessionState('IDLE');
    setVoiceStatus('connecting');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Setup Input Stream (Microphone)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: PCM_SAMPLE_RATE });
    const source = inputCtx.createMediaStreamSource(stream);
    const processor = inputCtx.createScriptProcessor(4096, 1, 1);
    
    inputSourceRef.current = source;
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
        // Simple visualizer for mic
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        if (rms > 0.05) setAudioLevel(Math.min(rms * 5, 0.5)); // Cap visuals

        if (!isMicActive) return; // Only send if mic is "on" in UI
        
        const pcmBlob = createPcmBlob(inputData);
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        }
    };

    source.connect(processor);
    processor.connect(inputCtx.destination);

    // Connect to Gemini
    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: SYSTEM_INSTRUCTION,
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            inputAudioTranscription: { model: "google-default" },
            outputAudioTranscription: {},
        },
        callbacks: {
            onopen: () => {
                console.log("Session Opened");
                setVoiceStatus('connected');
                // Send Image Context immediately
                sessionPromise.then(session => {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: photoData.mimeType,
                            data: photoData.base64Data
                        }
                    });
                });
            },
            onmessage: async (message: LiveServerMessage) => {
                const content = message.serverContent;
                
                // 1. Handle Audio Output
                const audioData = content?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData && audioContextRef.current) {
                    setSessionState('SPEAKING');
                    
                    // Decode
                    const audioBuffer = await decodeAudioData(
                        base64ToUint8Array(audioData),
                        audioContextRef.current,
                        24000
                    );

                    // Visualize output audio
                    const rawData = audioBuffer.getChannelData(0);
                    let sum = 0;
                    for (let i=0; i<rawData.length; i+=100) sum += rawData[i] * rawData[i];
                    setAudioLevel(Math.sqrt(sum / (rawData.length/100)) * 5);

                    // Schedule playback
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                    
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContextRef.current.destination);
                    
                    source.addEventListener('ended', () => {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) {
                            setSessionState('IDLE');
                            setAudioLevel(0);
                        }
                    });

                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                }

                // 2. Handle Transcription (Real-time captions)
                if (content?.outputTranscription?.text) {
                    setCurrentText(prev => prev + content.outputTranscription.text);
                }
                
                // 3. Handle Turn Completion (Commit text to history)
                if (content?.turnComplete) {
                     setTranscript(prev => [...prev, {
                         role: 'assistant',
                         text: currentText, // In a real app we would use accumulated text
                         timestamp: Date.now()
                     }]);
                     setCurrentText('');
                     setSessionState('IDLE');
                }

                // 4. Handle Interruption
                if (content?.interrupted) {
                    sourcesRef.current.forEach(s => s.stop());
                    sourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                    setCurrentText('');
                    setSessionState('IDLE');
                }
            },
            onclose: () => {
                console.log("Session Closed");
                setVoiceStatus('idle');
            },
            onerror: (err) => {
                console.error("Session Error", err);
                setVoiceStatus('error');
            }
        }
    });

    sessionPromiseRef.current = sessionPromise;
    setIsMicActive(true); // Auto-start mic
  };

  const endSession = () => {
      // Clean up audio
      if (processorRef.current) processorRef.current.disconnect();
      if (inputSourceRef.current) inputSourceRef.current.disconnect();
      sourcesRef.current.forEach(s => s.stop());
      
      // Close session
      if (sessionPromiseRef.current) {
          sessionPromiseRef.current.then(session => session.close());
      }

      setAppState('REVIEW');
      setIsMusicPlaying(false);
  };

  // --- UI Components ---

  const LandingView = () => (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-5xl md:text-7xl font-serif tracking-wide mb-4 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 animate-pulse">
        Memory Stardust
      </h1>
      <p className="text-gray-400 max-w-lg mb-12 text-lg font-light">
        A sanctuary for your moments. We turn your photos into stardust and help you keep the stories they hold.
      </p>
      
      {appState === 'LANDING' ? (
        <label className="group cursor-pointer relative px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-full overflow-hidden backdrop-blur-sm">
            <span className="relative z-10 flex items-center gap-2 text-white tracking-widest uppercase text-sm font-semibold">
                <Sparkles size={16} /> Start a Memory
            </span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </label>
      ) : null}
    </div>
  );

  const UploadPreview = () => (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
        {photoData && (
            <div className="relative w-full max-w-md aspect-[3/4] md:aspect-square rounded-lg overflow-hidden shadow-2xl border border-white/10 mb-8">
                <img src={photoData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20" />
            </div>
        )}
        <div className="flex gap-4">
             <button 
                onClick={() => setAppState('LANDING')}
                className="px-6 py-3 rounded-full border border-white/20 text-white/60 hover:text-white hover:bg-white/5 transition-all"
             >
                Try Another
             </button>
             <button 
                onClick={startMemoryProcess}
                className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all shadow-lg shadow-white/10"
             >
                Visualize & Speak
             </button>
        </div>
    </div>
  );

  const SessionView = () => (
    <div className="relative z-10 flex flex-col h-screen">
        {/* Header / Top Bar */}
        <div className="flex justify-between items-center p-6 text-white/50 z-20">
            <VoiceStatusIndicator 
              status={voiceStatus} 
              showLabel={true}
              label="Gemini"
              size={10}
              glowIntensity={8}
            />
            <div className="flex items-center gap-4">
                 <button onClick={() => setMusicVolume(v => v === 0 ? 0.5 : 0)}>
                     {musicVolume === 0 ? <X size={16}/> : <Volume2 size={16} />}
                 </button>
                 <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={musicVolume} 
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-20 accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                 />
            </div>
        </div>

        {/* Central Visual Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-6">
            {/* Voice Waveform - Shows above subtitle when speaking */}
            {sessionState === 'SPEAKING' && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20">
                    <VoiceWaveform 
                        audioLevel={audioLevel}
                        isActive={true}
                        type="bars"
                        color="rgba(255, 255, 255, 0.8)"
                        barCount={40}
                        smoothing={0.7}
                        height={60}
                        width="300px"
                    />
                </div>
            )}

            {/* Voice Subtitle - AI's spoken text */}
            <VoiceSubtitle 
                text={currentText}
                isVisible={!!currentText}
                maxWidth="70%"
                opacity={0.6}
                fontSize="text-2xl md:text-3xl"
                position="bottom"
                typewriterEffect={true}
                typewriterSpeed={30}
            />
            
            {/* Guide hint if idle */}
            {sessionState === 'IDLE' && transcript.length === 0 && !currentText && (
                 <p className="text-white/40 font-light italic animate-pulse">Close your eyes and tell me about this moment...</p>
            )}
        </div>

        {/* Bottom Controls */}
        <div className="p-8 flex flex-col items-center gap-6 z-20">
            <div className="flex items-center gap-6">
                <MicButton 
                    isRecording={isMicActive}
                    onClick={() => setIsMicActive(!isMicActive)}
                    size={64}
                    glowColor="rgb(239, 68, 68)"
                    breathingDuration={1.8}
                />
            </div>
            <button 
                onClick={endSession}
                className="text-xs text-white/30 hover:text-white transition-colors border-b border-transparent hover:border-white"
            >
                End Session & Save Memory
            </button>
        </div>
    </div>
  );

  const ReviewView = () => (
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 max-w-3xl mx-auto">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full shadow-2xl">
              <div className="flex gap-6 mb-8 items-start">
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 opacity-80">
                      <img src={photoData?.previewUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" alt="Memory" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-serif text-white mb-2">Memory Archived</h2>
                      <p className="text-white/50 text-sm">
                          {new Date().toLocaleDateString()} • {transcript.length} turns recorded
                      </p>
                  </div>
              </div>

              <div className="h-64 overflow-y-auto pr-4 mb-8 space-y-4 scrollbar-hide">
                  {transcript.length > 0 ? transcript.map((turn, i) => (
                      <div key={i} className={`flex ${turn.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${
                              turn.role === 'assistant' 
                              ? 'bg-white/5 text-gray-300' 
                              : 'bg-white/10 text-white'
                          }`}>
                              {turn.text || "(Audio segment)"}
                          </div>
                      </div>
                  )) : (
                      <p className="text-center text-white/30 italic">No conversation recorded.</p>
                  )}
              </div>

              <div className="flex gap-4 justify-between pt-6 border-t border-white/5">
                  <button onClick={() => window.location.reload()} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                      <RotateCcw size={16} /> Start New
                  </button>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm transition-all border border-white/10">
                        <Share2 size={16} /> Share
                    </button>
                    <button onClick={downloadMemory} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-semibold transition-all">
                        <Download size={16} /> Download
                    </button>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden selection:bg-white/20">
      
      {/* Background Visuals - Always active now */}
      <ParticleCanvas 
        imageUrl={appState === 'LANDING' ? null : photoData?.previewUrl || null} 
        isActive={true} 
        audioLevel={audioLevel}
      />

      {/* Audio Layer */}
      <AmbiencePlayer 
        play={isMusicPlaying} 
        ducking={sessionState === 'SPEAKING' || isMicActive}
        volume={musicVolume}
      />

      {/* Rendering State Overlay */}
      {appState === 'RENDERING' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="text-center">
                  <div className="w-12 h-12 border-t-2 border-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/60 font-serif tracking-widest animate-pulse">CRYSTALLIZING MEMORY...</p>
              </div>
          </div>
      )}

      {/* Main Views */}
      {appState === 'LANDING' && <LandingView />}
      {appState === 'UPLOAD' && <UploadPreview />}
      {appState === 'SESSION' && <SessionView />}
      {appState === 'REVIEW' && <ReviewView />}

    </div>
  );
}