/** Short, collision-resistant-enough id for local-only records. */
export function makeId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
