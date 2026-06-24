/**
 * Pure scoring logic shared by the ExerciseRunner.
 *
 * Guiding FEAST principle: no penalty for a wrong answer (a guess beats a
 * blank), and the score rewards both accuracy and speed.
 */
import type { GeneratedItem, ItemOutcome } from '../types';

export interface ResponsePayload {
  /** Selected choice id (choice mode). */
  choiceId?: string;
  /** Entered number (numeric mode). */
  numericValue?: number;
  /** Time from item shown to response, in ms. */
  responseMs: number;
  /** False when the item timed out without a response. */
  answered: boolean;
}

/** Points per fully correct item. */
export const BASE_POINTS = 100;
/** Maximum speed bonus added to a correct item. */
export const MAX_SPEED_BONUS = 50;

export function answerIsCorrect(
  item: GeneratedItem,
  payload: Pick<ResponsePayload, 'choiceId' | 'numericValue'>,
): boolean {
  if (item.mode === 'choice') {
    return payload.choiceId != null && payload.choiceId === item.correctChoiceId;
  }
  // numeric
  return (
    payload.numericValue != null &&
    item.correctValue != null &&
    payload.numericValue === item.correctValue
  );
}

export function gradeItem(item: GeneratedItem, payload: ResponsePayload): ItemOutcome {
  const correct = payload.answered && answerIsCorrect(item, payload);
  return {
    answered: payload.answered,
    correct,
    responseMs: Math.max(0, Math.round(payload.responseMs)),
  };
}

/** Faster correct answers earn a larger bonus; clamped to [0, MAX_SPEED_BONUS]. */
export function speedBonus(responseMs: number, timeLimitMs: number): number {
  if (timeLimitMs <= 0) return 0;
  const ratio = 1 - responseMs / timeLimitMs;
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round(clamped * MAX_SPEED_BONUS);
}

export interface SessionSummary {
  totalItems: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
  avgResponseMs: number;
  score: number;
}

export function summarize(outcomes: ItemOutcome[], timeLimitMs: number): SessionSummary {
  const totalItems = outcomes.length;
  const correct = outcomes.filter((o) => o.correct).length;
  const answered = outcomes.filter((o) => o.answered);
  const avgResponseMs = answered.length
    ? Math.round(answered.reduce((sum, o) => sum + o.responseMs, 0) / answered.length)
    : 0;
  const score = outcomes.reduce(
    (sum, o) => sum + (o.correct ? BASE_POINTS + speedBonus(o.responseMs, timeLimitMs) : 0),
    0,
  );
  const accuracy = totalItems ? correct / totalItems : 0;
  return { totalItems, correct, accuracy, avgResponseMs, score };
}
