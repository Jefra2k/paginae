import { useLayoutEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";

export interface PasswordDialogProps {
  fileName: string;
  error?: "wrong" | null;
  onSubmit(password: string): void;
  onCancel(): void;
}

/** Modal prompt for the password of a protected PDF. Enter opens, Esc cancels. */
export function PasswordDialog({ fileName, error = null, onSubmit, onCancel }: PasswordDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  // A native modal dialog traps focus; on close the focus goes back where it was.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const cancel = () => {
    if (cancelled.current) return;
    cancelled.current = true;
    onCancel();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  // Esc in a browser fires `cancel` on the dialog; keep the dialog under React's control.
  const onDialogCancel = (e: SyntheticEvent) => {
    e.preventDefault();
    cancel();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-modal="true"
      aria-labelledby="password-title"
      aria-describedby="password-text"
      onKeyDown={onKeyDown}
      onCancel={onDialogCancel}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }}
      >
        <h2 id="password-title">{t("password.title")}</h2>
        <p id="password-text">{t("password.text", { name: fileName })}</p>
        <label className="field">
          <span>{t("password.label")}</span>
          <input
            ref={inputRef}
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error === "wrong" && (
          <p className="field-error" role="alert">
            {t("password.wrong")}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={cancel}>
            {t("actions.cancel")}
          </button>
          <button type="submit" className="primary-button">
            {t("password.open")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
