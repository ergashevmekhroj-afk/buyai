// Home dashboard (under the ask box): KPIs, price history chart, biggest movers, cheapest region per staple.
import { useEffect, useState } from "react";
import { officialHistory, forecastsFor, sourceHistory } from "../lib/db.js";
import { t, nameOf } from "../lib/i18n.js";
import { som, pct, monthName } from "../lib/util.js";
import PriceChart from "../components/PriceChart.jsx";
import CountUp from "../components/CountUp.jsx";

const CHART_PRODUCTS = ["rice", "oil_sunflower", "flour_first", "onion", "beef", "potatoes"];
const STAPLES = ["rice", "oil_sunflower", "flour_first", "onion", "carrot", "potatoes", "beef", "sugar", "eggs"];

export default function Dashboard({ refData: ref }) {
  const [chosen, setChosen] = useState("rice");
  const [chart, setChart] = useState(null);
  const [moversData, setMoversData] = useState(null);

  useEffect(() => {
    let stale = false;
    Promise.all([officialHistory([chosen], ["tsh_city_market"], "2024-01-01"), forecastsFor([chosen])])
      .then(([history, forecasts]) => { if (!stale) setChart({ history, forecasts }); });
    return () => { stale = true; };
  }, [chosen]);

  // 3-month movers in Tashkent city: the last 4 published months are enough
  useEffect(() => { sourceHistory("tsh_city_market", "2026-06-01").then(setMoversData); }, []);

  const product = (id) => ref.products.find((p) => p.product_id === id);
  const { offers, demo_offers: demo, live_offers: live, sellers } = ref.offerStats;   // counted in the database
  const regions = new Set(ref.sources.map((s) => s.region_id).filter(Boolean)).size;
  const month = ref.benchmark.map((b) => b.month).sort().at(-1);

  const moves = moversData && ref.products.map((p) => {
    const rows = moversData.filter((r) => r.product_id === p.product_id && r.price_som != null);
    if (rows.length < 4) return null;
    const lastRow = rows.at(-1), before = rows.at(-4);
    return { p, change: 100 * (lastRow.price_som - before.price_som) / before.price_som, price: lastRow.price_som };
  }).filter(Boolean).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
  const maxMove = moves ? Math.max(...moves.map((m) => Math.abs(m.change)), 1) : 1;

  return (
    <section className="dash">
      <div className="dash-head">
        <div><h2 className="section-title">{t("dash_title")}</h2><p className="muted">{t("dash_sub")}</p></div>
        <a href="#market" className="link">{t("dash_more")}</a>
      </div>
      <div className="kpis">
        <div className="kpi"><span>{t("kpi_offers")}</span><b><CountUp to={offers} /></b><small>{t("kpi_demo_note", { d: demo, l: live })}</small></div>
        <div className="kpi"><span>{t("kpi_sellers")}</span><b><CountUp to={sellers} /></b></div>
        <div className="kpi"><span>{t("kpi_regions")}</span><b><CountUp to={regions} /></b><small>/ 14</small></div>
        <div className="kpi"><span>{t("kpi_month")}</span><b>{monthName(month)}</b><small>stat.uz</small></div>
      </div>
      <div className="dash-grid">
        <div className="card">
          <div className="card-head"><h3>{t("chart_title")}</h3>
            <div className="chips small">
              {CHART_PRODUCTS.map((id) => <button key={id} type="button" className={`chip ${id === chosen ? "on" : ""}`} onClick={() => setChosen(id)}>{nameOf(product(id))}</button>)}
            </div>
          </div>
          {chart && <PriceChart history={chart.history} forecasts={chart.forecasts} />}
        </div>
        <div className="card">
          <h3>{t("movers_title")}</h3>
          <div className="movers">
            {!moves ? <p className="muted">…</p> : moves.map((m) => (
              <div className="mover" key={m.p.product_id}>
                <span>{nameOf(m.p)} <small className="muted">{som(m.price)}</small></span><b className={m.change > 0 ? "up" : "down"}>{pct(m.change)}</b>
                <div className="bar"><i style={{ width: `${(100 * Math.abs(m.change) / maxMove).toFixed(0)}%`, background: `var(${m.change > 0 ? "--amber" : "--green"})` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <h3>{t("cheapest_title")}</h3>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>{t("col_product")}</th><th>{t("cheapest_region")}</th><th className="num">{t("m_official")}</th><th className="num">{t("vs_tashkent")}</th></tr></thead>
          <tbody>
            {STAPLES.map((id) => {
              const prices = ref.benchmark.filter((b) => b.product_id === id);
              if (!prices.length) return null;
              const best = prices.reduce((a, b) => (b.price_som < a.price_som ? b : a));
              const tash = prices.find((b) => b.region_id === "tashkent_city");
              const diff = tash ? 100 * (best.price_som - tash.price_som) / tash.price_som : null;
              return (
                <tr key={id}>
                  <td><b>{nameOf(product(id))}</b></td>
                  <td>{nameOf(ref.regions.find((r) => r.region_id === best.region_id))} <span className="sub">{monthName(best.month)}</span></td>
                  <td className="num">{som(best.price_som)}</td>
                  <td className="num"><span className={diff < 0 ? "down" : ""}>{diff == null || best.region_id === "tashkent_city" ? "—" : pct(diff)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </section>
  );
}
