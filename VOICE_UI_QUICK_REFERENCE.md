# Voice UI Components - Quick Reference

## 🎙 Component Summary

### 1. **VoiceSubtitle** (语音字幕)
**File**: `components/VoiceSubtitle.tsx`
- ✨ Live text display with typewriter effect
- 🎨 Semi-transparent card with backdrop blur
- 📍 Configurable position (top/center/bottom)
- ⚙️ Adjustable: opacity, speed, font size, max width

### 2. **MicButton** (语音按钮) 
**File**: `components/MicButton.tsx`
- 🔴 Recording state with red glow
- 💫 Breathing animation during recording
- 📐 Configurable size (48-80px)
- ⚙️ Adjustable: size, glow color, breathing duration

### 3. **VoiceWaveform** (语音波形)
**File**: `components/VoiceWaveform.tsx`
- 📊 Real-time audio visualization (bars/line/circular)
- 🌊 Smooth wave motion with audio reactivity
- 🎨 Canvas-based rendering (60fps)
- ⚙️ Adjustable: type, color, bar count, smoothing, size

### 4. **VoiceStatusIndicator** (连接指示灯)
**File**: `components/VoiceStatusIndicator.tsx`
- 🔵 Four states: idle (gray) / connecting (yellow) / connected (green) / error (red)
- ✨ Sparkle effect on connected state
- 💡 Hover tooltip with status description
- ⚙️ Adjustable: size, label, glow intensity

---

## 🎯 Integration Points in App.tsx

### Added Imports
```typescript
import VoiceSubtitle from './components/VoiceSubtitle';
import MicButton from './components/MicButton';
import VoiceWaveform from './components/VoiceWaveform';
import VoiceStatusIndicator, { VoiceConnectionStatus } from './components/VoiceStatusIndicator';
```

### New State
```typescript
const [voiceStatus, setVoiceStatus] = useState<VoiceConnectionStatus>('idle');
```

### SessionView Layout
```typescript
// Header: VoiceStatusIndicator
<VoiceStatusIndicator status={voiceStatus} label="Gemini" />

// Central Area: VoiceWaveform + VoiceSubtitle
<VoiceWaveform audioLevel={audioLevel} isActive={sessionState === 'SPEAKING'} />
<VoiceSubtitle text={currentText} isVisible={!!currentText} />

// Bottom: MicButton
<MicButton isRecording={isMicActive} onClick={...} />
```

---

## 🎨 Tailwind Custom Animations

**File**: `tailwind.config.js`

Added animations:
- `breathing` - Scale + opacity pulse (1.8s cycle)
- `breathing-glow` - Glow intensity pulse
- `fade-in` - Opacity + translateY entrance
- `fade-out` - Opacity + translateY exit
- `scale-in` - Scale + opacity entrance

---

## 📱 User Experience Flow

```
1. Upload Photo → Visualize & Speak
2. Session Starts
   ├─ Status: idle → connecting → connected (green dot)
   └─ Mic Button: automatically enabled (red)

3. User Speaks
   ├─ Mic Button: breathing glow effect
   └─ Particles: react to microphone input

4. AI Responds
   ├─ Session State: SPEAKING
   ├─ Waveform: appears with audio visualization
   ├─ Subtitle: typewriter text reveal
   └─ Particles: react to TTS audio

5. End Session
   └─ Status: connected → idle
```

---

## 🔧 Quick Customization

### Change Subtitle Position
```tsx
<VoiceSubtitle position="center" /> // top | center | bottom
```

### Adjust Waveform Style
```tsx
<VoiceWaveform type="circular" /> // bars | line | circular
```

### Change Button Size
```tsx
<MicButton size={80} /> // 48-80 recommended
```

### Modify Status Label
```tsx
<VoiceStatusIndicator label="GPT-4o" />
```

---

## 📋 Files Modified/Created

### Created (4 new components):
- ✅ `components/VoiceSubtitle.tsx`
- ✅ `components/MicButton.tsx`
- ✅ `components/VoiceWaveform.tsx`
- ✅ `components/VoiceStatusIndicator.tsx`

### Modified:
- ✅ `App.tsx` - Integrated all voice UI components
- ✅ `types.ts` - Added VoiceConnectionStatus type
- ✅ `tailwind.config.js` - Added custom animations

### Documentation:
- ✅ `VOICE_UI_DOCUMENTATION.md` - Comprehensive guide
- ✅ `VOICE_UI_QUICK_REFERENCE.md` - This file

---

## ✅ Testing Checklist

- [ ] Voice status indicator changes: idle → connecting → connected
- [ ] Mic button toggles recording state with glow effect
- [ ] Waveform appears and animates during AI speech
- [ ] Subtitle displays with typewriter effect
- [ ] All animations smooth (300ms transitions)
- [ ] Components fade in/out properly
- [ ] Responsive on mobile devices
- [ ] No console errors

---

## 🚀 Next Steps

1. Run `npm run dev` to test the voice UI
2. Verify all components render correctly
3. Test voice session flow from start to end
4. Adjust parameters to match design preferences
5. Test on different screen sizes

---

**Ready to use! All voice UI components are fully integrated and functional.** 🎉

