// Home dashboard: KPIs, price history chart, biggest movers, cheapest region per staple.
import { officialHistory, forecastsFor, sourceHistory } from "../db.js";
import { t, nameOf, onLangChange } from "../i18n.js";
import { som, pct, esc, monthName, countUp } from "../util.js";
import { priceChart } from "./chart.js";

let ref, moversData = null, chosen = "rice";
const $ = (s) => document.querySelector(s);
const STAPLES = ["rice", "oil_sunflower", "flour_first", "onion", "carrot", "potatoes", "beef", "sugar", "eggs"];

export async function initDashboard(reference) {
  ref = reference;
  drawAll();
  // 3-month movers in Tashkent city: last 4 published months are enough
  moversData = await sourceHistory("tsh_city_market", "2026-06-01");
  drawMovers();
  onLangChange(drawAll);
}

function drawAll() {
  drawKpis();
  drawChips();
  drawChart();
  drawMovers();
  drawCheapest();
}

function drawKpis() {
  const offers = ref.offers;
  const demo = offers.filter((o) => o.is_demo).length;
  const sellers = new Set(offers.map((o) => o.seller_id)).size;
  const regions = new Set(ref.sources.map((s) => s.region_id).filter(Boolean)).size;
  const month = ref.benchmark.map((b) => b.month).sort().at(-1);
  $("#kpis").innerHTML = `
    <div class="kpi"><span>${t("kpi_offers")}</span><b data-n="${offers.length}">0</b><small>${t("kpi_demo_note", { d: demo, l: offers.length - demo })}</small></div>
    <div class="kpi"><span>${t("kpi_sellers")}</span><b data-n="${sellers}">0</b></div>
    <div class="kpi"><span>${t("kpi_regions")}</span><b data-n="${regions}">0</b><small>/ 14</small></div>
    <div class="kpi"><span>${t("kpi_month")}</span><b>${monthName(month)}</b><small>stat.uz</small></div>`;
  $("#kpis").querySelectorAll("b[data-n]").forEach((b) => countUp(b, Number(b.dataset.n)));
}

function drawChips() {
  const list = ["rice", "oil_sunflower", "flour_first", "onion", "beef", "potatoes"];
  $("#dash-products").innerHTML = list.map((id) => {
    const p = ref.products.find((x) => x.product_id === id);
    return `<button type="button" class="chip ${id === chosen ? "on" : ""}" data-id="${id}">${esc(nameOf(p))}</button>`;
  }).join("");
  $("#dash-products").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { chosen = b.dataset.id; drawChips(); drawChart(); }));
}

async function drawChart() {
  const [history, forecasts] = await Promise.all([officialHistory([chosen], ["tsh_city_market"], "2024-01-01"), forecastsFor([chosen])]);
  priceChart($("#dash-chart"), history, forecasts);
}

function drawMovers() {
  if (!moversData) { $("#movers").innerHTML = `<p class="muted">…</p>`; return; }
  const moves = ref.products.map((p) => {
    const rows = moversData.filter((r) => r.product_id === p.product_id && r.price_som != null);
    if (rows.length < 4) return null;
    const lastRow = rows.at(-1), before = rows.at(-4);
    return { p, change: 100 * (lastRow.price_som - before.price_som) / before.price_som, price: lastRow.price_som };
  }).filter(Boolean).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
  const max = Math.max(...moves.map((m) => Math.abs(m.change)), 1);
  $("#movers").innerHTML = moves.map((m) => `
    <div class="mover"><span>${esc(nameOf(m.p))} <small class="muted">${som(m.price)}</small></span><b class="${m.change > 0 ? "up" : "down"}">${pct(m.change)}</b>
      <div class="bar"><i style="width:${(100 * Math.abs(m.change) / max).toFixed(0)}%;background:var(${m.change > 0 ? "--amber" : "--green"})"></i></div></div>`).join("");
}

function drawCheapest() {
  const rows = STAPLES.map((id) => {
    const p = ref.products.find((x) => x.product_id === id);
    const prices = ref.benchmark.filter((b) => b.product_id === id);
    if (!prices.length) return "";
    const best = prices.reduce((a, b) => (b.price_som < a.price_som ? b : a));
    const tash = prices.find((b) => b.region_id === "tashkent_city");
    const diff = tash ? 100 * (best.price_som - tash.price_som) / tash.price_som : null;
    const region = nameOf(ref.regions.find((r) => r.region_id === best.region_id));
    return `<tr><td><b>${esc(nameOf(p))}</b></td><td>${esc(region)} <span class="sub">${monthName(best.month)}</span></td>
      <td class="num">${som(best.price_som)}</td><td class="num"><span class="${diff < 0 ? "down" : ""}">${diff == null || best.region_id === "tashkent_city" ? "—" : pct(diff)}</span></td></tr>`;
  }).join("");
  $("#cheapest").innerHTML = `<thead><tr><th>${t("col_product")}</th><th>${t("cheapest_region")}</th><th class="num">${t("m_official")}</th><th class="num">${t("vs_tashkent")}</th></tr></thead><tbody>${rows}</tbody>`;
}
