/**
 * Builds a full session of items from an exercise's generator.
 *
 * Generators stay pure and "infinite", but a single session should feel varied:
 * this de-duplicates prompts within a sliding window and balances item
 * categories (so you don't get, say, eight multiplications in a row). It is a
 * pure, deterministic function of (def, baseSeed, level).
 */
import type { Difficulty, ExerciseDef, GeneratedItem } from '@/types';

/** Deterministically mix the base seed with slot/attempt into a fresh seed. */
function mixSeed(base: number, index: number, attempt: number): number {
  let h = (base ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (index + 0x85ebca6b), 0xc2b2ae35) >>> 0;
  h = Math.imul(h ^ (attempt + 0x27d4eb2f), 0x165667b1) >>> 0;
  return h >>> 0;
}

const MAX_ATTEMPTS = 10;

export function buildSession(
  def: ExerciseDef,
  baseSeed: number,
  level: Difficulty,
  variant?: string,
  count = def.itemsPerSession,
): GeneratedItem[] {
  const items: GeneratedItem[] = [];
  const recentPrompts: string[] = [];
  const recentWindow = Math.min(8, count);
  const categoryCount: Record<string, number> = {};
  let prevCategory: string | undefined;

  for (let i = 0; i < count; i++) {
    let chosen: GeneratedItem | null = null;
    let chosenScore = -Infinity;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = def.generate(mixSeed(baseSeed, i, attempt), level, variant);
      const category = candidate.category ?? '';
      const isDuplicate = recentPrompts.includes(candidate.prompt);

      // Higher is better: penalise repeats, over-used categories, and
      // repeating the previous item's category.
      let score = 0;
      if (isDuplicate) score -= 100;
      score -= (categoryCount[category] ?? 0) * 3;
      if (category && category === prevCategory) score -= 5;

      if (score > chosenScore) {
        chosenScore = score;
        chosen = candidate;
      }
      // Good enough: not a repeat and not over-using a category — stop early.
      if (!isDuplicate && score >= 0) break;
    }

    const item = chosen as GeneratedItem;
    items.push(item);

    recentPrompts.push(item.prompt);
    if (recentPrompts.length > recentWindow) recentPrompts.shift();
    const category = item.category ?? '';
    categoryCount[category] = (categoryCount[category] ?? 0) + 1;
    prevCategory = category;
  }

  return items;
}
