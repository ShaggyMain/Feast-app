/**
 * Dummy / demo generator for milestone M0.
 *
 * Produces a quick mental-arithmetic question with four options and exactly one
 * correct answer, surrounded by plausible "near miss" distractors. It is a pure
 * function of the seed, which makes it deterministic and easy to test — the same
 * pattern every later FEAST generator will follow.
 */
import type { Choice, GeneratedItem } from '../../types';
import { mulberry32, pick, randInt, shuffle } from '../../core/rng';

type Op = '+' | '−' | '×';

function apply(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
  }
}

export function generateDummy(seed: number): GeneratedItem {
  const rng = mulberry32(seed);
  const op = pick(rng, ['+', '−', '×'] as const);

  let a: number;
  let b: number;
  if (op === '×') {
    a = randInt(rng, 3, 12);
    b = randInt(rng, 3, 9);
  } else {
    a = randInt(rng, 11, 89);
    b = randInt(rng, 11, 89);
    if (op === '−' && b > a) {
      const t = a;
      a = b;
      b = t; // keep the result non-negative
    }
  }

  const answer = apply(a, b, op);

  // Build three unique distractors that are close to the answer but never equal it.
  const distractors = new Set<number>();
  const candidates = [
    answer + 1,
    answer - 1,
    answer + 2,
    answer - 2,
    answer + 10,
    answer - 10,
  ];
  for (const c of shuffle(rng, candidates)) {
    if (c !== answer && c >= 0) distractors.add(c);
    if (distractors.size === 3) break;
  }
  // Extremely unlikely fallback to guarantee three distractors.
  let pad = 3;
  while (distractors.size < 3) {
    const c = answer + pad;
    if (c !== answer) distractors.add(c);
    pad += 1;
  }

  const values = shuffle(rng, [answer, ...distractors]);
  const choices: Choice[] = values.map((v, i) => ({ id: `c${i}`, label: String(v) }));
  const correct = choices.find((c) => c.label === String(answer));

  return {
    prompt: `${a} ${op} ${b} = ?`,
    mode: 'choice',
    choices,
    correctChoiceId: correct ? correct.id : choices[0].id,
    answerLabel: String(answer),
    hint: 'Policz w pamięci — liczy się czas.',
  };
}
