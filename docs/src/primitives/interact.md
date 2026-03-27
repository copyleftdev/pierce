# Interact

Human simulation primitives. Mouse movement, typing, CAPTCHA solving, and adaptive timing.

## `humanMouseMove(handle, targetX, targetY, opts?)`

Moves the cursor along a cubic bezier path with natural variance.

```typescript
import { humanMouseMove } from 'pierce/interact'

await humanMouseMove(handle, 500, 400, {
  startX: 100,      // default: random 50-200
  startY: 100,      // default: random 50-200
  steps: 30,        // default: random 20-35
  stepDelay: 10,    // default: random 5-20ms
})
```

**What makes it human-like:**
- Cubic bezier with randomized control points (no two paths identical)
- Ease-in-out timing (slow start, fast middle, slow end)
- Gaussian micro-jitter (simulates hand tremor)
- Variable step count and timing

## `humanMouseTraverse(handle, targets)`

Moves through multiple points with natural pauses between movements.

```typescript
import { humanMouseTraverse } from 'pierce/interact'

await humanMouseTraverse(handle, [
  { x: 200, y: 300 },
  { x: 500, y: 400 },
  { x: 300, y: 600 },
])
```

## `humanClick(handle, x, y)`

Moves to target with bezier path, pauses briefly, then clicks.

## `humanType(handle, selector, text, opts?)`

Types text with per-character delay variance.

```typescript
import { humanType } from 'pierce/interact'

await humanType(handle, 'input[type="text"]', 'hello world', {
  baseDelay: 50,   // ms between keystrokes
  variance: 30,    // +/- randomness
})
```

## `fillByLabel(handle, labelPattern, value)`

Finds an input by its associated label text and fills it. No ID or name needed.

```typescript
import { fillByLabel } from 'pierce/interact'

await fillByLabel(handle, /email/i, 'user@example.com')
await fillByLabel(handle, /password/i, 'secret')
```

## `solveMathCaptcha(handle)`

Parses a math CAPTCHA from the page's visible text.

```typescript
import { solveMathCaptcha } from 'pierce/interact'

const challenge = await solveMathCaptcha(handle)
// { type: "math", question: "23 + 17 = ?", answer: 40 }
```

**Patterns recognized:** `23 + 17 = ?`, `? = 23 + 17`, `What is 23 plus 17?`, `Solve: 23 + 17`, word-form numbers.

## `submitCaptcha(handle)`

Solves the CAPTCHA, finds the input by computed visibility, fills the answer, and clicks submit.

```typescript
import { submitCaptcha } from 'pierce/interact'

const solved = await submitCaptcha(handle)  // true if submitted
```

## `waitForDelayedContent(handle, opts?)`

Waits for timing traps and delayed content using DOM quiescence.

## `waitForStreamComplete(handle, opts?)`

Waits for streaming content (WebSocket, SSE) by watching for completion text or DOM quiescence.

```typescript
import { waitForStreamComplete } from 'pierce/interact'

await waitForStreamComplete(handle, {
  completionPattern: /complete|finished/i,
  timeoutMs: 30000,
})
```

## `humanDelay(handle, baseMs?, variance?)`

Random-variance delay instead of fixed `sleep`.
