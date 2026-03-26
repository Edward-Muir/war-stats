# Animation Principles

## Easing & Tweening

Choose easing based on the emotion you want to create:

### Exponential - Sharp, Impactful

Use for hits, errors, sudden stops.

```typescript
// Framer Motion
transition: { ease: [0.16, 1, 0.3, 1], duration: 0.3 }

// CSS
transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
```

### Quadratic - Soft, Gentle

Use for UI transitions, fades.

```typescript
// Framer Motion
transition: { ease: "easeOut", duration: 0.2 }

// CSS
transition: opacity 0.2s ease-out;
```

### Spring - Natural, Bouncy

Use for interactive elements, playful UI.

```typescript
// Framer Motion
transition: { type: "spring", stiffness: 400, damping: 25 }
```

Spring configurations:
| Feel | Stiffness | Damping |
|------|-----------|---------|
| Bouncy, playful | 300 | 10 |
| Snappy, responsive | 500 | 30 |
| Gentle, smooth | 200 | 20 |
| No bounce (critical) | 400 | 40 |

## Squash and Stretch

The most important animation principle. Objects compress on impact and stretch when moving fast.

### Key Rule

**Maintain volume**: If you stretch tall, squash narrow. Total "mass" stays constant.

### Framer Motion Implementation

```typescript
const squashStretchVariants = {
  idle: { scaleX: 1, scaleY: 1 },
  squash: { scaleX: 1.2, scaleY: 0.8 },
  stretch: { scaleX: 0.8, scaleY: 1.2 },
};

<motion.div
  variants={squashStretchVariants}
  animate={isLanding ? "squash" : "idle"}
  transition={{ type: "spring", stiffness: 500, damping: 15 }}
/>
```

### CSS Keyframes

```css
@keyframes bounce {
  0% {
    transform: scaleX(1) scaleY(1) translateY(0);
  }
  30% {
    transform: scaleX(1.1) scaleY(0.9) translateY(0);
  } /* squash on land */
  50% {
    transform: scaleX(0.95) scaleY(1.05) translateY(-10px);
  } /* stretch up */
  70% {
    transform: scaleX(1.02) scaleY(0.98) translateY(0);
  } /* small squash */
  100% {
    transform: scaleX(1) scaleY(1) translateY(0);
  }
}

.bouncing {
  animation: bounce 0.6s ease-out;
}
```

### When to Use

- Landing after a jump/drop
- Button press feedback
- Card placement
- Object collisions
- Celebratory bounces

## Timing Guidelines

Consistency is key. Pick durations and stick to them across your app.

| Interaction Type   | Duration  | Use Case                                   |
| ------------------ | --------- | ------------------------------------------ |
| Micro-interactions | 100-150ms | Hover states, button press                 |
| Quick feedback     | 150-250ms | Tap responses, toggles                     |
| UI transitions     | 200-400ms | Modal open, panel slide                    |
| Page transitions   | 300-600ms | Route changes, major state shifts          |
| Emphasis           | 400-800ms | Celebratory animations, attention-grabbing |
| Ambient            | 1000ms+   | Background loops, idle animations          |

### Anti-Pattern

Don't use the same duration for everything. Fast interactions (taps) should feel instant; larger transitions can be slower.

## CSS Animation Utilities

### Reusable Timing Constants

```typescript
// constants/animation.ts
export const TIMING = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  emphasis: 600,
} as const;

export const EASING = {
  snap: [0.16, 1, 0.3, 1],
  smooth: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
} as const;
```

### CSS Custom Properties

```css
:root {
  --timing-instant: 100ms;
  --timing-fast: 150ms;
  --timing-normal: 250ms;
  --timing-slow: 400ms;

  --ease-snap: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

## Common Animation Patterns

### Enter/Exit

```typescript
const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.2 },
};
```

### Scale Pop

```typescript
const scalePop = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  transition: { type: 'spring', stiffness: 500, damping: 30 },
};
```

### Stagger Children

```typescript
const container = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const child = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};
```
