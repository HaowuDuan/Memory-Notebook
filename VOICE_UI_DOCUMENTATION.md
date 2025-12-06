# Voice UI Components Documentation

## Overview

The Memory Notebook application now features a comprehensive voice UI system that enhances the conversational experience between the user and AI. This document outlines the four main voice UI components and their integration.

---

## 1. VoiceSubtitle Component (语音字幕)

### Purpose
Displays AI speech as real-time subtitles with elegant animations, creating an immersive storytelling experience.

### Features
- **Typewriter Effect**: Characters appear one-by-one as the AI speaks
- **Fade In/Out Animations**: Smooth transitions when text appears and disappears
- **Semi-transparent Card**: Beautiful backdrop-blur design with adjustable opacity
- **Auto Line-wrapping**: Long sentences automatically wrap for readability
- **Translation Hint**: Optional "Tap to translate" prompt appears after text is fully displayed

### Props
```typescript
interface VoiceSubtitleProps {
  text: string;                    // The subtitle text to display
  isVisible: boolean;              // Show/hide the subtitle
  maxWidth?: string;               // Max width (default: "70%")
  opacity?: number;                // Background opacity 0.3-0.8 (default: 0.6)
  fontSize?: string;               // Tailwind font size class (default: "text-2xl md:text-3xl")
  position?: 'top' | 'center' | 'bottom'; // Screen position (default: "bottom")
  typewriterEffect?: boolean;      // Enable typewriter animation (default: true)
  typewriterSpeed?: number;        // Characters per second (default: 30)
}
```

### Usage Example
```tsx
<VoiceSubtitle 
  text={currentText}
  isVisible={!!currentText}
  maxWidth="70%"
  opacity={0.6}
  position="bottom"
  typewriterEffect={true}
  typewriterSpeed={30}
/>
```

---

## 2. MicButton Component (语音按钮)

### Purpose
Primary interaction button for voice recording with visual feedback for different states.

### Features
- **Recording States**: Visual distinction between idle and recording
- **Breathing Glow Effect**: Pulsing animation during recording
- **Ripple Effect**: Expanding rings to indicate active listening
- **Hover Animations**: Scale effect on hover
- **Smooth Transitions**: 300ms transition duration for all state changes

### Props
```typescript
interface MicButtonProps {
  isRecording: boolean;           // Recording state
  onClick: () => void;            // Click handler
  size?: number;                  // Button diameter in px (default: 64)
  glowColor?: string;             // Glow color when recording (default: "rgb(239, 68, 68)")
  breathingDuration?: number;     // Breathing cycle in seconds (default: 1.8)
}
```

### Usage Example
```tsx
<MicButton 
  isRecording={isMicActive}
  onClick={() => setIsMicActive(!isMicActive)}
  size={64}
  glowColor="rgb(239, 68, 68)"
  breathingDuration={1.8}
/>
```

---

## 3. VoiceWaveform Component (语音波形)

### Purpose
Real-time audio visualization that responds to AI voice playback, creating a dynamic visual representation of sound.

### Features
- **Multiple Visualization Types**: 
  - `bars`: Column-based frequency bars (default)
  - `line`: Smooth waveform line
  - `circular`: Radial wave pattern
- **Real-time Audio Reactivity**: Amplitude responds to actual audio levels
- **Smooth Transitions**: Configurable smoothing for organic movement
- **Horizontal Flow**: Gentle wave motion creates sense of progression
- **Fade In/Out**: Appears only during speech playback

### Props
```typescript
interface VoiceWaveformProps {
  audioLevel: number;             // Audio amplitude 0.0-1.0
  isActive: boolean;              // Show/hide waveform
  type?: 'line' | 'bars' | 'circular'; // Visualization style (default: "bars")
  color?: string;                 // Waveform color (default: "rgba(255, 255, 255, 0.8)")
  barCount?: number;              // Number of bars (default: 40)
  smoothing?: number;             // Transition smoothing 0-1 (default: 0.7)
  height?: number;                // Canvas height in px (default: 60)
  width?: string;                 // Canvas width (default: "300px")
}
```

### Usage Example
```tsx
<VoiceWaveform 
  audioLevel={audioLevel}
  isActive={sessionState === 'SPEAKING'}
  type="bars"
  color="rgba(255, 255, 255, 0.8)"
  barCount={40}
  smoothing={0.7}
  height={60}
  width="300px"
/>
```

---

## 4. VoiceStatusIndicator Component (语音连接指示灯)

### Purpose
Displays the current connection status of the voice system with visual cues.

### Features
- **Four Connection States**:
  - `idle`: Gray - System not active
  - `connecting`: Yellow with pulse - Initializing connection
  - `connected`: Green with sparkle - Ready for conversation
  - `error`: Red - Connection error
