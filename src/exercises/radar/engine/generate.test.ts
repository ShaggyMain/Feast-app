import { generateScenario } from './generate';
import { bearing, normalizeDeg } from './geometry';
import { initWorld, isComplete, stepWorld } from './sim';
import type { RadarLevel, Scenario } from './types';

/** Run a scenario to completion with no player input. */
function runHandsOff(scenario: Scenario) {
  let w = initWorld(scenario);
  let guard = 0;
  while (!isComplete(w, scenario) && guard < 6000) {
    w = stepWorld(w, scenario, 1);
    guard += 1;
  }
  return w;
}

const controllable = (s: Scenario) => s.aircraft.filter((a) => a.controllable);
const uncontrolled = (s: Scenario) => s.aircraft.filter((a) => !a.controllable);

describe('generateScenario', () => {
  it('is deterministic for a given seed + level', () => {
    expect(generateScenario(123, 2)).toEqual(generateScenario(123, 2));
    expect(generateScenario(123, 6)).toEqual(generateScenario(123, 6));
  });

  it('varies with the seed', () => {
    expect(generateScenario(1, 3)).not.toEqual(generateScenario(2, 3));
  });

  it('scales traffic with the level', () => {
    expect(generateScenario(5, 1).aircraft).toHaveLength(1);
    expect(generateScenario(5, 2).aircraft).toHaveLength(3);
    expect(generateScenario(5, 3).aircraft).toHaveLength(4);
    expect(generateScenario(5, 4).aircraft).toHaveLength(5);
    expect(generateScenario(5, 5).aircraft).toHaveLength(5);
    expect(generateScenario(5, 6).aircraft).toHaveLength(8);
  });

  it('produces valid, in-bounds traffic with assigned gates (L3)', () => {
    const s = generateScenario(42, 3);
    const gateIds = new Set(s.gates.map((g) => g.id));
    for (const a of s.aircraft) {
      expect(a.state).toBe('inbound');
      expect(gateIds.has(a.exitGateId)).toBe(true);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(s.config.size);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(s.config.size);
    }
    expect(new Set(s.aircraft.map((a) => a.callsign)).size).toBe(s.aircraft.length);
  });

  it('L1 is deliberately mis-aimed so the player must steer', () => {
    const s = generateScenario(7, 1);
    const a = s.aircraft[0];
    const gate = s.gates.find((g) => g.id === a.exitGateId)!;
    const offset = Math.abs(normalizeDeg(a.heading - bearing(a.x, a.y, gate.x, gate.y)));
    expect(offset).toBeGreaterThanOrEqual(20);
  });

  it('embeds a guaranteed conflict if the player does nothing (L2–L6)', () => {
    for (const level of [2, 3, 4, 5, 6] as RadarLevel[]) {
      for (const seed of [1, 7, 42]) {
        expect(runHandsOff(generateScenario(seed, level)).stats.conflictEvents).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('L4 adds exactly one uncontrolled transit track on one flight level', () => {
    const s = generateScenario(11, 4);
    expect(s.config.verticalEnabled).toBe(false);
    expect(controllable(s)).toHaveLength(4);
    expect(uncontrolled(s)).toHaveLength(1);
    expect(uncontrolled(s)[0].exitGateId).toBe('');
    expect(new Set(s.aircraft.map((a) => a.altitude)).size).toBe(1);
  });

  it('L5 turns on the altitude layer with traffic on multiple levels', () => {
    const s = generateScenario(11, 5);
    expect(s.config.verticalEnabled).toBe(true);
    expect(uncontrolled(s)).toHaveLength(1);
    expect(new Set(s.aircraft.map((a) => a.altitude)).size).toBeGreaterThanOrEqual(2);
  });

  it('L6 is max load: six controllable, two uncontrolled, staggered + 3D', () => {
    const s = generateScenario(11, 6);
    expect(s.config.verticalEnabled).toBe(true);
    expect(controllable(s)).toHaveLength(6);
    expect(uncontrolled(s)).toHaveLength(2);
    expect(s.aircraft.some((a) => a.state === 'pending' && a.spawnAtSec > 0)).toBe(true);
  });
});
