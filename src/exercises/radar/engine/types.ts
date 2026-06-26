/** Radar engine types (Module 3.4 DART). Levels L1–L4 share one flight level
 * (degenerate, plays 2D); L5–L6 use the altitude layer. */

export type AircraftState = 'pending' | 'inbound' | 'handedOff' | 'lost';

export interface Aircraft {
  id: string;
  callsign: string;
  x: number;
  y: number;
  heading: number;
  speed: number;
  /** Flight level in sim units (1 unit ≈ 100 ft → FLxxx = altitude). */
  altitude: number;
  targetHeading: number;
  targetSpeed: number;
  targetAltitude: number;
  /** False = uncontrolled transit traffic to avoid (cannot be commanded). */
  controllable: boolean;
  /** Empty for uncontrolled traffic (no delivery obligation). */
  exitGateId: string;
  /** Target arrival time (seconds from scenario start). */
  etaSec: number;
  /** Seconds after start at which the track appears (0 = present from t=0). */
  spawnAtSec: number;
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
  /** Vertical separation threshold (altitude units). */
  sepV: number;
  /** Climb/descent rate, altitude units/sec. */
  climbRate: number;
  minAlt: number;
  maxAlt: number;
  /** Whether the altitude layer is in play (L5+). Hides climb/descend below. */
  verticalEnabled: boolean;
  /** CPA look-ahead seconds for predictive warnings. */
  predictT: number;
  /** How close to a gate counts as arrival. */
  gateRadius: number;
  /** +/- seconds tolerance around the target ETA. */
  etaWindowSec: number;
  durationSec: number;
}

export type RadarLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Scenario {
  level: RadarLevel;
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
