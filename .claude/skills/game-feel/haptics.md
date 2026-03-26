# Haptic Feedback

## Vibration API Basics

The Vibration API provides haptic feedback on mobile devices.

### Check Support

```typescript
const supportsVibration = 'vibrate' in navigator;
```

### Simple Vibration

```typescript
// Single vibration (milliseconds)
navigator.vibrate(50); // 50ms buzz

// Pattern: [vibrate, pause, vibrate, pause, ...]
navigator.vibrate([100, 50, 100]); // Double tap

// Stop vibration
navigator.vibrate(0);
```

## Feedback Patterns

Define consistent patterns for different interaction types:

```typescript
const haptics = {
  // UI feedback
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(25),
  heavy: () => navigator.vibrate?.(50),

  // Semantic feedback
  success: () => navigator.vibrate?.([30, 50, 30]), // Double light tap
  error: () => navigator.vibrate?.([50, 30, 50, 30, 80]), // Escalating buzz
  warning: () => navigator.vibrate?.([40, 40, 40]), // Triple pulse

  // Game events
  impact: () => navigator.vibrate?.(80),
  drop: () => navigator.vibrate?.([20, 10, 40]),
  select: () => navigator.vibrate?.(15),
};
```

### Pattern Guidelines

| Feedback Type | Duration  | Pattern       | Use Case                 |
| ------------- | --------- | ------------- | ------------------------ |
| Light tap     | 10-15ms   | Single        | Hover, minor select      |
| Medium tap    | 20-30ms   | Single        | Button press, toggle     |
| Heavy tap     | 40-60ms   | Single        | Confirm, submit          |
| Success       | 60-100ms  | Double pulse  | Achievement, win         |
| Error         | 100-200ms | Escalating    | Validation fail, mistake |
| Impact        | 50-100ms  | Single strong | Collision, placement     |

## React Hook

```typescript
function useHaptics() {
  const isSupported = 'vibrate' in navigator;

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (isSupported) {
        navigator.vibrate(pattern);
      }
    },
    [isSupported]
  );

  const haptics = useMemo(
    () => ({
      light: () => vibrate(10),
      medium: () => vibrate(25),
      heavy: () => vibrate(50),
      success: () => vibrate([30, 50, 30]),
      error: () => vibrate([50, 30, 50, 30, 80]),
      impact: () => vibrate(80),
    }),
    [vibrate]
  );

  return { isSupported, vibrate, haptics };
}
```

## Multi-Sensory Feedback

Always pair haptics with visual and audio feedback for the best experience:

```typescript
function useMultiSensoryFeedback() {
  const { haptics } = useHaptics();
  const { playSound } = useSounds();
  const { triggerFlash } = useFlash();

  const feedback = {
    success: () => {
      haptics.success();
      playSound('success');
      triggerFlash('success');
    },
    error: () => {
      haptics.error();
      playSound('error');
      triggerFlash('error');
      triggerShake('medium');
    },
    impact: () => {
      haptics.impact();
      playSound('thud');
    },
  };

  return feedback;
}
```

## Limitations

### Browser Support

| Browser          | Support         |
| ---------------- | --------------- |
| Chrome Android   | Full            |
| Firefox Android  | Full            |
| Safari iOS       | Limited/None    |
| Desktop browsers | None (no motor) |

### Requirements

1. **HTTPS** - Required on most browsers
2. **User gesture** - Must be triggered by user interaction (click, touch)
3. **Not in background** - Page must be visible

### Safe Usage Pattern

```typescript
function safeVibrate(pattern: number | number[]) {
  try {
    // Check support and page visibility
    if ('vibrate' in navigator && document.visibilityState === 'visible') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently fail - haptics are enhancement, not critical
  }
}
```

## Integration with Events

### On Button Click

```typescript
<button
  onClick={(e) => {
    haptics.medium();
    handleClick(e);
  }}
>
  Click Me
</button>
```

### On Drag Events

```typescript
const { haptics } = useHaptics();

<motion.div
  drag
  onDragStart={() => haptics.light()}
  onDragEnd={() => haptics.impact()}
/>
```

### On Game Events

```typescript
function placeCard(index: number) {
  const isCorrect = checkPlacement(index);

  if (isCorrect) {
    haptics.success();
  } else {
    haptics.error();
  }

  // ... rest of placement logic
}
```

## Best Practices

1. **Keep it subtle** - Less is more; constant vibration is annoying
2. **Match intensity to importance** - Save strong feedback for significant events
3. **Always provide alternatives** - Never rely solely on haptics
4. **Respect system settings** - Some users disable vibration
5. **Test on real devices** - Emulators don't provide accurate haptic feedback
6. **Use short patterns** - Long vibrations drain battery and annoy users
