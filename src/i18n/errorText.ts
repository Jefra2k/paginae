import type { TFunction } from "i18next";
import { isCommandError, type CommandError } from "../backend/types";

export function toCommandError(e: unknown): CommandError {
  return isCommandError(e) ? e : { kind: "unknown", message: String(e) };
}

/** The catalog text for an error: `errors.<kind>`, else `errors.unknown` with the message. */
export function errorText(t: TFunction, error: CommandError): string {
  const key = `errors.${error.kind}`;
  return error.kind !== "unknown" && t(key, { defaultValue: "" }) !== ""
    ? t(key)
    : t("errors.unknown", { message: error.message });
}
