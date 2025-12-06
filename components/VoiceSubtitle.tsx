import React, { useState, useEffect } from 'react';

interface VoiceSubtitleProps {
  text: string;
  isVisible: boolean;
  maxWidth?: string; // e.g., "70%"
  opacity?: number; // 0.3 - 0.8
  fontSize?: string; // e.g., "text-2xl"
  position?: 'top' | 'center' | 'bottom'; // Position on screen
  typewriterEffect?: boolean; // Enable character-by-character reveal
  typewriterSpeed?: number; // Characters per second
}

const VoiceSubtitle: React.FC<VoiceSubtitleProps> = ({
  text,
  isVisible,
  maxWidth = "70%",
  opacity = 0.6,
  fontSize = "text-2xl md:text-3xl",
  position = "bottom",
  typewriterEffect = true,
  typewriterSpeed = 30, // chars per second
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isFullyDisplayed, setIsFullyDisplayed] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!typewriterEffect || !text) {
      setDisplayedText(text);
      setIsFullyDisplayed(true);
      return;
    }

    setIsFullyDisplayed(false);
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsFullyDisplayed(true);
        clearInterval(interval);
      }
    }, 1000 / typewriterSpeed);

    return () => clearInterval(interval);
  }, [text, typewriterEffect, typewriterSpeed]);

  // Reset when text changes
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsFullyDisplayed(false);
    }
  }, [text]);

  // Position classes
  const positionClasses = {
    top: 'top-24',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-32'
  };

  if (!isVisible || !text) return null;

  return (
    <div 
      className={`absolute ${positionClasses[position]} left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{ maxWidth }}
    >
      <div 
        className="px-8 py-6 rounded-2xl backdrop-blur-xl border border-white/20 shadow-2xl"
        style={{ 
          backgroundColor: `rgba(0, 0, 0, ${opacity})`,
        }}
      >
        <p 
          className={`${fontSize} font-serif leading-relaxed text-white text-center transition-all duration-300`}
          style={{
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)',
            lineHeight: '1.6',
            wordBreak: 'break-word',
          }}
        >
          {displayedText}
          {typewriterEffect && !isFullyDisplayed && (
            <span className="inline-block w-0.5 h-6 bg-white/80 ml-1 animate-pulse" />
          )}
        </p>
        
        {/* Optional: Translation hint */}
        {isFullyDisplayed && (
          <div className="mt-3 text-center">
            <button className="text-xs text-white/40 hover:text-white/70 transition-colors">
              Tap to translate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceSubtitle;

