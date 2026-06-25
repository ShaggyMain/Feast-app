import { Stack, useLocalSearchParams } from 'expo-router';

import { getExercise } from '@/data/registry';
import { ExerciseRunner } from '@/runner/ExerciseRunner';
import { ReactionExercise } from '@/exercises/reaction/ReactionExercise';
import { MemoryExercise } from '@/exercises/memory/MemoryExercise';
import { NBackExercise } from '@/exercises/memory/NBackExercise';
import { RadarExercise } from '@/exercises/memory/radar/RadarExercise';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = id ?? '';
  const exercise = getExercise(exerciseId);
  const runner = exercise?.runner ?? 'standard';

  function renderRunner() {
    switch (runner) {
      case 'reaction-simple':
      case 'reaction-gonogo':
        return <ReactionExercise exerciseId={exerciseId} kind={runner} />;
      case 'memory':
        return <MemoryExercise exerciseId={exerciseId} />;
      case 'nback':
        return <NBackExercise exerciseId={exerciseId} />;
      case 'radar':
        return <RadarExercise exerciseId={exerciseId} />;
      default:
        return <ExerciseRunner exerciseId={exerciseId} />;
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: exercise?.title ?? 'Ćwiczenie' }} />
      {renderRunner()}
    </>
  );
}
