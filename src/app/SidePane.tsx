import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface SidePaneProps {
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/** A collapsible side area; the toggle stays reachable at the pane edge when collapsed. */
export function SidePane({ side, collapsed, onToggle, children }: SidePaneProps) {
  const { t } = useTranslation();
  const label =
    side === "left"
      ? collapsed
        ? t("actions.expandLeft")
        : t("actions.collapseLeft")
      : collapsed
        ? t("actions.expandRight")
        : t("actions.collapseRight");
  const Icon =
    side === "left" ? (collapsed ? PanelLeftOpen : PanelLeftClose) : collapsed ? PanelRightOpen : PanelRightClose;

  return (
    <aside className={`side-pane side-pane-${side}`} data-testid={`pane-${side}`} data-collapsed={collapsed}>
      <button
        type="button"
        className="icon-button pane-toggle"
        data-testid={`toggle-${side}`}
        aria-label={label}
        aria-expanded={!collapsed}
        title={label}
        onClick={onToggle}
      >
        <Icon size={18} aria-hidden="true" />
      </button>
      <div className="side-pane-content" hidden={collapsed}>
        {children}
      </div>
    </aside>
  );
}
