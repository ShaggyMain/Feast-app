/**
 * Pure radar simulation helpers (Module 3.4 MVP): movement toward the runway,
 * proximity/conflict detection and difficulty parameters. Kept framework-free so
 * the tricky bits are unit-tested; the component owns the animation loop.
 */
import type { Difficulty } from '@/types';

export interface RadarParams {
  durationMs: number;
  spawnEveryMs: number;
  /** Plane speed as a fraction of the scope size per second. */
  speedFrac: number;
  maxPlanes: number;
  /** Separation threshold as a fraction of the scope size. */
  sepFrac: number;
}

export function radarParams(level: Difficulty): RadarParams {
  switch (level) {
    case 'easy':
      return { durationMs: 60000, spawnEveryMs: 3500, speedFrac: 0.085, maxPlanes: 3, sepFrac: 0.13 };
    case 'medium':
      return { durationMs: 60000, spawnEveryMs: 2700, speedFrac: 0.11, maxPlanes: 4, sepFrac: 0.16 };
    case 'hard':
      return { durationMs: 75000, spawnEveryMs: 2000, speedFrac: 0.14, maxPlanes: 5, sepFrac: 0.19 };
  }
}

export interface Movable {
  id: number;
  x: number;
  y: number;
}

/** Move a point toward a target by `step`, clamping so it never overshoots. */
export function stepToward(
  x: number,
  y: number,
  tx: number,
  ty: number,
  step: number,
): { x: number; y: number } {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.hypot(dx, dy);
  if (d <= step || d === 0) return { x: tx, y: ty };
  return { x: x + (dx / d) * step, y: y + (dy / d) * step };
}

export function reachedLanding(x: number, y: number, lx: number, ly: number, radius: number): boolean {
  return Math.hypot(lx - x, ly - y) <= radius;
}

/** Unordered id-pairs that are within `threshold` of each other. */
export function conflictPairs(planes: Movable[], threshold: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < planes.length; i++) {
    for (let j = i + 1; j < planes.length; j++) {
      const a = planes[i];
      const b = planes[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < threshold) out.push([a.id, b.id]);
    }
  }
  return out;
}

export function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
