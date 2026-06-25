/** Radar engine types (Module 3.4 DART). 2D for levels L1–L3; altitude later. */

export type AircraftState = 'inbound' | 'handedOff' | 'lost';

export interface Aircraft {
  id: string;
  callsign: string;
  x: number;
  y: number;
  heading: number;
  speed: number;
  targetHeading: number;
  targetSpeed: number;
  controllable: boolean;
  exitGateId: string;
  /** Target arrival time (seconds from scenario start). */
  etaSec: number;
  state: AircraftState;
  /** Runtime flags set by the conflict detector. */
  conflict: boolean;
  warn: boolean;
}

export interface Gate {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface RadarConfig {
  /** Square scope size in sim units (rendered scaled to px). */
  size: number;
  /** Turn rate, deg/sec. */
  turnRate: number;
  /** Speed change rate, units/sec². */
  aRate: number;
  minSpeed: number;
  maxSpeed: number;
  /** Horizontal separation threshold (units). */
  sepH: number;
  /** CPA look-ahead seconds for predictive warnings. */
  predictT: number;
  /** How close to a gate counts as arrival. */
  gateRadius: number;
  /** +/- seconds tolerance around the target ETA. */
  etaWindowSec: number;
  durationSec: number;
}

export interface Scenario {
  level: 1 | 2 | 3;
  config: RadarConfig;
  gates: Gate[];
  aircraft: Aircraft[];
}

export interface RadarStats {
  conflictSeconds: number;
  conflictEvents: number;
  handoffs: number;
  onTimeHandoffs: number;
  missedEta: number;
  wrongGate: number;
  lost: number;
}

export interface World {
  aircraft: Aircraft[];
  elapsedSec: number;
  stats: RadarStats;
  /** Whether any active conflict exists this frame (for onset counting). */
  activeConflict: boolean;
}

export const emptyStats = (): RadarStats => ({
  conflictSeconds: 0,
  conflictEvents: 0,
  handoffs: 0,
  onTimeHandoffs: 0,
  missedEta: 0,
  wrongGate: 0,
  lost: 0,
});
