import { generateScenario } from './generate';
import { initRctWorld, isRctComplete, stepRct } from './sim';
import type { RctScenario } from './types';

function runHandsOff(scenario: RctScenario) {
  let w = initRctWorld(scenario);
  let guard = 0;
  while (!isRctComplete(w, scenario) && guard < 6000) {
    w = stepRct(w, scenario, 1);
    guard += 1;
  }
  return w;
}

describe('generateScenario (RCT)', () => {
  it('is deterministic for a given seed + level', () => {
    expect(generateScenario(123, 2)).toEqual(generateScenario(123, 2));
    expect(generateScenario(7, 3)).toEqual(generateScenario(7, 3));
  });

  it('scales traffic and always carries instructions', () => {
    expect(generateScenario(5, 1).aircraft).toHaveLength(2);
    expect(generateScenario(5, 2).aircraft).toHaveLength(3);
    expect(generateScenario(5, 3).aircraft).toHaveLength(4);
    expect(generateScenario(5, 1).instructions.length).toBeGreaterThanOrEqual(1);
    expect(generateScenario(5, 3).instructions.length).toBeGreaterThanOrEqual(2);
  });

  it('produces valid routes through the network', () => {
    const s = generateScenario(42, 3);
    const ids = new Set(s.fixes.map((f) => f.id));
    for (const a of s.aircraft) {
      expect(a.route.length).toBeGreaterThanOrEqual(2);
      expect(a.route.every((r) => ids.has(r))).toBe(true);
      expect(a.legIdx).toBe(1);
      expect(a.controllable).toBe(true);
    }
  });

  it('issues instructions that actually require an action', () => {
    for (const level of [1, 2, 3] as const) {
      const s = generateScenario(11, level);
      for (const ins of s.instructions) {
        const ac = s.aircraft.find((a) => a.id === ins.acId)!;
        expect(ac).toBeTruthy();
        // The instructed value differs from the current target → a real task.
        expect(ac.targetAltitude).not.toBe(ins.value);
        // Complying delivers the aircraft at its cleared exit level.
        expect(ac.clearedAlt).toBe(ins.value);
      }
    }
  });

  it('embeds a guaranteed crossing conflict at L2/L3 if the controller does nothing', () => {
    for (const level of [2, 3] as const) {
      for (const seed of [1, 7, 42]) {
        expect(runHandsOff(generateScenario(seed, level)).stats.conflictEvents).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
