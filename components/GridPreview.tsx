'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Grid3x3, Maximize2, X } from 'lucide-react';

import type { Background } from '@/types/diff';
import { useBackdropClose } from '@/utils/backdropClose';

import { BUTTON_ICON, SEGMENT_GROUP, segmentClass, toggleButtonClass } from './ui';

export const CANVAS = 32;

/** Which guide set to draw: file icons use the centered 28×28 area, folder
 *  icons the overlay badge area in the bottom-right of the folder shape, plus the overlay size limit. */
export type GuideKind = 'file' | 'folder';

// Guide square [x1, y1, x2, y2] in canvas px — circle is inscribed, crosshair at its center
const GUIDE_BOX: Record<GuideKind, [number, number, number, number]> = {
  file: [2, 2, 30, 30], // 2px margin
  folder: [10, 10, 30, 30], // folder overlay badge, 2px from the right and bottom edges
};

// Largest overlay the folder-icon-overlay-size lint allows (28×23), kept inside the 2px margin
// at the bottom right: [x, y, width, height]
const FOLDER_OVERLAY_LIMIT = [2, 7, 28, 23] as const;

// Base folder shape, from vscode-icons' default_folder.svg — folder_type_* icons
// are drawn on top of this outline
const FOLDER_OUTLINE = 'M27.5,5.5H18.2L16.1,9.7H4.4V26.5H29.6V5.5Zm0,4.2H19.3l1.1-2.1h7.1Z';

/** Folder-shaped icons (incl. default_folder / default_root_folder and variants) */
export function guideKindFor(filename: string): GuideKind {
  return /^(light_)?(folder_type_|default_(root_)?folder)/.test(filename) ? 'folder' : 'file';
}

/** Light-theme icon variants: file_type_light_*, folder_type_light_*, light_* */
export function isLightIcon(filename: string): boolean {
  return /(^|_)light_/.test(filename);
}

/** Filename of the same icon in the other theme: file_type_x ↔ file_type_light_x,
 *  folder_type_x(_opened) ↔ folder_type_light_x(_opened), anything else x ↔ light_x */
export function themeCounterpart(filename: string): string {
  const typed = filename.match(/^(file_type_|folder_type_)(light_)?(.*)$/);
  if (typed) return `${typed[1]}${typed[2] ? '' : 'light_'}${typed[3]}`;
  return filename.startsWith('light_') ? filename.slice('light_'.length) : `light_${filename}`;
}

/** SVG source → data URL usable as an <img> src */
export function svgDataUrl(content: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
}

/** Thumbnail background that follows the app theme, as VS Code's explorer would show the icon */
export const THEME_PREVIEW_BG = 'bg-stage-light dark:bg-stage-dark';

export const BACKGROUNDS: Record<Background, { label: string; className: string }> = {
  dark: { label: 'Dark', className: 'bg-stage-dark text-stage-dark-foreground' },
  light: { label: 'Light', className: 'bg-stage-light text-stage-light-foreground' },
  // Shows where the icon is transparent
  checker: {
    label: 'Checker',
    className:
      'bg-[repeating-conic-gradient(var(--checker-a)_0_25%,var(--checker-b)_0_50%)] bg-size-[12.5%_12.5%] text-stage-light-foreground',
  },
};

export const GUIDE_COLOR = 'var(--overlay-guide)';
// Uniform grid, one line every 2px (16×16 cells) — dense enough to judge
// alignment without drowning the icon
export const GRID_STEP = 2;

/** Uniform grid (a line every GRID_STEP px) plus the guide square, inscribed
 *  circle and center crosshair, drawn in viewBox space so they line up exactly
 *  with an icon whose viewBox is "0 0 32 32". Drawn above every compare view. */
