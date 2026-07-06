/**
 * Pure builder for a single "memorise the gauges" round (3.1): distinct values
 * and SEVERAL recall questions (each a 4-option pick whose distractors include
 * the other, confusable gauge values). Quizzing more than one gauge — and more
 * as the set grows — means the whole memorised set is tested, not just the first
 * few (a single query per round left the later gauges almost never asked).
 */
import type { Choice } from '@/types';
import { randInt, shuffle, type Rng } from '@/core/rng';
import { buildChoices } from '@/exercises/_shared/choices';

export interface GaugeQuestion {
  recallIndex: number;
  answer: number;
  choices: Choice[];
  correctChoiceId: string;
}

export interface GaugeRound {
  values: number[];
  questions: GaugeQuestion[];
}

/** How many gauges to quiz for a set of `count` — scales up with the set. */
export function gaugeQueries(count: number): number {
  return Math.max(2, Math.min(3, count - 3));
}

export function buildGaugeRound(rng: Rng, count: number, queryCount = gaugeQueries(count)): GaugeRound {
  const values: number[] = [];
  while (values.length < count) {
    const v = randInt(rng, 10, 99);
    if (!values.includes(v)) values.push(v);
  }

  const q = Math.max(1, Math.min(queryCount, count));
  const indices = shuffle(
    rng,
    values.map((_, i) => i),
  ).slice(0, q);

  const questions: GaugeQuestion[] = indices.map((recallIndex) => {
    const answer = values[recallIndex];
    // Distractors: other gauge values (confusable) first, then near numbers.
    const others = shuffle(
      rng,
      values.filter((_, i) => i !== recallIndex),
    );
    const distractors = [...others, answer + 1, answer - 1, answer + 10, answer - 10, answer + 2];
    const { choices, correctChoiceId } = buildChoices(rng, answer, distractors, String, (n) => n >= 0);
    return { recallIndex, answer, choices, correctChoiceId };
  });

  return { values, questions };
}
