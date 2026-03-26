# Accessibility

## Reduced Motion

### Why It Matters

Some users experience motion sickness, vestibular disorders, or seizures from animations. The `prefers-reduced-motion` media query lets you respect their system settings.

### CSS Implementation

```css
/* Global disable for all animations */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Targeted CSS

```css
.animated-element {
  transition: transform 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .animated-element {
    transition: none;
  }
}
```

### Framer Motion Hook

```typescript
import { useReducedMotion } from 'framer-motion';

function AnimatedCard() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 400 }
      }
    />
  );
}
```

### Custom Hook

```typescript
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

### What to Reduce vs Remove

| Keep (essential)          | Reduce/Remove           |
| ------------------------- | ----------------------- |
| State changes (show/hide) | Decorative motion       |
| Focus indicators          | Parallax effects        |
| Loading states            | Auto-playing animations |
| Progress feedback         | Screen shake            |
|                           | Bouncy springs          |
|                           | Particles               |

## Audio Accessibility

### Always Provide Mute Control

```typescript
function AudioControls() {
  const { isMuted, toggleMute, volume, setVolume } = useAudioSettings();

  return (
    <div role="group" aria-label="Audio controls">
      <button
        onClick={toggleMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
      >
        {isMuted ? <VolumeX /> : <Volume2 />}
      </button>

      <label>
        <span className="sr-only">Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
        />
      </label>
    </div>
  );
}
```

### Never Auto-Play

```typescript
// Bad - auto-plays on load
useEffect(() => {
  backgroundMusic.play();
}, []);

// Good - requires user action
function StartScreen() {
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    setHasStarted(true);
    backgroundMusic.play();
  };

  return (
    <button onClick={handleStart}>
      Start Game
    </button>
  );
}
```

### Multi-Sensory Feedback

Never rely on audio alone. Pair with visual feedback:

```typescript
function Notification({ type, message }) {
  const { playSound } = useSounds();

  useEffect(() => {
    playSound(type);  // Audio feedback
  }, [type, playSound]);

  return (
    <div
      role="alert"  // Announced by screen readers
      className={cn(
        "notification",
        type === 'success' && "bg-green-500",  // Visual feedback
        type === 'error' && "bg-red-500"
      )}
    >
      {type === 'success' && <CheckIcon />}  {/* Icon feedback */}
      {type === 'error' && <XIcon />}
      {message}
    </div>
  );
}
```

## Focus Management

### Visible Focus Indicators

```css
/* Never remove focus outlines entirely */
:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Style for keyboard users only */
:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### Focus Trapping in Modals

```typescript
import { FocusTrap } from 'focus-trap-react';

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap>
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
            <button onClick={onClose}>Close</button>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
```

## Screen Reader Considerations

### Announce Dynamic Content

```typescript
function ScoreDisplay({ score }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      Score: {score}
    </div>
  );
}
```

### Hide Decorative Elements

```typescript
// Decorative animations shouldn't be announced
<motion.div
  aria-hidden="true"
  className="background-particles"
/>

// Meaningful content should be accessible
<motion.div
  role="status"
  aria-label={`Card placed ${isCorrect ? 'correctly' : 'incorrectly'}`}
>
  {isCorrect ? <CheckIcon /> : <XIcon />}
</motion.div>
```

## Timing and Timeouts

### Provide Enough Time

```typescript
// Bad - disappears too quickly
setTimeout(() => hideMessage(), 1500);

// Good - adequate reading time
setTimeout(() => hideMessage(), 5000);

// Better - let user control
<Toast
  message="Card placed correctly!"
  onDismiss={() => setToast(null)}
  autoDismiss={5000}
/>
```

### Pause on Hover/Focus

```typescript
function Toast({ message, autoDismiss, onDismiss }) {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(onDismiss, autoDismiss);
    return () => clearTimeout(timer);
  }, [isPaused, autoDismiss, onDismiss]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {message}
    </div>
  );
}
```

## Quick Checklist

- [ ] Respect `prefers-reduced-motion`
- [ ] Provide mute/volume controls
- [ ] Never auto-play audio
- [ ] Pair audio with visual feedback
- [ ] Maintain visible focus indicators
- [ ] Use `aria-live` for dynamic content
- [ ] Hide decorative animations from screen readers
- [ ] Provide adequate time for timed content
- [ ] Test with screen readers (VoiceOver, NVDA)
