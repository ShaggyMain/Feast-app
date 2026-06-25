import { generateScenario } from './generate';
import { bearing, normalizeDeg } from './geometry';
import { initWorld, isComplete, stepWorld } from './sim';
import type { Scenario } from './types';

/** Run a scenario to completion with no player input. */
function runHandsOff(scenario: Scenario) {
  let w = initWorld(scenario);
  let guard = 0;
  while (!isComplete(w, scenario) && guard < 5000) {
    w = stepWorld(w, scenario, 1);
    guard += 1;
  }
  return w;
}

describe('generateScenario', () => {
  it('is deterministic for a given seed + level', () => {
    expect(generateScenario(123, 2)).toEqual(generateScenario(123, 2));
  });

  it('varies with the seed', () => {
    expect(generateScenario(1, 3)).not.toEqual(generateScenario(2, 3));
  });

  it('scales traffic with the level (1 / 3 / 4)', () => {
    expect(generateScenario(5, 1).aircraft).toHaveLength(1);
    expect(generateScenario(5, 2).aircraft).toHaveLength(3);
    expect(generateScenario(5, 3).aircraft).toHaveLength(4);
  });

  it('produces valid, in-bounds, inbound traffic with assigned gates', () => {
    const s = generateScenario(42, 3);
    const gateIds = new Set(s.gates.map((g) => g.id));
    for (const a of s.aircraft) {
      expect(a.state).toBe('inbound');
      expect(a.controllable).toBe(true);
      expect(gateIds.has(a.exitGateId)).toBe(true);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(s.config.size);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(s.config.size);
    }
    // Callsigns are unique.
    expect(new Set(s.aircraft.map((a) => a.callsign)).size).toBe(s.aircraft.length);
  });

  it('L1 is deliberately mis-aimed so the player must steer', () => {
    const s = generateScenario(7, 1);
    const a = s.aircraft[0];
    const gate = s.gates.find((g) => g.id === a.exitGateId)!;
    const offset = Math.abs(normalizeDeg(a.heading - bearing(a.x, a.y, gate.x, gate.y)));
    expect(offset).toBeGreaterThanOrEqual(20);
  });

  it('L2/L3 embed a guaranteed conflict if the player does nothing', () => {
    for (const seed of [1, 2, 3, 99]) {
      expect(runHandsOff(generateScenario(seed, 2)).stats.conflictEvents).toBeGreaterThanOrEqual(1);
      expect(runHandsOff(generateScenario(seed, 3)).stats.conflictEvents).toBeGreaterThanOrEqual(1);
    }
  });
});
