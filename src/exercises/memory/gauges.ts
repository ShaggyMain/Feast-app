/**
 * Pure builder for a single "memorise the gauges" round (3.1): distinct values,
 * a queried index, and a 4-option recall question whose distractors include the
 * other (confusable) gauge values. Exactly one correct option.
 */
import type { Choice } from '@/types';
import { randInt, shuffle, type Rng } from '@/core/rng';
import { buildChoices } from '@/exercises/_shared/choices';

export interface GaugeRound {
  values: number[];
  recallIndex: number;
  answer: number;
  choices: Choice[];
  correctChoiceId: string;
}

export function buildGaugeRound(rng: Rng, count: number): GaugeRound {
  const values: number[] = [];
  while (values.length < count) {
    const v = randInt(rng, 10, 99);
    if (!values.includes(v)) values.push(v);
  }
  const recallIndex = randInt(rng, 0, count - 1);
  const answer = values[recallIndex];

  // Distractors: other gauge values (confusable) first, then near numbers.
  const others = shuffle(
    rng,
    values.filter((_, i) => i !== recallIndex),
  );
  const distractors = [...others, answer + 1, answer - 1, answer + 10, answer - 10, answer + 2];
  const { choices, correctChoiceId } = buildChoices(
    rng,
    answer,
    distractors,
    String,
    (n) => n >= 0,
  );

  return { values, recallIndex, answer, choices, correctChoiceId };
}
