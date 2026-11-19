import { useState, type KeyboardEvent } from "react";
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

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-title"
        aria-describedby="password-text"
        onKeyDown={onKeyDown}
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
            <button type="button" className="secondary-button" onClick={onCancel}>
              {t("actions.cancel")}
            </button>
            <button type="submit" className="primary-button">
              {t("password.open")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
