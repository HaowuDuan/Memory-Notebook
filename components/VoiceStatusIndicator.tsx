import React from 'react';

export type VoiceConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface VoiceStatusIndicatorProps {
  status: VoiceConnectionStatus;
  showLabel?: boolean;
  size?: number; // Dot diameter (8-12 px)
  label?: string; // Custom label (e.g., "Gemini", "Voice")
  glowIntensity?: number; // 0-10, blur radius for glow
}

const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  status,
  showLabel = true,
  size = 10,
  label = 'Voice',
  glowIntensity = 8,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          color: 'rgb(156, 163, 175)', // gray-400
          bgColor: 'rgba(156, 163, 175, 0.2)',
          text: 'Idle',
          glow: 'rgba(156, 163, 175, 0.4)',
        };
      case 'connecting':
        return {
          color: 'rgb(251, 191, 36)', // yellow-400
          bgColor: 'rgba(251, 191, 36, 0.2)',
          text: 'Connecting...',
          glow: 'rgba(251, 191, 36, 0.6)',
          animate: true,
        };
      case 'connected':
        return {
          color: 'rgb(34, 197, 94)', // green-500
          bgColor: 'rgba(34, 197, 94, 0.2)',
          text: 'Connected',
          glow: 'rgba(34, 197, 94, 0.6)',
          sparkle: true,
        };
      case 'error':
        return {
          color: 'rgb(239, 68, 68)', // red-500
          bgColor: 'rgba(239, 68, 68, 0.2)',
          text: 'Disconnected',
          glow: 'rgba(239, 68, 68, 0.6)',
        };
      default:
        return {
          color: 'rgb(156, 163, 175)',
          bgColor: 'rgba(156, 163, 175, 0.2)',
          text: 'Unknown',
          glow: 'rgba(156, 163, 175, 0.4)',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 group relative">
      {/* Status Dot */}
      <div className="relative flex items-center justify-center">
        {/* Glow effect */}
        <div
          className={`absolute rounded-full transition-all duration-300 ${
            config.animate ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${size * 2}px`,
            height: `${size * 2}px`,
            backgroundColor: config.bgColor,
            boxShadow: `0 0 ${glowIntensity}px ${config.glow}`,
          }}
        />
        
        {/* Main dot */}
        <div
          className={`relative rounded-full transition-all duration-300 ${
            config.animate ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: config.color,
            boxShadow: `0 0 ${glowIntensity / 2}px ${config.glow}`,
          }}
        >
          {/* Sparkle effect for connected state */}
          {config.sparkle && (
            <div className="absolute inset-0 rounded-full animate-ping" style={{
              backgroundColor: config.color,
              opacity: 0.3,
              animationDuration: '2s',
            }} />
          )}
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <span className="text-xs tracking-wider uppercase text-white/70 transition-colors duration-300">
          {label}
        </span>
      )}

      {/* Tooltip on hover */}
      <div className="absolute left-0 top-full mt-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-white/10">
        {config.text}
        <div className="absolute -top-1 left-3 w-2 h-2 bg-black/90 border-l border-t border-white/10 transform rotate-45" />
      </div>
    </div>
  );
};

export default VoiceStatusIndicator;

