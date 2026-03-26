# Mobile-First Design

## Touch Targets & Thumb Zones

### Minimum Touch Target Sizes

| Standard          | Size    | Use Case                 |
| ----------------- | ------- | ------------------------ |
| Apple HIG         | 44x44px | iOS apps, Safari         |
| Material Design 3 | 48x48dp | Android apps, Chrome     |
| WCAG 2.2          | 24x24px | Absolute minimum (avoid) |

**Key stat**: 25%+ of users miss targets smaller than 44x44px, especially those with motor impairments.

### Tailwind Touch Target Classes

```css
/* Utility class for minimum touch targets */
.touch-target {
  @apply min-w-[44px] min-h-[44px];
}

/* Extend small icons with padding */
.touch-target-padded {
  @apply p-3; /* 12px padding extends 20px icon to 44px */
}
```

```typescript
// Icon button with proper touch target
<button className="p-3 -m-3"> {/* Padding extends target, negative margin keeps visual size */}
  <Icon className="w-5 h-5" />
</button>
```

### Touch Target Spacing

Maintain **8px minimum** between interactive elements to prevent accidental taps.

```typescript
// Bad - buttons too close
<div className="flex gap-1">
  <button>Save</button>
  <button>Cancel</button>
</div>

// Good - adequate spacing
<div className="flex gap-3"> {/* 12px gap */}
  <button>Save</button>
  <button>Cancel</button>
</div>
```

### Thumb Zone Ergonomics

75% of users interact with phones using only one thumb. Design for this.

| Zone             | Location      | Comfort Level            |
| ---------------- | ------------- | ------------------------ |
| Easy (Green)     | Bottom center | Natural, comfortable     |
| Stretch (Yellow) | Mid-sides     | Reachable but strained   |
| Hard (Red)       | Top corners   | Requires grip adjustment |

**Best practices:**

- Place primary CTAs in bottom/center of screen
- Avoid critical actions in top corners
- Use bottom sheets instead of top modals
- Consider both right and left-handed users

```typescript
// Primary action in thumb-friendly zone
<div className="fixed bottom-0 inset-x-0 p-4 pb-safe">
  <button className="w-full py-4 bg-accent text-white rounded-xl">
    Place Card
  </button>
</div>
```

## Visual Hierarchy & Spacing

### The 8-Point Grid System

All spacing should be multiples of 8px for consistency across iOS and Android.

| Token | Size | Use Case                       |
| ----- | ---- | ------------------------------ |
| xs    | 4px  | Tight spacing, icon gaps       |
| sm    | 8px  | Related elements, list items   |
| md    | 16px | Section padding, card padding  |
| lg    | 24px | Section gaps, major separators |
| xl    | 32px | Page margins, hero spacing     |
| 2xl   | 48px | Major section breaks           |

### Spacing Guidelines

```typescript
// Card with 8-point grid spacing
<div className="p-4 space-y-3"> {/* 16px padding, 12px vertical gap */}
  <h2 className="text-lg font-semibold">Card Title</h2>
  <p className="text-sm text-gray-600">Description text</p>
  <button className="mt-4">Action</button> {/* 16px top margin */}
</div>
```

### Visual Hierarchy Principles

1. **Single primary CTA per screen** - Avoid decision fatigue
2. **Progressive disclosure** - Reveal complexity as needed
3. **Grouping by proximity** - Related items close together
4. **Generous white space** - Reduces cognitive load by 20%

```typescript
// Clear hierarchy with single primary action
<div className="space-y-6">
  <h1 className="text-2xl font-bold">Game Over</h1>
  <p className="text-gray-600">You scored 8 out of 10!</p>

  <button className="w-full py-4 bg-accent text-white"> {/* Primary */}
    Play Again
  </button>

  <button className="w-full py-3 text-gray-600"> {/* Secondary */}
    Share Results
  </button>
</div>
```

## Typography

### Mobile Font Size Guidelines

| Element       | Size Range | Notes                |
| ------------- | ---------- | -------------------- |
| Body text     | 16-18px    | Never below 16px     |
| Small/caption | 14px       | Use sparingly        |
| Titles        | 24-32px    | Headers, game state  |
| Large display | 36-48px    | Scores, hero numbers |
| UI elements   | 14-16px    | Buttons, labels      |

### Line Height & Length

```css
/* Optimal readability */
body {
  font-size: 16px;
  line-height: 1.5; /* 24px - 1.4 to 1.6x font size */
  max-width: 65ch; /* 50-75 characters per line */
}
```

### Responsive Typography

```css
/* Fluid typography with clamp() */
h1 {
  font-size: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  /* Min 24px, scales with viewport, max 40px */
}

body {
  font-size: clamp(1rem, 0.875rem + 0.5vw, 1.125rem);
  /* Min 16px, max 18px */
}
```

### Contrast Requirements

| Element                        | Minimum Ratio |
| ------------------------------ | ------------- |
| Normal text (<18px)            | 4.5:1         |
| Large text (18px+ / 14px bold) | 3:1           |
| UI components & icons          | 3:1           |
| Focus indicators               | 3:1           |

