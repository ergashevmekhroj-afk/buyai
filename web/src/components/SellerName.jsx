// A seller's name in tables. BuyAI sellers open their card; OLX ads open the original ad on OLX
// (we keep no OLX seller names or phones: the buyer contacts the seller there).
import { t } from "../lib/i18n.js";
import { som } from "../lib/util.js";

export default function SellerName({ offer: o, onOpen }) {
  if (o.url) return <a className="seller-link" href={o.url} target="_blank" rel="noopener noreferrer" title={t("olx_open")}>{o.seller_name} ↗</a>;
  return <button type="button" className="seller-link" onClick={() => onOpen(o.seller_id)}>{o.seller_name}</button>;
}

// "free", "15 000 so'm", or "to agree" (OLX ads do not say)
export const deliveryText = (o) => (o.delivery_fee_som == null ? t("delivery_ask") : o.delivery_fee_som ? som(o.delivery_fee_som) : t("free"));

// How an OLX price was turned into our unit, shown openly ("ad: 1 200 per piece -> per 10")
export const priceNote = (o) => (o.price_note && o.price_note !== "as_listed" ? t(`pn_${o.price_note}`, { raw: som(o.listed_price_som ?? 0) }) : null);
