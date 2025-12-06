import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
  size?: number; // Diameter in pixels (48-80)
  glowColor?: string; // Color when recording
  breathingDuration?: number; // Breathing light cycle duration in seconds
}

const MicButton: React.FC<MicButtonProps> = ({
  isRecording,
  onClick,
  size = 64,
  glowColor = 'rgb(239, 68, 68)', // red-500
  breathingDuration = 1.8,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-full transition-all duration-300 ease-out
        flex items-center justify-center
        ${isRecording 
          ? 'scale-110 shadow-2xl' 
          : 'scale-100 hover:scale-105 shadow-lg'
        }
      `}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
        border: isRecording ? '2px solid rgba(239, 68, 68, 0.5)' : '2px solid rgba(255, 255, 255, 0.2)',
      }}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {/* Breathing glow effect when recording */}
      {isRecording && (
        <div 
          className="absolute inset-0 rounded-full animate-breathing-glow"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            animation: `breathing ${breathingDuration}s ease-in-out infinite`,
          }}
        />
      )}

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
        {isRecording ? (
          <Mic 
            size={size * 0.4} 
            className="text-red-400 drop-shadow-lg" 
          />
        ) : (
          <MicOff 
            size={size * 0.4} 
            className="text-white/80 drop-shadow-lg" 
          />
        )}
      </div>
    </button>
  );
};

export default MicButton;

