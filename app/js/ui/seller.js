// Seller page: post a price through the post_offer database function,
// and show "your price vs the official regional average" while typing.
import { postOffer } from "../db.js";
import { t, nameOf, onLangChange } from "../i18n.js";
import { som, pct, esc, monthName, perUnit } from "../util.js";

let ref;
const $ = (s) => document.querySelector(s);

export function initSeller(reference, onPosted) {
  ref = reference;
  const form = $("#seller-form");
  fillSelects(form, "tashkent_city", "rice");
  $("#market-list").innerHTML = ref.markets.map((m) => `<option value="${esc(m.name)}">`).join("");

  // phone given -> consent required (personal data law)
  form.phone.addEventListener("input", () => {
    const has = form.phone.value.trim() !== "";
    $("#consent-row").hidden = !has;
    form.consent.required = has;
  });
  ["input", "change"].forEach((ev) => form.addEventListener(ev, () => compare(form)));
  compare(form);
  onLangChange(() => { fillSelects(form, form.region.value, form.product.value); compare(form); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    $("#seller-result").className = "result";
    $("#seller-result").textContent = t("f_sending");
    try {
      await postOffer({
        name: form.name.value.trim(), phone: form.phone.value.trim() || null,
        region: form.region.value, market: form.market.value.trim() || null, product: form.product.value,
        price: Math.round(Number(form.price.value)), minQty: Number(form.minQty.value), fee: Math.round(Number(form.fee.value)),
      });
      $("#seller-result").className = "result ok";
      $("#seller-result").textContent = t("f_ok");
      onPosted?.();
    } catch (err) {
      $("#seller-result").className = "result err";
      $("#seller-result").textContent = t("f_err", { msg: err.message });
    } finally {
      btn.disabled = false;
    }
  });
}

function fillSelects(form, region, product) {
  form.region.innerHTML = ref.regions.map((r) => `<option value="${r.region_id}">${esc(nameOf(r))}</option>`).join("");
  form.product.innerHTML = [...ref.products].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
    .map((p) => `<option value="${p.product_id}">${esc(nameOf(p))}</option>`).join("");
  form.region.value = region;
  form.product.value = product;
}

function compare(form) {
  const p = ref.products.find((x) => x.product_id === form.product.value);
  $("#price-label").textContent = t("f_price", { unit: perUnit(p.unit) });
  const b = ref.benchmark.find((x) => x.region_id === form.region.value && x.product_id === form.product.value);
  const price = Number(form.price.value);
  const out = $("#price-compare");
  if (!b) { out.innerHTML = `<span class="muted">${t("f_cmp_none")}</span>`; return; }
  const base = t("f_cmp_base", { month: monthName(b.month), price: `<b>${som(b.price_som)}</b>` });
  if (!price) { out.innerHTML = base; return; }
  const diff = 100 * (price - b.price_som) / b.price_som;
  const cls = diff >= 20 ? "flag-high" : diff < 0 ? "down" : "";
  const note = diff >= 20 ? ` — ${t("f_cmp_high")}` : diff < 0 ? ` — ${t("f_cmp_low")}` : "";
  out.innerHTML = `${base}. ${t("f_cmp_yours", { pct: `<span class="${cls}">${pct(diff)}</span>` })}${note}.`;
}
