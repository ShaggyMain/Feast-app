import { Stack, useLocalSearchParams } from 'expo-router';

import { getExercise } from '@/data/registry';
import { ExerciseRunner } from '@/runner/ExerciseRunner';
import { ReactionExercise } from '@/exercises/reaction/ReactionExercise';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = id ?? '';
  const exercise = getExercise(exerciseId);
  const runner = exercise?.runner ?? 'standard';

  return (
    <>
      <Stack.Screen options={{ title: exercise?.title ?? 'Ćwiczenie' }} />
      {runner === 'reaction-simple' || runner === 'reaction-gonogo' ? (
        <ReactionExercise exerciseId={exerciseId} kind={runner} />
      ) : (
        <ExerciseRunner exerciseId={exerciseId} />
      )}
    </>
  );
}
