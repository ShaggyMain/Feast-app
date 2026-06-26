/**
 * Seeded RCT scenario generator (L1–L3). A "crossroads" airway network: eight
 * edge fixes all connect to a central fix CTR, so every route crosses at CTR —
 * the controller vertically separates the traffic flowing through it and obeys
 * radio instructions. Pure & deterministic for a given (seed, level).
 */
import { bearing, dist } from '../../radar/engine/geometry';
import { mulberry32, pick, randInt, type Rng } from '@/core/rng';
import type { Fix, RadioInstruction, RctAircraft, RctConfig, RctScenario } from './types';

const SIZE = 1000;
const BASE_SPEED = 22;
const ALT_LANES = [180, 200, 220, 240];

const AIRLINES = ['SAS', 'DLH', 'RYR', 'AFR', 'KLM', 'BAW', 'EZY', 'WZZ', 'LOT', 'UAE', 'SWR', 'AUA'];

const FIX_DEF: Array<[string, string, number, number, boolean]> = [
  ['W', 'WOBSA', 60, 500, true],
  ['E', 'ESDEK', 940, 500, true],
  ['N', 'NORLU', 500, 60, true],
  ['S', 'SODAR', 500, 940, true],
  ['NW', 'NIKMA', 175, 175, true],
  ['NE', 'NEGRU', 825, 175, true],
  ['SW', 'SOWKA', 175, 825, true],
  ['SE', 'SEMBA', 825, 825, true],
  ['CTR', 'CENTR', 500, 500, false],
];

function fixes(): Fix[] {
  return FIX_DEF.map(([id, name, x, y, edge]) => ({ id, name, x, y, edge }));
}

const airways = (): Array<[string, string]> =>
  ['W', 'E', 'N', 'S', 'NW', 'NE', 'SW', 'SE'].map((e) => [e, 'CTR'] as [string, string]);

const byId = (fs: Fix[], id: string): Fix => fs.find((f) => f.id === id)!;

function configFor(level: 1 | 2 | 3): RctConfig {
  const base: RctConfig = {
    size: SIZE,
    turnRate: 3,
    aRate: 10,
    climbRate: 3,
    minSpeed: 14,
    maxSpeed: 34,
    minAlt: 160,
    maxAlt: 260,
    sepH: 92,
    sepV: 15,
    predictT: 16,
    fixRadius: 38,
    altWindow: 10,
    etaWindowSec: 16,
    durationSec: 170,
  };
  if (level === 1) return { ...base, etaWindowSec: 20, durationSec: 130 };
  if (level === 2) return { ...base, durationSec: 170 };
  return { ...base, etaWindowSec: 14, durationSec: 210 };
}

function callsigns(rng: Rng, n: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  while (out.length < n) {
    const cs = `${pick(rng, AIRLINES)}${randInt(rng, 100, 999)}`;
    if (!seen.has(cs)) {
      seen.add(cs);
      out.push(cs);
    }
  }
  return out;
}

const speedJitter = (rng: Rng): number => Math.round(BASE_SPEED * (0.94 + rng() * 0.14));

function makeAircraft(
  fs: Fix[],
  id: string,
  callsign: string,
  entryId: string,
  exitId: string,
  speed: number,
  alt: number,
  clearedAlt: number,
  spawnAtSec: number,
): RctAircraft {
  const entry = byId(fs, entryId);
  const ctr = byId(fs, 'CTR');
  const exit = byId(fs, exitId);
  const route = [entryId, 'CTR', exitId];
  const pathLen = dist(entry.x, entry.y, ctr.x, ctr.y) + dist(ctr.x, ctr.y, exit.x, exit.y);
  return {
    id,
    callsign,
    x: entry.x,
    y: entry.y,
    heading: bearing(entry.x, entry.y, ctr.x, ctr.y),
    speed,
    altitude: alt,
    targetSpeed: speed,
    targetAltitude: alt,
    route,
    legIdx: 1, // already at the entry fix; fly to CTR next
    clearedAlt,
    controllable: true,
    etaSec: spawnAtSec + pathLen / speed,
    spawnAtSec,
    state: spawnAtSec > 0 ? 'pending' : 'enroute',
    conflict: false,
    warn: false,
  };
}

