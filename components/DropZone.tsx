'use client';

import { useCallback, useEffect, useState } from 'react';

import { ClipboardPaste, FolderOpen, Upload } from 'lucide-react';

import type { SvgItem } from '@/types/diff';
import { isSvgFile, looksLikeSvg, validateSvg } from '@/utils/analyzeSvg';

import { BUTTON_SECONDARY } from './ui';

export const PASTED_NAME = 'pasted.svg';

export type NewSvg = Omit<SvgItem, 'id'>;

/** Valid SVGs, and a reason for every file or text that was rejected */
export async function collectFiles(fileList: FileList | File[]): Promise<{ added: NewSvg[]; errors: string[] }> {
  const added: NewSvg[] = [];
  const errors: string[] = [];
  for (const file of Array.from(fileList)) {
    if (!isSvgFile(file)) {
      errors.push(`${file.name}: not an SVG file (expected .svg), skipped`);
      continue;
    }
    const content = await file.text();
    const problem = validateSvg(content);
    if (problem) errors.push(`${file.name}: ${problem}`);
    else added.push({ name: file.name, content, source: { kind: 'upload', fileName: file.name } });
  }
  return { added, errors };
}

/** Name used for pasted code: the guessed icon type and folder exemptions depend on it */
export function normalizeName(name: string): string {
  const trimmed = name.trim() || PASTED_NAME;
  return trimmed.toLowerCase().endsWith('.svg') ? trimmed : `${trimmed}.svg`;
}

export function collectText(content: string, name: string): { added: NewSvg[]; errors: string[] } {
  const filename = normalizeName(name);
  if (!looksLikeSvg(content)) return { added: [], errors: ['Pasted text does not contain an <svg> element.'] };
  const problem = validateSvg(content);
  if (problem) return { added: [], errors: [`${filename}: ${problem}`] };
  return { added: [{ name: filename, content, source: { kind: 'paste' } }], errors: [] };
}

interface DropZoneProps {
  onAdd: (items: NewSvg[]) => void;
  onErrors: (errors: string[]) => void;
  onPasteClick: () => void;
  compact?: boolean;
}

export default function DropZone({ onAdd, onErrors, onPasteClick, compact = false }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (result: { added: NewSvg[]; errors: string[] }) => {
      onErrors(result.errors);
      if (result.added.length) onAdd(result.added);
    },
    [onAdd, onErrors],
  );

  const addFiles = useCallback(async (files: FileList | File[]) => handle(await collectFiles(files)), [handle]);

  // Ctrl/Cmd+V anywhere on the page (outside text fields): SVG files or SVG code from the clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (files.length) {
        e.preventDefault();
        void addFiles(files);
      } else if (text) {
        e.preventDefault();
        handle(collectText(text, PASTED_NAME));
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles, handle]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) {
      void addFiles(e.dataTransfer.files);
    } else {
      const text = e.dataTransfer.getData('text/plain');
      if (text) handle(collectText(text, PASTED_NAME));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void addFiles(e.target.files);
    e.target.value = ''; // allow choosing the same file again after editing it
  };

  return (
    <div className={`flex gap-2 ${compact ? 'flex-row items-stretch' : 'flex-col'}`}>
      <label
        className={`group flex flex-1 cursor-pointer gap-3 rounded-md border border-dashed transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${
          compact ? 'flex-row items-center px-4 py-2.5' : 'min-h-56 flex-col items-start justify-end p-6 sm:p-8'
        } ${dragging ? 'border-foreground bg-card' : 'border-input bg-well hover:border-foreground hover:bg-card'}`}
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept=".svg,image/svg+xml" multiple className="sr-only" onChange={handleFileInput} />
        {dragging ? (
          <FolderOpen className={`${compact ? 'h-4 w-4' : 'mb-auto h-7 w-7'} text-foreground`} />
        ) : (
          <Upload
            className={`${compact ? 'h-4 w-4' : 'mb-auto h-7 w-7'} text-muted-foreground transition-colors group-hover:text-foreground`}
          />
        )}
        <span className={compact ? '' : 'space-y-1'}>
          <span className={`block font-semibold text-foreground ${compact ? 'text-sm' : 'text-lg'}`}>
            {compact ? 'Drop more SVGs or click to browse' : 'Drop two or more SVGs here or click to browse'}
          </span>
          {!compact && (
            <span className="block text-sm text-muted-foreground">
              Several files at once, or press <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste SVG code
            </span>
          )}
        </span>
      </label>
      <button
        onClick={onPasteClick}
        className={`${BUTTON_SECONDARY} ${compact ? 'h-auto' : 'h-10 w-full sm:w-auto sm:self-start'}`}
      >
        <ClipboardPaste className="h-4 w-4" />
        Paste SVG code
      </button>
    </div>
  );
}
