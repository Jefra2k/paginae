import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "./app/AppShell";
import { Banners } from "./app/Banners";
import { matchShortcut, type ShortcutAction } from "./app/shortcuts";
import { StartScreen } from "./app/StartScreen";
import { useOpenFiles } from "./app/useOpenFiles";
import { useBackend } from "./backend/BackendContext";
import { PasswordDialog } from "./dialogs/PasswordDialog";
import { errorText } from "./i18n/errorText";
import { ReaderToolPane } from "./reader/ReaderToolPane";
import { useSearch } from "./reader/useSearch";
import { DocumentsProvider, nextZoom, useDocuments } from "./state/documents";
import { DocumentView, ViewerContext, type DocumentViewHandle } from "./viewer/DocumentView";
import { createRenderCaches, RenderCachesContext } from "./viewer/RenderCache";
import { ThumbnailPane } from "./viewer/ThumbnailPane";

function Workbench() {
  const { t } = useTranslation();
  const backend = useBackend();
  const { state, dispatch, active } = useDocuments();
  const files = useOpenFiles();
  const [caches] = useState(() => createRenderCaches(backend));
  const viewRef = useRef<DocumentViewHandle>(null);
  const [fitPercent, setFitPercent] = useState<number | null>(null);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);

  useEffect(
    () => () => {
      caches.pages.dispose();
      caches.thumbnails.dispose();
    },
    [caches],
  );

  const viewer = useMemo<DocumentViewHandle>(
    () => ({
      scrollToPage: (page) => viewRef.current?.scrollToPage(page),
      effectivePercent: () => viewRef.current?.effectivePercent() ?? 100,
    }),
    [],
  );

  const search = useSearch(active?.info.id ?? null, viewer.scrollToPage);

  const closeDocument = useCallback(
    (id: number) => {
      caches.pages.invalidate(id);
      caches.thumbnails.invalidate(id);
      dispatch({ type: "closed", id });
      backend.closeDocument(id).catch(() => {
        // Already gone in the core: nothing left to release.
      });
    },
    [backend, caches, dispatch],
  );

  const run = useCallback(
    (action: ShortcutAction): boolean => {
      if (action === "open") {
        void files.openPicker();
        return true;
      }
      // Without a document there is nothing to print, but the webview must not print the window either.
      if (!active) return action === "print";
      const id = active.info.id;
      const lastPage = active.info.page_count - 1;
      switch (action) {
        case "closeActive":
          closeDocument(id);
          return true;
        case "zoomIn":
        case "zoomOut":
          dispatch({
            type: "zoomed",
            id,
            zoom: nextZoom(active.zoom, action === "zoomIn" ? 1 : -1, viewer.effectivePercent()),
          });
          return true;
        case "fitWidth":
          dispatch({ type: "zoomed", id, zoom: { kind: "fitWidth" } });
          return true;
        case "fitPage":
          dispatch({ type: "zoomed", id, zoom: { kind: "fitPage" } });
          return true;
        case "nextPage":
          viewer.scrollToPage(Math.min(lastPage, active.currentPage + 1));
          return true;
        case "prevPage":
          viewer.scrollToPage(Math.max(0, active.currentPage - 1));
          return true;
        case "firstPage":
          viewer.scrollToPage(0);
          return true;
        case "lastPage":
          viewer.scrollToPage(lastPage);
          return true;
        case "nextTab": {
          const index = state.order.indexOf(id);
          dispatch({ type: "activated", id: state.order[(index + 1) % state.order.length] });
          return true;
        }
        case "focusSearch":
          setSearchFocusRequest((n) => n + 1);
          return true;
        case "nextHit":
          search.next();
          return true;
        case "prevHit":
          search.prev();
          return true;
        case "clearSearch":
          // Without a search Esc is left alone (a dialog or the webview may want it).
          if (search.query === "" && search.hits.length === 0) return false;
          search.clear();
          return true;
        case "print":
          if (active.info.permissions.print !== false) void backend.printDocument(id);
          return true;
      }
    },
    [active, backend, closeDocument, dispatch, files, search, state.order, viewer],
  );

  const passwordOpen = files.password !== null;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (passwordOpen) return;
      const action = matchShortcut(e);
      if (action && run(action)) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run, passwordOpen]);

  const tabs = state.order.map((id) => ({ id, name: state.docs[id].info.file_name, title: state.docs[id].info.path }));

  return (
    <RenderCachesContext.Provider value={caches}>
      <ViewerContext.Provider value={viewer}>
        <AppShell
          revealRight={searchFocusRequest}
          tabs={{
            tabs,
            activeId: state.activeId,
            onSelect: (id) => dispatch({ type: "activated", id }),
            onClose: closeDocument,
            onNew: () => void files.openPicker(),
          }}
          left={active ? <ThumbnailPane doc={active} onSelect={(page) => viewer.scrollToPage(page)} /> : null}
          center={
            <>
              {files.error && (
                <div className="error-alert" role="alert">
                  <span>{errorText(t, files.error)}</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t("actions.close")}
                    title={t("actions.close")}
                    onClick={files.dismissError}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
              {active ? (
                <>
                  <Banners key={`banners-${active.info.id}`} doc={active} />
                  <DocumentView
                    key={active.info.id}
                    ref={viewRef}
                    doc={active}
                    onPercentChange={setFitPercent}
                    hits={search.hits}
                    currentHit={search.current}
                  />
                </>
              ) : (
                <StartScreen
                  recent={files.recent}
                  onOpen={() => void files.openPicker()}
                  onOpenPath={(path) => void files.openPaths([path])}
                />
              )}
            </>
          }
          right={
            active ? (
              <ReaderToolPane doc={active} fitPercent={fitPercent} search={search} focusRequest={searchFocusRequest} />
            ) : null
          }
        />
        {files.password && (
          <PasswordDialog
            key={files.password.attempt}
            fileName={files.password.fileName}
            error={files.password.error}
            onSubmit={files.password.submit}
            onCancel={files.password.cancel}
          />
        )}
      </ViewerContext.Provider>
    </RenderCachesContext.Provider>
  );
}

function App() {
  return (
    <DocumentsProvider>
      <Workbench />
    </DocumentsProvider>
  );
}

export default App;
