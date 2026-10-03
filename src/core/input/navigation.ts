import type { InputAction } from './index';
/** Spatial movement stops at edges; never crosses a column boundary. */
export function navigate(index: number, count: number, columns: number, action: InputAction): number {
  if (action === 'UP') return index >= columns ? index - columns : index;
  if (action === 'DOWN') return index + columns < count ? index + columns : index;
  if (action === 'LEFT') return index % columns > 0 ? index - 1 : index;
  if (action === 'RIGHT') return index % columns + 1 < columns && index + 1 < count ? index + 1 : index;
  return index;
}
