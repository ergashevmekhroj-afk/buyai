// Start-up: load reference data once, set the language, wire the pages.
// Pages: #ask (home + dashboard), #market, #seller, #team (the four agents). A QR code can open .../#seller directly.
import { loadReference } from "./db.js";
import { LANGS, lang, setLang, t, applyStatic, onLangChange } from "./i18n.js";
import { initAsk } from "./ui/ask.js";
import { initDashboard } from "./ui/dashboard.js";
import { initSeller } from "./ui/seller.js";
import { initMarket, refresh as refreshMarket } from "./ui/market.js";

const $ = (s) => document.querySelector(s);
document.documentElement.lang = lang;
applyStatic();

// ---------- language menu ----------
function drawLangMenu() {
  $("#lang-current").textContent = LANGS[lang].short;
  $("#lang-menu").innerHTML = Object.entries(LANGS).map(([code, l]) =>
    `<li><button role="option" data-lang="${code}" aria-selected="${code === lang}">${l.label}<b>${l.short}</b></button></li>`).join("");
}
drawLangMenu();
$("#lang-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  const menu = $("#lang-menu");
  menu.hidden = !menu.hidden;
  $("#lang-btn").setAttribute("aria-expanded", String(!menu.hidden));
});
$("#lang-menu").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-lang]");
  if (!b) return;
  setLang(b.dataset.lang);
  $("#lang-menu").hidden = true;
});
document.addEventListener("click", () => { $("#lang-menu").hidden = true; });
onLangChange(drawLangMenu);

// ---------- pages ----------
function route() {
  const page = ["ask", "market", "seller", "team"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "ask";
  document.querySelectorAll(".page").forEach((p) => { p.hidden = p.id !== `page-${page}`; });
  document.querySelectorAll("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === page));
  if (page === "market") refreshMarket();
  if (page !== "ask") window.scrollTo(0, 0);
}

try {
  const ref = await loadReference();
  initAsk(ref);
  initDashboard(ref);
  initMarket(ref);
  initSeller(ref);
  $("#load-status").remove();
  route();
  window.addEventListener("hashchange", route);
} catch (err) {
  console.error(err);
  $("#load-status").textContent = t("load_error", { msg: err.message });
}
