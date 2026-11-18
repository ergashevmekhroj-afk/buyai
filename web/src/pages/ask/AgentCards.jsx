// The four agent cards that light up in order, each with a short live feed of what it found.
import { useEffect, useRef, useState } from "react";
import { t, nameOf } from "../../lib/i18n.js";
import { som, mln, pct, qtyText, monthName, perUnit } from "../../lib/util.js";
import ProductIcon from "../../components/ProductIcon.jsx";
import { PriceRange, Sparkline } from "../../components/MiniCharts.jsx";
import { DEFAULT_QTY } from "../../lib/agents/planner.js";
import CountUp from "../../components/CountUp.jsx";
import Badge from "../../components/Badge.jsx";
import { AGENTS } from "../../agentsInfo.js";
import { speak, stopSpeaking } from "../../lib/voice.js";

const STATE_KEY = { wait: "st_wait", running: "st_run", done: "st_done" };
export const SIGNAL = { buy: "sig_buy", wait: "sig_wait", neutral: "sig_neutral" };

export default function AgentCards({ cards, phase, refData }) {
  const [playing, setPlaying] = useState(null);       // which agent (1..4) is speaking right now
  const feeds = useRef([]);                           // each card's feed, to read out what is on screen
  function toggleVoice(a, i) {
    if (playing === a.n) { stopSpeaking(); setPlaying(null); return; }
    setPlaying(a.n);
    speak(spokenText(feeds.current[i]), () => setPlaying((p) => (p === a.n ? null : p)), a.voice);
  }
  return (
    <>
      <h2 className="section-title">
        {phase === "running" && <span className="spinner" />}
        {t(phase === "running" ? "agents_title" : "agents_title_done")}
      </h2>
      <div className={`pipeline ${phase === "running" ? "running" : ""}`}>
        {AGENTS.map((a, i) => (
          <article key={a.n} className={`agent ${cards[i].state === "wait" ? "" : cards[i].state}`}>
            <header>
              <span className="avatar"><img src={a.img} alt="" width="56" height="56" /><i className="badge-num">{a.n}</i></span>
              <div><h3>{t(`a${a.n}_name`)}</h3><p className="epithet">{t(`a${a.n}_title`)}</p><p>{t(`a${a.n}_role`)}</p></div>
              <span className="state">{t(STATE_KEY[cards[i].state])}</span>
              {cards[i].state === "done" && (
                <button type="button" className={`agent-voice ${playing === a.n ? "on" : ""}`} onClick={() => toggleVoice(a, i)}
                  title={t(playing === a.n ? "stop_reading" : "read_aloud")} aria-label={`${t(`a${a.n}_name`)}: ${t(playing === a.n ? "stop_reading" : "read_aloud")}`}>
                  {playing === a.n ? "■" : "🔊"}
                </button>)}
            </header>
            <div className="feed" ref={(el) => (feeds.current[i] = el)}>{cards[i].items.map((it) => <FeedItem key={it.id} it={it} refData={refData} />)}</div>
          </article>
        ))}
      </div>
    </>
  );
}

