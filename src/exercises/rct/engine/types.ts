/**
 * RCT (Radar Control Test) engine types. Aircraft follow a network of airways
 * (corridors) between named fixes; the controller manages altitude/speed and
 * separation at crossings, and complies with "radio" instructions. Reuses the
 * radar engine's geometry + 3D conflict detection (RctAircraft satisfies the
 * structural `Track`).
 */

export type RctState = 'pending' | 'enroute' | 'exited' | 'lost';

export interface Fix {
  id: string;
  name: string;
  x: number;
  y: number;
  /** True for the edge fixes where traffic enters/leaves the sector. */
  edge?: boolean;
}

export interface RctAircraft {
  id: string;
  callsign: string;
  x: number;
  y: number;
  heading: number;
  speed: number;
  altitude: number;
  /** Player-controlled targets (heading is automatic — it follows the route). */
  targetSpeed: number;
  targetAltitude: number;
  /** Ordered fix ids from entry to exit; `legIdx` is the fix being flown to. */
  route: string[];
  legIdx: number;
  /** Flight level the aircraft must hold when it leaves at its exit fix. */
  clearedAlt: number;
  controllable: boolean;
  etaSec: number;
  spawnAtSec: number;
  state: RctState;
  conflict: boolean;
  warn: boolean;
}

export type InstrKind = 'climb' | 'descend' | 'speed';

export interface RadioInstruction {
  id: string;
  acId: string;
  callsign: string;
  kind: InstrKind;
  /** Target value: a flight level (climb/descend) or a speed (speed). */
  value: number;
  issuedAtSec: number;
  dueBySec: number;
  /** Runtime flags. */
  status: 'pending' | 'active' | 'complied' | 'missed';
}

export interface RctConfig {
  size: number;
  turnRate: number;
  aRate: number;
  climbRate: number;
  minSpeed: number;
  maxSpeed: number;
  minAlt: number;
  maxAlt: number;
  sepH: number;
  sepV: number;
  predictT: number;
  /** How close to a fix counts as crossing it. */
  fixRadius: number;
  /** Tolerance (alt units) for arriving at the cleared flight level. */
  altWindow: number;
  /** +/- seconds tolerance around the exit ETA. */
  etaWindowSec: number;
  durationSec: number;
}

export interface RctScenario {
  level: 1 | 2 | 3;
  config: RctConfig;
  fixes: Fix[];
  /** Undirected airway segments (fix id pairs) — drawn as corridors. */
  airways: Array<[string, string]>;
  aircraft: RctAircraft[];
  instructions: RadioInstruction[];
}

export interface RctStats {
  exits: number;
  onTimeExits: number;
  wrongAlt: number;
  lost: number;
  conflictSeconds: number;
  conflictEvents: number;
  instrComplied: number;
  instrMissed: number;
}

export interface RctWorld {
  aircraft: RctAircraft[];
  elapsedSec: number;
  stats: RctStats;
  activeConflict: boolean;
  instructions: RadioInstruction[];
}

export const emptyRctStats = (): RctStats => ({
  exits: 0,
  onTimeExits: 0,
  wrongAlt: 0,
  lost: 0,
  conflictSeconds: 0,
  conflictEvents: 0,
  instrComplied: 0,
  instrMissed: 0,
});
