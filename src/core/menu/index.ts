import type { PortfolioScreen, PortfolioView } from '../../domain/menu';

/** A child owns its view state. Popping exposes the unmodified parent frame. */
export type ScreenStack<T> = readonly T[];
export const pushScreen = <T>(stack: ScreenStack<T>, frame: T): ScreenStack<T> => [...stack, frame];
export const popScreen = <T>(stack: ScreenStack<T>): ScreenStack<T> => stack.slice(0, -1);
export function updateScreen<T>(stack: ScreenStack<T>, patch: Partial<T>): ScreenStack<T> {
 return stack.length ? [...stack.slice(0, -1), { ...stack.at(-1)!, ...patch }] : stack;
}
export function createPortfolioView(screen: PortfolioScreen, values: Partial<PortfolioView> = {}): PortfolioView {
 return { screen, cursor: 0, category: 0, page: 0, section: 0, project: 0, related: 0, notice: null, ...values };
}
