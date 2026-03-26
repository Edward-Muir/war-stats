# Performance

## GPU-Accelerated Properties

These properties are handled by the compositor and don't trigger layout or paint:

### Always Use

- `transform` (translate, scale, rotate, skew)
- `opacity`

```typescript
// Good - GPU accelerated
<motion.div
  animate={{
    x: 100,        // translateX
    y: 50,         // translateY
    scale: 1.1,
    rotate: 45,
    opacity: 0.5
  }}
/>
```

### Avoid Animating

These trigger expensive layout recalculations:

| Property                            | Alternative               |
| ----------------------------------- | ------------------------- |
| `width` / `height`                  | Use `scale`               |
| `top` / `left` / `right` / `bottom` | Use `x` / `y` (translate) |
| `margin` / `padding`                | Use `x` / `y`             |
| `border-width`                      | Animate a pseudo-element  |
| `font-size`                         | Use `scale`               |

```typescript
// Bad - triggers layout
<motion.div animate={{ width: 200, marginLeft: 20 }} />

// Good - GPU accelerated
<motion.div animate={{ scaleX: 1.5, x: 20 }} />
```

## will-change Hint

Tell the browser to prepare for animation:

```css
.will-animate {
  will-change: transform, opacity;
}
```

**Caution**: Use sparingly. Overuse consumes memory. Remove after animation completes.

```typescript
const [isAnimating, setIsAnimating] = useState(false);

<div style={{ willChange: isAnimating ? 'transform' : 'auto' }} />
```

## Reducing Re-renders

### Memoize Animation Callbacks

```typescript
// Bad - new function every render
<motion.div onAnimationComplete={() => onComplete()} />

// Good - stable reference
const handleComplete = useCallback(() => {
  onComplete();
}, [onComplete]);

<motion.div onAnimationComplete={handleComplete} />
```

### Memoize Animation Configs

```typescript
// Bad - new object every render
<motion.div
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
/>

// Good - stable reference
const springTransition = useMemo(() => ({
  type: "spring",
  stiffness: 400,
  damping: 25
}), []);

<motion.div transition={springTransition} />
```

### Memo Animated Components

```typescript
const AnimatedCard = React.memo(({ item, onSelect }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onSelect(item.id)}
  >
    {item.name}
  </motion.div>
));
```

### Extract Static Variants

```typescript
// Define outside component (never recreated)
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Card() {
  return <motion.div variants={cardVariants} />;
}
```

## Lazy Animation Loading

### useInView for Viewport-Based Loading

```typescript
import { useInView } from 'framer-motion';

function LazyAnimatedSection({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,     // Only trigger once
    margin: "-50px" // Start 50px before entering viewport
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
    >
      {children}
    </motion.div>
  );
}
```

### Conditional Animation

```typescript
function Card({ item, isVisible }) {
  // Don't animate if not visible
  if (!isVisible) {
    return <div>{item.name}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {item.name}
    </motion.div>
  );
}
```

## Batch State Updates

### Group Related State Changes

```typescript
// Bad - multiple re-renders
setIsAnimating(true);
setScore(score + 1);
setMessage('Great!');

// Good - single re-render (React 18+ auto-batches)
// But be explicit for clarity:
import { flushSync } from 'react-dom';

// Or use a reducer for complex state
const [state, dispatch] = useReducer(gameReducer, initialState);
dispatch({ type: 'SCORE_POINT' }); // Updates multiple values atomically
```

## Animation Cleanup

### Cancel Animations on Unmount

```typescript
import { useAnimation } from 'framer-motion';

function Component() {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ x: 100 });

    return () => {
      controls.stop(); // Prevent memory leaks
    };
  }, [controls]);

  return <motion.div animate={controls} />;
}
```

### Clear Timeouts

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    setIsAnimating(false);
  }, 500);

  return () => clearTimeout(timeout);
}, []);
```

## Profiling Animations

### React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Record during animation
4. Look for components re-rendering unnecessarily

### Chrome Performance Tab

1. Open DevTools → Performance
2. Record during animation
3. Look for:
   - Long "Recalculate Style" (avoid layout-triggering properties)
   - Long "Paint" (reduce painted area)
   - Dropped frames (target 16ms per frame for 60fps)

### Framer Motion Debug

```typescript
// Log animation frame values
<motion.div
  animate={{ x: 100 }}
  onUpdate={(latest) => console.log(latest)}
/>
```

## Quick Checklist

- [ ] Only animate `transform` and `opacity`
- [ ] Memoize callbacks and config objects
- [ ] Use `React.memo` for animated list items
- [ ] Define variants outside components
- [ ] Use `useInView` for off-screen content
- [ ] Clean up animations on unmount
- [ ] Profile with React DevTools
