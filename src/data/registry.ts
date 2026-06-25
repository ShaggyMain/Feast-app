/**
 * Static registry of training modules and runnable exercises.
 *
 * Each exercise pairs plain metadata with a pure generator. Screens read from
 * here to render module lists and to drive the ExerciseRunner. New exercises
 * are added here as later milestones land.
 */
import type { ExerciseDef, ModuleId } from '@/types';
import { ModuleColors } from '@/constants/theme';
import { generateArith } from '@/exercises/math/arith';
import { generateVst } from '@/exercises/math/vst';
import { generatePercent } from '@/exercises/math/percent';
import { generateHeading } from '@/exercises/math/heading';
import { generateOrientation } from '@/exercises/spatial/orientation';
import { generateCoords } from '@/exercises/spatial/coords';
import { generateSeries } from '@/exercises/reaction/series';

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
    id: 'math-arith',
    module: 'math',
    title: 'Działania w pamięci',
    description: 'Dodawanie, odejmowanie, mnożenie i dzielenie bez kalkulatora — 4 opcje.',
    timePerItemSec: 12,
    itemsPerSession: 10,
    variant: {
      label: 'DZIAŁANIE',
      default: 'all',
      options: [
        { value: 'all', label: 'Wszystkie' },
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
    title: 'Prędkość · dystans · czas',
    description: 'Przeliczenia v–s–t pod presją. Wpisz wynik liczbowo.',
    timePerItemSec: 15,
    itemsPerSession: 8,
    generate: generateVst,
  },
  {
    id: 'math-percent',
    module: 'math',
    title: 'Procenty i proporcje',
    description: 'Ile to X% z N oraz ułamki — 4 opcje.',
    timePerItemSec: 15,
    itemsPerSession: 8,
    generate: generatePercent,
  },
  {
    id: 'math-heading',
    module: 'math',
    title: 'Kursy i kąty',
    description: 'Skręty w lewo/prawo i kursy przeciwne na róży 0–360° z kompasem.',
    timePerItemSec: 12,
    itemsPerSession: 8,
    generate: generateHeading,
  },
  {
    id: 'spatial-orient',
    module: 'spatial',
    title: 'Orientacja i kompas',
    description: 'Kierunek z punktu A do B oraz obroty kierunku patrzenia (8 kierunków).',
    timePerItemSec: 18,
    itemsPerSession: 8,
    variant: {
      label: 'TYP',
      default: 'all',
      options: [
        { value: 'all', label: 'Wszystkie' },
        { value: 'bearing8', label: 'Kierunek' },
        { value: 'relative', label: 'Obrót' },
      ],
    },
    generate: generateOrientation,
  },
  {
    id: 'spatial-coords',
    module: 'spatial',
    title: 'Współrzędne (radar)',
    description: 'Oszacuj kurs i odległość między samolotem a celem na siatce.',
    timePerItemSec: 20,
    itemsPerSession: 8,
    variant: {
      label: 'TYP',
      default: 'all',
      options: [
        { value: 'all', label: 'Wszystkie' },
        { value: 'bearing', label: 'Kurs' },
        { value: 'distance', label: 'Dystans' },
      ],
    },
    generate: generateCoords,
  },
  {
    id: 'react-simple',
    module: 'reaction',
    title: 'Czas reakcji',
    description: 'Dotknij, gdy ekran zmieni się na zielony. Mierzymy milisekundy.',
    timePerItemSec: 0,
    itemsPerSession: 5,
    runner: 'reaction-simple',
  },
  {
    id: 'react-gonogo',
    module: 'reaction',
    title: 'Reakcja z wyborem (go/no-go)',
    description: 'Dotknij na GO (zielony), wstrzymaj się na STOP (czerwony).',
    timePerItemSec: 0,
    itemsPerSession: 14,
    runner: 'reaction-gonogo',
  },
  {
    id: 'series',
    module: 'reaction',
    title: 'Serie liczbowe',
    description: 'Rozpoznaj regułę i podaj kolejny element ciągu — 4 opcje.',
    timePerItemSec: 25,
    itemsPerSession: 8,
    variant: {
      label: 'TYP CIĄGU',
      default: 'all',
      options: [
        { value: 'all', label: 'Wszystkie' },
        { value: 'arithmetic', label: 'Arytm.' },
        { value: 'geometric', label: 'Geom.' },
        { value: 'squares', label: 'Kwadraty' },
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
