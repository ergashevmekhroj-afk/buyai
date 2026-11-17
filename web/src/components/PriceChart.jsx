// One price chart style for the whole app: official monthly line + dashed estimate (forecast).
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { t } from "../lib/i18n.js";
import { som, monthName } from "../lib/util.js";
import { useLang } from "../hooks.js";

export default function PriceChart({ history, forecasts, tall = false }) {
  const canvas = useRef(null);
  const lng = useLang();

  useEffect(() => {
    if (!history) return;
    const css = getComputedStyle(document.documentElement);
    const green = css.getPropertyValue("--green").trim(), amber = css.getPropertyValue("--amber").trim();
    const muted = css.getPropertyValue("--muted").trim(), line = css.getPropertyValue("--line").trim();
    const labels = [...history.map((h) => h.month), ...forecasts.map((f) => f.month)];
    const official = [...history.map((h) => h.price_som), ...forecasts.map(() => null)];   // empty months stay empty
    const last = history.length - 1;   // the estimate starts at the last official point so the lines connect
    const est = labels.map((_, i) => (i === last ? history[last]?.price_som : i > last ? forecasts[i - last - 1].price_som : null));
    const ctx = canvas.current.getContext("2d");
    const fill = ctx.createLinearGradient(0, 0, 0, canvas.current.clientHeight || 260);
    fill.addColorStop(0, green + "33"); fill.addColorStop(1, green + "00");
    const chart = new Chart(canvas.current, {
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
    });
    return () => chart.destroy();
  }, [history, forecasts, lng]);

  return <div className={`chart-box ${tall ? "tall" : ""}`}><canvas ref={canvas} /></div>;
}
