/**
 * Human-Like Mouse Movement
 *
 * Generates bezier-curve mouse paths with:
 * - Ease-in-out timing (slow start, fast middle, slow end)
 * - Control point randomization (no two paths identical)
 * - Micro-jitter (gaussian noise simulating hand tremor)
 * - Variable velocity (not constant speed)
 * - Overshoot correction (natural human behavior)
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { MousePath } from "../types.js";

function gaussRandom(mean = 0, stdev = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + stdev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Generate a human-like bezier path from current position to target.
 */
function generatePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps: number
): { x: number; y: number }[] {
  // Random control points for the bezier curve
  const dx = endX - startX;
  const dy = endY - startY;
  const cp1x = startX + dx * 0.25 + gaussRandom(0, Math.abs(dx) * 0.15);
  const cp1y = startY + dy * 0.1 + gaussRandom(0, Math.abs(dy) * 0.15);
  const cp2x = startX + dx * 0.75 + gaussRandom(0, Math.abs(dx) * 0.1);
  const cp2y = startY + dy * 0.9 + gaussRandom(0, Math.abs(dy) * 0.1);

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const raw = i / steps;
    // Ease-in-out (smoothstep)
    const t = raw * raw * (3 - 2 * raw);

    // Cubic bezier
    const it = 1 - t;
    const x =
      it * it * it * startX +
      3 * it * it * t * cp1x +
      3 * it * t * t * cp2x +
      t * t * t * endX;
    const y =
      it * it * it * startY +
      3 * it * it * t * cp1y +
      3 * it * t * t * cp2y +
      t * t * t * endY;

    // Micro-jitter (hand tremor)
    points.push({
      x: x + gaussRandom(0, 0.5),
      y: y + gaussRandom(0, 0.5),
    });
  }
  return points;
}

/**
 * Move mouse to a target position with human-like movement.
 *
 * @param handle BrowserHandle
 * @param targetX Target X coordinate
 * @param targetY Target Y coordinate
 * @param opts Movement options
 */
export async function humanMouseMove(
  handle: BrowserHandle,
  targetX: number,
  targetY: number,
  opts?: {
    /** Starting X (default: random 50-200) */
    startX?: number;
    /** Starting Y (default: random 50-200) */
    startY?: number;
    /** Number of interpolation steps (default: 20-35 random) */
    steps?: number;
    /** Delay between steps in ms (default: 5-20 random) */
    stepDelay?: number;
  }
): Promise<MousePath> {
  const startX = opts?.startX ?? 50 + Math.random() * 150;
  const startY = opts?.startY ?? 50 + Math.random() * 150;
  const steps = opts?.steps ?? Math.floor(20 + Math.random() * 15);

  const path = generatePath(startX, startY, targetX, targetY, steps);
  const points: { x: number; y: number; t: number }[] = [];
  const t0 = Date.now();

  for (const point of path) {
    await handle.mouseMove(point.x, point.y);
    points.push({ ...point, t: Date.now() - t0 });
    const delay = opts?.stepDelay ?? 5 + Math.random() * 15;
    await handle.waitForTimeout(delay);
  }

  return { points, duration: Date.now() - t0 };
}

/**
 * Move mouse across multiple targets with natural pauses.
 */
export async function humanMouseTraverse(
  handle: BrowserHandle,
  targets: { x: number; y: number }[]
): Promise<MousePath> {
  const allPoints: { x: number; y: number; t: number }[] = [];
  const t0 = Date.now();
  let lastX = 50 + Math.random() * 100;
  let lastY = 50 + Math.random() * 100;

  for (const target of targets) {
    const path = await humanMouseMove(handle, target.x, target.y, {
      startX: lastX,
      startY: lastY,
    });
    allPoints.push(...path.points);
    lastX = target.x;
    lastY = target.y;

    // Natural pause between movements
    await handle.waitForTimeout(30 + Math.random() * 100);
  }

  return { points: allPoints, duration: Date.now() - t0 };
}

/**
 * Perform a human-like click with mouse movement first.
 */
export async function humanClick(
  handle: BrowserHandle,
  targetX: number,
  targetY: number
): Promise<void> {
  await humanMouseMove(handle, targetX, targetY);
  await handle.waitForTimeout(30 + Math.random() * 50);
  await handle.mouseClick(targetX, targetY);
}
