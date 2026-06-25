/**
 * Module 4.3 — Serie liczbowe (number series).
 * Multiple choice "what comes next?". Many rule families give built-in variety:
 * arithmetic, geometric, second-difference, alternating, Fibonacci-like,
 * squares and cubes. Pure and deterministic per (seed, level).
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

function arithmetic(rng: Rng, level: Difficulty): Series {
  const a0 = randInt(rng, level === 'easy' ? 1 : 2, level === 'easy' ? 20 : 45);
  const d = randInt(rng, 2, level === 'easy' ? 6 : level === 'medium' ? 9 : 13);
  const terms = [a0, a0 + d, a0 + 2 * d, a0 + 3 * d];
  return { terms, answer: a0 + 4 * d };
}

function geometric(rng: Rng, level: Difficulty): Series {
  const a0 = randInt(rng, 1, level === 'easy' ? 4 : 5);
  const r = level === 'easy' ? randInt(rng, 2, 3) : randInt(rng, 2, level === 'hard' ? 4 : 3);
  const terms = [a0, a0 * r, a0 * r * r, a0 * r * r * r];
  return { terms, answer: a0 * r ** 4 };
}

function secondDiff(rng: Rng): Series {
  const a0 = randInt(rng, 1, 15);
  const d0 = randInt(rng, 1, 6);
  const e = randInt(rng, 1, 4);
  const terms = [a0];
  let d = d0;
  for (let i = 1; i < 4; i++) {
    terms.push(terms[i - 1] + d);
    d += e;
  }
  return { terms, answer: terms[3] + d };
}

function alternating(rng: Rng): Series {
  const a0 = randInt(rng, 1, 20);
  const da = randInt(rng, 2, 9);
  const b0 = randInt(rng, 1, 20);
  const db = randInt(rng, 2, 9);
  // A0, B0, A1, B1, A2, (answer = B2)
  const terms = [a0, b0, a0 + da, b0 + db, a0 + 2 * da];
  return { terms, answer: b0 + 2 * db };
}

function fibonacci(rng: Rng): Series {
  const a = randInt(rng, 1, 6);
  const b = randInt(rng, a, a + 6);
  const terms = [a, b];
  for (let i = 2; i < 5; i++) terms.push(terms[i - 1] + terms[i - 2]);
  return { terms, answer: terms[4] + terms[3] };
}

function squares(rng: Rng, level: Difficulty): Series {
  const k = randInt(rng, 1, level === 'easy' ? 5 : 8);
  const terms = [k * k, (k + 1) ** 2, (k + 2) ** 2, (k + 3) ** 2];
  return { terms, answer: (k + 4) ** 2 };
}

function cubes(rng: Rng): Series {
  const k = randInt(rng, 1, 4);
  const terms = [k ** 3, (k + 1) ** 3, (k + 2) ** 3, (k + 3) ** 3];
  return { terms, answer: (k + 4) ** 3 };
}

function build(rule: Rule, rng: Rng, level: Difficulty): Series {
  switch (rule) {
    case 'arithmetic':
      return arithmetic(rng, level);
    case 'geometric':
      return geometric(rng, level);
    case 'second-diff':
      return secondDiff(rng);
    case 'alternating':
      return alternating(rng);
    case 'fibonacci':
      return fibonacci(rng);
    case 'squares':
      return squares(rng, level);
    case 'cubes':
      return cubes(rng);
  }
}

export function generateSeries(seed: number, level: Difficulty): GeneratedItem {
  const rng = mulberry32(seed);
  const rule = pick(rng, RULES_BY_LEVEL[level]);
  const { terms, answer } = build(rule, rng, level);

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
