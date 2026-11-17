// Home screen: ask box (text or voice), region picker, the 4 agents working live, the final plan.
import { plan, DEFAULT_QTY } from "../agents/planner.js";
import { scout } from "../agents/priceScout.js";
import { analyse, FLAG_HIGH } from "../agents/marketAnalyst.js";
import { advise } from "../agents/financeAdvisor.js";
import { AI_URL, AI_TIMEOUT_MS, SUPABASE_KEY } from "../config.js";
import { t, nameOf, lang, onLangChange } from "../i18n.js";
import { som, mln, pct, qtyText, sleep, esc, monthName, countUp } from "../util.js";
import { startListening, speak, stopSpeaking } from "../voice.js";

let ref;
let runId = 0;          // a newer run cancels the animation / explanation of an older one
let last = null;        // last result, re-drawn when the language changes
let soundOn = false;
const $ = (s) => document.querySelector(s);

// ---------------- setup ----------------
export function initAsk(reference) {
  ref = reference;
  try { soundOn = localStorage.getItem("sound") === "1"; } catch { /* ignore */ }
  setSoundButton();
  $("#sound-toggle").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("sound", soundOn ? "1" : "0"); } catch { /* ignore */ }
    if (!soundOn) stopSpeaking();
    setSoundButton();
  });

  // regions: Tashkent city + Jizzakh ticked by default (the demo script)
  const withData = new Set(ref.sources.map((s) => s.region_id).filter(Boolean));
  const ticked = new Set(["tashkent_city", "jizzakh"]);
  const drawRegions = () => {
    $("#region-list").innerHTML = ref.regions.map((r) => `
      <label class="chip ${ticked.has(r.region_id) ? "on" : ""}">
        <input type="checkbox" value="${r.region_id}" ${ticked.has(r.region_id) ? "checked" : ""}>
        ${esc(nameOf(r))}${withData.has(r.region_id) ? ' <span class="star">★</span>' : ""}</label>`).join("");
    summary();
  };
  const summary = () => {
    const names = ref.regions.filter((r) => ticked.has(r.region_id)).map(nameOf);
    $("#region-summary").textContent = names.length > 2 ? `${names.slice(0, 2).join(", ")} ${t("regions_more", { n: names.length - 2 })}` : names.join(", ");
  };
  $("#region-list").addEventListener("change", (e) => {
    e.target.checked ? ticked.add(e.target.value) : ticked.delete(e.target.value);
    e.target.closest(".chip").classList.toggle("on", e.target.checked);
    summary();
  });
  const panel = $("#region-panel");
  $("#region-btn").addEventListener("click", () => { panel.hidden = !panel.hidden; $("#region-btn").setAttribute("aria-expanded", String(!panel.hidden)); });
  $("#region-done").addEventListener("click", () => { panel.hidden = true; });
  drawRegions();

  // suggestions
  const drawSuggestions = () => document.querySelectorAll(".sugg").forEach((b) => { b.textContent = t(b.dataset.ex); });
  document.querySelectorAll(".sugg").forEach((b) => b.addEventListener("click", () => { $("#order-text").value = b.textContent; autoGrow(); run([...ticked]); }));
  drawSuggestions();

  // ask box
  const box = $("#order-text");
  const autoGrow = () => { box.style.height = "auto"; box.style.height = Math.min(box.scrollHeight, 120) + "px"; };
  box.addEventListener("input", autoGrow);
  box.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#ask-form").requestSubmit(); } });
  $("#ask-form").addEventListener("submit", (e) => { e.preventDefault(); run([...ticked]); });

  // microphone
  let session = null;
  $("#mic").addEventListener("click", async () => {
    if (session) { session.stop(); session = null; return; }
    session = await startListening({
      onText: (text) => { box.value = text; autoGrow(); run([...ticked]); },
      onState: (s) => {
        $("#mic").classList.toggle("rec", s === "listening");
        $("#mic").classList.toggle("busy", s === "working");
        $("#mic-status").textContent = { listening: t("mic_listening"), working: t("mic_working"), denied: t("mic_denied"), unsupported: t("mic_unsupported"), error: "", idle: "" }[s] ?? "";
        if (s !== "listening") session = null;
      },
    });
  });

  drawStats();
  onLangChange(() => { drawRegions(); drawSuggestions(); drawStats(); setSoundButton(); if (last) redraw(); });
}

