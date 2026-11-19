import { Info, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DocState } from "../state/documents";

type BannerKind = "xfa" | "noPrint";

/** Information lines about the open document (XFA form, printing locked), each dismissible. */
export function Banners({ doc }: { doc: DocState }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<BannerKind[]>([]);
  const shown: { kind: BannerKind; text: string }[] = [];
  if (doc.info.form === "xfa") shown.push({ kind: "xfa", text: t("banners.xfa") });
  if (doc.info.permissions.print === false) shown.push({ kind: "noPrint", text: t("banners.noPrint") });
  const visible = shown.filter((banner) => !dismissed.includes(banner.kind));
  if (visible.length === 0) return null;

  return (
    <div className="banners">
      {visible.map((banner) => (
        <div key={banner.kind} className="banner" role="status" data-testid={`banner-${banner.kind}`}>
          <Info size={16} aria-hidden="true" />
          <span className="banner-text">{banner.text}</span>
          <button
            type="button"
            className="icon-button banner-close"
            aria-label={t("actions.close")}
            title={t("actions.close")}
            onClick={() => setDismissed((d) => [...d, banner.kind])}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
