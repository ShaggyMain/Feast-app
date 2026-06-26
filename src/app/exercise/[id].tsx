import { Stack, useLocalSearchParams } from 'expo-router';

import { getExercise } from '@/data/registry';
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

  function renderRunner() {
    switch (runner) {
      case 'reaction-simple':
      case 'reaction-gonogo':
        return <ReactionExercise exerciseId={exerciseId} kind={runner} />;
      case 'memory':
        return <MemoryExercise exerciseId={exerciseId} />;
      case 'nback':
        return <NBackExercise exerciseId={exerciseId} />;
      case 'multipass':
        return <MultipassExercise exerciseId={exerciseId} />;
      case 'multipass-full':
        return <MultipassFullExercise exerciseId={exerciseId} />;
      case 'radar':
        return <RadarExercise exerciseId={exerciseId} />;
      case 'rct':
        return <RctExercise exerciseId={exerciseId} />;
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