function setSoundButton() {
  const b = $("#sound-toggle");
  b.setAttribute("aria-pressed", String(soundOn));
  b.title = t(soundOn ? "sound_on" : "sound_off");
}

function drawStats() {
  const offers = ref.offers.length, prices = ref.officialCount;
  $("#stats").innerHTML = [
    [prices, t("stat_prices")], [ref.products.length, t("stat_products")], [offers, t("stat_offers")], [4, t("stat_agents")],
  ].map(([n, label]) => `<div class="stat"><b data-n="${n}">0</b><span>${label}</span></div>`).join("");
  $("#stats").querySelectorAll("b").forEach((b) => countUp(b, Number(b.dataset.n)));
  const latest = ref.benchmark.map((b) => b.month).sort().at(-1);
  $("#asof").textContent = t("data_as_of", { month: monthName(latest) });
}

// ---------------- helpers ----------------
const productOf = (id) => ref.products.find((p) => p.product_id === id);
const regionName = (id) => nameOf(ref.regions.find((r) => r.region_id === id)) || id;
const badge = (o) => o.is_demo ? `<span class="badge demo">${t("demo")}</span>` : `<span class="badge live">${t("live")}</span>`;
const SIGNAL = { buy: "sig_buy", wait: "sig_wait", neutral: "sig_neutral" };

function agentCard(n) {
  const el = document.querySelector(`.agent[data-agent="${n}"]`);
  const feed = el.querySelector(".feed");
  return {
    el, feed,
    state(s) { el.className = `agent ${s === "wait" ? "" : s}`; el.querySelector(".state").textContent = t({ wait: "st_wait", running: "st_run", done: "st_done" }[s]); },
    add(html, cls = "line") { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; feed.appendChild(d); return d; },
    clear() { feed.innerHTML = ""; },
  };
}

// highlight what the Planner understood inside the sentence
function highlighted(sentence, spans) {
  const sorted = [...(spans ?? [])].sort((a, b) => a.at - b.at || b.len - a.len);
  let out = "", pos = 0;
  for (const s of sorted) {
    if (s.at < pos) continue;   // overlaps a span already drawn
    out += esc(sentence.slice(pos, s.at)) + `<mark class="${s.kind === "num" ? "num" : ""}">${esc(sentence.slice(s.at, s.at + s.len))}</mark>`;
    pos = s.at + s.len;
  }
  return out + esc(sentence.slice(pos));
}

// ---------------- the run ----------------
async function run(regionIds) {
  const text = $("#order-text").value.trim();
  if (!text) { $("#order-text").focus(); return; }
  if (!regionIds.length) { $("#region-panel").hidden = false; $("#mic-status").textContent = t("pick_region"); return; }
  stopSpeaking();
  const my = ++runId;
  const alive = () => my === runId;
  $("#region-panel").hidden = true;
  $("#send").disabled = true;
  $("#plan").hidden = true;
  $("#agents").hidden = false;
  $("#agents-title").innerHTML = `<span class="spinner"></span>${t("agents_title")}`;
  $("#pipeline").classList.add("running");
  const cards = [1, 2, 3, 4].map(agentCard);
  cards.forEach((c) => { c.clear(); c.state("wait"); });
  $("#agents").scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    cards[0].state("running");
    cards[0].add(`<span class="muted">${t("p_reading")}</span>`);
    const order = await plan(text, ref.products);
    if (!alive()) return;
    cards[0].clear();
    await drawPlanner(cards[0], text, order, 1);
    if (!order.items.length) { cards[0].add(t("p_nothing")); cards[0].state("done"); return; }
    cards[0].state("done");

    cards[1].state("running");
    cards[1].add(`<span class="muted">${t("s_loading", { r: regionIds.length })}</span>`);
    const s = await scout(order, regionIds);
    if (!alive()) return;
    cards[1].clear();
    await drawScout(cards[1], s, 1, alive);
    cards[1].state("done");

    cards[2].state("running");
    const a = await analyse(order, s, regionIds, ref);
    if (!alive()) return;
    await drawAnalyst(cards[2], a, 1, alive);
    cards[2].state("done");

    cards[3].state("running");
    const f = advise(order, s, a, ref);
    await drawFinance(cards[3], f, 1);
    cards[3].state("done");

    last = { text, order, s, a, f };
    finish(my);
    renderPlan();
    explainWithAI(my);
  } catch (err) {
    console.error(err);
    $("#plan").hidden = false;
    $("#plan").innerHTML = `<p class="result err">${esc(t("run_error", { msg: err.message }))}</p>`;
    finish(my);
  } finally {
    if (alive()) $("#send").disabled = false;
  }
}

