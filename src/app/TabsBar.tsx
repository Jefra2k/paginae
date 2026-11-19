import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface TabItem {
  id: number;
  name: string;
}

export interface TabsBarProps {
  tabs?: TabItem[];
  activeId?: number | null;
  onSelect?: (id: number) => void;
  onClose?: (id: number) => void;
  onNew?: () => void;
}

/** One tab per open document, each with a close cross, and a button for another file. */
export function TabsBar({ tabs = [], activeId = null, onSelect, onClose, onNew }: TabsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="tabs-bar">
      {tabs.map((tab) => (
        <div key={tab.id} className="tab" data-testid="tab" data-active={tab.id === activeId}>
          <button
            type="button"
            className="tab-label"
            aria-current={tab.id === activeId ? "true" : undefined}
            onClick={() => onSelect?.(tab.id)}
          >
            {tab.name}
          </button>
          <button
            type="button"
            className="tab-close"
            aria-label={t("tabs.closeTab", { name: tab.name })}
            title={t("tabs.closeTab", { name: tab.name })}
            onClick={() => onClose?.(tab.id)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="tab-new"
        aria-label={t("tabs.newTab")}
        title={t("tabs.newTab")}
        onClick={() => onNew?.()}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
