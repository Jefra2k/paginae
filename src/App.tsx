import { useTranslation } from "react-i18next";
import { AppShell } from "./app/AppShell";

function App() {
  const { t } = useTranslation();
  return <AppShell center={<p>{t("start.headline")}</p>} />;
}

export default App;
