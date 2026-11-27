'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ClipboardPaste, X } from 'lucide-react';

import { useBackdropClose } from '@/utils/backdropClose';

import { collectText, type NewSvg } from './DropZone';
import { BUTTON_ICON, BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD_ERROR, INPUT_CLASS } from './ui';

interface PasteDialogProps {
  onAdd: (items: NewSvg[]) => void;
  onClose: () => void;
}

export default function PasteDialog({ onAdd, onClose }: PasteDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const backdropProps = useBackdropClose(onClose);

  // Esc closes only this dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const submit = () => {
    const result = collectText(code, name);
    if (result.errors.length) {
      setError(result.errors.join(' '));
      return;
    }
    onAdd(result.added);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-scrim p-4" {...backdropProps}>
      <div
        className="flex w-full max-w-lg flex-col rounded-lg border border-border bg-card shadow-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-border py-2 pl-4 pr-2">
          <h2 id="paste-dialog-title" className="inline-flex items-center gap-2 text-base font-semibold">
            <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
            Paste SVG code
          </h2>
          <button onClick={onClose} className={BUTTON_ICON} title="Close (Esc)" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <textarea
            autoFocus
            value={code}
            onChange={e => {
              setCode(e.target.value);
              setError(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
            }}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">…</svg>'
            spellCheck={false}
            aria-label="SVG code"
            aria-invalid={!!error}
            aria-describedby={error ? 'paste-error' : undefined}
            className={`h-48 w-full resize-y rounded-sm border bg-well p-3 font-mono text-xs leading-5 text-foreground placeholder:text-muted-foreground ${error ? 'border-destructive' : 'border-input'
              }`}
          />
          {error && (
            <p id="paste-error" className={FIELD_ERROR} role="alert">
              {error}
            </p>
          )}
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Filename (optional, e.g. file_type_x.svg)"
            title="The filename decides the icon type and guide set, e.g. folder icons skip the margin checks"
            aria-label="Filename"
            className={`${INPUT_CLASS} w-full font-mono text-xs`}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button onClick={onClose} className={BUTTON_SECONDARY}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!code.trim()}
            className={`${BUTTON_PRIMARY} px-4`}
            title="Add (Ctrl+Enter)"
          >
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
