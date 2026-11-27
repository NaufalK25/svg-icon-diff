import { type MouseEvent, useRef } from 'react';

/**
 * Props for a modal's backdrop wrapper that close the modal when the backdrop
 * itself is clicked. The press must also *start* on the backdrop: dragging a
 * text selection from inside the modal and releasing outside fires a click on
 * the backdrop, which must not close it.
 */
export function useBackdropClose(onClose: () => void) {
  const pressedOnBackdrop = useRef(false);
  return {
    onMouseDown: (e: MouseEvent) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: MouseEvent) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      pressedOnBackdrop.current = false;
    },
  };
}
