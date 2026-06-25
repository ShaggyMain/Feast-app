import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';

interface LineChartProps {
  data: number[];
  width: number;
  height?: number;
  color: string;
  /** Format a value for the min/max/last labels. */
  format?: (v: number) => string;
  /** Caption shown above the chart. */
  label?: string;
}

export function LineChart({ data, width, height = 120, color, format = (v) => String(Math.round(v)), label }: LineChartProps) {
  const theme = useTheme();
  const pad = 10;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = height - pad * 2;

  let body;
  if (data.length === 0) {
    body = (
      <View style={[styles.empty, { height }]}>
        <AppText variant="caption">Brak danych — ukończ sesję.</AppText>
      </View>
    );
  } else {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const x = (i: number) => pad + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => pad + innerH - ((v - min) / span) * innerH;
    const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const last = data.length - 1;

    body = (
      <Svg width={width} height={height}>
        <Line x1={pad} y1={pad + innerH} x2={pad + innerW} y2={pad + innerH} stroke={theme.border} strokeWidth={1} />
        {data.length > 1 ? (
          <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        ) : null}
        {data.map((v, i) => (
          <Circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 4 : 2.5} fill={color} />
        ))}
        <SvgText x={pad} y={pad + 4} fontSize={11} fill={theme.textSecondary}>
          {format(max)}
        </SvgText>
        <SvgText x={pad} y={pad + innerH} fontSize={11} fill={theme.textSecondary}>
          {format(min)}
        </SvgText>
      </Svg>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {label ? (
        <View style={styles.head}>
          <AppText variant="label">{label}</AppText>
          {data.length > 0 ? (
            <AppText variant="caption" color={color}>
              {format(data[data.length - 1])}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center' },
});
