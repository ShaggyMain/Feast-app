/**
 * Module 4.3 — Serie liczbowe (number series).
 * Multiple choice "what comes next?". Many rule families give built-in variety:
 * arithmetic, geometric, second-difference, alternating, Fibonacci-like,
 * squares and cubes. Difficulty also lengthens the visible sequence, and an
 * optional variant lets the learner drill one family. Pure & deterministic.
 */
import type { Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, randInt, type Rng } from '@/core/rng';
import { buildChoices } from '@/exercises/_shared/choices';

type Rule = 'arithmetic' | 'geometric' | 'second-diff' | 'alternating' | 'fibonacci' | 'squares' | 'cubes';

interface Series {
  terms: number[];
  answer: number;
}

const RULES_BY_LEVEL: Record<Difficulty, Rule[]> = {
  easy: ['arithmetic', 'geometric', 'squares'],
  medium: ['arithmetic', 'geometric', 'second-diff', 'alternating', 'squares'],
  hard: ['arithmetic', 'geometric', 'second-diff', 'alternating', 'fibonacci', 'cubes'],
};

/** Variant value -> forced rule (others stay in the 'all' mix to keep the UI small). */
const VARIANT_RULE: Record<string, Rule> = {
  arithmetic: 'arithmetic',
  geometric: 'geometric',
  squares: 'squares',
};

/** Harder = longer sequence; capped for fast-growing families to keep numbers sane. */
function lengthFor(level: Difficulty, rule: Rule): number {
  const base = level === 'easy' ? 4 : level === 'medium' ? 5 : 6;
  if (rule === 'geometric' || rule === 'cubes') return 4;
  if (rule === 'alternating') return 5;
  if (rule === 'fibonacci') return Math.min(base, 5);
  return base;
}

function arithmetic(rng: Rng, level: Difficulty, len: number): Series {
  const a0 = randInt(rng, level === 'easy' ? 1 : 2, level === 'easy' ? 20 : 45);
  const d = randInt(rng, 2, level === 'easy' ? 6 : level === 'medium' ? 9 : 13);
  const terms = Array.from({ length: len }, (_, i) => a0 + i * d);
  return { terms, answer: a0 + len * d };
}

function geometric(rng: Rng, level: Difficulty, len: number): Series {
  const a0 = randInt(rng, 1, level === 'easy' ? 4 : 5);
  const r = level === 'easy' ? randInt(rng, 2, 3) : randInt(rng, 2, level === 'hard' ? 4 : 3);
  const terms = Array.from({ length: len }, (_, i) => a0 * r ** i);
  return { terms, answer: a0 * r ** len };
}

function secondDiff(rng: Rng, len: number): Series {
  const a0 = randInt(rng, 1, 15);
  const d0 = randInt(rng, 1, 6);
  const e = randInt(rng, 1, 4);
  const terms = [a0];
  let d = d0;
  for (let i = 1; i < len; i++) {
    terms.push(terms[i - 1] + d);
    d += e;
  }
  return { terms, answer: terms[len - 1] + d };
}

function alternating(rng: Rng, len: number): Series {
  const a0 = randInt(rng, 1, 20);
  const da = randInt(rng, 2, 9);
  const b0 = randInt(rng, 1, 20);
  const db = randInt(rng, 2, 9);
  const at = (i: number) => (i % 2 === 0 ? a0 + (i / 2) * da : b0 + ((i - 1) / 2) * db);
  const terms = Array.from({ length: len }, (_, i) => at(i));
  return { terms, answer: at(len) };
}

function fibonacci(rng: Rng, len: number): Series {
  const a = randInt(rng, 1, 6);
  const b = randInt(rng, a, a + 6);
  const terms = [a, b];
  for (let i = 2; i < len; i++) terms.push(terms[i - 1] + terms[i - 2]);
  return { terms, answer: terms[len - 1] + terms[len - 2] };
}

function squares(rng: Rng, level: Difficulty, len: number): Series {
  const k = randInt(rng, 1, level === 'easy' ? 5 : 8);
  const terms = Array.from({ length: len }, (_, i) => (k + i) ** 2);
  return { terms, answer: (k + len) ** 2 };
}

function cubes(rng: Rng, len: number): Series {
  const k = randInt(rng, 1, 4);
  const terms = Array.from({ length: len }, (_, i) => (k + i) ** 3);
  return { terms, answer: (k + len) ** 3 };
}

function build(rule: Rule, rng: Rng, level: Difficulty, len: number): Series {
  switch (rule) {
    case 'arithmetic':
      return arithmetic(rng, level, len);
    case 'geometric':
      return geometric(rng, level, len);
    case 'second-diff':
      return secondDiff(rng, len);
    case 'alternating':
      return alternating(rng, len);
    case 'fibonacci':
      return fibonacci(rng, len);
    case 'squares':
      return squares(rng, level, len);
    case 'cubes':
      return cubes(rng, len);
  }
}

export function generateSeries(seed: number, level: Difficulty, variant?: string): GeneratedItem {
  const rng = mulberry32(seed);
  const forced = variant ? VARIANT_RULE[variant] : undefined;
  const rule = forced ?? pick(rng, RULES_BY_LEVEL[level]);
  const len = lengthFor(level, rule);
  const { terms, answer } = build(rule, rng, level, len);

  const last = terms[terms.length - 1];
  const prev = terms[terms.length - 2];
  const linearGuess = last + (last - prev); // tempting "just add the last gap"
  const distractors = [
    answer + 1,
    answer - 1,
    answer + 2,
    answer - 2,
    linearGuess,
    last + (last - prev) + 1,
    Math.round(answer * 1.1),
  ];

  const { choices, correctChoiceId } = buildChoices(rng, answer, distractors, String, (n) => n >= 0);

  return {
    prompt: `${terms.join(', ')}, ?`,
    mode: 'choice',
    choices,
    correctChoiceId,
    answerLabel: String(answer),
    hint: 'Znajdź regułę: różnice, iloczyny, kwadraty…',
    category: rule,
  };
}
