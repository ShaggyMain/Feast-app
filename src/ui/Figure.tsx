import { Fragment } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { FigureSpec, GridPoint, NetCellSpec } from '@/types';
import { useTheme } from '@/hooks/use-theme';

/** Distinct color + letter per cube face symbol (0..5). */
const SYMBOLS: { color: string; letter: string }[] = [
  { color: '#3C82F6', letter: 'A' },
  { color: '#F59E0B', letter: 'B' },
  { color: '#22C55E', letter: 'C' },
  { color: '#A855F7', letter: 'D' },
  { color: '#EF4444', letter: 'E' },
  { color: '#14B8A6', letter: 'F' },
];

/** Renders the optional visual that accompanies a generated item. */
export function Figure({ spec, accent, size = 180 }: { spec: FigureSpec; accent?: string; size?: number }) {
  if (spec.type === 'heading') {
    return <HeadingCompass heading={spec.heading} turn={spec.turn} accent={accent} size={size} />;
  }
  if (spec.type === 'grid') {
    return <GridFigure cells={spec.cells} points={spec.points} arrow={spec.arrow} accent={accent} size={size} />;
  }
  if (spec.type === 'net') {
    return <NetFigure cols={spec.cols} rows={spec.rows} cells={spec.cells} size={size} />;
  }
  if (spec.type === 'cube') {
    return <CubeFigure top={spec.top} left={spec.left} right={spec.right} size={size} />;
  }
  if (spec.type === 'shape2d') {
    return <Shape2dFigure cols={spec.cols} rows={spec.rows} cells={spec.cells} accent={accent} size={size} />;
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
  type P = { x: number; y: number };
  const polar = (radius: number, deg: number): P => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  const cardinals: Array<[string, number]> = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  const headingPoint = polar(r - 6, heading);

  // Rotation-direction cue: a FIXED-size curved arrow near the centre showing
  // only which way you turn (clockwise = right, anticlockwise = left). It does
  // NOT depend on the heading or the turn magnitude — drawing the resulting
  // direction would give the answer away (the player must compute it).
  const turning = turn != null && turn !== 0;
  const dirSign = turning && (turn as number) < 0 ? -1 : 1;
  let arc = '';
  let arrow: { tip: P; a: P; b: P } | null = null;
  if (turning) {
    const rr = r * 0.34;
    const startAng = -120 * dirSign;
    const sweep = 230;
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const p = polar(rr, startAng + dirSign * sweep * (i / steps));
      arc += (i === 0 ? 'M' : ' L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    const endAng = startAng + dirSign * sweep;
    const tip = polar(rr, endAng);
    const prev = polar(rr, endAng - dirSign * 12);
    const ux = tip.x - prev.x;
    const uy = tip.y - prev.y;
    const len = Math.hypot(ux, uy) || 1;
    const h = 9;
    const rot = (ang: number): P => ({
      x: tip.x + (h * ((ux / len) * Math.cos(ang) - (uy / len) * Math.sin(ang))),
      y: tip.y + (h * ((ux / len) * Math.sin(ang) + (uy / len) * Math.cos(ang))),
    });
    arrow = { tip, a: rot((150 * Math.PI) / 180), b: rot((-150 * Math.PI) / 180) };
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
        {arc ? <Path d={arc} stroke={a} strokeWidth={2.5} fill="none" strokeLinecap="round" /> : null}
        {arrow ? (
          <Polygon
            points={`${arrow.tip.x.toFixed(1)},${arrow.tip.y.toFixed(1)} ${arrow.a.x.toFixed(1)},${arrow.a.y.toFixed(1)} ${arrow.b.x.toFixed(1)},${arrow.b.y.toFixed(1)}`}
            fill={a}
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

function NetFigure({ cols, rows, cells, size }: { cols: number; rows: number; cells: NetCellSpec[]; size: number }) {
  const theme = useTheme();
  const pad = 6;
  const cell = (size - pad * 2) / Math.max(cols, rows);
  const ox = pad + (size - pad * 2 - cell * cols) / 2;
  const oy = pad + (size - pad * 2 - cell * rows) / 2;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {cells.map((c, i) => {
          const sym = SYMBOLS[c.sym % SYMBOLS.length];
          const x = ox + c.x * cell;
          const y = oy + c.y * cell;
          return (
            <Fragment key={i}>
              <Rect x={x} y={y} width={cell} height={cell} fill={sym.color} stroke={theme.background} strokeWidth={2} rx={4} />
              <SvgText x={x + cell / 2} y={y + cell / 2 + cell * 0.16} fontSize={cell * 0.42} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
                {sym.letter}
              </SvgText>
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function CubeFigure({ top, left, right, size }: { top: number; left: number; right: number; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const a = size * 0.33;
  const topPts = `${cx},${cy - a} ${cx + a},${cy - a / 2} ${cx},${cy} ${cx - a},${cy - a / 2}`;
  const leftPts = `${cx - a},${cy - a / 2} ${cx},${cy} ${cx},${cy + a} ${cx - a},${cy + a / 2}`;
  const rightPts = `${cx},${cy} ${cx + a},${cy - a / 2} ${cx + a},${cy + a / 2} ${cx},${cy + a}`;
  const face = (sym: number) => SYMBOLS[sym % SYMBOLS.length];
  const fs = size * 0.16;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Polygon points={topPts} fill={face(top).color} stroke="#0B1220" strokeWidth={2} />
        <Polygon points={leftPts} fill={face(left).color} stroke="#0B1220" strokeWidth={2} />
        <Polygon points={rightPts} fill={face(right).color} stroke="#0B1220" strokeWidth={2} />
        {/* shading for depth */}
        <Polygon points={leftPts} fill="#000000" opacity={0.12} />
        <Polygon points={rightPts} fill="#000000" opacity={0.22} />
        <SvgText x={cx} y={cy - a / 2 + fs / 2} fontSize={fs} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
          {face(top).letter}
        </SvgText>
        <SvgText x={cx - a / 2} y={cy + a / 4 + fs / 2} fontSize={fs} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
          {face(left).letter}
        </SvgText>
        <SvgText x={cx + a / 2} y={cy + a / 4 + fs / 2} fontSize={fs} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
          {face(right).letter}
        </SvgText>
      </Svg>
    </View>
  );
}

function Shape2dFigure({ cols, rows, cells, accent, size }: { cols: number; rows: number; cells: { x: number; y: number }[]; accent?: string; size: number }) {
  const theme = useTheme();
  const fill = accent ?? theme.tint;
  const pad = 8;
  const cell = (size - pad * 2) / Math.max(cols, rows);
  const ox = pad + (size - pad * 2 - cell * cols) / 2;
  const oy = pad + (size - pad * 2 - cell * rows) / 2;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {cells.map((c, i) => (
          <Rect
            key={i}
            x={ox + c.x * cell}
            y={oy + c.y * cell}
            width={cell}
            height={cell}
            fill={fill}
            stroke={theme.background}
            strokeWidth={2}
            rx={3}
          />
        ))}
      </Svg>
    </View>
  );
}
