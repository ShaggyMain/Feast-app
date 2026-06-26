/**
 * Module 1.1 — Działania w pamięci (mental arithmetic).
 * Multiple choice, four operations, difficulty-scaled ranges; hard adds
 * left-to-right +/- chains. Pure and deterministic per (seed, level).
 */
import type { Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, randInt, type Rng } from '@/core/rng';
import { buildChoices } from '@/exercises/_shared/choices';
import { t } from '@/i18n';

type Op = '+' | '−' | '×' | '÷';

function applyOp(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return a / b;
  }
}

interface Binary {
  prompt: string;
  answer: number;
  category: string;
}

function makeBinary(rng: Rng, level: Difficulty, forcedOp?: Op): Binary {
  const ops: Op[] = level === 'easy' ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
  const op = forcedOp ?? pick(rng, ops);

  if (op === '×') {
    const a = level === 'easy' ? randInt(rng, 2, 9) : level === 'medium' ? randInt(rng, 11, 29) : randInt(rng, 12, 99);
    const b = level === 'hard' ? randInt(rng, 3, 12) : randInt(rng, 2, 9);
    return { prompt: `${a} × ${b} = ?`, answer: a * b, category: '×' };
  }

  if (op === '÷') {
    const [dLo, dHi, qLo, qHi] =
      level === 'easy' ? [2, 9, 2, 12] : level === 'medium' ? [3, 12, 3, 19] : [7, 19, 11, 40];
    const divisor = randInt(rng, dLo, dHi);
    const quotient = randInt(rng, qLo, qHi);
    const dividend = divisor * quotient;
    return { prompt: `${dividend} ÷ ${divisor} = ?`, answer: quotient, category: '÷' };
  }

  // + or -
  const [lo, hi] = level === 'easy' ? [10, 99] : level === 'medium' ? [20, 199] : [100, 899];
  let a = randInt(rng, lo, hi);
  let b = randInt(rng, lo, hi);
  if (op === '−' && b > a) {
    const t = a;
    a = b;
    b = t;
  }
  return { prompt: `${a} ${op} ${b} = ?`, answer: applyOp(a, b, op), category: op };
}

function makeChain(rng: Rng): Binary {
  // a op1 b op2 c, +/- only, evaluated left-to-right, kept non-negative.
  const a = randInt(rng, 110, 880);
  const b = randInt(rng, 11, 120);
  const c = randInt(rng, 11, 120);
  const op1 = pick(rng, ['+', '−'] as const);
  const r1 = applyOp(a, b, op1);
  const op2Pool = r1 >= c ? (['+', '−'] as const) : (['+'] as const);
  const op2 = pick(rng, op2Pool);
  const answer = applyOp(r1, c, op2);
  return { prompt: `${a} ${op1} ${b} ${op2} ${c} = ?`, answer, category: 'chain' };
}

const OPS: readonly Op[] = ['+', '−', '×', '÷'];

export function generateArith(seed: number, level: Difficulty, variant?: string): GeneratedItem {
  const rng = mulberry32(seed);
  const forced = variant && (OPS as readonly string[]).includes(variant) ? (variant as Op) : undefined;
  const useChain = !forced && level === 'hard' && rng() < 0.5;
  const { prompt, answer, category } = useChain ? makeChain(rng) : makeBinary(rng, level, forced);

  const distractors = [
    answer + 1,
    answer - 1,
    answer + 2,
    answer - 2,
    answer + 10,
    answer - 10,
    answer + 3,
  ];
  const { choices, correctChoiceId } = buildChoices(
    rng,
    answer,
    distractors,
    String,
    (n) => n >= 0,
  );

  return {
    prompt,
    mode: 'choice',
    choices,
    correctChoiceId,
    answerLabel: String(answer),
    hint: t('hint.arith'),
    category,
  };
}
