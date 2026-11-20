import type { Backend } from "../backend/Backend";
import { toCommandError } from "../i18n/errorText";

/** Opens the print window; a failure is logged (there is no error surface reachable from every caller). */
export function startPrint(backend: Backend, docId: number): void {
  backend.printDocument(docId).catch((e: unknown) => {
    const { kind, message } = toCommandError(e);
    console.error(`printing document ${docId} failed (${kind}): ${message}`);
  });
}
