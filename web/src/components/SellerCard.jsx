// Pop-up card for one seller (opened by clicking a seller name): who they are, how to contact them,
// and all their current prices. Demo sellers are sample data, so they have no contact.
import { useEffect, useRef, useState } from "react";
import { sellerCard } from "../lib/db.js";
import { t, nameOf } from "../lib/i18n.js";
import { som, pct, perUnit } from "../lib/util.js";
import ProductIcon from "./ProductIcon.jsx";
import Badge from "./Badge.jsx";

export default function SellerCard({ sellerId, refData: ref, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    sellerCard(sellerId).then(setData).catch((e) => setError(e.message));
    const esc = (e) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [sellerId]);

  const s = data?.seller;
  const regionName = (id) => nameOf(ref.regions.find((r) => r.region_id === id)) || id;
  const product = (id) => ref.products.find((p) => p.product_id === id);
  const tel = s?.phone?.replace(/[^\d+]/g, "");

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal seller-card" role="dialog" aria-modal="true" aria-label={s?.name ?? ""} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={onClose} aria-label={t("close")}>×</button>
        {error && <p className="result err">{error}</p>}
        {!data && !error && <p className="muted">{t("loading")}</p>}
        {s && (
          <>
            <div className="sc-head">
              <span className="sc-avatar" aria-hidden="true">{s.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <h2>{s.name} <Badge offer={s} /></h2>
                <p className="muted">🏪 {s.market_name ?? t("sc_no_market")} · 📍 {regionName(s.region_id)}</p>
              </div>
            </div>

            <div className="sc-contact">
              {s.is_demo ? <p className="muted">{t("sc_demo")}</p>
                : s.phone ? <><a className="btn-primary sc-call" href={`tel:${tel}`}>📞 {s.phone}</a>
                    <a className="btn-ghost" href={`https://t.me/+${tel.replace("+", "")}`} target="_blank" rel="noopener noreferrer">✈️ Telegram</a></>
                : <p className="muted">{t("sc_no_phone")}</p>}
            </div>

            <h3 className="sc-h">{t("sc_offers", { n: data.offers.length })}</h3>
            <div className="sc-offers">
              {data.offers.map((o) => {
                const p = product(o.product_id);
                const cls = o.vs_official_pct >= 20 ? "flag-high" : o.vs_official_pct <= -20 ? "flag-low" : o.vs_official_pct < 0 ? "down" : "";
                return (
                  <div key={o.offer_id} className="sc-offer">
                    <ProductIcon id={o.product_id} size={28} />
                    <div className="sc-o-name"><b>{nameOf(p)}</b>
                      <small>min {Number(o.min_qty)} · {t("delivery")} {o.delivery_fee_som ? som(o.delivery_fee_som) : t("free")}</small></div>
                    <div className="sc-o-price"><b>{som(o.price_som)}</b><small>{perUnit(p?.unit)}</small>
                      {o.vs_official_pct != null && <small className={cls}>{pct(o.vs_official_pct)} {t("official")}</small>}</div>
                  </div>);
              })}
              {!data.offers.length && <p className="muted">{t("no_offers")}</p>}
            </div>
            {s.is_demo && <p className="hint">{t("sc_demo_note")}</p>}
          </>
        )}
      </div>
    </div>
  );
}
