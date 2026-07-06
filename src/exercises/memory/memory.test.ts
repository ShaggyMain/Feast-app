import { mulberry32 } from '../../core/rng';
import { buildNbackSequence, memoryParams, multipassParams, nbackParams } from './params';
import { buildGaugeRound } from './gauges';

describe('memory params', () => {
  it('n-back gets harder: higher N, faster pace', () => {
    expect(nbackParams('easy').n).toBe(1);
    expect(nbackParams('medium').n).toBe(2);
    expect(nbackParams('hard').n).toBe(3);
    expect(nbackParams('hard').isiMs).toBeLessThan(nbackParams('easy').isiMs);
  });

  it('memory exposure shortens and gauges grow with difficulty', () => {
    expect(memoryParams('hard').exposeMs).toBeLessThan(memoryParams('easy').exposeMs);
    expect(memoryParams('hard').baseGauges).toBeGreaterThan(memoryParams('easy').baseGauges);
  });

  it('multipass speeds up at higher difficulty', () => {
    expect(multipassParams('hard').cycleMs).toBeLessThan(multipassParams('easy').cycleMs);
    expect(multipassParams('hard').onMs).toBeLessThan(multipassParams('easy').onMs);
  });
});

describe('buildNbackSequence', () => {
  it('marks targets exactly when current equals N-back, with a sane rate', () => {
    for (const n of [1, 2, 3]) {
      let total = 0;
      let targets = 0;
      for (let seed = 0; seed < 60; seed++) {
        const { seq, target } = buildNbackSequence(mulberry32(seed * 31 + 1), n, 28, 0.3);
        expect(seq.length).toBe(28);
        for (let i = 0; i < seq.length; i++) {
          const isMatch = i >= n && seq[i] === seq[i - n];
          expect(target[i]).toBe(isMatch);
          if (i >= n) {
            total += 1;
            if (target[i]) targets += 1;
          }
        }
      }
      const rate = targets / total;
      expect(rate).toBeGreaterThan(0.18);
      expect(rate).toBeLessThan(0.42);
    }
  });

  it('is deterministic', () => {
    expect(buildNbackSequence(mulberry32(5), 2, 20, 0.3)).toEqual(
      buildNbackSequence(mulberry32(5), 2, 20, 0.3),
    );
  });
});

describe('buildGaugeRound', () => {
  it('quizzes several distinct gauges (scaling with the set), one correct option each', () => {
    for (let count = 4; count <= 7; count++) {
      for (let seed = 0; seed < 200; seed++) {
        const round = buildGaugeRound(mulberry32(seed * 13 + count), count);
        expect(round.values.length).toBe(count);
        expect(new Set(round.values).size).toBe(count);

        // more than one query, all distinct, capped sensibly
        expect(round.questions.length).toBeGreaterThanOrEqual(2);
        expect(round.questions.length).toBeLessThanOrEqual(Math.min(3, count));
        expect(new Set(round.questions.map((q) => q.recallIndex)).size).toBe(round.questions.length);

        for (const q of round.questions) {
          expect(q.recallIndex).toBeGreaterThanOrEqual(0);
          expect(q.recallIndex).toBeLessThan(count);
          expect(q.answer).toBe(round.values[q.recallIndex]);
          expect(q.choices.length).toBe(4);
          expect(new Set(q.choices.map((c) => c.label)).size).toBe(4);
          const correct = q.choices.filter((c) => c.id === q.correctChoiceId);
          expect(correct).toHaveLength(1);
          expect(correct[0].label).toBe(String(q.answer));
        }
      }
    }
  });
});
