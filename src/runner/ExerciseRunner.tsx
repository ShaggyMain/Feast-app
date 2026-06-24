/**
 * ExerciseRunner — the shared shell every exercise runs inside.
 *
 *  intro  → choose difficulty, see best score, read the method hint
 *  playing→ per-item countdown, multiple-choice or numeric input, optional
 *           figure, instant feedback (color + haptics), no penalty for wrong/blank
 *  done   → accuracy + speed score, compared to the previous best for that level
 *
 * Per-item state lives in <PlayItem>, remounted via `key` for each question so
 * timers and inputs reset cleanly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import type { Difficulty, ExerciseDef, ExerciseResult, GeneratedItem, ItemOutcome } from '@/types';
import { getExercise, getModule } from '@/data/registry';
import { gradeItem, summarize } from '@/runner/scoring';
import { buildSession } from '@/runner/session';
import { useResultsStore } from '@/store/results';
import { useSettingsStore } from '@/store/settings';
import { bestScore } from '@/store/selectors';
import { makeId } from '@/core/id';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TimerBar } from '@/ui/TimerBar';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Figure } from '@/ui/Figure';

const FEEDBACK_MS = 650;

const LEVEL_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Łatwy' },
  { value: 'medium', label: 'Średni' },
  { value: 'hard', label: 'Trudny' },
];

function makeSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

type Phase = 'intro' | 'playing' | 'done';

export function ExerciseRunner({ exerciseId }: { exerciseId: string }) {
  const theme = useTheme();
  const router = useRouter();
  useKeepAwake();

  const def = useMemo(() => getExercise(exerciseId), [exerciseId]);
  const accent = useMemo(
    () => (def ? getModule(def.module)?.color : undefined) ?? theme.tint,
    [def, theme.tint],
  );
  const addResult = useResultsStore((s) => s.addResult);
  const results = useResultsStore((s) => s.results);

  const [level, setLevel] = useState<Difficulty>(() => useSettingsStore.getState().defaultLevel);
  const [phase, setPhase] = useState<Phase>('intro');
  const [baseSeed, setBaseSeed] = useState(makeSeed);
  const [outcomes, setOutcomes] = useState<ItemOutcome[]>([]);
  const [savedResult, setSavedResult] = useState<ExerciseResult | null>(null);
  const prevBestRef = useRef(0);

  const total = def ? def.itemsPerSession : 0;
  const timeLimitMs = def ? def.timePerItemSec * 1000 : 0;
  const index = outcomes.length;

  // Pre-build the whole session so prompts are de-duplicated and item types are
  // balanced (variety within a session); regenerated each run via baseSeed.
  const sessionItems = useMemo(
    () => (def && phase === 'playing' ? buildSession(def, baseSeed, level) : []),
    [def, phase, baseSeed, level],
  );
  const currentItem = phase === 'playing' && index < sessionItems.length ? sessionItems[index] : null;

  useEffect(() => {
    if (!def || phase !== 'playing' || savedResult || total === 0 || outcomes.length < total) return;
    const summary = summarize(outcomes, timeLimitMs);
    const result: ExerciseResult = {
      id: makeId(),
      module: def.module,
      exercise: def.id,
      level,
      date: new Date().toISOString(),
      totalItems: summary.totalItems,
      correct: summary.correct,
      accuracy: summary.accuracy,
      avgResponseMs: summary.avgResponseMs,
      score: summary.score,
    };
    addResult(result);
    setSavedResult(result);
    setPhase('done');
  }, [outcomes, phase, total, def, savedResult, timeLimitMs, addResult, level]);

  const handleItemComplete = useCallback((outcome: ItemOutcome) => {
    setOutcomes((prev) => [...prev, outcome]);
  }, []);

  const start = useCallback(() => {
    prevBestRef.current = def ? bestScore(useResultsStore.getState().results, def.id, level) : 0;
    setOutcomes([]);
    setSavedResult(null);
    setBaseSeed(makeSeed());
    setPhase('playing');
  }, [def, level]);

  if (!def) {
    return (
      <Screen>
        <AppText variant="title">Nie znaleziono ćwiczenia</AppText>
        <PrimaryButton label="Wróć" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <IntroView
        def={def}
        accent={accent}
        level={level}
        onLevel={setLevel}
        bestForLevel={bestScore(results, def.id, level)}
        onStart={start}
        onBack={() => router.back()}
      />
    );
  }

  if (phase === 'done' && savedResult) {
    return (
      <ResultsView
        result={savedResult}
        prevBest={prevBestRef.current}
        accent={accent}
        onRetry={start}
        onChangeLevel={() => setPhase('intro')}
        onBack={() => router.back()}
      />
    );
  }

  const correctSoFar = outcomes.filter((o) => o.correct).length;
  const sessionProgress = total ? index / total : 0;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <AppText variant="caption">
          Pytanie {Math.min(index + 1, total)} / {total}
        </AppText>
        <AppText variant="caption" color={theme.success}>
          ✓ {correctSoFar}
        </AppText>
      </View>
      <View style={[styles.sessionTrack, { backgroundColor: theme.surfaceAlt }]}>
        <View style={{ flex: sessionProgress, backgroundColor: accent }} />
        <View style={{ flex: 1 - sessionProgress }} />
      </View>

      {currentItem ? (
        <PlayItem
          key={`${baseSeed}-${index}`}
          item={currentItem}
          timeLimitMs={timeLimitMs}
          accent={accent}
          onComplete={handleItemComplete}
        />
      ) : (
        <View style={styles.flexCenter} />
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------

function IntroView({
  def,
  accent,
  level,
  onLevel,
  bestForLevel,
  onStart,
  onBack,
}: {
  def: ExerciseDef;
  accent: string;
  level: Difficulty;
  onLevel: (l: Difficulty) => void;
  bestForLevel: number;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <Screen>
      <AppText variant="title">{def.title}</AppText>
      <AppText variant="bodyMuted">{def.description}</AppText>

      <AppText variant="label" style={styles.introLabel}>
        POZIOM TRUDNOŚCI
      </AppText>
      <SegmentedControl value={level} options={LEVEL_OPTIONS} onChange={onLevel} accent={accent} />

      <View style={styles.statRow}>
        <Stat label="Rekord (poziom)" value={String(bestForLevel)} accent={accent} />
        <Stat label="Czas / pyt." value={`${def.timePerItemSec}s`} />
        <Stat label="Pytania" value={String(def.itemsPerSession)} />
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Start" onPress={onStart} />
        <PrimaryButton label="Wróć" variant="ghost" onPress={onBack} />
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------

interface PlayItemProps {
  item: GeneratedItem;
  timeLimitMs: number;
  accent: string;
  onComplete: (outcome: ItemOutcome) => void;
}

function PlayItem({ item, timeLimitMs, accent, onComplete }: PlayItemProps) {
  const theme = useTheme();
  const hapticsOn = useSettingsStore((s) => s.haptics);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [remainingMs, setRemainingMs] = useState(timeLimitMs);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [numericText, setNumericText] = useState('');
  const [outcome, setOutcome] = useState<ItemOutcome | null>(null);

  const finish = useCallback(
    (payload: { answered: boolean; choiceId?: string; numericValue?: number }) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const responseMs = payload.answered ? Date.now() - startRef.current : timeLimitMs;
      const graded = gradeItem(item, { ...payload, responseMs });

      if (hapticsOn && Platform.OS !== 'web') {
        Haptics.notificationAsync(
          graded.correct
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }

      setOutcome(graded);
      setPhase('feedback');
      feedbackTimer.current = setTimeout(() => onComplete(graded), FEEDBACK_MS);
    },
    [item, timeLimitMs, onComplete, hapticsOn],
  );

  useEffect(() => {
    if (phase !== 'answering') return;
    const id = setInterval(() => {
      const remaining = timeLimitMs - (Date.now() - startRef.current);
      if (remaining <= 0) {
        clearInterval(id);
        finish({ answered: false });
      } else {
        setRemainingMs(remaining);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, timeLimitMs, finish]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const onChoose = (id: string) => {
    if (phase !== 'answering') return;
    setChosenId(id);
    finish({ answered: true, choiceId: id });
  };

  const onSubmitNumeric = () => {
    if (phase !== 'answering') return;
    const value = Number(numericText.replace(',', '.'));
    if (!Number.isFinite(value) || numericText.trim() === '') return;
    finish({ answered: true, numericValue: value });
  };

  const showFeedback = phase === 'feedback';

  return (
    <View style={styles.flexCenter}>
      <TimerBar progress={remainingMs / timeLimitMs} />

      <View style={styles.promptBlock}>
        {item.figure ? <Figure spec={item.figure} accent={accent} /> : null}
        <Text style={[styles.prompt, { color: theme.text }]}>{item.prompt}</Text>
        {item.hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{item.hint}</Text> : null}
      </View>

      {showFeedback ? (
        <Text style={[styles.feedback, { color: outcome?.correct ? theme.success : theme.danger }]}>
          {outcome?.correct
            ? 'Dobrze!'
            : outcome?.answered
              ? `Błąd — poprawnie: ${item.answerLabel}`
              : `Czas minął — poprawnie: ${item.answerLabel}`}
        </Text>
      ) : (
        <View style={styles.feedbackSpacer} />
      )}

      {item.mode === 'choice' && item.choices ? (
        <View style={styles.choiceGrid}>
          {item.choices.map((choice) => {
            const isCorrect = choice.id === item.correctChoiceId;
            const isChosen = choice.id === chosenId;
            let bg = theme.surface;
            let borderColor = theme.border;
            let labelColor = theme.text;
            if (showFeedback && isCorrect) {
              bg = theme.success;
              borderColor = theme.success;
              labelColor = theme.successText;
            } else if (showFeedback && isChosen) {
              bg = theme.danger;
              borderColor = theme.danger;
              labelColor = theme.dangerText;
            } else if (isChosen) {
              borderColor = accent;
            }
            return (
              <Text
                key={choice.id}
                onPress={() => onChoose(choice.id)}
                style={[styles.choice, { backgroundColor: bg, borderColor, color: labelColor }]}>
                {choice.label}
              </Text>
            );
          })}
        </View>
      ) : (
        <View style={styles.numericBlock}>
          <TextInput
            value={numericText}
            onChangeText={setNumericText}
            editable={!showFeedback}
            keyboardType="numbers-and-punctuation"
            inputMode="numeric"
            placeholder="Wpisz odpowiedź"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={onSubmitNumeric}
            returnKeyType="done"
            style={[
              styles.numericInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          />
          <PrimaryButton
            label="Zatwierdź"
            onPress={onSubmitNumeric}
            disabled={showFeedback || numericText.trim() === ''}
          />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

function ResultsView({
  result,
  prevBest,
  accent,
  onRetry,
  onChangeLevel,
  onBack,
}: {
  result: ExerciseResult;
  prevBest: number;
  accent: string;
  onRetry: () => void;
  onChangeLevel: () => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const accuracyPct = Math.round(result.accuracy * 100);
  const avgSec = (result.avgResponseMs / 1000).toFixed(1);
  const isRecord = result.score > prevBest;
  const levelLabel = LEVEL_OPTIONS.find((l) => l.value === result.level)?.label ?? result.level;

  return (
    <Screen>
      <AppText variant="title">Koniec sesji</AppText>
      <AppText variant="caption">Poziom: {levelLabel}</AppText>

      <View style={styles.statRow}>
        <Stat label="Wynik" value={String(result.score)} accent={accent} />
        <Stat label="Trafność" value={`${accuracyPct}%`} />
        <Stat label="Śr. czas" value={`${avgSec}s`} />
      </View>

      <AppText variant="bodyMuted">
        Poprawne odpowiedzi: {result.correct} / {result.totalItems}
      </AppText>

      <View
        style={[styles.recordBanner, { backgroundColor: isRecord ? theme.success : theme.surfaceAlt }]}>
        <Text
          style={[styles.recordText, { color: isRecord ? theme.successText : theme.textSecondary }]}>
          {isRecord
            ? `Nowy rekord (${levelLabel})! Poprzedni: ${prevBest}`
            : `Najlepszy wynik (${levelLabel}): ${Math.max(prevBest, result.score)}`}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Jeszcze raz" onPress={onRetry} />
        <PrimaryButton label="Zmień poziom" variant="secondary" onPress={onChangeLevel} />
        <PrimaryButton label="Statystyki" variant="ghost" onPress={() => router.push('/stats')} />
        <PrimaryButton label="Wróć" variant="ghost" onPress={onBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flexCenter: { flex: 1, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden', flexDirection: 'row' },
  introLabel: { marginTop: Spacing.sm },
  promptBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  prompt: { fontSize: 38, fontWeight: '800', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center' },
  feedback: { fontSize: 16, fontWeight: '700', textAlign: 'center', minHeight: 22 },
  feedbackSpacer: { minHeight: 22 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md },
  choice: {
    width: '47%',
    flexGrow: 1,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    fontSize: 24,
    fontWeight: '800',
    overflow: 'hidden',
  },
  numericBlock: { gap: Spacing.md },
  numericInput: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  recordBanner: { borderRadius: Radius.md, padding: Spacing.md },
  recordText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
});
