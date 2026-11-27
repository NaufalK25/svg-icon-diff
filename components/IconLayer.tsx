'use client';

import { useRasterUrl } from '@/hooks/useRasterUrl';
import type { RenderSize } from '@/types/diff';

interface IconLayerProps {
  content: string;
  size: RenderSize;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

/** An icon filling its (relative) parent: pixel-accurate at a fixed size, crisp vector at 'fit' */
export default function IconLayer({ content, size, alt, className = '', style }: IconLayerProps) {
  const src = useRasterUrl(content, size);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`pointer-events-none absolute inset-0 h-full w-full select-none object-contain ${
        size === 'fit' ? '' : '[image-rendering:pixelated]'
      } ${className}`}
      style={style}
    />
  );
}
