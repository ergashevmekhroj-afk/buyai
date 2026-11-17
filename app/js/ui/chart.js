// One price chart style for the whole app: official line + dashed estimate.
import { t } from "../i18n.js";
import { som, monthName } from "../util.js";

const charts = new Map();

export function priceChart(canvas, history, forecasts) {
  const css = getComputedStyle(document.documentElement);
  const green = css.getPropertyValue("--green").trim(), amber = css.getPropertyValue("--amber").trim();
  const muted = css.getPropertyValue("--muted").trim(), line = css.getPropertyValue("--line").trim();
  const labels = [...history.map((h) => h.month), ...forecasts.map((f) => f.month)];
  const official = [...history.map((h) => h.price_som), ...forecasts.map(() => null)];   // empty months stay empty
  const last = history.length - 1;   // the estimate starts at the last official point so the lines connect
  const est = labels.map((_, i) => (i === last ? history[last]?.price_som : i > last ? forecasts[i - last - 1].price_som : null));

  charts.get(canvas)?.destroy();
  const ctx = canvas.getContext("2d");
  const fill = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 260);
  fill.addColorStop(0, green + "33"); fill.addColorStop(1, green + "00");
  charts.set(canvas, new Chart(canvas, {
    type: "line",
    data: {
      labels: labels.map(monthName),
      datasets: [
        { label: t("legend_official"), data: official, borderColor: green, backgroundColor: fill, fill: true, pointRadius: 0, borderWidth: 2.5, tension: .25 },
        ...(forecasts.length ? [{ label: t("legend_forecast"), data: est, borderColor: amber, backgroundColor: amber, borderDash: [6, 4], pointRadius: 3, borderWidth: 2.5 }] : []),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { labels: { color: muted, boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${som(c.parsed.y)}` } } },
      scales: {
        x: { ticks: { color: muted, maxTicksLimit: 7 }, grid: { display: false } },
        y: { ticks: { color: muted, callback: (v) => v.toLocaleString("ru-RU") }, grid: { color: line } },
      },
    },
  }));
}
