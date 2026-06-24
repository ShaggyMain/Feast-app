/**
 * Static registry of training modules and runnable exercises.
 *
 * Each exercise pairs plain metadata with a pure generator. Screens read from
 * here to render module lists and to drive the ExerciseRunner. New exercises
 * are added here as later milestones land.
 */
import type { ExerciseDef, ModuleId } from '@/types';
import { ModuleColors } from '@/constants/theme';
import { generateDummy } from '@/exercises/dummy/generate';

export interface ModuleMeta {
  id: ModuleId;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
}

export const MODULES: ModuleMeta[] = [
  {
    id: 'math',
    title: 'Matematyka pod czas',
    subtitle: 'Prędkość–dystans–czas, działania, procenty, kursy',
    emoji: '🧮',
    color: ModuleColors.math,
  },
  {
    id: 'spatial',
    title: 'Wyobraźnia przestrzenna / 3D',
    subtitle: 'Składanie kostki, rotacje, orientacja, współrzędne',
    emoji: '🧊',
    color: ModuleColors.spatial,
  },
  {
    id: 'memory',
    title: 'Pamięć i multitasking',
    subtitle: 'Zapamiętywanie, n-back, Multipass, radar/DART',
    emoji: '🧠',
    color: ModuleColors.memory,
  },
  {
    id: 'reaction',
    title: 'Reakcja i serie liczbowe',
    subtitle: 'Czas reakcji, go/no-go, ciągi liczbowe',
    emoji: '⚡',
    color: ModuleColors.reaction,
  },
];

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'demo-arith',
    module: 'math',
    title: 'Demo: liczenie w pamięci',
    description: 'Ćwiczenie demonstracyjne (M0) — szybkie działania, 4 opcje, na czas.',
    timePerItemSec: 12,
    itemsPerSession: 8,
    generate: generateDummy,
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