// What an agent says out loud = the lines on its card, without buttons, tables and small print.
function spokenText(feed) {
  if (!feed) return "";
  const copy = feed.cloneNode(true);
  copy.querySelectorAll(".counter").forEach((el) => el.closest(".line")?.remove());   // "123 / 291 offers checked"
  copy.querySelectorAll(".flag-btn").forEach((el) => el.replaceWith(el.textContent.replace(/[▾▴]/g, "")));  // "3 offers flagged"
  copy.querySelectorAll("button, .proof, .scan, small.muted, .badge, svg, .prange, .flag-list .row-item").forEach((el) => el.remove());
  // read only the first 2 warnings; the rest stay on screen (shorter = faster and fewer VoiceLab credits)
  [...copy.querySelectorAll(".row-item.flag, .row-item.flag-low")].slice(2).forEach((el) => el.closest(".line")?.remove());
  copy.querySelectorAll(".money > *").forEach((el) => el.append(" "));              // "Kerak 4,7 mln so'm Bor ..."
  copy.querySelectorAll(".tagx").forEach((el) => el.append(", "));     // "Guruch 200 kg, Yog' 100 litr, ..."
  copy.querySelectorAll("br").forEach((el) => el.replaceWith(". "));
  return [...copy.children].map((el) => el.textContent.replace(/·/g, " ").replace(/[*⚠▾▴✓]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean).join(". ").replace(/\.\s*\./g, ".").slice(0, 600);
}

// One line in an agent's feed. "it.kind" says what to show; the numbers are formatted here.
function FeedItem({ it, refData: ref }) {
  const product = (id) => ref.products.find((p) => p.product_id === id);
  const regionName = (id) => nameOf(ref.regions.find((r) => r.region_id === id)) || id;
  const line = (children) => <div className="line">{children}</div>;

  switch (it.kind) {
    case "muted": return line(<span className="muted">{t(it.key, it.params)}</span>);
    case "text": return line(t(it.key));
    case "offTopic": return line(<div className="off-topic">{t("p_off_topic")}</div>);
    case "sentence": return line(<div className="sentence"><Highlighted text={it.text} spans={it.spans} /></div>);
    case "tags": return (
      <div className="extract">
        {it.tags.map((tg, i) => {
          if (tg.type === "item") { const p = product(tg.product_id); return <span key={i} className="tagx"><ProductIcon id={tg.product_id} size={16} /> {nameOf(p)} · {tg.fromBudget ? t("p_from_budget") : <>{qtyText(tg.quantity, p.unit)}{tg.defaulted ? "*" : ""}</>}</span>; }
          const label = tg.type === "cash" ? t("p_cash") : t("p_deadline");
          const value = tg.value == null ? t("p_not_said") : tg.type === "cash" ? mln(tg.value) : t("p_days", { n: tg.value });
          return <span key={i} className={`tagx ${tg.value == null ? "grey" : ""}`}>{label}: {value}</span>;
        })}
      </div>);
    case "groups": return line(<small className="muted">{t("p_groups", { groups: it.groups.map((g) => t(`grp_${g}`)).join(", "), n: it.n })}</small>);
    case "budget": return line(
      <div className="budget-split">💰 {t("s_budget", { cash: mln(it.cash), n: it.n, share: mln(it.share) })}</div>);
    case "defaultQty": return line(<small className="muted">* {t("p_default_qty", { n: DEFAULT_QTY })}</small>);
    case "source": {
      const by = { gemini: "Gemini", claude: "Claude" }[it.source];
      return line(<small className="muted">{by ? t("p_by_claude").replace("Claude", by) : t("p_by_keywords")}</small>);
    }
    case "counter": return line(<><span className="counter">{it.seen}</span> / {t("s_checked", { n: it.total })}</>);
    case "label": return line(<div className="label"><ProductIcon id={it.product_id} size={18} /> {nameOf(product(it.product_id))}</div>);
    case "scan": {
      // while scanning: offers appear one by one; then one plain line with the cheapest delivered offer
      if (it.best) {
        const o = it.best;
        return (
          <div className="line">
            <div className="best-offer">
              <div className="bo-top"><b className="bo-price">{som(o.price_som)}</b><small>{perUnit(product(it.unit)?.unit)}</small>
                <span className="bo-total">{t("s_total")} {mln(o.cost)}</span></div>
              <div className="bo-seller">{o.seller_name} · {regionName(o.region_id)}</div>
              {it.all.length > 1 && <PriceRange offers={it.all} chosen={o} official={o.official_avg_som} />}
            </div>
            {it.others > 0 && <OfferList all={it.all} best={o} others={it.others} unit={product(it.unit)?.unit} regionName={regionName} />}
          </div>);
      }
      return (
        <div className="scan">
          {it.rows.map((o) => (
            <div key={o.offer_id} className="row-item"><span>{o.seller_name} <small>{regionName(o.region_id)}</small></span><span>{som(o.price_som)}</span></div>
          ))}
        </div>);
    }
    case "verdictLine": {
      // one compact block per product: picture, buy/wait, % vs official, small price chart, warnings folded
      const cheaper = it.vs != null && it.vs < 0;
      return line(
        <div className="verdict-block">
          <div className="vb-head"><ProductIcon id={it.product_id} size={20} /><b>{nameOf(product(it.product_id))}</b>
            <span className={`signal ${it.signal}`}>{t(SIGNAL[it.signal])}</span></div>
          <div className="vb-body">
            <div className={`vb-vs ${cheaper ? "down" : it.vs != null ? "up" : ""}`}>
              {it.vs == null ? <small className="muted">{t("m_no_official")}</small> : <><b>{pct(it.vs)}</b><small>{t("official")}</small></>}
            </div>
            {it.series?.length > 1 && <Sparkline series={it.series} estimate={it.estimate ?? []} />}
          </div>
          {it.outlookPct != null && <small className="muted">{t("m_next")}: {pct(it.outlookPct)}</small>}
          {it.flags?.length > 0 && <FlagList flags={it.flags} />}
        </div>);
    }
    case "flag": {
      const o = it.offer, high = o.vs_official_pct > 0;
      return line(<div className={`row-item ${high ? "flag" : "flag-low"}`}><span>⚠ {t(high ? "a_flag" : "a_flag_low", { seller: o.seller_name, pct: pct(Math.abs(o.vs_official_pct)).replace("+", "") })} <Badge offer={o} /></span></div>);
    }
    case "flagSummary": return line(<small className="muted">{it.n ? t("m_flags", { n: it.n }) : t("m_no_flags")}</small>);
    case "money": return line(
      <div className="money">
        <span>{t("f_need")}</span><b><CountUp to={it.need} format={mln} /></b>
        <span>{t("f_have")}</span><b>{it.have != null ? <CountUp to={it.have} format={mln} /> : "—"}</b>
      </div>);
    case "gauge": return <Gauge pct={it.pct} short={it.short} />;
    case "enough": return line(<b className="down">{t("f_enough", { left: mln(it.left) })}</b>);
    case "short": return line(<b className="up">{t("f_short", { short: mln(it.short) })}</b>);
    case "interest": return line(t("f_interest", { rate: it.rate, sum: som(it.sum) }));
    case "wait": return line(waitText(it.riseCost));
    case "finVerdict": {
      // one line: enough cash, or how much is missing and whether a loan pays off
      if (it.verdict === "enough") return line(<b className="down">{t("fin_enough", { left: mln(it.left) })}</b>);
      if (it.verdict === "nocash") return line(<span className="muted">{t("f_nocash")}</span>);
      return line(<><b className="up">{t("fin_short", { short: mln(it.short) })}</b><br />{t(it.verdict === "borrow" ? "fin_borrow" : "fin_wait", { sum: som(it.interest) })}</>);
    }
    case "loan": return line(<small>{t(it.loan.labelKey)}: {t("avg")} {it.loan.avg}% · {it.loan.banks.map((b) => `${b.bank} ${b.rate_pct}%`).join(", ")}</small>);
    default: return null;
  }
}

// Tarozibon ota's warnings, folded: "⚠ 3 offers flagged" opens the list
function FlagList({ flags }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flag-list">
      <button type="button" className="flag-btn" aria-expanded={open} onClick={() => setOpen(!open)}>⚠ {t("m_flags", { n: flags.length })} {open ? "▴" : "▾"}</button>
      {open && flags.map((o) => {
        const high = o.vs_official_pct > 0;
        return <div key={o.offer_id} className={`row-item ${high ? "flag" : "flag-low"}`}><span>{t(high ? "a_flag" : "a_flag_low", { seller: o.seller_name, pct: pct(Math.abs(o.vs_official_pct)).replace("+", "") })} <Badge offer={o} /></span></div>;
      })}
    </div>);
}

