'use client';

import { useState } from 'react';
import Link from 'next/link';

import { GitPullRequest } from 'lucide-react';

import AddedIconView from '@/components/AddedIconView';
import AllVsBaseGrid from '@/components/AllVsBaseGrid';
import CompareView from '@/components/CompareView';
import DropZone from '@/components/DropZone';
import Header from '@/components/Header';
import PasteDialog from '@/components/PasteDialog';
import SvgTray from '@/components/SvgTray';
import { FIELD_ERROR } from '@/components/ui';
import { useAppContext } from '@/context/AppContext';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useKeyboard } from '@/hooks/useKeyboard';
import { withFolderVariant } from '@/utils/folderLint';

export default function ComparePage() {
  const { items, baseId, compareId, addItems, swap, setCompareId } = useAppContext();
  const [errors, setErrors] = useState<string[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);

  const pick = (id: string | null) => {
    const item = items.find(i => i.id === id);
    return item ? withFolderVariant(item, items) : null;
  };
  const a = pick(baseId);
  const b = pick(compareId);

  useHotkeys({ x: swap });

  // ← / → step B through the other icons in tray order
  const stepCompare = (dir: 1 | -1) => {
    const others = items.filter(i => i.id !== baseId);
    if (others.length < 2) return;
    const at = others.findIndex(i => i.id === compareId);
    setCompareId(others[(at + dir + others.length) % others.length].id);
  };
  useKeyboard({ onNextIcon: () => stepCompare(1), onPrevIcon: () => stepCompare(-1) });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div
          className={
            items.length === 0 ? 'grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12' : 'space-y-3'
          }
        >
          {items.length === 0 && (
            <div className="space-y-4 lg:pt-2">
              <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-[2.5rem] sm:leading-[1.1]">
                Compare SVG icons
              </h2>
              <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
                Drop, pick or paste two or more SVGs to compare them visually and as code. Nothing is uploaded: files
                stay in this browser. To review the icons in a pull request, use{' '}
                <Link
                  href="/pr"
                  className="inline-flex items-center gap-1 font-semibold text-foreground underline decoration-input decoration-1 underline-offset-4 hover:decoration-foreground"
                >
                  <GitPullRequest className="h-4 w-4" />
                  PR review
                </Link>
                .
              </p>
            </div>
          )}

          <DropZone
            onAdd={addItems}
            onErrors={setErrors}
            onPasteClick={() => setPasteOpen(true)}
            compact={items.length > 0}
          />
        </div>

        {errors.length > 0 && (
          <div className={`space-y-0.5 ${FIELD_ERROR}`} role="alert">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        <SvgTray />

        {items.length === 1 && a && (
          <>
            <p className="text-base text-muted-foreground">
              Add another SVG to compare it with <span className="font-mono text-foreground">{a.name}</span>.
            </p>
            <AddedIconView key={a.id} item={a} />
          </>
        )}

        {a && b && <CompareView a={a} b={b} others={items.filter(i => i.id !== a.id && i.id !== b.id)} />}

        <AllVsBaseGrid />
      </main>

      {pasteOpen && <PasteDialog onAdd={addItems} onClose={() => setPasteOpen(false)} />}
    </div>
  );
}
