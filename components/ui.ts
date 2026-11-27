// Shared class tokens: one look per control role. Colours come from app/globals.css.

/** Solid ink button: the one primary action in its region */
export const BUTTON_PRIMARY =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground transition-[opacity,transform] hover:opacity-85 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35 disabled:active:translate-y-0';

/** Outlined button: secondary actions */
export const BUTTON_SECONDARY =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-input hover:bg-muted active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40';

/** Compact outlined button, for tool rows */
export const BUTTON_SMALL =
  'inline-flex h-7 items-center justify-center gap-1.5 rounded-sm border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:border-input hover:bg-muted active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40';

/** Square icon-only button */
export const BUTTON_ICON =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

/** Track of a segmented control */
export const SEGMENT_GROUP = 'inline-flex rounded-sm border border-border bg-well p-0.5';

/** Item inside a segmented control, or a stand-alone toggle (add `border border-border` for that) */
export const segmentClass = (active: boolean) =>
  `inline-flex h-7 items-center gap-1 rounded-[3px] px-2.5 text-xs transition-colors ${
    active
      ? 'bg-card font-semibold text-foreground shadow-[0_0_0_1px_var(--border)]'
      : 'text-muted-foreground hover:text-foreground'
  }`;

/** Stand-alone on/off toggle (Grid, Guides, Normalize) */
export const toggleButtonClass = (active: boolean) =>
  `inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs transition-colors ${
    active
      ? 'border-input bg-card font-semibold text-foreground'
      : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
  }`;

export const SELECT_CLASS =
  'h-8 rounded-sm border border-input bg-card px-2 text-xs text-foreground hover:border-muted-foreground';

export const INPUT_CLASS =
  'h-9 rounded-sm border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground';

/** Underlined tab: the mark sits under the current one */
export const tabClass = (active: boolean) =>
  `relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap px-3 text-sm transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full ${
    active
      ? 'font-semibold text-foreground after:bg-mark'
      : 'text-muted-foreground hover:text-foreground after:bg-transparent hover:after:bg-border'
  }`;

/** Section heading inside a page: sentence case, carried by weight, not by caps */
export const SECTION_TITLE = 'text-sm font-semibold text-foreground';
export const SECTION_COUNT = 'ml-1.5 font-mono text-xs font-normal tabular-nums text-muted-foreground';

export const NOTICE_WARNING = 'rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-foreground';
export const NOTICE_ERROR =
  'rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm text-destructive';

/** Nothing to show here (no files, no differences): one look for every empty result */
export const EMPTY_STATE =
  'rounded-md border border-dashed border-input bg-well px-4 py-8 text-sm text-muted-foreground';

/** Inline list of hints / shortcuts, separated by hairlines instead of middle dots */
export const HINT_LIST =
  'flex flex-col gap-y-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:[&>li]:px-3 sm:[&>li:first-child]:pl-0 sm:[&>li+li]:border-l sm:[&>li+li]:border-border';

/** Small status chip */
export const CHIP = 'inline-flex items-center rounded-sm px-1.5 text-xs font-semibold leading-5';

/** Raised panel (cards, summary bars) */
export const PANEL = 'rounded-md border border-border bg-card';

/** Label sitting on a preview stage, readable on any stage ground */
export const STAGE_LABEL =
  'pointer-events-none absolute rounded-sm bg-stage-label px-1.5 py-0.5 text-xs font-semibold text-stage-label-foreground';
