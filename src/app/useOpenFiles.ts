import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "../backend/BackendContext";
import type { CommandError, RecentFile } from "../backend/types";
import { toCommandError } from "../i18n/errorText";
import { useDocuments } from "../state/documents";

const MAX_RECENT = 10;

export interface PasswordRequest {
  fileName: string;
  error: "wrong" | null;
  /** Changes with every prompt, so the dialog can start with an empty field. */
  attempt: number;
  submit(password: string): void;
  cancel(): void;
}

const isPdf = (path: string) => path.toLowerCase().endsWith(".pdf");
const fileNameOf = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** Opening files (picker, drop, recent list, start-up file), the password prompt and the recent list. */
export function useOpenFiles() {
  const backend = useBackend();
  const { dispatch } = useDocuments();
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const recentRef = useRef<RecentFile[]>([]);
  const [error, setError] = useState<CommandError | null>(null);
  const [password, setPassword] = useState<PasswordRequest | null>(null);
  const attempts = useRef(0);
  const started = useRef(false);

  const updateRecent = useCallback(
    (change: (files: RecentFile[]) => RecentFile[]) => {
      const next = change(recentRef.current);
      recentRef.current = next;
      setRecent(next);
      backend.saveRecentFiles(next).catch(() => {
        // The list is a convenience; failing to store it must not disturb opening.
      });
    },
    [backend],
  );

  const askPassword = useCallback(
    (path: string, wrong: boolean) =>
      new Promise<string | null>((resolve) => {
        setPassword({
          fileName: fileNameOf(path),
          error: wrong ? "wrong" : null,
          attempt: ++attempts.current,
          submit: (entered) => resolve(entered),
          cancel: () => {
            setPassword(null);
            resolve(null);
          },
        });
      }),
    [],
  );

  const openOne = useCallback(
    async (path: string) => {
      let secret: string | undefined;
      for (;;) {
        try {
          const info = await backend.openDocument(path, secret);
          setPassword(null);
          setError(null);
          dispatch({ type: "opened", info });
          backend.hasText(info.id).then(
            (hasText) => dispatch({ type: "textKnown", id: info.id, hasText }),
            () => {}, // unknown stays null: the search explains itself later
          );
          const entry: RecentFile = { path, name: info.file_name, openedAt: new Date().toISOString() };
          updateRecent((files) => [entry, ...files.filter((f) => f.path !== path)].slice(0, MAX_RECENT));
          return;
        } catch (e) {
          const failure = toCommandError(e);
          if (failure.kind === "password_required" || failure.kind === "wrong_password") {
            const entered = await askPassword(path, failure.kind === "wrong_password");
            if (entered === null) return;
            secret = entered;
            continue;
          }
          setPassword(null);
          if (failure.kind === "io") updateRecent((files) => files.filter((f) => f.path !== path));
          setError(failure);
          return;
        }
      }
    },
    [backend, dispatch, askPassword, updateRecent],
  );

  // Opens run one after another, so at most one password prompt is ever waiting for an answer.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const openPaths = useCallback(
    (paths: string[]): Promise<void> => {
      const run = queue.current.then(async () => {
        for (const path of paths) await openOne(path);
      });
      queue.current = run.catch(() => {});
      return run;
    },
    [openOne],
  );

  const openPicker = useCallback(async () => {
    try {
      const path = await backend.pickPdf();
      if (path) await openPaths([path]);
    } catch (e) {
      setError(toCommandError(e));
    }
  }, [backend, openPaths]);

  // Recent list first, then the start-up file, exactly once (StrictMode runs effects twice).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const files = await backend.loadRecentFiles();
        recentRef.current = files;
        setRecent(files);
      } catch {
        // Start with an empty list.
      }
      try {
        const path = await backend.startupFile();
        if (path) await openPaths([path]);
      } catch (e) {
        setError(toCommandError(e));
      }
    })();
  }, [backend, openPaths]);

  const openPathsRef = useRef(openPaths);
  openPathsRef.current = openPaths;

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    backend
      .onFilesDropped((paths) => {
        const pdfs = paths.filter(isPdf);
        if (pdfs.length > 0) void openPathsRef.current(pdfs);
      })
      .then(
        (stop) => {
          if (cancelled) stop();
          else unlisten = stop;
        },
        () => {},
      );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [backend]);

  const dismissError = useCallback(() => setError(null), []);

  return { recent, openPaths, openPicker, error, dismissError, password };
}
