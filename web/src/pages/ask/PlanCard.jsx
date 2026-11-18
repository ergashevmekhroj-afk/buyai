// The final purchase plan: where to buy each product, totals, savings vs the official average,
// the finance verdict, an explanation (AI-written if available, else a template), loan rates and tax notes.
import { useEffect, useRef, useState } from "react";
import { AI_URL, AI_TIMEOUT_MS, SUPABASE_KEY } from "../../lib/config.js";
import { t, nameOf, lang } from "../../lib/i18n.js";
import { som, mln, pct, qtyText } from "../../lib/util.js";
import { FLAG_HIGH } from "../../lib/agents/marketAnalyst.js";
import { speak, stopSpeaking } from "../../lib/voice.js";
import { useLang } from "../../hooks.js";
import Badge from "../../components/Badge.jsx";
import ProductIcon from "../../components/ProductIcon.jsx";
import { SELLER_FEE, feeOnPlan } from "../../lib/business.js";
import { NARRATOR } from "../../agentsInfo.js";

const VERDICT = { enough: "v_enough", borrow: "v_borrow", wait: "v_wait", nocash: "v_nocash" };

export default function PlanCard({ result, refData: ref, soundOn }) {
  const lng = useLang();
  const [ai, setAi] = useState(null);          // { text, engine } from the AI, or null = template text
  const [reading, setReading] = useState(false);
  const spokenFor = useRef(null);             // speak once per new plan (not again on a language switch)
  const sound = useRef(soundOn);
  sound.current = soundOn;

  const { s, f, advice } = result;
  const product = (id) => ref.products.find((p) => p.product_id === id);
  const regionName = (id) => nameOf(ref.regions.find((r) => r.region_id === id)) || id;
  const template = t("tmpl", {
    items: s.lines.filter((l) => l.best).map((l) => `${nameOf(product(l.item.product_id))}: ${l.best.seller_name} (${regionName(l.best.region_id)}), ${som(l.best.price_som)}`).join("; "),
    total: mln(s.total), saved: mln(Math.max(0, s.savings)), verdict: t(VERDICT[f.verdict]),
  });
  const explanation = ai?.text ?? template;

  // Ask the AI for a friendlier explanation of the SAME numbers, in the current language
  useEffect(() => {
    setAi(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
    let text = null;
    fetch(AI_URL, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ mode: "explain", summary: summaryFor(result, ref) }) })
      .then((res) => (res.ok ? res.json() : null))
      .then((out) => { if (out?.text) { text = out.text; setAi({ text: out.text, engine: out.engine }); } })
      .catch(() => { /* keep the template text */ })
      .finally(() => {
        clearTimeout(timer);
        if (ctrl.signal.aborted && text == null && spokenFor.current === result.id) return;
        if (sound.current && spokenFor.current !== result.id) { spokenFor.current = result.id; speak(text ?? template, undefined, NARRATOR); }
      });
    return () => { ctrl.abort(); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, lng]);

  function toggleRead() {
    if (reading) { stopSpeaking(); setReading(false); return; }
    setReading(true);
    speak(explanation, () => setReading(false), NARRATOR);
  }

  const vs = (p) => {
    if (p == null) return <span className="muted">{t("m_no_official")}</span>;
    const cls = p >= FLAG_HIGH ? "flag-high" : p <= -FLAG_HIGH ? "flag-low" : p < 0 ? "down" : "";
    return <span className={cls}>{pct(p)}</span>;
  };
  const by = ai ? ({ gemini: "Gemini", claude: "Claude" }[ai.engine] ?? "AI") : null;

  return (
    <>
      <div className="plan-head"><h2>{t("plan_title")}</h2>
        <button type="button" className={`btn-ghost ${reading ? "on" : ""}`} onClick={toggleRead}>🔊 <span>{t(reading ? "stop_reading" : "read_aloud")}</span></button>
      </div>
      {/* final advice: when to buy each product, and the whole plan in two lines (all numbers from code) */}
      <div className="final-advice">
        <h3>💡 {t("fa_title")}</h3>
        <ul>
          {advice.items.map((it) => (
            <li key={it.product_id} className={`fa-${it.action}`}>
              <b>{nameOf(product(it.product_id))}:</b> {t(`fa_${it.reason}`, { pct: pct(Math.abs(it.pct ?? 0)).replace("+", ""), sum: som(it.save), days: it.days })}
              <small>{t("fa_where", { seller: it.seller, region: regionName(it.region_id), price: som(it.price) })}</small>
            </li>
          ))}
        </ul>
        <p className="fa-sum">{t("fa_total", { total: mln(s.total), saved: mln(Math.max(0, s.savings)) })}
          {advice.timingSave >= 1000 && <> {t("fa_timing", { sum: som(advice.timingSave) })}</>}
          {" "}<b>{t(VERDICT[f.verdict])}</b></p>
        <p className="hint">{t("fa_note")}</p>
      </div>
      <div className="table-wrap"><table className="table plan-table">
        <thead><tr><th>{t("col_product")}</th><th>{t("col_where")}</th><th className="num">{t("col_price")}</th><th className="num">{t("col_vs")}</th><th className="num">{t("col_sum")}</th></tr></thead>
        <tbody>
          {s.lines.map((l) => {
            const p = product(l.item.product_id);
            if (!l.best) return <tr key={p.product_id}><td><span className="p-cell"><ProductIcon id={p.product_id} size={26} /><span><b>{nameOf(p)}</b></span></span></td><td colSpan={4} className="muted">{t("no_offer_row")}</td></tr>;
            const o = l.best;
            return (
              <tr key={p.product_id}>
                <td><span className="p-cell"><ProductIcon id={p.product_id} size={26} /><span><b>{nameOf(p)}</b><span className="sub">{qtyText(o.buyQty, p.unit)}</span>
                  {o.buyQty > l.item.quantity && <span className="sub">{t("min_order", { q: qtyText(o.min_qty, p.unit) })}</span>}</span></span></td>
                <td>{o.seller_name} <Badge offer={o} /><span className="sub">{o.market_name ?? ""}, {regionName(o.region_id)}{o.phone ? `, ${o.phone}` : ""}</span></td>
                <td className="num">{som(o.price_som)}<span className="sub">{t("delivery")} {o.delivery_fee_som ? som(o.delivery_fee_som) : t("free")}</span></td>
                <td className="num">{vs(o.vs_official_pct)}<span className="sub">{t("official")} {som(o.official_avg_som)}</span></td>
                <td className="num"><b>{mln(o.goodsCost)}</b></td>
              </tr>);
          })}
        </tbody>
      </table></div>
      <div className="totals">
        <div className="total-box"><span>{t("t_goods")}</span><b>{mln(s.goods)}</b></div>
        <div className="total-box"><span>{t("t_delivery")}</span><b>{mln(s.delivery)}</b></div>
        <div className="total-box"><span>{t("t_total")}</span><b>{mln(s.total)}</b></div>
        <div className="total-box good"><span>{t("t_savings")}</span><b>{mln(s.savings)}</b></div>
      </div>
      {/* how BuyAI earns on this plan (planned business model, see lib/business.js) */}
      <div className="earn-box">
        <b>{t("earn_title")}</b>
        <span>{t("earn_seller", { fee: som(feeOnPlan(s.total)), pct: SELLER_FEE * 100 })}</span>
        {f.verdict === "borrow" && <span>{t("earn_bank")}</span>}
        <a href="#team">{t("earn_more")}</a>
      </div>
      <p className="explain">{explanation}<span className="src">{by ? t("explain_claude").replace("Claude", by) : t("explain_template")}</span></p>
      <details><summary>{t("rates_title", { date: f.ratesAsOf })}</summary>
        <div className="table-wrap"><table className="table"><tbody>
          {f.loans.flatMap((l) => l.banks.map((b) => <tr key={l.labelKey + b.bank}><td>{t(l.labelKey)}</td><td>{b.bank}</td><td className="num">{b.rate_pct}%</td></tr>))}
        </tbody></table></div>
        <p className="hint">{t("rates_note", { rate: f.policyRate })}</p>
      </details>
      <details><summary>{t("tax_title")}</summary>
        <ul><li>{t("tax_1", { std: f.tax.std, ip: f.tax.ip })}</li><li>{t("tax_2", { lim: f.tax.lim })}</li><li>{t("tax_3")}</li></ul>
        <p className="hint">{t("tax_note")}</p>
      </details>
    </>
  );
}

