import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
  size?: number; // Diameter in pixels (48-80)
  glowColor?: string; // Color when recording
  breathingDuration?: number; // Breathing light cycle duration in seconds
  disabled?: boolean; // Disable button
}

const MicButton: React.FC<MicButtonProps> = ({
  isRecording,
  onClick,
  size = 64,
  glowColor = 'rgb(239, 68, 68)', // red-500
  breathingDuration = 1.8,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-full transition-all duration-300 ease-out
        flex items-center justify-center
        ${isRecording
          ? 'scale-110 shadow-2xl'
          : 'scale-100 hover:scale-105 shadow-lg'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: isRecording ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
        border: isRecording ? '2px solid rgba(34, 197, 94, 0.4)' : '2px solid rgba(99, 102, 241, 0.3)',
      }}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {/* Breathing glow effect - always show, more subtle when not recording */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          animation: `breathing ${breathingDuration}s ease-in-out infinite`,
          opacity: isRecording ? 1 : 0.5,
        }}
      />

      {/* Pulsing ring when recording */}
      {isRecording && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: glowColor,
            opacity: 0.3,
            animationDuration: `${breathingDuration}s`,
          }}
        />
      )}

      {/* Icon */}
      <div className="relative z-10">
        <Mic
          size={size * 0.4}
          className={`drop-shadow-lg ${isRecording ? 'text-red-400' : 'text-white/80'}`}
        />
      </div>
    </button>
  );
};

export default MicButton;