- **Hover Tooltip**: Shows descriptive status text on hover
- **Glow Effects**: Colored shadows matching status
- **Smooth Transitions**: Color and glow transitions over 300ms

### Props
```typescript
interface VoiceStatusIndicatorProps {
  status: 'idle' | 'connecting' | 'connected' | 'error';
  showLabel?: boolean;            // Show text label (default: true)
  size?: number;                  // Dot diameter in px (default: 10)
  label?: string;                 // Custom label text (default: "Voice")
  glowIntensity?: number;         // Glow blur radius (default: 8)
}
```

### Usage Example
```tsx
<VoiceStatusIndicator 
  status={voiceStatus}
  showLabel={true}
  label="Gemini"
  size={10}
  glowIntensity={8}
/>
```

---

## Integration Architecture

### State Management
The voice UI components are integrated into the main `App.tsx` with the following state:

```typescript
// Voice UI States
const [voiceStatus, setVoiceStatus] = useState<VoiceConnectionStatus>('idle');
const [currentText, setCurrentText] = useState<string>('');
const [audioLevel, setAudioLevel] = useState(0);
const [isMicActive, setIsMicActive] = useState(false);
const [sessionState, setSessionState] = useState<SessionState>('IDLE');
```

### Component Layout in SessionView

```
┌─────────────────────────────────────────┐
│ Header (VoiceStatusIndicator + Controls)│
├─────────────────────────────────────────┤
│                                         │
│         VoiceWaveform (top 1/3)        │
│              (when speaking)            │
│                                         │
│              Particle Canvas            │
│              (background)               │
│                                         │
│         VoiceSubtitle (bottom)         │
│              (when text)                │
│                                         │
├─────────────────────────────────────────┤
│         MicButton (bottom center)       │
└─────────────────────────────────────────┘
```

### Event Flow

1. **Session Start**:
   - Status: `idle` → `connecting` → `connected`
   - MicButton automatically enabled

2. **User Speaks**:
   - MicButton shows recording state (red glow)
   - Audio level updates from microphone input

3. **AI Responds**:
   - SessionState changes to `SPEAKING`
   - VoiceWaveform appears above subtitle area
   - VoiceSubtitle displays text with typewriter effect
   - Audio level updates from TTS playback

4. **Session End**:
   - Status changes back to `idle`
   - All components fade out

---

## Customization Guide

### For Designers

All components accept customizable parameters:

**Colors**: Adjust glow colors, waveform colors, subtitle backgrounds
**Timing**: Control animation speeds, breathing cycles, typewriter speed
**Sizing**: Button sizes, subtitle widths, waveform dimensions
**Positioning**: Subtitle placement, indicator location

### For Developers

**Tailwind Configuration**: Custom animations are defined in `tailwind.config.js`:
- `breathing`: Opacity + scale pulsing
- `breathingGlow`: Glow intensity pulsing
- `fade-in/fade-out`: Opacity + translation
- `scale-in`: Scale + opacity entrance

**Component Files**:
- `/components/VoiceSubtitle.tsx`
- `/components/MicButton.tsx`
- `/components/VoiceWaveform.tsx`
- `/components/VoiceStatusIndicator.tsx`

---

## Performance Considerations

1. **Canvas Rendering**: VoiceWaveform uses RAF (requestAnimationFrame) for smooth 60fps animations
2. **Smooth Transitions**: Configurable smoothing prevents jittery movements
3. **Conditional Rendering**: Components only render when needed (isActive, isVisible flags)
4. **Memory Management**: Animation frames properly cleaned up on unmount

---

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Required APIs**: Canvas 2D, CSS backdrop-filter, CSS custom properties
- **Fallbacks**: Components gracefully degrade if features unsupported

---

## Future Enhancements

Potential improvements for voice UI:

1. **Subtitle Translation**: Implement live translation feature
2. **Voice Visualization Themes**: Additional waveform styles (spectrum, radial bars)
3. **Gesture Controls**: Touch gestures for mobile interactions
4. **Accessibility**: Screen reader support, keyboard shortcuts
5. **Customizable Themes**: User-selectable color schemes

---

## Troubleshooting

### Subtitle not appearing
- Check `currentText` has value
- Verify `isVisible` is true
- Ensure Tailwind classes are compiled

### Waveform not animating
- Confirm `isActive` is true
- Check `audioLevel` is updating (0.0-1.0 range)
- Verify canvas element renders

### MicButton not responding
- Check `onClick` handler is bound
- Verify state updates in parent component
- Test browser console for errors

### Status indicator wrong color
- Verify `status` prop matches type definition
- Check connection callback updates
- Inspect status state transitions

---

## Credits

Designed for Memory Notebook - A sanctuary for precious moments.
Implementation follows modern React + TypeScript best practices with Tailwind CSS.