function finish(my) {
  if (my !== runId) return;
  $("#pipeline").classList.remove("running");
  $("#agents-title").textContent = t("agents_title_done");
}

// redraw everything (no animation) after a language change
async function redraw() {
  const cards = [1, 2, 3, 4].map(agentCard);
  cards.forEach((c) => { c.clear(); c.state("done"); });
  const { text, order, s, a, f } = last;
  await drawPlanner(cards[0], text, order, 0);
  await drawScout(cards[1], s, 0, () => true);
  await drawAnalyst(cards[2], a, 0, () => true);
  await drawFinance(cards[3], f, 0);
  $("#agents-title").textContent = t("agents_title_done");
  renderPlan();
  explainWithAI(runId);
}

// ---------------- agent feeds (speed = 1 animates, 0 draws instantly) ----------------
async function drawPlanner(c, text, order, speed) {
  c.add(`<div class="sentence">${highlighted(text, order.spans)}</div>`);
  await sleep(300 * speed);
  const tags = c.add("", "extract");
  for (const it of order.items) {
    const p = productOf(it.product_id);
    tags.insertAdjacentHTML("beforeend", `<span class="tagx">${esc(nameOf(p))} · ${qtyText(it.quantity, p.unit)}${it.defaulted ? "*" : ""}</span>`);
    await sleep(220 * speed);
  }
  tags.insertAdjacentHTML("beforeend", `<span class="tagx ${order.cash_som ? "" : "grey"}">${t("p_cash")}: ${order.cash_som ? mln(order.cash_som) : t("p_not_said")}</span>`);
  tags.insertAdjacentHTML("beforeend", `<span class="tagx ${order.deadline_days != null ? "" : "grey"}">${t("p_deadline")}: ${order.deadline_days != null ? t("p_days", { n: order.deadline_days }) : t("p_not_said")}</span>`);
  if (order.items.some((i) => i.defaulted)) c.add(`<small class="muted">* ${t("p_default_qty", { n: DEFAULT_QTY })}</small>`);
  const by = { gemini: "Gemini", claude: "Claude" }[order.source];
  c.add(`<small class="muted">${by ? t("p_by_claude").replace("Claude", by) : t("p_by_keywords")}</small>`);
  await sleep(250 * speed);
}

