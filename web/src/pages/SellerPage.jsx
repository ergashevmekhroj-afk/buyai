// Seller page: post a price through the post_offer database function,
// and show "your price vs the official regional average" while typing.
import { useState } from "react";
import { postOffer } from "../lib/db.js";
import { t, nameOf } from "../lib/i18n.js";
import { som, pct, monthName, perUnit } from "../lib/util.js";

const EMPTY = { name: "", phone: "", consent: false, region: "tashkent_city", market: "", product: "rice", price: "", minQty: "10", fee: "0" };

export default function SellerPage({ refData: ref, hidden }) {
  const [f, setF] = useState(EMPTY);
  const [result, setResult] = useState(null);     // { cls: "ok" | "err" | "", text }
  const [sending, setSending] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const product = ref.products.find((p) => p.product_id === f.product);
  const products = [...ref.products].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const hasPhone = f.phone.trim() !== "";          // phone given -> consent required (personal data law)

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setResult({ cls: "", text: t("f_sending") });
    try {
      await postOffer({
        name: f.name.trim(), phone: f.phone.trim() || null, region: f.region, market: f.market.trim() || null, product: f.product,
        price: Math.round(Number(f.price)), minQty: Number(f.minQty), fee: Math.round(Number(f.fee)),
      });
      setResult({ cls: "ok", text: t("f_ok") });
    } catch (err) {
      setResult({ cls: "err", text: t("f_err", { msg: err.message }) });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="page" hidden={hidden}>
      <div className="seller-wrap">
        <h1 className="page-title">{t("seller_title")}</h1>
        <p className="muted">{t("seller_sub")}</p>
        <form className="card form" onSubmit={submit}>
          <label><span>{t("f_name")}</span><input value={f.name} onChange={set("name")} required minLength={2} maxLength={80} autoComplete="organization" /></label>
          <label><span>{t("f_phone")}</span><input value={f.phone} onChange={set("phone")} type="tel" maxLength={30} placeholder="+998 __ ___ __ __" autoComplete="tel" /></label>
          {hasPhone && <label className="check"><input type="checkbox" checked={f.consent} onChange={set("consent")} required /> <span>{t("f_consent")}</span></label>}
          <div className="row">
            <label><span>{t("f_region")}</span>
              <select value={f.region} onChange={set("region")} required>
                {ref.regions.map((r) => <option key={r.region_id} value={r.region_id}>{nameOf(r)}</option>)}
              </select></label>
            <label><span>{t("f_market")}</span><input value={f.market} onChange={set("market")} list="market-list" maxLength={80} placeholder={t("f_market_ph")} /></label>
          </div>
          <datalist id="market-list">{ref.markets.map((m) => <option key={m.name} value={m.name} />)}</datalist>
          <label><span>{t("f_product")}</span>
            <select value={f.product} onChange={set("product")} required>
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{nameOf(p)}</option>)}
            </select></label>
          <div className="row">
            <label><span>{t("f_price", { unit: perUnit(product.unit) })}</span><input value={f.price} onChange={set("price")} type="number" inputMode="numeric" min="1" max="9999999" required /></label>
            <label><span>{t("f_min")}</span><input value={f.minQty} onChange={set("minQty")} type="number" inputMode="decimal" min="0.1" step="any" required /></label>
          </div>
          <label><span>{t("f_fee")}</span><input value={f.fee} onChange={set("fee")} type="number" inputMode="numeric" min="0" required /></label>
          <p className="compare"><Compare refData={ref} region={f.region} product={f.product} price={Number(f.price)} /></p>
          <button className="btn-primary" type="submit" disabled={sending}>{t("f_submit")}</button>
          <p className={`result ${result?.cls ?? ""}`} aria-live="polite">{result?.text}</p>
        </form>
      </div>
    </section>
  );
}

// "Official average in this region was X. Your price: +12%" (flags 20%+ as overpriced, like the Market Analyst)
function Compare({ refData: ref, region, product, price }) {
  const b = ref.benchmark.find((x) => x.region_id === region && x.product_id === product);
  if (!b) return <span className="muted">{t("f_cmp_none")}</span>;
  const [before, after] = t("f_cmp_base", { month: monthName(b.month), price: "\u0000" }).split("\u0000");
  const base = <>{before}<b>{som(b.price_som)}</b>{after}</>;
  if (!price) return base;
  const diff = 100 * (price - b.price_som) / b.price_som;
  const cls = diff >= 20 ? "flag-high" : diff < 0 ? "down" : "";
  const note = diff >= 20 ? ` — ${t("f_cmp_high")}` : diff < 0 ? ` — ${t("f_cmp_low")}` : "";
  const [y1, y2] = t("f_cmp_yours", { pct: "\u0000" }).split("\u0000");
  return <>{base}. {y1}<span className={cls}>{pct(diff)}</span>{y2}{note}.</>;
}
