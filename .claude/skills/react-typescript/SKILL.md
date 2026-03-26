---
name: react-typescript
description: Best practices for React 19 and TypeScript development. Use when writing React components, hooks, TypeScript types, or reviewing React/TypeScript code.
---

# React + TypeScript Development

## TypeScript Configuration

Enable strict mode with these recommended flags:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## Type Definitions

### Use Literal Union Types (Not Enums)
```typescript
// Preferred
type Status = 'pending' | 'active' | 'completed';

// Avoid - adds runtime overhead
enum Status { Pending, Active, Completed }
```

### Never Use `any` - Use `unknown` Instead
```typescript
const data: unknown = await fetchData();
if (isUser(data)) { /* data is now typed */ }
```

### Use `readonly` for Immutable Data
```typescript
interface Config {
  readonly maxRetries: number;
}
const items: readonly string[] = ['a', 'b'];
```

### Explicit Return Types on Exported Functions
```typescript
export function calculate(items: Item[]): number { }
```

### Use Utility Types
```typescript
Partial<User>           // All properties optional
Pick<User, 'id' | 'name'>  // Select specific properties
Omit<User, 'id'>        // Exclude specific properties
Record<Category, string>   // Typed key-value object
```

## React Component Patterns

### Props Interface Above Component
```typescript
interface CardProps {
  title: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  title,
  variant = 'primary',
  onClick
}) => { ... };
```

### Explicitly Type Children When Needed
```typescript
interface ModalProps {
  isOpen: boolean;
  children: React.ReactNode;
}
```

### Discriminated Unions for Variants
```typescript
type ButtonProps =
  | { variant: 'link'; href: string }
  | { variant: 'button'; onClick: () => void };
```

## Hooks Best Practices

### Rules of Hooks
- Only call hooks at the top level (never in conditions/loops)
- Only call from React functions or custom hooks

### Type Custom Hook Returns
```typescript
interface UseCounterReturn {
  count: number;
  increment: () => void;
}

function useCounter(): UseCounterReturn { ... }
```

### Functional Updates for Previous State
```typescript
// Avoid - may have stale state
setCount(count + 1);

// Preferred - always gets latest
setCount(prev => prev + 1);
```

### Clean Up Side Effects
```typescript
useEffect(() => {
  const sub = dataSource.subscribe();
  return () => sub.unsubscribe();
}, [dataSource]);
```

## Event Handler Typing

```typescript
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { };
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { };
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { };
```

## Performance

### useCallback for Callbacks to Children
```typescript
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### useMemo for Expensive Computations
```typescript
const sorted = useMemo(() =>
  [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

### React.memo for Pure Components
```typescript
const ListItem = React.memo<Props>(({ item }) => <div>{item.name}</div>);
```

### Don't Over-Optimize
Only memoize when there's a measurable performance issue.

## State Management

### Never Mutate State
```typescript
// Wrong
state.items.push(newItem);

// Correct
setItems([...items, newItem]);
```

### Context API Guidelines
- Use for rarely-changing state (theme, locale, auth)
- Avoid for frequently-updated state (causes re-renders)

## Constants

### Extract Magic Numbers
```typescript
const ANIMATION_DURATION_MS = 600;
setTimeout(() => {}, ANIMATION_DURATION_MS);
```

### Use `as const` for Objects
```typescript
const COLORS = {
  primary: '#007bff',
  danger: '#dc3545',
} as const;
```

## Common Pitfalls

### Avoid Object Literals in Dependencies
```typescript
// Wrong - new object each render
useEffect(() => {}, [{ id: 1 }]);

// Correct
const config = useMemo(() => ({ id: 1 }), []);
useEffect(() => {}, [config]);
```

### Avoid Inline Styles
```typescript
// Creates new object each render
<div style={{ marginTop: 20 }}>

// Use CSS classes
<div className="mt-5">
```

## Naming Conventions

- Components: PascalCase (`Button.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`)
- Types/Interfaces: PascalCase (`UserProps`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)

## Accessibility

- Use semantic HTML (`<button>` not `<div onClick>`)
- Add ARIA labels when needed
- Ensure keyboard navigation works
