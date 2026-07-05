import { Stack, useLocalSearchParams } from 'expo-router';

import { getExercise } from '@/data/registry';
import { useT } from '@/i18n/useT';
import { ExerciseRunner } from '@/runner/ExerciseRunner';
import { ReactionExercise } from '@/exercises/reaction/ReactionExercise';
import { MemoryExercise } from '@/exercises/memory/MemoryExercise';
import { NBackExercise } from '@/exercises/memory/NBackExercise';
import { MultipassExercise } from '@/exercises/memory/MultipassExercise';
import { MultipassFullExercise } from '@/exercises/multipass/MultipassFullExercise';
import { RadarExercise } from '@/exercises/radar/RadarExercise';
import { RctExercise } from '@/exercises/rct/RctExercise';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = id ?? '';
  const exercise = getExercise(exerciseId);
  const runner = exercise?.runner ?? 'standard';
  const t = useT();

  // key={exerciseId}: a mix playlist replaces this route with a different id;
  // the key forces a fresh mount so the new game doesn't inherit stale state.
  function renderRunner() {
    switch (runner) {
      case 'reaction-simple':
      case 'reaction-gonogo':
        return <ReactionExercise key={exerciseId} exerciseId={exerciseId} kind={runner} />;
      case 'memory':
        return <MemoryExercise key={exerciseId} exerciseId={exerciseId} />;
      case 'nback':
        return <NBackExercise key={exerciseId} exerciseId={exerciseId} />;
      case 'multipass':
        return <MultipassExercise key={exerciseId} exerciseId={exerciseId} />;
      case 'multipass-full':
        return <MultipassFullExercise key={exerciseId} exerciseId={exerciseId} />;
      case 'radar':
        return <RadarExercise key={exerciseId} exerciseId={exerciseId} />;
      case 'rct':
        return <RctExercise key={exerciseId} exerciseId={exerciseId} />;
      default:
        return <ExerciseRunner key={exerciseId} exerciseId={exerciseId} />;
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: exercise ? t(exercise.title) : t('nav.exercise') }} />
      {renderRunner()}
    </>
  );
}
