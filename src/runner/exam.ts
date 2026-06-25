/**
 * Exam mode (M5): a single timed session that mixes items from several standard
 * (generated-item) exercises across modules, back-to-back with no per-exercise
 * intro — to simulate the fatigue of a real FEAST sitting. Pure item builder so
 * it can be unit-tested; the ExamRunner drives the timing/scoring with PlayItem.
 */
import type { Difficulty, ExerciseDef, GeneratedItem, ModuleId } from '@/types';
import { mulberry32, shuffle } from '@/core/rng';

export interface ExamItem {
  exerciseId: string;
  module: ModuleId;
  item: GeneratedItem;
  timeLimitMs: number;
}

/** Cap per-item time so the exam stays brisk even for slower exercises. */
const MAX_ITEM_SEC = 18;

function mixSeed(base: number, i: number): number {
  let h = (base ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (i + 0x85ebca6b), 0xc2b2ae35) >>> 0;
  h = Math.imul(h ^ 0x27d4eb2f, 0x165667b1) >>> 0;
  return h >>> 0;
}

export function buildExamItems(
  baseSeed: number,
  level: Difficulty,
  count: number,
  defs: ExerciseDef[],
): ExamItem[] {
  const usable = defs.filter((d) => typeof d.generate === 'function');
  if (usable.length === 0) return [];

  // Shuffle the exercise order once, then round-robin so modules interleave.
  const order = shuffle(mulberry32(baseSeed >>> 0), usable);
  const items: ExamItem[] = [];
  for (let i = 0; i < count; i++) {
    const def = order[i % order.length];
    const item = def.generate!(mixSeed(baseSeed, i), level, def.variant?.default);
    const timeLimitMs = Math.min(def.timePerItemSec || MAX_ITEM_SEC, MAX_ITEM_SEC) * 1000;
    items.push({ exerciseId: def.id, module: def.module, item, timeLimitMs });
  }
  return items;
}
