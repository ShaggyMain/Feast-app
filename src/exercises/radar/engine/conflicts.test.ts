import type { Aircraft } from './types';
import { cpaDistance, detectConflicts } from './conflicts';

function ac(partial: Partial<Aircraft>): Aircraft {
  return {
    id: 'a',
    callsign: 'X',
    x: 0,
    y: 0,
    heading: 0,
    speed: 0,
    targetHeading: 0,
    targetSpeed: 0,
    controllable: true,
    exitGateId: 'N',
    etaSec: 0,
    state: 'inbound',
    conflict: false,
    warn: false,
    ...partial,
  };
}

describe('cpaDistance', () => {
  it('is ~0 for two tracks converging on the same point', () => {
    // a heads east from origin; b heads north from (50,50): both reach (50,0).
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10 });
    const b = ac({ id: 'b', x: 50, y: 50, heading: 0, speed: 10 });
    expect(cpaDistance(a, b, 20)).toBeCloseTo(0, 5);
  });

  it('returns the current distance when tracks are parallel (no closure)', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10 });
    const b = ac({ id: 'b', x: 0, y: 30, heading: 90, speed: 10 });
    expect(cpaDistance(a, b, 20)).toBeCloseTo(30);
  });
});

describe('detectConflicts', () => {
  it('flags an active pair when already inside separation', () => {
    const a = ac({ id: 'a', x: 0, y: 0 });
    const b = ac({ id: 'b', x: 10, y: 0 });
    const r = detectConflicts([a, b], 20, 10);
    expect(r.active.has('a')).toBe(true);
    expect(r.active.has('b')).toBe(true);
    expect(r.activePairs).toEqual([['a', 'b']]);
    expect(r.warn.size).toBe(0);
  });

  it('warns (amber) when separated now but predicted to converge', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10 });
    const b = ac({ id: 'b', x: 50, y: 50, heading: 0, speed: 10 });
    const r = detectConflicts([a, b], 20, 10);
    expect(r.active.size).toBe(0); // ~70 units apart right now
    expect(r.warn.has('a')).toBe(true);
    expect(r.warn.has('b')).toBe(true);
  });

  it('finds nothing when far apart and diverging', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 270, speed: 10 });
    const b = ac({ id: 'b', x: 200, y: 0, heading: 90, speed: 10 });
    const r = detectConflicts([a, b], 20, 10);
    expect(r.active.size).toBe(0);
    expect(r.warn.size).toBe(0);
  });
});
