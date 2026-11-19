import { FileText, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RecentFile } from "../backend/types";

export interface StartScreenProps {
  recent: RecentFile[];
  onOpen(): void;
  onOpenPath(path: string): void;
}

/** Shown while no document is open: open button, drop hint and the recently opened files. */
export function StartScreen({ recent, onOpen, onOpenPath }: StartScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="start-screen">
      <h1 className="start-headline">{t("start.headline")}</h1>
      <p className="start-hint">{t("start.hint")}</p>
      <button type="button" className="primary-button" data-testid="open" onClick={onOpen}>
        <FolderOpen size={18} aria-hidden="true" />
        <span>{t("actions.open")}</span>
      </button>
      <section className="start-recent" aria-labelledby="start-recent-title">
        <h2 id="start-recent-title">{t("start.recent")}</h2>
        {recent.length === 0 ? (
          <p className="start-empty">{t("start.noRecent")}</p>
        ) : (
          <ul className="recent-list">
            {recent.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className="recent-item"
                  data-testid="recent-item"
                  title={file.path}
                  onClick={() => onOpenPath(file.path)}
                >
                  <FileText size={16} aria-hidden="true" />
                  <span>{file.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
