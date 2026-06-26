/**
 * Static registry of training modules and runnable exercises.
 *
 * Each exercise pairs plain metadata with a pure generator. `title`,
 * `description` and the variant labels are i18n keys (see `src/i18n`), resolved
 * to the active language by the screens that render them. Screens read from
 * here to render module lists and to drive the ExerciseRunner.
 */
import type { ExerciseDef, ModuleId } from '@/types';
import { ModuleColors } from '@/constants/theme';
import { generateArith } from '@/exercises/math/arith';
import { generateVst } from '@/exercises/math/vst';
import { generatePercent } from '@/exercises/math/percent';
import { generateHeading } from '@/exercises/math/heading';
import { generateOrientation } from '@/exercises/spatial/orientation';
import { generateCoords } from '@/exercises/spatial/coords';
import { generateCube } from '@/exercises/spatial/cube';
import { generateRotation } from '@/exercises/spatial/rotation';
import { generateSeries } from '@/exercises/reaction/series';

export interface ModuleMeta {
  id: ModuleId;
  /** i18n key. */
  title: string;
  /** i18n key. */
  subtitle: string;
  emoji: string;
  color: string;
}

export const MODULES: ModuleMeta[] = [
  { id: 'math', title: 'mod.math.title', subtitle: 'mod.math.sub', emoji: '🧮', color: ModuleColors.math },
  { id: 'spatial', title: 'mod.spatial.title', subtitle: 'mod.spatial.sub', emoji: '🧊', color: ModuleColors.spatial },
  { id: 'memory', title: 'mod.memory.title', subtitle: 'mod.memory.sub', emoji: '🧠', color: ModuleColors.memory },
  { id: 'reaction', title: 'mod.reaction.title', subtitle: 'mod.reaction.sub', emoji: '⚡', color: ModuleColors.reaction },
];

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'math-arith',
    module: 'math',
    title: 'ex.math-arith.title',
    description: 'ex.math-arith.desc',
    timePerItemSec: 12,
    itemsPerSession: 10,
    variant: {
      label: 'var.action',
      default: 'all',
      options: [
        { value: 'all', label: 'varopt.all' },
        { value: '+', label: '+' },
        { value: '−', label: '−' },
        { value: '×', label: '×' },
        { value: '÷', label: '÷' },
      ],
    },
    generate: generateArith,
  },
  {
    id: 'math-vst',
    module: 'math',
    title: 'ex.math-vst.title',
    description: 'ex.math-vst.desc',
    timePerItemSec: 15,
    itemsPerSession: 8,
    variant: {
      label: 'var.sought',
      default: 'all',
      options: [
        { value: 'all', label: 'varopt.all' },
        { value: 'distance', label: 'varopt.distance' },
        { value: 'time', label: 'varopt.time' },
        { value: 'speed', label: 'varopt.speed' },
      ],
    },
    generate: generateVst,
  },
  {
    id: 'math-percent',
    module: 'math',
    title: 'ex.math-percent.title',
    description: 'ex.math-percent.desc',
    timePerItemSec: 15,
    itemsPerSession: 8,
    variant: {
      label: 'var.type',
      default: 'all',
      options: [
        { value: 'all', label: 'varopt.all' },
        { value: 'percent', label: 'varopt.percent' },
        { value: 'fraction', label: 'varopt.fraction' },
      ],
    },
    generate: generatePercent,
  },
  {
    id: 'math-heading',
    module: 'math',
    title: 'ex.math-heading.title',
    description: 'ex.math-heading.desc',
    timePerItemSec: 12,
    itemsPerSession: 8,
    variant: {
      label: 'var.type',
      default: 'all',
      options: [
        { value: 'all', label: 'varopt.all' },
        { value: 'turn', label: 'varopt.turn' },
        { value: 'reciprocal', label: 'varopt.reciprocal' },
      ],
    },
    generate: generateHeading,
  },
  {
    id: 'spatial-orient',
    module: 'spatial',
    title: 'ex.spatial-orient.title',
    description: 'ex.spatial-orient.desc',
    timePerItemSec: 18,
    itemsPerSession: 8,
    variant: {
      label: 'var.type',
      default: 'all',
      options: [
        { value: 'all', label: 'varopt.all' },
        { value: 'bearing8', label: 'varopt.bearing8' },
        { value: 'relative', label: 'varopt.relative' },
      ],
    },
    generate: generateOrientation,
  },
  {
    id: 'spatial-coords',
    module: 'spatial',
    title: 'ex.spatial-coords.title',
    description: 'ex.spatial-coords.desc',
    timePerItemSec: 20,
    itemsPerSession: 8,
    variant: {
      label: 'var.type',
      default: 'all',
      options: [
        { value: 'all', label: 'varopt.all' },
        { value: 'bearing', label: 'varopt.bearing' },
        { value: 'distance', label: 'varopt.distance' },
      ],
    },
    generate: generateCoords,
  },
  {
    id: 'spatial-rotation',
    module: 'spatial',
    title: 'ex.spatial-rotation.title',
    description: 'ex.spatial-rotation.desc',
    timePerItemSec: 35,
    itemsPerSession: 8,
    generate: generateRotation,
  },
  {
    id: 'spatial-cube',
    module: 'spatial',
    title: 'ex.spatial-cube.title',
    description: 'ex.spatial-cube.desc',
    timePerItemSec: 45,
    itemsPerSession: 6,
    generate: generateCube,
  },
  {
    id: 'mem-gauges',
    module: 'memory',
    title: 'ex.mem-gauges.title',
    description: 'ex.mem-gauges.desc',
    timePerItemSec: 0,
    itemsPerSession: 5,
    runner: 'memory',
  },
  {
    id: 'mem-nback',
    module: 'memory',
    title: 'ex.mem-nback.title',
    description: 'ex.mem-nback.desc',
    timePerItemSec: 0,
    itemsPerSession: 24,
    runner: 'nback',
  },
  {
    id: 'mem-multipass',
    module: 'memory',
    title: 'ex.mem-multipass.title',
    description: 'ex.mem-multipass.desc',
    timePerItemSec: 0,
    itemsPerSession: 0,
    runner: 'multipass',
  },
  {
    id: 'mem-multipass-full',
    module: 'memory',
    title: 'ex.mem-multipass-full.title',
    description: 'ex.mem-multipass-full.desc',
    timePerItemSec: 0,
    itemsPerSession: 0,
    runner: 'multipass-full',
  },
  {
    id: 'mem-radar',
    module: 'memory',
    title: 'ex.mem-radar.title',
    description: 'ex.mem-radar.desc',
    timePerItemSec: 0,
    itemsPerSession: 0,
    runner: 'radar',
  },
  {
    id: 'radar-rct',
    module: 'memory',
    title: 'ex.radar-rct.title',
    description: 'ex.radar-rct.desc',
    timePerItemSec: 0,
    itemsPerSession: 0,
    runner: 'rct',
  },
  {
    id: 'react-simple',
    module: 'reaction',
    title: 'ex.react-simple.title',
    description: 'ex.react-simple.desc',
    timePerItemSec: 0,
    itemsPerSession: 5,
    runner: 'reaction-simple',
  },
  {
    id: 'react-gonogo',
    module: 'reaction',
    title: 'ex.react-gonogo.title',
    description: 'ex.react-gonogo.desc',
    timePerItemSec: 0,
    itemsPerSession: 14,
    runner: 'reaction-gonogo',
  },
  {
    id: 'series',
    module: 'reaction',
    title: 'ex.series.title',
    description: 'ex.series.desc',
    timePerItemSec: 25,
    itemsPerSession: 8,
    variant: {
      label: 'var.seqType',
      default: 'all',
      options: [
        { value: 'all', label: 'varopt.all' },
        { value: 'arithmetic', label: 'varopt.arithmetic' },
        { value: 'geometric', label: 'varopt.geometric' },
        { value: 'squares', label: 'varopt.squares' },
      ],
    },
    generate: generateSeries,
  },
];

export function getModule(id: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getExercise(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function exercisesForModule(id: string): ExerciseDef[] {
  return EXERCISES.filter((e) => e.module === id);
}
