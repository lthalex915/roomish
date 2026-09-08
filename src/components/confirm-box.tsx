import { Button } from "@/components/ui/button";

export function ConfirmBox({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-3xl border border-danger/30 bg-surface p-6 shadow-[8px_8px_0_0_#1c1914]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-danger">Please check</p>
        <h2 id="confirm-title" className="mt-2 font-serif text-2xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Keep it
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
