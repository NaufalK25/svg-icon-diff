'use client';

import type { ViewSettings } from './CompareToolbar';
import { AxisRulers, BACKGROUNDS, GridOverlay, RULER_SIZE } from './GridPreview';
import { STAGE_LABEL } from './ui';

interface StageProps extends React.HTMLAttributes<HTMLDivElement> {
  settings: ViewSettings;
  /** Replaces the background from the settings, e.g. black for the difference view */
  backgroundClassName?: string;
  /** Small corner label, e.g. "A" or "Before" */
  label?: string;
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Square preview area at the zoom size, with the grid and guides drawn above
 * everything inside it in the same 32×32 viewBox space, so alignment is judged
 * the same way in every compare mode.
 */
export default function Stage({
  settings,
  backgroundClassName,
  label,
  children,
  className = '',
  style,
  ref,
  ...rest
}: StageProps) {
  // The frame is the stage plus its rulers; the stage itself keeps the ref and the pointer
  // handlers, so swipe positions are still measured against the square alone
  return (
    <AxisRulers className="max-w-full" style={{ width: `calc(${settings.zoom}px + ${RULER_SIZE})` }}>
      <div
        ref={ref}
        className={`relative aspect-square w-full overflow-hidden rounded-sm shadow-[0_0_0_1px_var(--border)] ${
          backgroundClassName ?? BACKGROUNDS[settings.background].className
        } ${className}`}
        style={style}
        {...rest}
      >
        {children}
        <GridOverlay grid={settings.grid} guides={settings.guides} kind={settings.kind} />
        {label && <span className={`${STAGE_LABEL} left-1.5 top-1.5`}>{label}</span>}
      </div>
    </AxisRulers>
  );
}
