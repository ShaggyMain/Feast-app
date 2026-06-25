import { gonogoParams, simpleParams } from './params';

describe('reaction difficulty params', () => {
  it('simple reaction gets a shorter deadline and more trials when harder', () => {
    expect(simpleParams('hard').deadlineMs).toBeLessThan(simpleParams('medium').deadlineMs);
    expect(simpleParams('medium').deadlineMs).toBeLessThan(simpleParams('easy').deadlineMs);
    expect(simpleParams('hard').trials).toBeGreaterThan(simpleParams('easy').trials);
  });

  it('go/no-go gets faster windows and more trials when harder', () => {
    expect(gonogoParams('hard').windowMs).toBeLessThan(gonogoParams('medium').windowMs);
    expect(gonogoParams('medium').windowMs).toBeLessThan(gonogoParams('easy').windowMs);
    expect(gonogoParams('hard').isiMs).toBeLessThan(gonogoParams('easy').isiMs);
    expect(gonogoParams('hard').trials).toBeGreaterThan(gonogoParams('easy').trials);
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const p = gonogoParams(level);
      expect(p.goRatio).toBeGreaterThan(0.5);
      expect(p.goRatio).toBeLessThanOrEqual(0.7);
    }
  });
});
