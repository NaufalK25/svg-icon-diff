'use client';

import { useState } from 'react';

interface RangeInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Slider step; typed values can be any whole number in range */
  step?: number;
  /** Shown after the number field, e.g. "%" or "ms" */
  unit?: string;
  /** Width class of the slider */
  sliderClassName?: string;
  /** Rendered between the slider and the number field, e.g. the end label of a slider */
  between?: React.ReactNode;
  'aria-label': string;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** A slider with a number field next to it, for typing an exact value instead of dragging */
export default function RangeInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  sliderClassName = 'w-32',
  between,
  'aria-label': ariaLabel,
}: RangeInputProps) {
  // Text being typed; null shows the current value. Kept separate so a half-typed
  // number ("", "1" on the way to "120") doesn't snap back while typing
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = Math.round(Number(draft));
    if (draft.trim() !== '' && Number.isFinite(n)) onChange(clamp(n, min, max));
    setDraft(null);
  };

  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={sliderClassName}
        aria-label={ariaLabel}
      />
      {between}
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={draft ?? value}
          onChange={e => {
            setDraft(e.target.value);
            // Apply as you type when it's already a valid value, so the preview follows
            const n = Number(e.target.value);
            if (e.target.value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              commit();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              // Revert without closing the view around it
              e.stopPropagation();
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          aria-label={`${ariaLabel} value`}
          className="h-7 w-16 rounded-sm border border-input bg-card px-1.5 text-right font-mono text-xs tabular-nums text-foreground"
        />
        {unit && <span className="font-mono">{unit}</span>}
      </span>
    </span>
  );
}
