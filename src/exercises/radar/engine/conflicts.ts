/** Separation / conflict detection, including predictive CPA warnings. */
import type { Aircraft } from './types';
import { clamp, dist, velocity } from './geometry';

/** Closest approach distance between a and b over the next `T` seconds (linear). */
export function cpaDistance(a: Aircraft, b: Aircraft, T: number): number {
  const va = velocity(a.heading, a.speed);
  const vb = velocity(b.heading, b.speed);
  const rpx = b.x - a.x;
  const rpy = b.y - a.y;
  const rvx = vb.vx - va.vx;
  const rvy = vb.vy - va.vy;
  const rv2 = rvx * rvx + rvy * rvy;
  const t = rv2 > 1e-9 ? clamp(-(rpx * rvx + rpy * rvy) / rv2, 0, T) : 0;
  return Math.hypot(rpx + rvx * t, rpy + rvy * t);
}

export interface ConflictResult {
  /** ids currently within separation (active, red). */
  active: Set<string>;
  /** ids predicted to lose separation within T (amber). */
  warn: Set<string>;
  activePairs: Array<[string, string]>;
}

export function detectConflicts(aircraft: Aircraft[], sepH: number, T: number): ConflictResult {
  const active = new Set<string>();
  const warn = new Set<string>();
  const activePairs: Array<[string, string]> = [];

  for (let i = 0; i < aircraft.length; i++) {
    for (let j = i + 1; j < aircraft.length; j++) {
      const a = aircraft[i];
      const b = aircraft[j];
      if (dist(a.x, a.y, b.x, b.y) < sepH) {
        active.add(a.id);
        active.add(b.id);
        activePairs.push([a.id, b.id]);
      } else if (cpaDistance(a, b, T) < sepH) {
        warn.add(a.id);
        warn.add(b.id);
      }
    }
  }
  return { active, warn, activePairs };
}
