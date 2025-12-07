import React from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import Visualizer from './components/Visualizer';

// Icons
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const PhoneOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
    <line x1="23" y1="1" x2="1" y2="23"/>
  </svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export default function App() {
  const { 
    isConnected, 
    isConnecting, 
    error, 
    connect, 
    disconnect, 
    analysers 
  } = useGeminiLive();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 rounded-full blur-[100px]" />
      </div>

      <main className="z-10 flex flex-col items-center w-full max-w-md px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                <ActivityIcon />
                <span className="text-xs font-medium tracking-wider uppercase text-slate-400">Gemini Live API</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Voice Assistant
            </h1>
            <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                Real-time, interruptible conversation powered by Gemini 2.5 Flash.
            </p>
        </div>

        {/* Visualizer Container */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-slate-900/50 rounded-full border border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-white/5 backdrop-blur-sm">
            <Visualizer 
                inputAnalyser={analysers.input} 
                outputAnalyser={analysers.output} 
                isConnected={isConnected}
            />
        </div>

        {/* Status Messages */}
        <div className="h-6">
            {error && (
                <span className="text-red-400 text-sm font-medium animate-pulse">{error}</span>
            )}
            {isConnecting && !error && (
                <span className="text-indigo-400 text-sm font-medium animate-pulse">Establishing connection...</span>
            )}
            {isConnected && !error && (
                <span className="text-emerald-400 text-sm font-medium">Live Session Active</span>
            )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-6">
            {!isConnected ? (
                <button
                    onClick={connect}
                    disabled={isConnecting}
                    className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    aria-label="Start Conversation"
                >
                    <div className="absolute inset-0 rounded-full border border-white/20" />
                    <MicIcon />
                </button>
            ) : (
                <button
                    onClick={disconnect}
                    className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-all duration-300 hover:scale-105"
                    aria-label="End Conversation"
                >
                     <div className="absolute inset-0 rounded-full border border-white/20" />
                    <PhoneOffIcon />
                </button>
            )}
        </div>
        
        {/* Instructions / Footer */}
        <div className="text-center">
            <p className="text-xs text-slate-500">
                {isConnected 
                    ? "Speak naturally. You can interrupt at any time."
                    : "Tap the microphone to start."}
            </p>
        </div>

      </main>
    </div>
  );
}