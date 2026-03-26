# Framer Motion Patterns

## Gesture Props

### Basic Gestures

```typescript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Click Me
</motion.button>
```

### With Transitions

```typescript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Bouncy Button
</motion.button>
```

### Drag Interactions

```typescript
<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
  dragElastic={0.2}
  whileDrag={{ scale: 1.1, cursor: "grabbing" }}
  onDragStart={() => console.log('Started dragging')}
  onDragEnd={(event, info) => console.log('Velocity:', info.velocity)}
/>
```

### Focus States

```typescript
<motion.input
  whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
/>
```

## AnimatePresence

Required for exit animations when components unmount.

### Basic Usage

```typescript
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    />
  )}
</AnimatePresence>
```

### List Items

```typescript
<AnimatePresence>
  {items.map(item => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout  // Smooth reordering
    >
      {item.name}
    </motion.li>
  ))}
</AnimatePresence>
```

### Mode Options

```typescript
// Wait for exit before enter (sequential)
<AnimatePresence mode="wait">

// Exit and enter simultaneously (default)
<AnimatePresence mode="sync">

// Don't animate initial render
<AnimatePresence initial={false}>
```

## Layout Animations

### Auto Layout

```typescript
// Elements smoothly animate when their position changes
<motion.div layout>
  {/* Content that may resize or reposition */}
</motion.div>
```

### Layout ID (Shared Element Transitions)

```typescript
// Card in list
<motion.div layoutId={`card-${id}`}>
  <h3>{title}</h3>
</motion.div>

// Same card expanded (different component)
<motion.div layoutId={`card-${id}`}>
  <h3>{title}</h3>
  <p>{description}</p>
</motion.div>
```

### Layout Groups

```typescript
import { LayoutGroup } from 'framer-motion';

// Elements in the same group animate together
<LayoutGroup>
  <motion.div layout />
  <motion.div layout />
</LayoutGroup>
```

## Spring Physics

### Configuration Options

```typescript
transition: {
  type: "spring",
  stiffness: 400,  // Spring tension (higher = faster)
  damping: 25,     // Friction (higher = less bounce)
  mass: 1,         // Weight (higher = slower, more momentum)
}
```

### Presets

```typescript
const springs = {
  // Quick and snappy
  snappy: { type: 'spring', stiffness: 500, damping: 30 },

  // Bouncy and playful
  bouncy: { type: 'spring', stiffness: 300, damping: 10 },

  // Smooth and gentle
  gentle: { type: 'spring', stiffness: 200, damping: 20 },

  // No bounce (critically damped)
  noOvershoot: { type: 'spring', stiffness: 400, damping: 40 },

  // Heavy/slow
  heavy: { type: 'spring', stiffness: 200, damping: 30, mass: 2 },
};
```

### Bounce Calculation

For critical damping (no bounce): `damping = 2 * sqrt(stiffness * mass)`

## Variants

### Basic Variants

```typescript
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

<motion.div
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
/>
```

### Parent-Child Propagation

```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

## useReducedMotion

Respect user's motion preferences:

```typescript
import { useReducedMotion } from 'framer-motion';

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ x: 100 }}
      transition={shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 400 }
      }
    />
  );
}
```

## useInView

Trigger animations when elements enter viewport:

```typescript
import { useInView, motion } from 'framer-motion';
import { useRef } from 'react';

function FadeInSection({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

## Animation Controls

### Manual Control

```typescript
import { useAnimation } from 'framer-motion';

function Component() {
  const controls = useAnimation();

  const handleClick = async () => {
    await controls.start({ scale: 1.2 });
    await controls.start({ scale: 1 });
  };

  return <motion.div animate={controls} onClick={handleClick} />;
}
```

### Sequence Animations

```typescript
const controls = useAnimation();

async function sequence() {
  await controls.start({ x: 100 });
  await controls.start({ y: 100 });
  await controls.start({ x: 0, y: 0 });
}
```

## Common Patterns

### Card Hover Effect

```typescript
<motion.div
  whileHover={{ y: -4, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
  transition={{ type: "spring", stiffness: 300 }}
>
  <Card />
</motion.div>
```

### Button Press

```typescript
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Submit
</motion.button>
```

### Notification Toast

```typescript
<AnimatePresence>
  {toast && (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {toast.message}
    </motion.div>
  )}
</AnimatePresence>
```
