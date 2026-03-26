# Visual Feedback

## Screen Shake

Use for impacts, errors, or important events. The intensity should match the significance.

### Intensity Levels

| Level  | Offset | Duration | Use Case                      |
| ------ | ------ | -------- | ----------------------------- |
| Light  | 2-4px  | 200ms    | Minor feedback, notifications |
| Medium | 4-8px  | 300ms    | Errors, collisions            |
| Heavy  | 8-12px | 400ms    | Major impacts, game over      |

### CSS Implementation

```css
@keyframes shake-light {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-2px);
  }
  40% {
    transform: translateX(2px);
  }
  60% {
    transform: translateX(-1px);
  }
  80% {
    transform: translateX(1px);
  }
}

@keyframes shake-medium {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-4px);
  }
  40% {
    transform: translateX(4px);
  }
  60% {
    transform: translateX(-2px);
  }
  80% {
    transform: translateX(2px);
  }
}

@keyframes shake-heavy {
  0%,
  100% {
    transform: translateX(0);
  }
  10% {
    transform: translateX(-8px) rotate(-1deg);
  }
  30% {
    transform: translateX(8px) rotate(1deg);
  }
  50% {
    transform: translateX(-6px);
  }
  70% {
    transform: translateX(6px);
  }
  90% {
    transform: translateX(-2px);
  }
}

.shake-light {
  animation: shake-light 0.2s ease-out;
}
.shake-medium {
  animation: shake-medium 0.3s ease-out;
}
.shake-heavy {
  animation: shake-heavy 0.4s ease-out;
}
```

### Framer Motion Implementation

```typescript
const shakeVariants = {
  light: {
    x: [0, -2, 2, -1, 1, 0],
    transition: { duration: 0.2 }
  },
  medium: {
    x: [0, -4, 4, -2, 2, 0],
    transition: { duration: 0.3 }
  },
  heavy: {
    x: [0, -8, 8, -6, 6, -2, 0],
    rotate: [0, -1, 1, -0.5, 0.5, 0],
    transition: { duration: 0.4 }
  }
};

// Usage
<motion.div
  animate={shakeIntensity}
  variants={shakeVariants}
/>
```

### React Hook for Screen Shake

```typescript
function useScreenShake() {
  const [shake, setShake] = useState<'light' | 'medium' | 'heavy' | null>(null);

  const triggerShake = useCallback((intensity: 'light' | 'medium' | 'heavy') => {
    setShake(intensity);
    const duration = intensity === 'light' ? 200 : intensity === 'medium' ? 300 : 400;
    setTimeout(() => setShake(null), duration);
  }, []);

  return { shake, triggerShake };
}
```

## Color & Flash Effects

### Flash on Success/Error

```typescript
function useFlash() {
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);

  const triggerFlash = useCallback((type: 'success' | 'error') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 150);
  }, []);

  return { flash, triggerFlash };
}

// Component
<motion.div
  className="absolute inset-0 pointer-events-none"
  animate={{
    backgroundColor: flash === 'success' ? 'rgba(34, 197, 94, 0.3)' :
                     flash === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                     'rgba(0, 0, 0, 0)'
  }}
  transition={{ duration: 0.1 }}
/>
```

### Border/Outline Flash

```typescript
const borderFlash = {
  success: {
    boxShadow: [
      '0 0 0 0 rgba(34, 197, 94, 0)',
      '0 0 0 4px rgba(34, 197, 94, 0.4)',
      '0 0 0 0 rgba(34, 197, 94, 0)',
    ],
    transition: { duration: 0.4 },
  },
  error: {
    boxShadow: [
      '0 0 0 0 rgba(239, 68, 68, 0)',
      '0 0 0 4px rgba(239, 68, 68, 0.4)',
      '0 0 0 0 rgba(239, 68, 68, 0)',
    ],
    transition: { duration: 0.4 },
  },
};
```

### Pulse/Glow Effect

```css
@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.4);
  }
}

.pulse-glow {
  animation: pulse-glow 1.5s ease-in-out infinite;
}
```

## Particle Effects

### Confetti (react-confetti-explosion)

```typescript
import ConfettiExplosion from 'react-confetti-explosion';

function WinCelebration({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <ConfettiExplosion
      force={0.6}
      duration={2500}
      particleCount={100}
      width={1000}
    />
  ) : null;
}
```

### Configuration Options

| Prop            | Value     | Effect                   |
| --------------- | --------- | ------------------------ |
| `force`         | 0.2-0.8   | How far particles spread |
| `duration`      | 2000-3000 | Animation length (ms)    |
| `particleCount` | 50-200    | Number of particles      |
| `width`         | 500-1500  | Spread width             |
| `colors`        | string[]  | Custom colors            |

### DIY Particle System (CSS)

```css
@keyframes particle-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(0);
    opacity: 0;
  }
}

.particle {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: particle-rise 0.8s ease-out forwards;
}
```

```typescript
// Generate particles on event
function createParticles(x: number, y: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    x: x + (Math.random() - 0.5) * 40,
    y,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.1,
  }));
}
```

## Visual Feedback Checklist

For important interactions, consider:

- [ ] **Immediate response** - Something changes within 100ms
- [ ] **State indication** - User can see what changed
- [ ] **Proportional feedback** - Big actions get big feedback
- [ ] **Consistency** - Same action = same feedback everywhere

## Anti-Patterns

1. **Too much shake** - Reserve for truly impactful moments
2. **Constant flashing** - Causes fatigue and accessibility issues
3. **Slow feedback** - Anything over 100ms feels laggy
4. **Inconsistent colors** - Success should always be green, errors red