async function drawScout(c, s, speed, alive) {
  const counter = c.add(`<span class="counter">0</span> / ${s.offersChecked} · ${t("s_checked", { n: s.offersChecked })}`);
  const num = counter.querySelector(".counter");
  let seen = 0;
  for (const l of s.lines) {
    const p = productOf(l.item.product_id);
    c.add(`<div class="label">${esc(nameOf(p))}</div>`);
    if (!l.candidates.length) { c.add(`<span class="muted">${t("s_none")}</span>`); continue; }
    const list = c.add("", "scan");
    // show offers in the order they arrive, then lift the cheapest to the top
    const shown = [...l.candidates].sort((x, y) => x.offer_id.localeCompare(y.offer_id)).slice(0, 6);
    if (!shown.includes(l.best)) shown[shown.length - 1] = l.best;
    for (const o of shown) {
      if (!alive()) return;
      list.insertAdjacentHTML("beforeend", `<div class="row-item" data-id="${o.offer_id}"><span>${esc(o.seller_name)} <small>${esc(regionName(o.region_id))}</small></span><span>${som(o.price_som)}</span></div>`);
      seen++; num.textContent = Math.min(seen, s.offersChecked);
      await sleep(90 * speed);
    }
    const bestEl = list.querySelector(`[data-id="${l.best.offer_id}"]`);
    bestEl.classList.add("best");
    bestEl.lastElementChild.innerHTML = `${som(l.best.price_som)} <small>· ${t("s_total")} ${mln(l.best.cost)}</small>`;
    list.prepend(bestEl);
    await sleep(250 * speed);
  }
  num.textContent = s.offersChecked;
}

async function drawAnalyst(c, a, speed, alive) {
  for (const pa of a.products) {
    if (!alive()) return;
    const p = productOf(pa.product_id);
    const trend = pa.trends.map((tr) => `${esc(regionName(tr.region_id))}: <b>${som(tr.price)}</b> <small>(${monthName(tr.month)}, ${t("m_trend3")} <span class="${tr.change3m > 0 ? "up" : "down"}">${pct(tr.change3m)}</span>)</small>`).join("<br>");
    c.add(`<div class="label">${esc(nameOf(p))} <span class="signal ${pa.signal}">${t(SIGNAL[pa.signal])}</span></div>`);
    c.add(`<small>${t("m_official")}:</small><br>${trend || `<span class="muted">${t("m_no_official")}</span>`}`);
    if (pa.outlookPct != null) c.add(`<small>${t("m_next")}: <b class="${pa.outlookPct > 0 ? "up" : "down"}">${pct(pa.outlookPct)}</b></small>`);
    await sleep(300 * speed);
    for (const o of pa.flagged) {
      c.add(`<div class="row-item ${o.vs_official_pct > 0 ? "flag" : "flag-low"}"><span>⚠ ${esc(o.seller_name)} ${badge(o)}<br><small>${t(o.vs_official_pct > 0 ? "m_flag_high" : "m_flag_low")}</small></span><b>${pct(o.vs_official_pct)}</b></div>`);
      await sleep(250 * speed);
    }
  }
  c.add(`<small class="muted">${a.flaggedCount ? t("m_flags", { n: a.flaggedCount }) : t("m_no_flags")}</small>`);
}

async function drawFinance(c, f, speed) {
  const money = c.add(`<div class="money"><span>${t("f_need")}</span><b class="need">0</b><span>${t("f_have")}</span><b class="have">${f.cash != null ? "0" : "—"}</b></div>`, "line");
  countUp(money.querySelector(".need"), f.total, (v) => mln(v), 700 * speed || 1);
  if (f.cash != null) countUp(money.querySelector(".have"), f.cash, (v) => mln(v), 700 * speed || 1);
  const gauge = c.add(`<i style="width:0"></i>`, `gauge ${f.shortfall ? "short" : ""}`);
  await sleep(50);
  gauge.firstChild.style.width = f.cash != null ? Math.min(100, 100 * f.cash / f.total) + "%" : "0%";
  await sleep(600 * speed);
  if (f.verdict === "enough") c.add(`<b class="down">${t("f_enough", { left: mln(f.cash - f.total) })}</b>`);
  if (f.verdict === "nocash") c.add(`<span class="muted">${t("f_nocash")}</span>`);
  if (f.shortfall) {
    c.add(`<b class="up">${t("f_short", { short: mln(f.shortfall) })}</b>`);
    await sleep(250 * speed);
    c.add(t("f_interest", { rate: f.bestRate, sum: som(f.interest) }));
    await sleep(250 * speed);
    c.add(waitText(f.riseCost));
  }
  for (const l of f.loans) {
    c.add(`<small>${t(l.labelKey)}: ${t("avg")} ${l.avg}% · ${l.banks.map((b) => `${esc(b.bank)} ${b.rate_pct}%`).join(", ")}</small>`);
  }
}

