// Market page: official price history (+ estimate) and today's live offers for one product.
import { officialHistory, forecastsFor, offersForProduct } from "../db.js";
import { t, nameOf, onLangChange } from "../i18n.js";
import { som, pct, esc } from "../util.js";
import { priceChart } from "./chart.js";

let ref;
const $ = (s) => document.querySelector(s);

export function initMarket(reference) {
  ref = reference;
  fillSelects("rice", "tsh_city_market");
  $("#m-product").addEventListener("change", refresh);
  $("#m-region").addEventListener("change", refresh);
  onLangChange(() => { fillSelects($("#m-product").value, $("#m-region").value); if (!$("#page-market").hidden) refresh(); });
}

function fillSelects(product, source) {
  $("#m-product").innerHTML = [...ref.products].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
    .map((p) => `<option value="${p.product_id}">${esc(nameOf(p))}</option>`).join("");
  $("#m-product").value = product;
  // one option per official source: regions with data + national stores
  const sources = [...ref.sources].sort((a, b) => (a.region_id === "tashkent_city" ? -1 : b.region_id === "tashkent_city" ? 1 : 0));
  $("#m-region").innerHTML = sources.map((s) => `<option value="${s.source_id}">${esc(s.region_id ? nameOf(ref.regions.find((r) => r.region_id === s.region_id)) : t("m_stores"))}</option>`).join("");
  $("#m-region").value = source;
}

export async function refresh() {
  const productId = $("#m-product").value, sourceId = $("#m-region").value;
  const source = ref.sources.find((s) => s.source_id === sourceId);
  const [history, forecasts, offers] = await Promise.all([
    officialHistory([productId], [sourceId], "2023-01-01"),
    source.region_id === "tashkent_city" ? forecastsFor([productId]) : [],
    offersForProduct(productId),
  ]);
  priceChart($("#m-chart"), history, forecasts);
  const regionName = (id) => nameOf(ref.regions.find((r) => r.region_id === id)) || id;
  const rows = offers.map((o) => {
    const cls = o.vs_official_pct >= 20 ? "flag-high" : o.vs_official_pct <= -20 ? "flag-low" : o.vs_official_pct < 0 ? "down" : "";
    return `<tr><td>${esc(o.seller_name)} ${o.is_demo ? `<span class="badge demo">${t("demo")}</span>` : `<span class="badge live">${t("live")}</span>`}
        <span class="sub">${esc(o.market_name ?? "")}</span></td>
      <td>${esc(regionName(o.region_id))}</td>
      <td class="num">${som(o.price_som)}<span class="sub">min ${Number(o.min_qty)}</span></td>
      <td class="num"><span class="${cls}">${pct(o.vs_official_pct)}</span></td></tr>`;
  }).join("");
  $("#m-offers").innerHTML = `<thead><tr><th>${t("col_seller")}</th><th>${t("col_region")}</th><th class="num">${t("col_price")}</th><th class="num">${t("col_vs")}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="4" class="muted">${t("no_offers")}</td></tr>`}</tbody>`;
}
