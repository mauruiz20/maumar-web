/**
 * How the object menu shows: as the full list, or collapsed to a small "Objects" button that
 * opens it. Touch and narrow screens always collapse it (markers are the main way in); on
 * desktop it is a list in the overview and collapses inside a view, so it never covers the
 * framed object.
 */
export type MenuLayout = 'list' | 'button';

/** Below this width the menu always collapses (CSS px). */
export const MENU_COMPACT_WIDTH = 768;

export function menuLayout({ compact, inView }: { compact: boolean; inView: boolean }): MenuLayout {
  return compact || inView ? 'button' : 'list';
}
