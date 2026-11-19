import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Bookmark } from "../backend/types";

function BookmarkNode({ node, onGo }: { node: Bookmark; onGo: (page: number) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const page = node.page_index;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <li className="bookmark">
      <div className="bookmark-row">
        {hasChildren ? (
          <button
            type="button"
            className="icon-button bookmark-toggle"
            aria-expanded={open}
            aria-label={t("reader.toggleBookmark", { title: node.title })}
            title={t("reader.toggleBookmark", { title: node.title })}
            onClick={() => setOpen((o) => !o)}
          >
            <Chevron size={16} aria-hidden="true" />
          </button>
        ) : (
          <span className="bookmark-toggle" aria-hidden="true" />
        )}
        {page === null ? (
          <span className="bookmark-title bookmark-inert">{node.title}</span>
        ) : (
          <button type="button" className="bookmark-title" onClick={() => onGo(page)}>
            {node.title}
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul className="bookmark-list">
          {node.children.map((child, i) => (
            <BookmarkNode key={i} node={child} onGo={onGo} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The document outline as a tree; entries without a target page are shown but cannot be clicked. */
export function BookmarksPanel({ bookmarks, onGo }: { bookmarks: Bookmark[]; onGo: (page: number) => void }) {
  const { t } = useTranslation();
  if (bookmarks.length === 0) return <p className="tool-note">{t("reader.noBookmarks")}</p>;
  return (
    <ul className="bookmark-list bookmark-root">
      {bookmarks.map((node, i) => (
        <BookmarkNode key={i} node={node} onGo={onGo} />
      ))}
    </ul>
  );
}
