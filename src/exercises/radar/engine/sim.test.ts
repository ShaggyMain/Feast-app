import type { Aircraft, Gate, RadarConfig, Scenario } from './types';
import {
  advanceAircraft,
  changeSpeed,
  directTo,
  initWorld,
  isComplete,
  stepWorld,
  turnBy,
} from './sim';

const cfg: RadarConfig = {
  size: 1000,
  turnRate: 3,
  aRate: 10,
  minSpeed: 0,
  maxSpeed: 100,
  sepH: 50,
  predictT: 10,
  gateRadius: 42,
  etaWindowSec: 5,
  durationSec: 100,
};

function ac(partial: Partial<Aircraft>): Aircraft {
  return {
    id: 'a',
    callsign: 'X',
    x: 500,
    y: 500,
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

const scenario = (aircraft: Aircraft[], gates: Gate[] = []): Scenario => ({
  level: 1,
  config: cfg,
  gates,
  aircraft,
});

describe('advanceAircraft', () => {
  it('flies straight along the current heading', () => {
    const out = advanceAircraft(ac({ x: 0, y: 0, heading: 0, speed: 10, targetSpeed: 10 }), cfg, 1);
    expect(out.x).toBeCloseTo(0);
    expect(out.y).toBeCloseTo(-10); // north = −y
  });

  it('turns toward the target heading at the turn rate', () => {
    const out = advanceAircraft(ac({ heading: 0, targetHeading: 90 }), cfg, 1);
    expect(out.heading).toBeCloseTo(3); // 3 deg/s × 1 s
  });

  it('eases speed toward the target by the accel rate', () => {
    const out = advanceAircraft(ac({ speed: 10, targetSpeed: 30 }), { ...cfg, aRate: 5 }, 1);
    expect(out.speed).toBeCloseTo(15);
  });

  it('ignores commands for uncontrollable traffic', () => {
    const out = advanceAircraft(
      ac({ heading: 0, targetHeading: 90, speed: 10, targetSpeed: 30, controllable: false }),
      cfg,
      1,
    );
    expect(out.heading).toBeCloseTo(0);
    expect(out.speed).toBeCloseTo(10);
  });
});

describe('stepWorld — gates', () => {
  const gateN: Gate = { id: 'N', name: 'N', x: 500, y: 0 };

  it('counts an on-time handoff at the assigned gate', () => {
    const w = initWorld(scenario([ac({ x: 500, y: 20, exitGateId: 'N', etaSec: 1 })], [gateN]));
    const out = stepWorld(w, scenario([], [gateN]), 1);
    expect(out.aircraft[0].state).toBe('handedOff');
    expect(out.stats.handoffs).toBe(1);
    expect(out.stats.onTimeHandoffs).toBe(1);
    expect(out.stats.missedEta).toBe(0);
  });

  it('counts a late handoff outside the ETA window', () => {
    const w = initWorld(scenario([ac({ x: 500, y: 20, exitGateId: 'N', etaSec: 50 })], [gateN]));
    const out = stepWorld(w, scenario([], [gateN]), 1);
    expect(out.stats.handoffs).toBe(1);
    expect(out.stats.onTimeHandoffs).toBe(0);
    expect(out.stats.missedEta).toBe(1);
  });

  it('counts a wrong-gate exit', () => {
    const w = initWorld(scenario([ac({ x: 500, y: 20, exitGateId: 'S' })], [gateN]));
    const out = stepWorld(w, scenario([], [gateN]), 1);
    expect(out.stats.wrongGate).toBe(1);
    expect(out.stats.handoffs).toBe(0);
  });
});

describe('stepWorld — leaving the sector', () => {
  it('marks an aircraft that crosses the edge as lost', () => {
    const w = initWorld(scenario([ac({ x: 985, y: 500, heading: 90, speed: 50, targetSpeed: 50 })]));
    const out = stepWorld(w, scenario([]), 1); // x → 1035 > size+margin
    expect(out.aircraft[0].state).toBe('lost');
    expect(out.stats.lost).toBe(1);
  });
});

describe('stepWorld — conflicts', () => {
  it('accumulates conflict seconds and counts one onset event', () => {
    const planes = [ac({ id: 'a', x: 500, y: 500 }), ac({ id: 'b', x: 520, y: 500 })];
    const s = scenario(planes);
    const w1 = stepWorld(initWorld(s), s, 1);
    expect(w1.activeConflict).toBe(true);
    expect(w1.stats.conflictSeconds).toBeCloseTo(1);
    expect(w1.stats.conflictEvents).toBe(1);
    const w2 = stepWorld(w1, s, 1);
    expect(w2.stats.conflictSeconds).toBeCloseTo(2);
    expect(w2.stats.conflictEvents).toBe(1); // still the same event
    expect(w2.aircraft[0].conflict).toBe(true);
  });
});

describe('isComplete', () => {
  it('ends when the clock runs out', () => {
    const w = { ...initWorld(scenario([ac({})])), elapsedSec: cfg.durationSec };
    expect(isComplete(w, scenario([ac({})]))).toBe(true);
  });

  it('ends early when no aircraft remain inbound', () => {
    const w = initWorld(scenario([ac({ state: 'handedOff' }), ac({ id: 'b', state: 'lost' })]));
    expect(isComplete(w, scenario([]))).toBe(true);
  });

  it('keeps running while an aircraft is inbound', () => {
    const w = initWorld(scenario([ac({ state: 'inbound' })]));
    expect(isComplete(w, scenario([]))).toBe(false);
  });
});

describe('command helpers', () => {
  it('turnBy adjusts the target heading (wrapping)', () => {
    expect(turnBy(ac({ targetHeading: 350 }), 20).targetHeading).toBe(10);
    expect(turnBy(ac({ targetHeading: 10 }), -20).targetHeading).toBe(350);
  });

  it('directTo points the target heading at the gate', () => {
    const out = directTo(ac({ x: 0, y: 0 }), { id: 'E', name: 'E', x: 100, y: 0 });
    expect(out.targetHeading).toBeCloseTo(90);
  });

  it('changeSpeed clamps within the configured envelope', () => {
    expect(changeSpeed(ac({ targetSpeed: 95 }), 20, cfg).targetSpeed).toBe(100);
    expect(changeSpeed(ac({ targetSpeed: 5 }), -20, cfg).targetSpeed).toBe(0);
  });
});
