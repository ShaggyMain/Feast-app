/**
 * Module 2.1 — Składanie kostki (net → cube).
 * Shows a hexomino net and four isometric cubes; exactly one is the real fold.
 * `cubeAdjacency` rolls a die and paints the *contact* face, which produces the
 * mirror-image (printed-side-IN) chirality; the puzzle shows real, printed-side-
 * OUT cubes, so the genuine view (camera at +x+y+z) is top = U, left = N,
 * right = E (left/right swapped vs the raw slots — verified by an independent
 * 3D fold for every net in the test).
 * Distractors each carry exactly one impossibility, and every cube shows three
 * DISTINCT faces (no repeated symbol — a duplicate face would give the answer
 * away instantly, since the net has each symbol once):
 *   D1 — top & right are an opposite pair (U & D) shown adjacent,
 *   D2 — mirror image (left/right swapped → wrong chirality),
 *   D3 — left & right are an opposite pair (E & W) shown adjacent.
 */
import type { Choice, Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, shuffle, type Rng } from '@/core/rng';
import { CUBE_NETS, OPPOSITE, cubeAdjacency, type Face } from '@/core/cube';
import { t } from '@/i18n';

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

  // left = N, right = E: corrects the printed-side-IN chirality of cubeAdjacency
  // so the rendered cube is the real (printed-side-OUT) fold of the net.
  const correct: CubeView = { top: s('U'), left: s('N'), right: s('E') };
  const d1: CubeView = { top: s('U'), left: s('E'), right: s(OPPOSITE.U) }; // U & D adjacent
  const d2: CubeView = { top: s('U'), left: s('E'), right: s('N') }; // mirror image (wrong chirality)
  const d3: CubeView = { top: s('U'), left: s('E'), right: s(OPPOSITE.E) }; // E & W adjacent (distinct faces)

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
    prompt: t('cube.prompt'),
    mode: 'choice',
    choices,
    correctChoiceId: choices[correctPos].id,
    answerLabel: String(correctPos + 1),
    hint: t('hint.cube'),
    promptFigure: {
      type: 'net',
      cols,
      rows,
      cells: net.map((n, i) => ({ x: n.c, y: n.r, sym: sym[i] })),
    },
    category: 'cube',
  };
}
