/**
 * Shared helper for multiple-choice generators: assemble exactly one correct
 * option plus unique distractors, shuffled. Keeps every MC generator DRY and
 * guarantees the "exactly one correct answer" invariant the tests assert.
 */
import type { Choice } from '@/types';
import { shuffle, type Rng } from '@/core/rng';

export interface MultipleChoice {
  choices: Choice[];
  correctChoiceId: string;
}

/**
 * @param rng          seeded RNG (for the shuffle)
 * @param correct      the correct numeric value
 * @param distractors  candidate wrong values (filtered: not equal to correct,
 *                     deduped; extras ignored). Padded if too few.
 * @param format       value → label (must be injective over the values used)
 * @param accept       predicate a value must satisfy to be usable (e.g. >= 0)
 * @param count        total number of options (default 4)
 */
export function buildChoices(
  rng: Rng,
  correct: number,
  distractors: number[],
  format: (n: number) => string = String,
  accept: (n: number) => boolean = () => true,
  count = 4,
): MultipleChoice {
  const picked = new Set<number>();
  for (const d of distractors) {
    if (picked.size >= count - 1) break;
    if (d !== correct && accept(d)) picked.add(d);
  }
  // Guarantee enough distractors by nudging outward from the answer.
  let step = 1;
  while (picked.size < count - 1) {
    for (const cand of [correct + step, correct - step]) {
      if (picked.size >= count - 1) break;
      if (cand !== correct && accept(cand)) picked.add(cand);
    }
    step += 1;
  }

  const values = shuffle(rng, [correct, ...picked]);
  const choices: Choice[] = values.map((v, i) => ({ id: `c${i}`, label: format(v) }));
  const correctChoiceId = choices[values.indexOf(correct)].id;
  return { choices, correctChoiceId };
}
