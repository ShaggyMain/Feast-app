import type { GeneratedItem, ItemOutcome } from '../types';
import { gradeItem, speedBonus, summarize } from './scoring';

const choiceItem: GeneratedItem = {
  prompt: '2 + 2 = ?',
  mode: 'choice',
  choices: [
    { id: 'c0', label: '4' },
    { id: 'c1', label: '5' },
  ],
  correctChoiceId: 'c0',
  answerLabel: '4',
};

const numericItem: GeneratedItem = {
  prompt: '480 km/h, 7 min?',
  mode: 'numeric',
  correctValue: 56,
  answerLabel: '56',
};

describe('gradeItem', () => {
  it('grades a correct choice', () => {
    const o = gradeItem(choiceItem, { choiceId: 'c0', responseMs: 1200, answered: true });
    expect(o).toEqual({ answered: true, correct: true, responseMs: 1200 });
  });

  it('grades a wrong choice', () => {
    const o = gradeItem(choiceItem, { choiceId: 'c1', responseMs: 900, answered: true });
    expect(o.correct).toBe(false);
  });

  it('treats a timeout (unanswered) as incorrect without penalty', () => {
    const o = gradeItem(choiceItem, { responseMs: 12000, answered: false });
    expect(o).toEqual({ answered: false, correct: false, responseMs: 12000 });
  });

  it('grades numeric answers', () => {
    expect(gradeItem(numericItem, { numericValue: 56, responseMs: 3000, answered: true }).correct).toBe(true);
    expect(gradeItem(numericItem, { numericValue: 57, responseMs: 3000, answered: true }).correct).toBe(false);
  });
});

describe('speedBonus', () => {
  it('rewards faster answers more', () => {
    expect(speedBonus(0, 10000)).toBe(50);
    expect(speedBonus(10000, 10000)).toBe(0);
    expect(speedBonus(5000, 10000)).toBe(25);
  });

  it('clamps out-of-range times', () => {
    expect(speedBonus(-100, 10000)).toBe(50);
    expect(speedBonus(99999, 10000)).toBe(0);
    expect(speedBonus(1000, 0)).toBe(0);
  });
});

describe('summarize', () => {
  const outcomes: ItemOutcome[] = [
    { answered: true, correct: true, responseMs: 2000 },
    { answered: true, correct: false, responseMs: 4000 },
    { answered: false, correct: false, responseMs: 12000 },
    { answered: true, correct: true, responseMs: 6000 },
  ];

  it('counts correct, accuracy and averages response over answered items only', () => {
    const s = summarize(outcomes, 12000);
    expect(s.totalItems).toBe(4);
    expect(s.correct).toBe(2);
    expect(s.accuracy).toBeCloseTo(0.5, 5);
    // answered items: 2000, 4000, 6000 -> avg 4000 (timed-out 12000 excluded)
    expect(s.avgResponseMs).toBe(4000);
  });

  it('scores only correct items, with a speed bonus', () => {
    const s = summarize(outcomes, 12000);
    // correct #1: 100 + bonus(2000/12000) ; correct #4: 100 + bonus(6000/12000)
    expect(s.score).toBeGreaterThan(200);
    expect(s.score).toBeLessThanOrEqual(300);
  });

  it('handles an empty session', () => {
    expect(summarize([], 12000)).toEqual({
      totalItems: 0,
      correct: 0,
      accuracy: 0,
      avgResponseMs: 0,
      score: 0,
    });
  });
});
