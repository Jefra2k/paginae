import { BookOpen, Files, MessageSquareText, Redo2, TextCursorInput, Undo2, Wrench, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type Mode = "read" | "comment" | "fill" | "pages" | "tools";

const MODES: { mode: Mode; icon: LucideIcon }[] = [
  { mode: "read", icon: BookOpen },
  { mode: "comment", icon: MessageSquareText },
  { mode: "fill", icon: TextCursorInput },
  { mode: "pages", icon: Files },
  { mode: "tools", icon: Wrench },
];

/** The five ways of working; only reading is available in this stage. */
export function ModesBar() {
  const { t } = useTranslation();
  const labels: Record<Mode, string> = {
    read: t("modes.read"),
    comment: t("modes.comment"),
    fill: t("modes.fill"),
    pages: t("modes.pages"),
    tools: t("modes.tools"),
  };

  return (
    <nav className="modes-bar" aria-label={t("modes.label")}>
      <div className="modes" role="group">
        {MODES.map(({ mode, icon: Icon }) => {
          const active = mode === "read";
          return (
            <button
              key={mode}
              type="button"
              className="mode"
              data-testid={`mode-${mode}`}
              aria-pressed={active}
              aria-disabled={active ? undefined : "true"}
              title={active ? undefined : t("modes.comingSoon")}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{labels[mode]}</span>
            </button>
          );
        })}
      </div>
      <div className="modes-end">
        <button type="button" className="icon-button" disabled aria-label={t("actions.undo")} title={t("actions.undo")}>
          <Undo2 size={18} aria-hidden="true" />
        </button>
        <button type="button" className="icon-button" disabled aria-label={t("actions.redo")} title={t("actions.redo")}>
          <Redo2 size={18} aria-hidden="true" />
        </button>
        <span className="save-state" aria-live="polite" />
      </div>
    </nav>
  );
}