// The numbers the AI may use (it only rewrites them as friendly text; it never computes)
function summaryFor({ s, a, f, advice }, ref) {
  const product = (id) => ref.products.find((p) => p.product_id === id);
  const regionName = (id) => nameOf(ref.regions.find((r) => r.region_id === id)) || id;
  return {
    language: lang,
    items: s.lines.map((l) => {
      const p = product(l.item.product_id), pa = a.products.find((x) => x.product_id === l.item.product_id);
      return { product: nameOf(p), quantity: l.best?.buyQty ?? l.item.quantity, unit: p.unit, seller: l.best?.seller_name ?? null,
        demo_seller: l.best?.is_demo ?? null, region: l.best ? regionName(l.best.region_id) : null, price_som: l.best?.price_som ?? null,
        official_avg_som: l.best?.official_avg_som ?? null, vs_official_pct: l.best?.vs_official_pct ?? null,
        signal: pa?.signal, next_month_change_pct_estimate: pa?.outlookPct };
    }),
    overpriced_offers_flagged: a.products.flatMap((p) => p.flagged.map((o) => ({ seller: o.seller_name, vs_official_pct: o.vs_official_pct }))),
    goods_som: s.goods, delivery_som: s.delivery, total_som: s.total, savings_vs_official_som: Math.round(s.savings),
    cash_som: f.cash, shortfall_som: f.shortfall, verdict: f.verdict, best_loan_rate_pct: f.bestRate,
    one_month_interest_som: f.interest && Math.round(f.interest), expected_price_change_cost_som: Math.round(f.riseCost),
    when_to_buy: advice.items.map((it) => ({ product: nameOf(product(it.product_id)), action: it.action, reason: it.reason,
      wait_days: it.days ?? null, expected_change_pct: it.pct != null ? Math.round(it.pct * 10) / 10 : null, saves_som: it.save ? Math.round(it.save) : null })),
  };
}
