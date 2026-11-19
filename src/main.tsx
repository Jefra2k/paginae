import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BackendProvider } from "./backend/BackendContext";
import { tauriBackend } from "./backend/tauriBackend";
import { initI18n } from "./i18n";
import "./styles/tokens.css";
import "./styles/app.css";

initI18n();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BackendProvider backend={tauriBackend}>
      <App />
    </BackendProvider>
  </React.StrictMode>,
);
