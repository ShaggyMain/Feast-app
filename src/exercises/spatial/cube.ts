/**
 * Module 2.1 — Składanie kostki (net → cube).
 * Shows a hexomino net and four isometric cubes; exactly one is the real fold.
 * Correct view (camera at +x+y+z): top = U, left = E, right = N (see core/cube).
 * Distractors each carry exactly one impossibility:
 *   D1 — an opposite pair shown adjacent (top & right are opposite faces),
 *   D2 — mirror image (left/right swapped → wrong chirality),
 *   D3 — a repeated face (a symbol appears twice).
 */
import type { Choice, Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, shuffle, type Rng } from '@/core/rng';
import { CUBE_NETS, OPPOSITE, cubeAdjacency, type Face } from '@/core/cube';

interface CubeView {
  top: number;
  left: number;
  right: number;
}

function symbolPermutation(rng: Rng): number[] {
  return shuffle(rng, [0, 1, 2, 3, 4, 5]);
}

export function generateCube(seed: number, level: Difficulty): GeneratedItem {
  const rng = mulberry32(seed);
  const net = pick(rng, CUBE_NETS);
  const { faces } = cubeAdjacency(net);
  const sym = symbolPermutation(rng); // cell index -> symbol id
  const s = (face: Face) => sym[faces[face]];

  const correct: CubeView = { top: s('U'), left: s('E'), right: s('N') };
  const d1: CubeView = { top: s('U'), left: s('E'), right: s(OPPOSITE.U) }; // U & D adjacent
  const d2: CubeView = { top: s('U'), left: s('N'), right: s('E') }; // mirror
  const d3: CubeView = { top: s('U'), left: s('E'), right: s('U') }; // repeated face

  const views = [correct, d1, d2, d3];
  const order = shuffle(rng, [0, 1, 2, 3]);
  const choices: Choice[] = order.map((vi, i) => ({
    id: `c${i}`,
    label: String(i + 1),
    figure: { type: 'cube', top: views[vi].top, left: views[vi].left, right: views[vi].right },
  }));
  const correctPos = order.indexOf(0);

  const cols = Math.max(...net.map((n) => n.c)) + 1;
  const rows = Math.max(...net.map((n) => n.r)) + 1;

  return {
    prompt: 'Który sześcian powstaje ze złożenia siatki?',
    mode: 'choice',
    choices,
    correctChoiceId: choices[correctPos].id,
    answerLabel: String(correctPos + 1),
    hint: 'Ściany przeciwległe nie mogą sąsiadować na widoku.',
    promptFigure: {
      type: 'net',
      cols,
      rows,
      cells: net.map((n, i) => ({ x: n.c, y: n.r, sym: sym[i] })),
    },
    category: 'cube',
  };
}
