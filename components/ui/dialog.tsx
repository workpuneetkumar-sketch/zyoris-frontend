import React, { ReactNode, useEffect, useRef } from "react";

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange && onOpenChange(false);
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      className="rounded-lg p-0 border-none outline-none w-full max-w-md"
    >
      {children}
    </dialog>
  );
}

export function DialogContent({ children }: { children: ReactNode }) {
  return <div className="p-6 bg-white rounded-lg shadow-lg">{children}</div>;
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-semibold text-gray-900">{children}</h2>;
}
