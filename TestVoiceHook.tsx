/**
 * TEST COMPONENT FOR PHASE 1
 *
 * This component tests the new useGeminiLive hook without affecting your main app.
 *
 * HOW TO USE:
 * 1. Temporarily import this in App.tsx instead of the main app
 * 2. Test the voice connection
 * 3. Verify dual AudioContexts are working
 * 4. Check cleanup works properly
 * 5. Switch back to main app
 */

import React, { useEffect, useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';

export default function TestVoiceHook() {
  const {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    audioContexts,
    analysers
  } = useGeminiLive();

  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  // Visualize audio levels in real-time
  useEffect(() => {
    if (!isConnected) return;

    const updateLevels = () => {
      // Measure input (microphone) level
      if (analysers.input) {
        const dataArray = new Uint8Array(analysers.input.frequencyBinCount);
        analysers.input.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setInputLevel(average);
      }

      // Measure output (AI voice) level
      if (analysers.output) {
        const dataArray = new Uint8Array(analysers.output.frequencyBinCount);
        analysers.output.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setOutputLevel(average);
      }

      requestAnimationFrame(updateLevels);
    };

    const frameId = requestAnimationFrame(updateLevels);
    return () => cancelAnimationFrame(frameId);
  }, [isConnected, analysers]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        backgroundColor: '#1e293b',
        borderRadius: '1rem',
        padding: '2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>

        {/* Header */}
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          🧪 Phase 1 Test - Voice Hook
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
          Testing useGeminiLive hook with dual AudioContext architecture
        </p>

        {/* Status Display */}
        <div style={{
          backgroundColor: '#334155',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            Connection Status
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : (isConnecting ? '#f59e0b' : '#6b7280')
            }} />
            <span>
              {isConnected ? '✅ Connected' : (isConnecting ? '⏳ Connecting...' : '⚪ Disconnected')}
            </span>
          </div>
          {error && (
            <div style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              ❌ Error: {error}
            </div>
          )}
        </div>

        {/* AudioContext Info */}
        <div style={{
          backgroundColor: '#334155',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            AudioContext Status
          </h2>
          <div style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
            <div>
              📥 Input Context: {audioContexts.input
                ? `✅ Active (${audioContexts.input.sampleRate}Hz)`
                : '❌ Not initialized'}
            </div>
            <div>
              📤 Output Context: {audioContexts.output
                ? `✅ Active (${audioContexts.output.sampleRate}Hz)`
                : '❌ Not initialized'}
            </div>
          </div>
        </div>

        {/* Audio Level Meters */}
        {isConnected && (
          <div style={{
            backgroundColor: '#334155',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              Audio Levels (Real-time)
            </h2>

            {/* Input Meter */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem' }}>🎤 Your Voice</span>
                <span style={{ fontSize: '0.875rem', color: '#60a5fa' }}>{Math.round(inputLevel)}</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#1e293b',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(inputLevel / 255) * 100}%`,
                  height: '100%',
                  backgroundColor: '#60a5fa',
                  transition: 'width 0.1s ease'
                }} />
              </div>
            </div>

            {/* Output Meter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem' }}>🔊 AI Voice</span>
                <span style={{ fontSize: '0.875rem', color: '#c084fc' }}>{Math.round(outputLevel)}</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#1e293b',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(outputLevel / 255) * 100}%`,
                  height: '100%',
                  backgroundColor: '#c084fc',
                  transition: 'width 0.1s ease'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={isConnecting}
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: isConnecting ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isConnecting ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isConnecting) e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!isConnecting) e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              {isConnecting ? '⏳ Connecting...' : '🎤 Start Test'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
            >
              🛑 Stop Test
            </button>
          )}
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#0f172a',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: '#cbd5e1'
        }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>✅ Testing Checklist:</h3>
          <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
            <li>Click "Start Test" and grant microphone permission</li>
            <li>Verify both AudioContexts show correct sample rates (16000Hz input, 24000Hz output)</li>
            <li>Speak and watch the "Your Voice" meter respond</li>
            <li>Wait for AI to respond and watch the "AI Voice" meter</li>
            <li>Try interrupting the AI mid-sentence (should work)</li>
            <li>Click "Stop Test" and verify everything cleans up</li>
            <li>Check browser console for any errors</li>
          </ol>
        </div>

        {/* Expected Results */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#064e3b',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: '#d1fae5'
        }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>✨ Expected Results:</h3>
          <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
            <li>Input context: 16000Hz sample rate</li>
            <li>Output context: 24000Hz sample rate</li>
            <li>Blue meter responds to your voice</li>
            <li>Purple meter responds to AI voice</li>
            <li>No console errors on disconnect</li>
            <li>Microphone light turns off after stopping</li>
          </ul>
        </div>

      </div>

      {/* Debug Info */}
      <div style={{
        marginTop: '1rem',
        maxWidth: '600px',
        width: '100%',
        fontSize: '0.75rem',
        color: '#64748b',
        fontFamily: 'monospace'
      }}>
        Debug: isConnected={String(isConnected)}, isConnecting={String(isConnecting)},
        hasInputCtx={String(!!audioContexts.input)}, hasOutputCtx={String(!!audioContexts.output)}
      </div>
    </div>
  );
}