function waitText(riseCost) {
  if (Math.abs(riseCost) < 1000) return t("f_wait_flat");
  return t(riseCost > 0 ? "f_wait_up" : "f_wait_down", { sum: som(Math.abs(riseCost)) });
}

// ---------------- final plan ----------------
const VERDICT = { enough: "v_enough", borrow: "v_borrow", wait: "v_wait", nocash: "v_nocash" };

function templateText() {
  const { s, f } = last;
  const items = s.lines.filter((l) => l.best).map((l) => `${nameOf(productOf(l.item.product_id))}: ${l.best.seller_name} (${regionName(l.best.region_id)}), ${som(l.best.price_som)}`).join("; ");
  return t("tmpl", { items, total: mln(s.total), saved: mln(Math.max(0, s.savings)), verdict: t(VERDICT[f.verdict]) });
}

function vsText(p) {
  if (p == null) return `<span class="muted">${t("m_no_official")}</span>`;
  const cls = p >= FLAG_HIGH ? "flag-high" : p <= -FLAG_HIGH ? "flag-low" : p < 0 ? "down" : "";
  return `<span class="${cls}">${pct(p)}</span>`;
}

function renderPlan() {
  const { s, f } = last;
  const rule = (id) => ref.rules.find((r) => r.rule_id === id)?.value_text;
  const rows = s.lines.map((l) => {
    const p = productOf(l.item.product_id);
    if (!l.best) return `<tr><td><b>${esc(nameOf(p))}</b></td><td colspan="4" class="muted">${t("no_offer_row")}</td></tr>`;
    const o = l.best;
    const minNote = o.buyQty > l.item.quantity ? `<span class="sub">${t("min_order", { q: qtyText(o.min_qty, p.unit) })}</span>` : "";
    return `<tr>
      <td><b>${esc(nameOf(p))}</b><span class="sub">${qtyText(o.buyQty, p.unit)}</span>${minNote}</td>
      <td>${esc(o.seller_name)} ${badge(o)}<span class="sub">${esc(o.market_name ?? "")}, ${esc(regionName(o.region_id))}${o.phone ? ", " + esc(o.phone) : ""}</span></td>
      <td class="num">${som(o.price_som)}<span class="sub">${t("delivery")} ${o.delivery_fee_som ? som(o.delivery_fee_som) : t("free")}</span></td>
      <td class="num">${vsText(o.vs_official_pct)}<span class="sub">${t("official")} ${som(o.official_avg_som)}</span></td>
      <td class="num"><b>${mln(o.goodsCost)}</b></td></tr>`;
  }).join("");
  const loanRows = f.loans.flatMap((l) => l.banks.map((b) => `<tr><td>${t(l.labelKey)}</td><td>${esc(b.bank)}</td><td class="num">${b.rate_pct}%</td></tr>`)).join("");
  const plan = $("#plan");
  plan.innerHTML = `
    <div class="plan-head"><h2>${t("plan_title")}</h2>
      <button type="button" id="read-btn" class="btn-ghost">🔊 <span>${t("read_aloud")}</span></button></div>
    <div class="table-wrap"><table class="table plan-table">
      <thead><tr><th>${t("col_product")}</th><th>${t("col_where")}</th><th class="num">${t("col_price")}</th><th class="num">${t("col_vs")}</th><th class="num">${t("col_sum")}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div class="totals">
      <div class="total-box"><span>${t("t_goods")}</span><b>${mln(s.goods)}</b></div>
      <div class="total-box"><span>${t("t_delivery")}</span><b>${mln(s.delivery)}</b></div>
      <div class="total-box"><span>${t("t_total")}</span><b>${mln(s.total)}</b></div>
      <div class="total-box good"><span>${t("t_savings")}</span><b>${mln(s.savings)}</b></div>
    </div>
    <div class="verdict ${f.verdict}"><b>${t("finance")}:</b> ${t(VERDICT[f.verdict])}
      ${f.shortfall ? `<br>${t("f_short", { short: mln(f.shortfall) })}. ${t("f_interest", { rate: f.bestRate, sum: som(f.interest) })}. ${waitText(f.riseCost)}.` : ""}</div>
    <p class="explain" id="explain">${esc(templateText())}<span class="src">${t("explain_template")}</span></p>
    <details><summary>${t("rates_title", { date: esc(f.ratesAsOf) })}</summary>
      <div class="table-wrap"><table class="table"><tbody>${loanRows}</tbody></table></div>
      <p class="hint">${t("rates_note", { rate: esc(f.policyRate) })}</p></details>
    <details><summary>${t("tax_title")}</summary><ul>
      <li>${t("tax_1", { std: esc(f.tax.std), ip: esc(f.tax.ip) })}</li><li>${t("tax_2", { lim: esc(f.tax.lim) })}</li><li>${t("tax_3")}</li></ul>
      <p class="hint">${t("tax_note")}</p></details>`;
  plan.hidden = false;
  let reading = false;
  $("#read-btn").addEventListener("click", () => {
    if (reading) { stopSpeaking(); reading = false; setRead(false); return; }
    reading = true; setRead(true);
    speak(currentExplanation(), () => { reading = false; setRead(false); });
  });
  function setRead(on) { $("#read-btn").classList.toggle("on", on); $("#read-btn span").textContent = t(on ? "stop_reading" : "read_aloud"); }
  setTimeout(() => plan.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
}

const currentExplanation = () => $("#explain")?.firstChild?.textContent ?? "";

// Ask the AI for a friendlier explanation of the SAME numbers, in the current language
async function explainWithAI(my) {
  const { s, a, f } = last;
  const summary = {
    language: lang,
    items: s.lines.map((l) => {
      const p = productOf(l.item.product_id), pa = a.products.find((x) => x.product_id === l.item.product_id);
      return { product: nameOf(p), quantity: l.best?.buyQty ?? l.item.quantity, unit: p.unit, seller: l.best?.seller_name ?? null,
        demo_seller: l.best?.is_demo ?? null, region: l.best ? regionName(l.best.region_id) : null, price_som: l.best?.price_som ?? null,
        official_avg_som: l.best?.official_avg_som ?? null, vs_official_pct: l.best?.vs_official_pct ?? null,
        signal: pa?.signal, next_month_change_pct_estimate: pa?.outlookPct };
    }),
    overpriced_offers_flagged: a.products.flatMap((p) => p.flagged.map((o) => ({ seller: o.seller_name, vs_official_pct: o.vs_official_pct }))),
    goods_som: s.goods, delivery_som: s.delivery, total_som: s.total, savings_vs_official_som: Math.round(s.savings),
    cash_som: f.cash, shortfall_som: f.shortfall, verdict: f.verdict, best_loan_rate_pct: f.bestRate,
    one_month_interest_som: f.interest && Math.round(f.interest), expected_price_change_cost_som: Math.round(f.riseCost),
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  let text = null;
  try {
    const res = await fetch(AI_URL, { method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY }, body: JSON.stringify({ mode: "explain", summary }) });
    if (res.ok) {
      const out = await res.json();
      if (out.text && my === runId && $("#explain")) {
        text = out.text;
        const by = { gemini: "Gemini", claude: "Claude" }[out.engine] ?? "AI";
        $("#explain").innerHTML = `${esc(text)}<span class="src">${t("explain_claude").replace("Claude", by)}</span>`;
      }
    }
  } catch { /* keep the template text */ } finally { clearTimeout(timer); }
  if (soundOn && my === runId) speak(text ?? currentExplanation());
}
