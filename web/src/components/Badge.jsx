// Where an offer comes from: "OLX" (a real OLX.uz ad, read daily), "Live" (a seller registered in BuyAI),
// or "Demo" (old generated sample sellers, no longer shown to buyers).
import { t } from "../lib/i18n.js";

export default function Badge({ offer }) {
  if (offer.source === "olx") return <span className="badge olx">OLX</span>;
  return offer.is_demo ? <span className="badge demo">{t("demo")}</span> : <span className="badge live">{t("live")}</span>;
}
