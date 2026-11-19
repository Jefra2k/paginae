import { useState, type ReactNode } from "react";
import { ModesBar } from "./ModesBar";
import { SidePane } from "./SidePane";
import { TabsBar, type TabsBarProps } from "./TabsBar";

export interface AppShellProps {
  tabs?: TabsBarProps;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

/** Workbench layout A: tabs, modes, then thumbnails | document | tools. */
export function AppShell({ tabs, left, center, right }: AppShellProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="app-shell" data-left-collapsed={leftCollapsed} data-right-collapsed={rightCollapsed}>
      <header className="app-shell-tabs">
        <TabsBar {...tabs} />
      </header>
      <div className="app-shell-modes">
        <ModesBar />
      </div>
      <SidePane side="left" collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((c) => !c)}>
        {left}
      </SidePane>
      <main className="app-shell-center">{center}</main>
      <SidePane side="right" collapsed={rightCollapsed} onToggle={() => setRightCollapsed((c) => !c)}>
        {right}
      </SidePane>
    </div>
  );
}
