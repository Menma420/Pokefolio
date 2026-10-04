/** Transient game-menu navigation contracts; no rendering or browser dependencies. */
export type PortfolioScreen = 'closed' | 'menu' | 'exit' | 'dex' | 'dex-detail' | 'projects' | 'project-detail' | 'experience' | 'experience-detail' | 'bag' | 'bag-reading' | 'card' | 'options' | 'controls';
export interface PortfolioView {
 screen: PortfolioScreen;
 cursor: number;
 category: number;
 page: number;
 section: number;
 project: number;
 related: number;
 relatedFocus?: boolean;
 pressed?: number | null;
 notice: string | null;
 reading?: string;
}
export interface MenuDef { id: string; label: string; screen: PortfolioScreen }
