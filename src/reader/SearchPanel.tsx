import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { DocState } from "../state/documents";
import type { SearchApi } from "./useSearch";

/** Search field, hit counter and stepping buttons, and the hits grouped by page. */
export function SearchPanel({
  doc,
  search,
  focusRequest = 0,
}: {
  doc: DocState;
  search: SearchApi;
  focusRequest?: number;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusRequest === 0) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusRequest]);
  const { hits, current, status } = search;

  const groups: { page: number; indices: number[] }[] = [];
  hits.forEach((hit, index) => {
    const last = groups[groups.length - 1];
    if (last && last.page === hit.page_index) last.indices.push(index);
    else groups.push({ page: hit.page_index, indices: [index] });
  });

  const done = status === "done";
  // A scan without text layer finds nothing, whatever is typed: say why instead of staying silent.
  const unsearchable = done && doc.hasText === false;

  return (
    <div className="search-panel">
      <input
        ref={inputRef}
        type="search"
        className="search-input"
        data-testid="search-input"
        aria-label={t("reader.search")}
        placeholder={t("reader.searchPlaceholder")}
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void search.run();
          }
        }}
      />
      {done && hits.length > 0 && (
        <div className="tool-row">
          <button
            type="button"
            className="icon-button"
            aria-label={t("reader.prevHit")}
            title={t("reader.prevHit")}
            onClick={search.prev}
          >
            <ChevronUp size={18} aria-hidden="true" />
          </button>
          <output className="hit-count" data-testid="hit-count">
            {t("reader.hits", { count: hits.length })}
          </output>
          <button
            type="button"
            className="icon-button"
            aria-label={t("reader.nextHit")}
            title={t("reader.nextHit")}
            onClick={search.next}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {unsearchable && <p className="tool-note">{t("reader.noText")}</p>}
      {done && !unsearchable && hits.length === 0 && <p className="tool-note">{t("reader.noHits")}</p>}
      {groups.length > 0 && (
        <ul className="hit-groups">
          {groups.map((group) => (
            <li key={group.page} className="hit-group">
              <span className="hit-group-title">
                {t("reader.hitGroup", {
                  n: group.page + 1,
                  count: group.indices.length,
                })}
              </span>
              <ul className="hit-items">
                {group.indices.map((index) => (
                  <li key={index}>
                    <button
                      type="button"
                      className="hit-item"
                      aria-current={index === current ? "true" : undefined}
                      onClick={() => search.select(index)}
                    >
                      {t("reader.hitItem", { n: index + 1 })}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