export function GridOverlay({ grid, guides, kind }: { grid: boolean; guides: boolean; kind: GuideKind }) {
  const [x1, y1, x2, y2] = GUIDE_BOX[kind];
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const size = x2 - x1;
  const cross = 1; // crosshair half-length in px
  const line = { vectorEffect: 'non-scaling-stroke' as const };
  return (
    <svg viewBox={`0 0 ${CANVAS} ${CANVAS}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {grid && (
        <g stroke="currentColor" strokeOpacity={0.3}>
          {Array.from({ length: CANVAS / GRID_STEP - 1 }, (_, i) => (i + 1) * GRID_STEP).map(n => (
            <g key={n}>
              <line x1={n} y1={0} x2={n} y2={CANVAS} {...line} />
              <line x1={0} y1={n} x2={CANVAS} y2={n} {...line} />
            </g>
          ))}
        </g>
      )}
      {guides && (
        <g style={{ stroke: GUIDE_COLOR }} fill="none">
          {kind === 'folder' && <path d={FOLDER_OUTLINE} strokeOpacity={0.8} {...line} />}
          {kind === 'folder' && (
            <rect
              x={FOLDER_OVERLAY_LIMIT[0]}
              y={FOLDER_OVERLAY_LIMIT[1]}
              width={FOLDER_OVERLAY_LIMIT[2]}
              height={FOLDER_OVERLAY_LIMIT[3]}
              strokeDasharray="1 2"
              strokeOpacity={0.8}
              {...line}
            />
          )}
          <rect x={x1} y={y1} width={size} height={size} strokeDasharray="4 3" {...line} />
          <circle cx={cx} cy={cy} r={size / 2} strokeDasharray="4 3" {...line} />
          <line x1={cx - cross} y1={cy} x2={cx + cross} y2={cy} {...line} />
          <line x1={cx} y1={cy - cross} x2={cx} y2={cy + cross} {...line} />
        </g>
      )}
    </svg>
  );
}

export function GridCanvas({
  src,
  alt,
  background,
  grid,
  guides,
  kind,
  className = '',
}: {
  src: string;
  alt: string;
  background: Background;
  grid: boolean;
  guides: boolean;
  kind: GuideKind;
  className?: string;
}) {
  const bg = BACKGROUNDS[background];
  return (
    <div className={`relative aspect-square ${bg.className} ${className}`}>
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
      <GridOverlay grid={grid} guides={guides} kind={kind} />
    </div>
  );
}

/** Canvas coordinates labelled on the rulers */
export const RULER_TICKS = [0, CANVAS / 2, CANVAS];
/** Width of the left ruler plus its gap, so a parent can size the frame (w-5 + gap-1.5) */
export const RULER_SIZE = '1.625rem';

// End ticks sit inside the edge (0 flush with the start, 32 flush with the end) so labels
// never stick out past the canvas; the others are centred on their line
const tickShift = (t: number, axis: 'x' | 'y') =>
  t === 0
    ? ''
    : t === CANVAS
      ? axis === 'x'
        ? '-translate-x-full'
        : '-translate-y-full'
      : axis === 'x'
        ? '-translate-x-1/2'
        : '-translate-y-1/2';

/**
 * Canvas-unit rulers (0 / 16 / 32) along the top and left edges of a square canvas.
 * The child is the canvas; it fills the second column.
 */
export function AxisRulers({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr] gap-1.5 font-mono text-xs tabular-nums leading-4 text-muted-foreground ${className}`}
      style={style}
    >
      <span />
      <div className="relative h-4" aria-hidden>
        {RULER_TICKS.map(t => (
          <span key={t} className={`absolute top-0 ${tickShift(t, 'x')}`} style={{ left: `${(t / CANVAS) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative w-5" aria-hidden>
        {RULER_TICKS.map(t => (
          <span key={t} className={`absolute right-0 ${tickShift(t, 'y')}`} style={{ top: `${(t / CANVAS) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

/** GridCanvas with 0 / 16 / 32 axis labels along the top and left edges */
export function LabeledGridCanvas(props: React.ComponentProps<typeof GridCanvas>) {
  return (
    <AxisRulers>
      <GridCanvas {...props} />
    </AxisRulers>
  );
}

export interface GridPreviewItem {
  src: string;
  label?: string;
}

/** Small grid preview tile; click to open the large grid preview modal. */
export function GridPreview({
  items,
  alt,
  kind = guideKindFor(alt),
  background = 'dark',
  className = '',
}: {
  /** First item is shown in the tile; all items are shown side by side in the modal */
  items: GridPreviewItem[];
  /** Icon filename — also used to pick the guide set unless `kind` is given */
  alt: string;
  kind?: GuideKind;
  /** Background of the tile and initial background state of the modal */
  background?: Background;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative overflow-hidden rounded-md border border-border ${className}`}
        title="Open grid preview"
        aria-label={`Open grid preview of ${alt}`}
      >
        <GridCanvas
          src={items[0].src}
          alt={alt}
          background={background}
          grid
          guides
          kind={kind}
          className="h-full w-full"
        />
        <span className="absolute right-1 top-1 rounded-sm bg-stage-label p-1 text-stage-label-foreground opacity-80 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3 w-3" />
        </span>
      </button>
      {open && (
        <GridPreviewModal items={items} alt={alt} kind={kind} background={background} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function GridPreviewModal({
  items,
  alt,
  kind: initialKind,
  background: initialBackground,
  onClose,
}: {
  items: GridPreviewItem[];
  alt: string;
  kind: GuideKind;
  background: Background;
  onClose: () => void;
}) {
  const [background, setBackground] = useState<Background>(initialBackground);
  const [grid, setGrid] = useState(true);
  const [guides, setGuides] = useState(true);
  const [kind, setKind] = useState<GuideKind>(initialKind);
  const backdropProps = useBackdropClose(onClose);

  // Esc closes only this modal, not the drawer/modal underneath
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // Portal to <body>: the drawer/modals that open this have transforms (slide-in
  // animations), which would otherwise trap a position:fixed overlay inside them
  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-scrim p-4" {...backdropProps}>
      <div
        className="flex max-h-full w-full max-w-5xl flex-col rounded-lg border border-border bg-card shadow-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Grid preview"
      >
        {/* Header + controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="mr-auto inline-flex items-center gap-2 text-base font-semibold">
            <Grid3x3 className="h-4 w-4 text-muted-foreground" />
            Grid preview
          </h2>
          <div className={SEGMENT_GROUP}>
            {(Object.keys(BACKGROUNDS) as Background[]).map(b => (
              <button
                key={b}
                onClick={() => setBackground(b)}
                aria-pressed={background === b}
                className={segmentClass(background === b)}
              >
                {BACKGROUNDS[b].label}
              </button>
            ))}
          </div>
          <button onClick={() => setGrid(v => !v)} aria-pressed={grid} className={toggleButtonClass(grid)}>
            Grid
          </button>
          <button onClick={() => setGuides(v => !v)} aria-pressed={guides} className={toggleButtonClass(guides)}>
            Guides
          </button>
          <div className={SEGMENT_GROUP} title="Guide set">
            <button
              onClick={() => setKind('file')}
              aria-pressed={kind === 'file'}
              className={segmentClass(kind === 'file')}
            >
              File
            </button>
            <button
              onClick={() => setKind('folder')}
              aria-pressed={kind === 'folder'}
              className={segmentClass(kind === 'folder')}
            >
              Folder
            </button>
          </div>
          <button onClick={onClose} className={BUTTON_ICON} title="Close (Esc)" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Canvases */}
        <div className="flex min-h-0 flex-1 flex-wrap items-start justify-center gap-6 overflow-auto bg-well p-6">
          {items.map((item, i) => (
            <div key={i} className="space-y-2">
              {item.label && <p className="text-center text-xs text-muted-foreground">{item.label}</p>}
              <LabeledGridCanvas
                src={item.src}
                alt={item.label ? `${alt} (${item.label})` : alt}
                background={background}
                grid={grid}
                guides={guides}
                kind={kind}
                className={`max-w-full border border-border ${
                  items.length > 1 ? 'w-[min(60vh,420px,calc(100vw-7rem))]' : 'w-[min(70vh,620px,calc(100vw-7rem))]'
                }`}
              />
            </div>
          ))}
        </div>

        <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>1 cell = {GRID_STEP}px of the 32×32 canvas</span>
          {/* Same hue as the guide lines, at a text-safe lightness */}
          <span className="text-plate-b">
            {kind === 'file'
              ? 'guide = 2px margin (28×28 content area), centered'
              : 'solid = base folder outline (default_folder), dashed = overlay badge (10→30), dotted = largest overlay allowed (28×23), all 2px from the edges'}
          </span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
