import type { Fix, RadioInstruction, RctAircraft, RctConfig, RctScenario } from './types';
import {
  advanceRct,
  changeAltitude,
  changeSpeed,
  initRctWorld,
  isRctComplete,
  setAltitude,
  stepRct,
  withAircraft,
} from './sim';

const cfg: RctConfig = {
  size: 1000,
  turnRate: 3,
  aRate: 10,
  climbRate: 10,
  minSpeed: 0,
  maxSpeed: 100,
  minAlt: 100,
  maxAlt: 300,
  sepH: 60,
  sepV: 40,
  predictT: 10,
  fixRadius: 40,
  altWindow: 10,
  etaWindowSec: 5,
  durationSec: 100,
};

const F2: Fix[] = [
  { id: 'A', name: 'A', x: 100, y: 500 },
  { id: 'B', name: 'B', x: 900, y: 500 },
];

function ac(p: Partial<RctAircraft>): RctAircraft {
  return {
    id: 'a',
    callsign: 'X',
    x: 100,
    y: 500,
    heading: 90,
    speed: 20,
    altitude: 200,
    targetSpeed: 20,
    targetAltitude: 200,
    route: ['A', 'B'],
    legIdx: 1,
    clearedAlt: 200,
    controllable: true,
    etaSec: 0,
    spawnAtSec: 0,
    state: 'enroute',
    conflict: false,
    warn: false,
    ...p,
  };
}

const scn = (aircraft: RctAircraft[], instructions: RadioInstruction[] = [], fixes: Fix[] = F2): RctScenario => ({
  level: 1,
  config: cfg,
  fixes,
  airways: [],
  aircraft,
  instructions,
});

describe('advanceRct', () => {
  it('steers toward the current route fix and moves', () => {
    const out = advanceRct(ac({ x: 100, y: 500, heading: 90, route: ['A', 'B'], legIdx: 1 }), F2, cfg, 1);
    expect(out.x).toBeGreaterThan(100); // moved east toward B
    expect(out.heading).toBeCloseTo(90);
  });

  it('advances to the next leg once it crosses a non-final fix', () => {
    const fixes: Fix[] = [
      { id: 'A', name: 'A', x: 100, y: 500 },
      { id: 'MID', name: 'MID', x: 500, y: 500 },
      { id: 'B', name: 'B', x: 900, y: 500 },
    ];
    const out = advanceRct(
      ac({ x: 490, y: 500, heading: 90, speed: 20, route: ['A', 'MID', 'B'], legIdx: 1 }),
      fixes,
      cfg,
      1,
    );
    expect(out.legIdx).toBe(2); // reached MID, now flying to B
  });
});

describe('stepRct — exits', () => {
  it('counts an on-time exit at the right flight level', () => {
    const a = ac({ x: 890, y: 500, etaSec: 1, altitude: 200, clearedAlt: 200, route: ['A', 'B'], legIdx: 1 });
    const out = stepRct(initRctWorld(scn([a])), scn([a]), 1);
    expect(out.aircraft[0].state).toBe('exited');
    expect(out.stats.exits).toBe(1);
    expect(out.stats.onTimeExits).toBe(1);
    expect(out.stats.wrongAlt).toBe(0);
  });

  it('flags a wrong-flight-level exit', () => {
    const a = ac({ x: 890, y: 500, etaSec: 1, altitude: 240, clearedAlt: 200, route: ['A', 'B'], legIdx: 1 });
    const out = stepRct(initRctWorld(scn([a])), scn([a]), 1);
    expect(out.stats.exits).toBe(1);
    expect(out.stats.onTimeExits).toBe(0);
    expect(out.stats.wrongAlt).toBe(1);
  });
});

describe('stepRct — conflicts and spawns', () => {
  it('accumulates conflict seconds for co-level crossing traffic', () => {
    const a = ac({ id: 'a', x: 500, y: 500, altitude: 200 });
    const b = ac({ id: 'b', x: 520, y: 500, altitude: 200 });
    const s = scn([a, b]);
    const w = stepRct(initRctWorld(s), s, 1);
    expect(w.activeConflict).toBe(true);
    expect(w.stats.conflictSeconds).toBeCloseTo(1);
    expect(w.stats.conflictEvents).toBe(1);
  });

  it('does not conflict when vertically separated', () => {
    const a = ac({ id: 'a', x: 500, y: 500, altitude: 200 });
    const b = ac({ id: 'b', x: 520, y: 500, altitude: 260 });
    const s = scn([a, b]);
    expect(stepRct(initRctWorld(s), s, 1).activeConflict).toBe(false);
  });

  it('activates pending traffic at its spawn time', () => {
    const a = ac({ state: 'pending', spawnAtSec: 5, speed: 0 });
    const s = scn([a]);
    expect(stepRct(initRctWorld(s), s, 4).aircraft[0].state).toBe('pending');
    expect(stepRct(stepRct(initRctWorld(s), s, 4), s, 1).aircraft[0].state).toBe('enroute');
  });
});

describe('stepRct — radio instructions', () => {
  const instr = (p: Partial<RadioInstruction> = {}): RadioInstruction => ({
    id: 'i',
    acId: 'a',
    callsign: 'X',
    kind: 'climb',
    value: 220,
    issuedAtSec: 2,
    dueBySec: 8,
    status: 'pending',
    ...p,
  });

  it('activates, then marks complied when the target is set', () => {
    const s = scn([ac({ id: 'a', targetAltitude: 200 })], [instr()]);
    let w = stepRct(initRctWorld(s), s, 1); // t=1 pending
    expect(w.instructions[0].status).toBe('pending');
    w = stepRct(w, s, 1); // t=2 active
    expect(w.instructions[0].status).toBe('active');
    w = withAircraft(w, 'a', (x) => setAltitude(x, 220, cfg));
    w = stepRct(w, s, 1); // t=3 complied
    expect(w.instructions[0].status).toBe('complied');
    expect(w.stats.instrComplied).toBe(1);
  });

  it('marks missed once the deadline passes without compliance', () => {
    const s = scn([ac({ id: 'a', targetAltitude: 200 })], [instr({ issuedAtSec: 1, dueBySec: 3 })]);
    let w = initRctWorld(s);
    for (let i = 0; i < 4; i++) w = stepRct(w, s, 1); // t=4 > dueBy
    expect(w.instructions[0].status).toBe('missed');
    expect(w.stats.instrMissed).toBe(1);
  });
});

describe('isRctComplete', () => {
  it('ends on the clock or when nothing is enroute/pending', () => {
    const done = { ...initRctWorld(scn([ac({ state: 'exited' })])), elapsedSec: cfg.durationSec };
    expect(isRctComplete(done, scn([ac({})]))).toBe(true);
    expect(isRctComplete(initRctWorld(scn([ac({ state: 'exited' })])), scn([ac({})]))).toBe(true);
    expect(isRctComplete(initRctWorld(scn([ac({ state: 'enroute' })])), scn([ac({})]))).toBe(false);
  });
});

describe('command helpers', () => {
  it('changeAltitude and setAltitude clamp to the band', () => {
    expect(changeAltitude(ac({ targetAltitude: 290 }), 20, cfg).targetAltitude).toBe(300);
    expect(setAltitude(ac({}), 999, cfg).targetAltitude).toBe(300);
  });
  it('changeSpeed clamps to the envelope', () => {
    expect(changeSpeed(ac({ targetSpeed: 95 }), 20, cfg).targetSpeed).toBe(100);
  });
});
