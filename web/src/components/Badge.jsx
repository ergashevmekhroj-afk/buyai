// "Demo" (generated seller) or "Live" (posted through the seller form) label on every offer.
import { t } from "../lib/i18n.js";

export default function Badge({ offer }) {
  return offer.is_demo ? <span className="badge demo">{t("demo")}</span> : <span className="badge live">{t("live")}</span>;
}