function climbInstr(
  id: string,
  ac: RctAircraft,
  value: number,
  issuedAtSec: number,
  windowSec: number,
): RadioInstruction {
  return {
    id,
    acId: ac.id,
    callsign: ac.callsign,
    kind: value > ac.altitude ? 'climb' : 'descend',
    value,
    issuedAtSec,
    dueBySec: issuedAtSec + windowSec,
    status: 'pending',
  };
}

/** Two perpendicular/diagonal routes that cross CTR together → a conflict. */
const CROSS_VARIANTS: Array<[string, string, string, string]> = [
  ['W', 'E', 'N', 'S'],
  ['E', 'W', 'S', 'N'],
  ['NW', 'SE', 'NE', 'SW'],
  ['NE', 'SW', 'SE', 'NW'],
];

export function generateScenario(seed: number, level: 1 | 2 | 3): RctScenario {
  const rng = mulberry32(seed >>> 0);
  const config = configFor(level);
  const fs = fixes();

  if (level === 1) {
    // Two non-conflicting tracks (different flight levels) + one instruction.
    const cs = callsigns(rng, 2);
    const [aIn, aOut] = pick(rng, [['W', 'E'], ['N', 'S'], ['E', 'W'], ['S', 'N']]);
    const a = makeAircraft(fs, 'ac0', cs[0], aIn, aOut, speedJitter(rng), ALT_LANES[1], ALT_LANES[2], 0);
    const [bIn, bOut] = pick(rng, [['NW', 'SE'], ['NE', 'SW'], ['SE', 'NW'], ['SW', 'NE']]);
    const b = makeAircraft(fs, 'ac1', cs[1], bIn, bOut, speedJitter(rng), ALT_LANES[3], ALT_LANES[3], 9);
    const instructions = [climbInstr('i0', a, ALT_LANES[2], 5, 22)]; // climb a to its cleared FL
    return { level, config, fixes: fs, airways: airways(), aircraft: [a, b], instructions };
  }

  // L2 / L3: a guaranteed crossing pair at CTR (same FL) + fillers + instructions.
  const fillerCount = level === 2 ? 1 : 2;
  const cs = callsigns(rng, 2 + fillerCount);
  const [p0in, p0out, p1in, p1out] = pick(rng, CROSS_VARIANTS);
  const pairSpeed = speedJitter(rng);
  const a0 = makeAircraft(fs, 'ac0', cs[0], p0in, p0out, pairSpeed, ALT_LANES[1], ALT_LANES[2], 0);
  const a1 = makeAircraft(fs, 'ac1', cs[1], p1in, p1out, pairSpeed, ALT_LANES[1], ALT_LANES[1], 0);

  const used = new Set([p0in, p0out, p1in, p1out]);
  const freeEdges = ['W', 'E', 'N', 'S', 'NW', 'NE', 'SW', 'SE'].filter((e) => !used.has(e));
  const fillers: RctAircraft[] = [];
  for (let i = 0; i < fillerCount; i++) {
    const entry = freeEdges[(i * 2) % freeEdges.length];
    const exit = freeEdges[(i * 2 + 1) % freeEdges.length];
    const lane = i === 0 ? ALT_LANES[2] : ALT_LANES[0]; // FL220 / FL180
    fillers.push(makeAircraft(fs, `ac${2 + i}`, cs[2 + i], entry, exit, speedJitter(rng), lane, lane, 6 + i * 10));
  }

  // Climbing the first of the conflicting pair to its cleared FL both resolves
  // the crossing conflict and satisfies its exit level — the controller must
  // act on the instruction in time.
  const instructions: RadioInstruction[] = [climbInstr('i0', a0, ALT_LANES[2], 4, level === 2 ? 22 : 18)];
  if (level === 3 && fillers[0]) {
    // Give this filler a planned descent as a radio instruction; its cleared FL
    // is the instructed level so complying also delivers it at the right level.
    fillers[0].altitude = ALT_LANES[3]; // start FL240
    fillers[0].targetAltitude = ALT_LANES[3];
    fillers[0].clearedAlt = ALT_LANES[1]; // must exit at FL200
    instructions.push(climbInstr('i1', fillers[0], ALT_LANES[1], 16, 20));
  }

  return { level, config, fixes: fs, airways: airways(), aircraft: [a0, a1, ...fillers], instructions };
}
