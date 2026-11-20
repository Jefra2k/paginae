import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React from "react";
import ReactDOM from "react-dom/client";
import { BackendProvider } from "../backend/BackendContext";
import { tauriBackend } from "../backend/tauriBackend";
import { initI18n } from "../i18n";
import "../styles/tokens.css";
import "./print.css";
import { PrintView } from "./PrintView";

const i18n = initI18n();
document.documentElement.lang = i18n.language;
document.title = i18n.t("print.title");
void getCurrentWindow().setTitle(i18n.t("print.title"));

const docId = Number(new URLSearchParams(window.location.search).get("id"));
const closePrintWindow = () => void invoke("close_print_window");
// Printed or cancelled: either way the window has done its job.
window.addEventListener("afterprint", closePrintWindow);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BackendProvider backend={tauriBackend}>
      <PrintView backend={tauriBackend} docId={docId} onClose={closePrintWindow} />
    </BackendProvider>
  </React.StrictMode>,
);
