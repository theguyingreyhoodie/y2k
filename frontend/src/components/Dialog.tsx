import { useEffect, useRef, type ReactNode } from "react";
import { Window } from "./Window";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

/** Native <dialog> (focus trap, Esc, inert background) dressed as a program window. */
export function Dialog({ open, title, onClose, children, width }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      style={width ? { width: `min(${width}px, calc(100vw - 32px))` } : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside the window) closes it.
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <Window title={title} onClose={onClose} as="div" bodyClassName="dialog__body">
          {children}
        </Window>
      ) : null}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog open={open} title={title} onClose={onClose} width={400}>
      <p>{message}</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--chrome btn--sm" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`btn btn--sm ${danger ? "btn--danger" : ""}`} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
