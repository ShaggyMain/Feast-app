import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';

import type { FigureSpec, GridPoint } from '@/types';
import { useTheme } from '@/hooks/use-theme';

/** Renders the optional visual that accompanies a generated item. */
export function Figure({ spec, accent, size = 180 }: { spec: FigureSpec; accent?: string; size?: number }) {
  if (spec.type === 'heading') {
    return <HeadingCompass heading={spec.heading} turn={spec.turn} accent={accent} size={size} />;
  }
  if (spec.type === 'grid') {
    return <GridFigure cells={spec.cells} points={spec.points} arrow={spec.arrow} accent={accent} size={size} />;
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

function GridFigure({
  cells,
  points,
  arrow,
  accent,
  size,
}: {
  cells: number;
  points: GridPoint[];
  arrow?: boolean;
  accent?: string;
  size: number;
}) {
  const theme = useTheme();
  const a = accent ?? theme.tint;
  const pad = 18;
  const span = size - pad * 2;
  // x right, y up.
  const sx = (x: number) => pad + (x / cells) * span;
  const sy = (y: number) => pad + (1 - y / cells) * span;

  const lines = Array.from({ length: cells + 1 }, (_, i) => i);
  const colorFor = (p: GridPoint) => (p.role === 'b' ? theme.danger : a);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {lines.map((i) => (
          <Line
            key={`v${i}`}
            x1={sx(i)}
            y1={sy(0)}
            x2={sx(i)}
            y2={sy(cells)}
            stroke={theme.border}
            strokeWidth={1}
          />
        ))}
        {lines.map((i) => (
          <Line
            key={`h${i}`}
            x1={sx(0)}
            y1={sy(i)}
            x2={sx(cells)}
            y2={sy(i)}
            stroke={theme.border}
            strokeWidth={1}
          />
        ))}

        {arrow && points.length >= 2 ? <Arrow x1={sx(points[0].x)} y1={sy(points[0].y)} x2={sx(points[1].x)} y2={sy(points[1].y)} color={theme.textSecondary} /> : null}

        {points.map((p, i) => (
          <Circle key={`p${i}`} cx={sx(p.x)} cy={sy(p.y)} r={7} fill={colorFor(p)} />
        ))}
        {points.map((p, i) =>
          p.label ? (
            <SvgText
              key={`l${i}`}
              x={sx(p.x)}
              y={sy(p.y) - 12}
              fontSize={14}
              fontWeight="700"
              fill={colorFor(p)}
              textAnchor="middle">
              {p.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

function Arrow({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 10;
  const p = (a: number) => [x2 - head * Math.cos(angle - a), y2 - head * Math.sin(angle - a)];
  const [lx, ly] = p(Math.PI / 7);
  const [rx, ry] = p(-Math.PI / 7);
  return (
    <>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Polygon points={`${x2},${y2} ${lx.toFixed(1)},${ly.toFixed(1)} ${rx.toFixed(1)},${ry.toFixed(1)}`} fill={color} />
    </>
  );
}