// "cheaper than N other offers" is a button: it opens every offer Dallol compared, ranked by delivered cost,
// so the claim can be checked. The chosen offer is highlighted; overpriced / suspiciously cheap ones are marked.
function OfferList({ all, best, others, unit, regionName }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="proof-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t("s_more", { n: others })} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="proof">
          <table>
            <thead><tr><th>#</th><th>{t("col_seller")}</th><th className="num">{t("col_price")}</th><th className="num">{t("s_min")}</th><th className="num">{t("delivery")}</th><th className="num">{t("s_total")}</th></tr></thead>
            <tbody>
              {all.map((o, i) => {
                const flag = o.vs_official_pct >= 20 ? "high" : o.vs_official_pct <= -20 ? "low" : "";
                return (
                  <tr key={o.offer_id} className={`${o === best ? "chosen" : ""} ${flag}`}>
                    <td>{i + 1}</td>
                    <td>{o.seller_name} <small>{regionName(o.region_id)}</small>{o.is_demo && <span className="badge demo">{t("demo")}</span>}
                      {flag && <small className={flag === "high" ? "flag-high" : "flag-low"}> ⚠ {t(flag === "high" ? "m_flag_high" : "m_flag_low")}</small>}</td>
                    <td className="num">{som(o.price_som)}</td>
                    <td className="num">{Number(o.min_qty)} {unit === "litre" ? "l" : unit === "10 pcs" ? "×10" : "kg"}</td>
                    <td className="num">{o.delivery_fee_som ? som(o.delivery_fee_som) : t("free")}</td>
                    <td className="num"><b>{mln(o.cost)}</b></td>
                  </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// cash bar that fills up after it appears
function Gauge({ pct: target, short }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = setTimeout(() => setW(target), 50); return () => clearTimeout(id); }, [target]);
  return <div className={`gauge ${short ? "short" : ""}`}><i style={{ width: `${w}%` }} /></div>;
}

// "if you wait a month, prices are expected to rise by X so'm"
export function waitText(riseCost) {
  if (Math.abs(riseCost) < 1000) return t("f_wait_flat");
  return t(riseCost > 0 ? "f_wait_up" : "f_wait_down", { sum: som(Math.abs(riseCost)) });
}

// highlight what Mirzo understood inside the sentence (products green, numbers blue)
function Highlighted({ text, spans }) {
  const sorted = [...(spans ?? [])].sort((a, b) => a.at - b.at || b.len - a.len);
  const out = [];
  let pos = 0;
  for (const s of sorted) {
    if (s.at < pos) continue;   // overlaps a span already drawn
    out.push(text.slice(pos, s.at));
    out.push(<mark key={s.at} className={s.kind === "num" ? "num" : ""}>{text.slice(s.at, s.at + s.len)}</mark>);
    pos = s.at + s.len;
  }
  out.push(text.slice(pos));
  return out;
}
