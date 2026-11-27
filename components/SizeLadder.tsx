'use client';

import { useRasterUrl } from '@/hooks/useRasterUrl';

import { BACKGROUNDS, svgDataUrl } from './GridPreview';

const SIZES = [16, 24, 32, 64] as const;
// Every magnified raster is shown this wide, so the pixel grids line up
const MAGNIFIED = 96;

function Rung({ content, size }: { content: string; size: number }) {
  const raster = useRasterUrl(content, size as 16 | 24 | 32 | 64);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center" style={{ width: MAGNIFIED, height: MAGNIFIED }}>
        {raster && (
          <img
            src={raster}
            alt=""
            width={MAGNIFIED}
            height={MAGNIFIED}
            className="[image-rendering:pixelated]"
            title={`${size}px, magnified ${MAGNIFIED / size}×`}
          />
        )}
      </div>
      {/* Actual size, drawn by the browser the same way VS Code draws it */}
      <div className="flex h-16 items-center justify-center">
        <img src={svgDataUrl(content)} alt="" width={size} height={size} title={`${size}px, actual size`} />
      </div>
      <span className="font-mono text-xs tabular-nums opacity-70">{size}px</span>
    </div>
  );
}

interface SizeLadderProps {
  content: string;
}

/** The icon at 16 / 24 / 32 / 64 px on dark and light: pixel-accurate rasters magnified, and at actual size */
export default function SizeLadder({ content }: SizeLadderProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(['dark', 'light'] as const).map(bg => (
        <div
          key={bg}
          className={`flex flex-wrap items-end justify-around gap-3 rounded-md border border-border p-3 ${BACKGROUNDS[bg].className}`}
        >
          {SIZES.map(size => (
            <Rung key={size} content={content} size={size} />
          ))}
        </div>
      ))}
    </div>
  );
}
