/**
 * Module 1.3 — Procenty i proporcje (percent / fraction of a quantity).
 * Multiple choice. N is always picked so the result is a whole number.
 */
import type { Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, randInt, type Rng } from '@/core/rng';
import { buildChoices } from '@/exercises/_shared/choices';

function gcd(a: number, b: number): number {
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** A multiplier k (>=2) and value = base*k landing inside [lo, hi]. */
function multipleInRange(rng: Rng, base: number, lo: number, hi: number): { k: number; value: number } {
  const mLo = Math.max(2, Math.ceil(lo / base));
  const mHi = Math.max(mLo, Math.floor(hi / base));
  const k = randInt(rng, mLo, mHi);
  return { k, value: base * k };
}

const X_BY_LEVEL: Record<Difficulty, number[]> = {
  easy: [10, 25, 50],
  medium: [5, 10, 15, 20, 25, 50, 75],
  hard: [5, 15, 35, 45, 55, 65, 85, 95],
};

const FRACTIONS: Record<Difficulty, Array<[number, number]>> = {
  easy: [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5]],
  medium: [[1, 3], [2, 3], [3, 8], [5, 8], [3, 10], [7, 10]],
  hard: [[5, 6], [4, 9], [7, 12], [5, 12], [3, 7], [4, 7]],
};

const N_RANGE: Record<Difficulty, [number, number]> = {
  easy: [40, 300],
  medium: [60, 600],
  hard: [120, 960],
};

export function generatePercent(seed: number, level: Difficulty): GeneratedItem {
  const rng = mulberry32(seed);
  const [nLo, nHi] = N_RANGE[level];
  const usePercent = rng() < 0.6;

  let prompt: string;
  let result: number;
  const category = usePercent ? 'percent' : 'fraction';

  if (usePercent) {
    const x = pick(rng, X_BY_LEVEL[level]);
    const g = gcd(x, 100);
    const step = 100 / g; // N must be a multiple of this
    const { k, value: n } = multipleInRange(rng, step, nLo, nHi);
    result = (x / g) * k;
    prompt = `${x}% z ${n} = ?`;
  } else {
    const [a, b] = pick(rng, FRACTIONS[level]);
    const { k, value: n } = multipleInRange(rng, b, nLo, nHi);
    result = a * k;
    prompt = `${a}/${b} z ${n} = ?`;
  }

  const distractors = [
    result + 1,
    result - 1,
    result + 2,
    result - 2,
    result + 10,
    Math.round(result * 1.25),
    Math.round(result / 2),
    result * 2,
  ];
  const { choices, correctChoiceId } = buildChoices(rng, result, distractors, String, (n) => n >= 0);

  return {
    prompt,
    mode: 'choice',
    choices,
    correctChoiceId,
    answerLabel: String(result),
    hint: 'Najpierw 10% lub 1 część, potem przeskaluj.',
    category,
  };
}