```typescript
// Accessible text colors
const colors = {
  // On light backgrounds
  textPrimary: '#1a1a1a', // ~15:1 contrast
  textSecondary: '#525252', // ~7:1 contrast
  textMuted: '#737373', // ~4.5:1 contrast

  // On dark backgrounds (#121212)
  darkTextPrimary: '#e4e4e4', // ~12:1 contrast
  darkTextSecondary: '#a3a3a3', // ~7:1 contrast
};
```

## Navigation Patterns

### Bottom Tab Navigation

Best for apps with 3-5 primary destinations. Places navigation in the natural thumb zone.

```typescript
<nav className="fixed bottom-0 inset-x-0 bg-white border-t pb-safe">
  <div className="flex justify-around">
    {tabs.map(tab => (
      <button
        key={tab.id}
        className="flex flex-col items-center py-2 px-4 min-w-[64px]"
      >
        <tab.icon className="w-6 h-6" />
        <span className="text-xs mt-1">{tab.label}</span>
      </button>
    ))}
  </div>
</nav>
```

### Bottom Sheets

Use for contextual actions, filters, or detail views. Better than modals for mobile.

```typescript
import { motion, AnimatePresence } from 'framer-motion';

function BottomSheet({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-50 pb-safe"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Gesture Navigation Principles

- Support swipe gestures but always provide visible controls as fallback
- Use spring-based animations for natural feel (Material 3 Expressive)
- Provide haptic feedback on gesture completion (see [haptics.md](haptics.md))

## Dark Mode

### Color Principles

| Avoid                | Use Instead | Reason                            |
| -------------------- | ----------- | --------------------------------- |
| #000000 (pure black) | #121212     | Reduces eye strain, OLED halation |
| #FFFFFF (pure white) | #E4E4E4     | Reduces contrast fatigue          |

### Semantic Color Tokens

```typescript
const theme = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    textPrimary: '#1A1A1A',
    textSecondary: '#525252',
    border: '#E5E5E5',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    textPrimary: '#E4E4E4',
    textSecondary: '#A3A3A3',
    border: '#2E2E2E',
  },
};
```

### Tailwind Dark Mode

```typescript
<div className="bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100">
  <p className="text-gray-600 dark:text-gray-400">
    Secondary text with proper contrast in both modes
  </p>
</div>
```

### Elevation in Dark Mode

Use lighter surfaces (not shadows) to indicate elevation:

```typescript
const darkElevation = {
  0: '#121212', // Base
  1: '#1E1E1E', // Cards, sheets
  2: '#232323', // Raised elements
  3: '#282828', // Modals
  4: '#2E2E2E', // Popovers
};
```

## Loading States

### Skeleton Screens vs Spinners

Users perceive skeleton screens as **30% faster** than spinners for identical load times.

| Use Skeleton Screens         | Use Spinners             |
| ---------------------------- | ------------------------ |
| Known layouts (cards, lists) | Unpredictable load times |
| Progressive content loading  | Form submissions         |
| Initial page loads           | Actions with no preview  |

### Skeleton Implementation

```typescript
function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {/* Image placeholder */}
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />

      {/* Title placeholder */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />

      {/* Description placeholder */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
      </div>
    </div>
  );
}
```

### Shimmer Animation

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

## Mobile Performance

### Core Web Vitals Targets

| Metric | Good    | Description               |
| ------ | ------- | ------------------------- |
| LCP    | < 2.5s  | Largest Contentful Paint  |
| INP    | < 200ms | Interaction to Next Paint |
| CLS    | < 0.1   | Cumulative Layout Shift   |

### Performance Best Practices

```typescript
// Lazy load images
<img
  src={src}
  loading="lazy"
  decoding="async"
  width={300}
  height={200}  // Always set dimensions to prevent CLS
/>

// Lazy load below-fold components
const ExpandedCard = lazy(() => import('./ExpandedCard'));

<Suspense fallback={<SkeletonCard />}>
  <ExpandedCard />
</Suspense>
```

### Prevent Layout Shift

```typescript
// Reserve space for dynamic content
<div className="aspect-video"> {/* Maintains aspect ratio */}
  <img src={src} className="w-full h-full object-cover" />
</div>

// Use min-height for text containers
<p className="min-h-[48px]">
  {isLoading ? <Skeleton /> : text}
</p>
```

## Quick Checklist

### Touch & Interaction

- [ ] Touch targets are at least 44x44px
- [ ] 8px+ spacing between interactive elements
- [ ] Primary actions in bottom/center (thumb zone)
- [ ] Gesture interactions have visible fallbacks

### Typography & Readability

- [ ] Body text is 16px minimum
- [ ] Line height is 1.4-1.6x font size
- [ ] Text contrast meets 4.5:1 (normal) or 3:1 (large)
- [ ] Supports 200% text scaling (WCAG)

### Visual Design

- [ ] Using 8-point grid for spacing
- [ ] Single primary CTA per screen
- [ ] Dark mode uses #121212, not pure black
- [ ] White text uses #E4E4E4, not pure white

### Performance

- [ ] LCP under 2.5 seconds
- [ ] Images have explicit width/height
- [ ] Below-fold content is lazy loaded
- [ ] Loading states use skeletons (not spinners)

### Navigation

- [ ] Primary nav in bottom zone
- [ ] Bottom sheets for contextual content
- [ ] Safe area insets respected (`pb-safe`)
