# Audio Implementation

## Howler.js Setup

### Installation

```bash
npm install howler
npm install -D @types/howler
```

### Basic Usage

```typescript
import { Howl } from 'howler';

const clickSound = new Howl({
  src: ['click.webm', 'click.mp3'], // WebM first, MP3 fallback
  volume: 0.5,
  preload: true,
});

clickSound.play();
```

## Audio Format Strategy

### Recommended: WebM + MP3

WebM offers best compression/quality balance. MP3 is the universal fallback.

```typescript
const sound = new Howl({
  src: ['sound.webm', 'sound.mp3'], // Order matters: first compatible format used
});
```

### Format Comparison

| Format    | Size     | Quality   | Browser Support       |
| --------- | -------- | --------- | --------------------- |
| WebM/Opus | Smallest | Excellent | Chrome, Firefox, Edge |
| MP3       | Medium   | Good      | Universal             |
| OGG       | Small    | Good      | Chrome, Firefox       |
| WAV       | Largest  | Lossless  | Universal             |

## Sound Sprites

Combine multiple short sounds into one file to reduce HTTP requests.

```typescript
const sfx = new Howl({
  src: ['sprites.webm', 'sprites.mp3'],
  sprite: {
    click: [0, 100], // [start_ms, duration_ms]
    success: [100, 300],
    error: [400, 200],
    whoosh: [600, 150],
    pop: [750, 80],
  },
});

// Play specific sound
sfx.play('click');
sfx.play('success');
```

### Creating Sprites

Use tools like [audiosprite](https://github.com/tonistiigi/audiosprite) or manually combine in Audacity.

## Large Files (Background Music)

For music, stream instead of buffering the entire file:

```typescript
const music = new Howl({
  src: ['background-music.mp3'],
  html5: true, // Stream instead of full buffer
  loop: true,
  volume: 0.3,
});

// Control playback
music.play();
music.pause();
music.fade(0.3, 0, 1000); // Fade out over 1 second
```

## Mobile Audio Unlocking

Audio is locked on mobile until first user interaction. Howler handles this automatically, but for manual control:

```typescript
import { Howler } from 'howler';

function unlockAudio() {
  const ctx = Howler.ctx;
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

// Call on first user interaction
<button onClick={() => {
  unlockAudio();
  startGame();
}}>
  Start Game
</button>
```

## Volume & Mute Management

### Global Controls

```typescript
import { Howler } from 'howler';

// Global mute
Howler.mute(true); // Mute all
Howler.mute(false); // Unmute all

// Global volume (0.0 to 1.0)
Howler.volume(0.5);
```

### React Hook for Audio Settings

```typescript
function useAudioSettings() {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('audio-muted') === 'true';
  });

  const [volume, setVolume] = useState(() => {
    return parseFloat(localStorage.getItem('audio-volume') || '0.5');
  });

  useEffect(() => {
    Howler.mute(isMuted);
    localStorage.setItem('audio-muted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    Howler.volume(volume);
    localStorage.setItem('audio-volume', String(volume));
  }, [volume]);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  return { isMuted, volume, setVolume, toggleMute };
}
```

## Sound Manager Pattern

Centralize all game audio in one place:

```typescript
// sounds.ts
import { Howl } from 'howler';

const sounds = {
  click: new Howl({ src: ['click.webm', 'click.mp3'], volume: 0.5 }),
  success: new Howl({ src: ['success.webm', 'success.mp3'], volume: 0.6 }),
  error: new Howl({ src: ['error.webm', 'error.mp3'], volume: 0.4 }),
  drop: new Howl({ src: ['drop.webm', 'drop.mp3'], volume: 0.5 }),
  whoosh: new Howl({ src: ['whoosh.webm', 'whoosh.mp3'], volume: 0.3 }),
};

export function playSound(name: keyof typeof sounds) {
  sounds[name].play();
}

export function preloadSounds() {
  // Sounds preload automatically, but this ensures they're ready
  Object.values(sounds).forEach((sound) => sound.load());
}
```

## Playback Patterns

### Play Once (Default)

```typescript
sound.play();
```

### Play with Rate Variation (Prevents Repetition Fatigue)

```typescript
function playWithVariation(sound: Howl) {
  sound.rate(0.9 + Math.random() * 0.2); // 0.9 to 1.1
  sound.play();
}
```

### Stop Previous Before Playing

```typescript
function playSingle(sound: Howl) {
  sound.stop();
  sound.play();
}
```

### Layered Sounds

```typescript
// Play multiple sounds together for impact
function playImpact() {
  sounds.thud.play();
  sounds.debris.play();
  sounds.rumble.play();
}
```

## Error Handling

```typescript
const sound = new Howl({
  src: ['sound.webm', 'sound.mp3'],
  onloaderror: (id, error) => {
    console.error('Failed to load sound:', error);
  },
  onplayerror: (id, error) => {
    console.error('Failed to play sound:', error);
    // Try to unlock and replay
    sound.once('unlock', () => sound.play());
  },
});
```

## Best Practices

1. **Preload critical sounds** - Load during game init, not during gameplay
2. **Use sprites for short effects** - Reduces HTTP requests
3. **Stream long audio** - Use `html5: true` for music
4. **Vary playback rate** - Prevents repetitive sounds from feeling robotic
5. **Respect user preferences** - Always provide mute/volume controls
6. **Keep effects short** - 50-300ms for UI feedback
7. **Match volume levels** - Normalize across all sounds
