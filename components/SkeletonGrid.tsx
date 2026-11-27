'use client';

import React from 'react';

import LoadingMessage from './LoadingMessage';

interface SkeletonGridProps {
  message: string;
  count?: number;
}

export default function SkeletonGrid({ message, count = 12 }: SkeletonGridProps) {
  return (
    <div className="space-y-5">
      {/* Status message */}
      <LoadingMessage>{message}</LoadingMessage>

      {/* Skeleton grid: the same shape as the file cards it stands in for */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-md border border-border bg-card p-3"
            style={{
              animationDelay: `${i * 20}ms`,
            }}
          >
            {/* Icon preview skeleton */}
            <div className="mb-3 flex justify-center gap-1.5">
              <div className="h-14 w-14 rounded-sm bg-muted" />
              <div className="h-14 w-14 rounded-sm bg-muted" />
            </div>

            {/* Filename skeleton */}
            <div className="mb-2 h-2.5 w-3/4 rounded-sm bg-muted" />

            {/* Footer skeleton */}
            <div className="h-2.5 w-1/2 rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
