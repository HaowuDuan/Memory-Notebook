import React, { useState } from 'react';
import { Share2, Sparkles, X, RotateCcw, Volume2, Download } from 'lucide-react';

import { AppState, SessionState, PhotoData, MemoryTurn } from './types';
import { SYSTEM_INSTRUCTION, PRESET_IMAGES } from './constants';
import ParticleCanvas from './components/ParticleCanvas';
import AmbiencePlayer from './components/AmbiencePlayer';
import VoiceSubtitle from './components/VoiceSubtitle';
import MicButton from './components/MicButton';
import VoiceWaveform from './components/VoiceWaveform';
import VoiceStatusIndicator, { VoiceConnectionStatus } from './components/VoiceStatusIndicator';
import { useGeminiLive } from './hooks/useGeminiLive';

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

  // Use the enhanced Gemini Live hook
  const {
    connect: connectVoice,
    disconnect: disconnectVoice,
    isConnected,
    isConnecting,
    error: voiceError,
    analysers
  } = useGeminiLive();

  // --- Helpers ---

  // Load random preset image for particle effects
  const startVoiceCompanion = () => {
    const randomImage = PRESET_IMAGES[Math.floor(Math.random() * PRESET_IMAGES.length)];
    const newPhotoData = {
      file: null as any,
      previewUrl: randomImage,
      base64Data: '', // Not sending to AI
      mimeType: 'image/jpeg'
    };
    setPhotoData(newPhotoData);
    setAppState('RENDERING');
    // Simulate rendering time for effect
    setTimeout(() => {
      setAppState('SESSION');
      startSessionWithData(newPhotoData);
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

  // --- Gemini Live Integration (Using Enhanced Hook) ---

  const startSessionWithData = async (data: PhotoData) => {
    setIsMusicPlaying(true);
    setSessionState('IDLE');
    setVoiceStatus('connecting');
    setIsMicActive(true); // Auto-start mic

    // Connect using the enhanced hook with all callbacks
    await connectVoice({
      systemInstruction: SYSTEM_INSTRUCTION,
      voiceName: 'Kore',
      // Temporarily disable photo sending to debug
      // photoContext: data.base64Data,

      transcriptCallbacks: {
        // Real-time AI speech display (for VoiceSubtitle)
        onAiTranscriptionChunk: (text) => {
          setCurrentText(prev => prev + text);
        },

        // Save user message to history
        onUserTranscriptionComplete: (fullText) => {
          setTranscript(prev => [...prev, {
            role: 'user',
            text: fullText,
            timestamp: Date.now()
          }]);
        },

        // Save AI message to history (FIXED - uses full accumulated text)
        onAiTranscriptionComplete: (fullText) => {
          setTranscript(prev => [...prev, {
            role: 'assistant',
            text: fullText,
            timestamp: Date.now()
          }]);
          setCurrentText(''); // Clear for next turn
        },

        // Turn completed
        onTurnComplete: () => {
          setSessionState('IDLE');
        },

        // User interrupted AI
        onInterrupted: () => {
          setCurrentText(''); // Clear interrupted text
          setSessionState('IDLE');
        }
      },

      audioCallbacks: {
        // Drive visualizations (waveform, particles)
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },

        // Update UI state
        onSpeakingStateChange: (speaking) => {
          setSessionState(speaking ? 'SPEAKING' : 'IDLE');
          if (!speaking) setAudioLevel(0);
        }
      }
    });

    setVoiceStatus('connected');
  };

  const endSession = () => {
    disconnectVoice();
    setAppState('REVIEW');
    setIsMusicPlaying(false);
    setVoiceStatus('idle');
  };

  // --- UI Components ---

  const LandingView = () => (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-5xl md:text-7xl font-serif tracking-wide mb-4 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 animate-pulse">
        Voice Companion
      </h1>
      <p className="text-gray-400 max-w-lg mb-12 text-lg font-light">
        A safe space to vent, process emotions, and feel heard. Let's talk through what's on your mind.
      </p>

      {appState === 'LANDING' ? (
        <button
          onClick={startVoiceCompanion}
          className="group cursor-pointer relative px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-full overflow-hidden backdrop-blur-sm"
        >
            <span className="relative z-10 flex items-center gap-2 text-white tracking-widest uppercase text-sm font-semibold">
                <Sparkles size={16} /> Start Talking
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ) : null}
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
                  <p className="text-white/60 font-serif tracking-widest animate-pulse">CONNECTING TO YOUR COMPANION...</p>
              </div>
          </div>
      )}

      {/* Main Views */}
      {appState === 'LANDING' && <LandingView />}
      {appState === 'SESSION' && <SessionView />}
      {appState === 'REVIEW' && <ReviewView />}

    </div>
  );
}