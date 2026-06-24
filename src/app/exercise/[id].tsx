import { Stack, useLocalSearchParams } from 'expo-router';

import { getExercise } from '@/data/registry';
import { ExerciseRunner } from '@/runner/ExerciseRunner';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = id ?? '';
  const exercise = getExercise(exerciseId);

  return (
    <>
      <Stack.Screen options={{ title: exercise?.title ?? 'Ćwiczenie' }} />
      <ExerciseRunner exerciseId={exerciseId} />
    </>
  );
}
