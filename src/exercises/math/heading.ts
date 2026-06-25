/**
 * Module 1.4 — Kursy i kąty (headings).
 * Multiple choice over 0..359°, with a compass figure. Two question types:
 * a left/right turn, and the reciprocal heading. Distractors include the
 * wrong-direction turn — the classic mistake.
 */
import type { Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, randInt, type Rng } from '@/core/rng';
import { buildChoices } from '@/exercises/_shared/choices';

/** Normalise to 0..359. */
function norm(d: number): number {
  return ((d % 360) + 360) % 360;
}

/** Aviation-style 3-digit heading, e.g. 40 -> "040°". */
export function formatHeading(d: number): string {
  return String(norm(d)).padStart(3, '0') + '°';
}

function pickHeading(rng: Rng, stepMult: number): number {
  // multiple of stepMult in [0, 360)
  return randInt(rng, 0, Math.floor(359 / stepMult)) * stepMult;
}

export function generateHeading(seed: number, level: Difficulty, variant?: string): GeneratedItem {
  const rng = mulberry32(seed);
  const headingStep = level === 'hard' ? 5 : 10;
  const forced = variant === 'reciprocal' ? true : variant === 'turn' ? false : undefined;
  const isReciprocal = forced ?? rng() < 0.3;

  let prompt: string;
  let answer: number;
  let figure: GeneratedItem['figure'];
  const distractors: number[] = [];

  if (isReciprocal) {
    const x = pickHeading(rng, headingStep);
    answer = norm(x + 180);
    prompt = `Kurs przeciwny do ${formatHeading(x)}?`;
    figure = { type: 'heading', heading: x, turn: 180 };
    distractors.push(x, norm(x + 90), norm(x - 90), norm(answer + 10), norm(answer - 10));
  } else {
    const x = pickHeading(rng, headingStep);
    const turnStep = level === 'easy' ? 45 : level === 'medium' ? 10 : 5;
    const maxTurn = level === 'easy' ? 4 : level === 'medium' ? 17 : 35;
    const y = randInt(rng, 1, maxTurn) * turnStep;
    const right = rng() < 0.5;
    const signed = right ? y : -y;
    answer = norm(x + signed);
    prompt = `Kurs ${formatHeading(x)}, w ${right ? 'prawo' : 'lewo'} o ${y}°. Nowy kurs?`;
    figure = { type: 'heading', heading: x, turn: signed };
    distractors.push(
      norm(x - signed), // wrong direction
      norm(answer + 10),
      norm(answer - 10),
      norm(answer + 20),
      norm(x), // forgot to turn
    );
  }

  const { choices, correctChoiceId } = buildChoices(
    rng,
    answer,
    distractors,
    formatHeading,
    (n) => n >= 0 && n <= 359,
  );

  return {
    prompt,
    mode: 'choice',
    choices,
    correctChoiceId,
    answerLabel: formatHeading(answer),
    hint: 'W prawo = +, w lewo = −. Zawijaj co 360°.',
    figure,
    category: isReciprocal ? 'reciprocal' : 'turn',
  };
}
