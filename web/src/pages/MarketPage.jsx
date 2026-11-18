// Market page: official price history (+ estimate) and today's live offers for one product.
import { useEffect, useState } from "react";
import { officialHistory, forecastsFor, offersForProduct } from "../lib/db.js";
import { t, nameOf } from "../lib/i18n.js";
import { som, pct } from "../lib/util.js";
import PriceChart from "../components/PriceChart.jsx";
import Badge from "../components/Badge.jsx";
import SellerCard from "../components/SellerCard.jsx";
import SellerName from "../components/SellerName.jsx";

export default function MarketPage({ refData: ref, active }) {
  const [product, setProduct] = useState("rice");
  const [sourceId, setSourceId] = useState("tsh_city_market");
  const [data, setData] = useState(null);       // { history, forecasts, offers }
  const [openSeller, setOpenSeller] = useState(null);   // seller_id whose card is open

  // reload whenever the page is opened or the choice changes (so a new seller offer shows up)
  useEffect(() => {
    if (!active) return;
    let stale = false;
    const source = ref.sources.find((s) => s.source_id === sourceId);
    Promise.all([
      officialHistory([product], [sourceId], "2023-01-01"),
      source.region_id === "tashkent_city" ? forecastsFor([product]) : [],   // the estimate exists for Tashkent city only
      offersForProduct(product),
    ]).then(([history, forecasts, offers]) => { if (!stale) setData({ history, forecasts, offers }); });
    return () => { stale = true; };
  }, [active, product, sourceId, ref]);

  const products = [...ref.products].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  // one option per official source: regions with data + national stores; Tashkent city first
  const sources = [...ref.sources].sort((a, b) => (a.region_id === "tashkent_city" ? -1 : b.region_id === "tashkent_city" ? 1 : 0));
  const regionName = (id) => nameOf(ref.regions.find((r) => r.region_id === id)) || id;

  return (
    <section className="page" hidden={!active}>
      <h1 className="page-title">{t("market_title")}</h1>
      <div className="card">
        <div className="row">
          <label><span>{t("m_product")}</span>
            <select value={product} onChange={(e) => setProduct(e.target.value)}>
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{nameOf(p)}</option>)}
            </select></label>
          <label><span>{t("m_region")}</span>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {sources.map((s) => <option key={s.source_id} value={s.source_id}>{s.region_id ? regionName(s.region_id) : t("m_stores")}</option>)}
            </select></label>
        </div>
        {data && <PriceChart history={data.history} forecasts={data.forecasts} tall />}
        <p className="hint">{t("m_chart_hint")}</p>
      </div>
      <div className="card">
        <h3>{t("offers_now")}</h3>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>{t("col_seller")}</th><th>{t("col_region")}</th><th className="num">{t("col_price")}</th><th className="num">{t("col_vs")}</th></tr></thead>
          <tbody>
            {data?.offers.length ? data.offers.map((o) => {
              const cls = o.vs_official_pct >= 20 ? "flag-high" : o.vs_official_pct <= -20 ? "flag-low" : o.vs_official_pct < 0 ? "down" : "";
              return (
                <tr key={o.offer_id}>
                  <td><SellerName offer={o} onOpen={setOpenSeller} /> <Badge offer={o} /><span className="sub">{o.market_name ?? ""}</span></td>
                  <td>{regionName(o.region_id)}</td>
                  <td className="num">{som(o.price_som)}{o.source !== "olx" && <span className="sub">min {Number(o.min_qty)}</span>}</td>
                  <td className="num"><span className={cls}>{pct(o.vs_official_pct)}</span></td>
                </tr>
              );
            }) : <tr><td colSpan={4} className="muted">{data ? t("no_offers") : "…"}</td></tr>}
          </tbody>
        </table></div>
      </div>
      {openSeller && <SellerCard sellerId={openSeller} refData={ref} onClose={() => setOpenSeller(null)} />}
    </section>
  );
}
