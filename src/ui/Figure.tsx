import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { FigureSpec } from '@/types';
import { useTheme } from '@/hooks/use-theme';

/** Renders the optional visual that accompanies a generated item. */
export function Figure({ spec, accent, size = 180 }: { spec: FigureSpec; accent?: string; size?: number }) {
  if (spec.type === 'heading') {
    return <HeadingCompass heading={spec.heading} turn={spec.turn} accent={accent} size={size} />;
  }
  return null;
}

function HeadingCompass({
  heading,
  turn,
  accent,
  size,
}: {
  heading: number;
  turn?: number;
  accent?: string;
  size: number;
}) {
  const theme = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const a = accent ?? theme.tint;

  // 0° = up (North), increasing clockwise.
  const polar = (radius: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  const cardinals: Array<[string, number]> = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  const headingPoint = polar(r - 6, heading);
  const target = turn != null && turn !== 0 ? heading + turn : null;
  const targetPoint = target != null ? polar(r - 6, target) : null;

  // Sampled arc showing the turn direction (avoids SVG arc-flag pitfalls).
  let arc = '';
  if (turn != null && turn !== 0) {
    const steps = Math.max(2, Math.round(Math.abs(turn) / 6));
    const rr = r * 0.5;
    for (let i = 0; i <= steps; i++) {
      const p = polar(rr, heading + (turn * i) / steps);
      arc += (i === 0 ? 'M' : ' L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={theme.border} strokeWidth={2} fill={theme.surface} />
        {ticks.map((t) => {
          const outer = polar(r, t);
          const inner = polar(r - (t % 90 === 0 ? 12 : 7), t);
          return (
            <Line
              key={t}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={theme.border}
              strokeWidth={t % 90 === 0 ? 2 : 1}
            />
          );
        })}
        {cardinals.map(([label, deg]) => {
          const p = polar(r - 26, deg);
          return (
            <SvgText
              key={label}
              x={p.x}
              y={p.y + 5}
              fontSize={13}
              fontWeight="700"
              fill={theme.textSecondary}
              textAnchor="middle">
              {label}
            </SvgText>
          );
        })}
        {arc ? <Path d={arc} stroke={a} strokeWidth={2} fill="none" strokeDasharray="4 3" /> : null}
        {targetPoint ? (
          <Line
            x1={cx}
            y1={cy}
            x2={targetPoint.x}
            y2={targetPoint.y}
            stroke={a}
            strokeOpacity={0.4}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}
        <Line
          x1={cx}
          y1={cy}
          x2={headingPoint.x}
          y2={headingPoint.y}
          stroke={a}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={4} fill={a} />
      </Svg>
    </View>
  );
}
