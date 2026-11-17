// "How BuyAI earns" section on the Agents page: the 4 revenue streams and the cost of one user.
// All numbers come from lib/business.js and are labelled as plans / estimates.
import { t } from "../lib/i18n.js";
import * as B from "../lib/business.js";

const usd = (n) => (n < 0.1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`);

export default function BusinessModel() {
  const u = B.unitEconomics(1000);
  const streams = [
    ["bm_s1", { pct: B.SELLER_FEE * 100 }],
    ["bm_s2", { usd: B.BANK_FEE_USD }],
    ["bm_s3", { usd: B.DATA_SUB_USD }],
    ["bm_s4", { usd: B.PREMIUM_USD }],
  ];
  return (
    <section className="bm">
      <h2>{t("bm_title")}</h2>
      <p className="muted">{t("bm_sub")}</p>
      <div className="bm-streams">
        {streams.map(([k, p], i) => (
          <article key={k}><span className="step">0{i + 1}</span><h3>{t(`${k}_h`)}</h3><p>{t(`${k}_p`, p)}</p></article>
        ))}
      </div>

      <h3 className="bm-h">{t("bm_cost_title")} <span className="badge-est">{t("estimate")}</span></h3>
      <div className="table-wrap"><table className="table">
        <tbody>
          <tr><td>{t("bm_c_plan")}</td><td className="num">{usd(B.AI_USD_PER_PLAN)}</td></tr>
          <tr><td>{t("bm_c_ai", { n: B.PLANS_PER_MONTH })}</td><td className="num">{usd(u.ai)}</td></tr>
          <tr><td>{t("bm_c_host", { n: u.businesses.toLocaleString("en").replace(",", " ") })}</td><td className="num">{usd(u.hosting)}</td></tr>
          <tr><td><b>{t("bm_c_total")}</b></td><td className="num"><b>{usd(u.cost)}</b></td></tr>
          <tr><td>{t("bm_c_rev", { mln: B.BUYS_SOM_MONTH / 1e6, pct: B.SELLER_FEE * 100 })}</td><td className="num good">{usd(u.revenue)}</td></tr>
          <tr><td><b>{t("bm_c_margin")}</b></td><td className="num good"><b>{usd(u.margin)}</b></td></tr>
        </tbody>
      </table></div>
      <p className="hint">{t("bm_note")}</p>
    </section>
  );
}
