// Two tiny charts for the agent cards (plain SVG, no library):
//   PriceRange: every offer Dallol compared as a dot on one bar (cheap left, dear right), the chosen
//               one big and green, and the official average as a dark tick. One look shows "we picked a cheap one".
//   Sparkline:  Tarozibon ota's official price line (last months) + dashed estimate for the next months.
import { som } from "../lib/util.js";
import { t } from "../lib/i18n.js";

export function PriceRange({ offers, chosen, official }) {
  const prices = offers.map((o) => o.price_som).concat(official ?? []);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const x = (p) => `${hi === lo ? 50 : 3 + 94 * (p - lo) / (hi - lo)}%`;   // position along the bar
  // plain HTML dots (not SVG) so they stay round at any card width
  return (
    <div className="prange" aria-hidden="true">
      <div className="pr-bar">
        {offers.map((o) => <i key={o.offer_id} className="pr-dot" style={{ left: x(o.price_som) }} />)}
        {official != null && <i className="pr-official" style={{ left: x(official) }} />}
        <i className="pr-chosen" style={{ left: x(chosen.price_som) }} />
      </div>
      <div className="pr-labels"><span>{som(lo)}</span>{official != null && <span className="pr-off">┃ {t("official")}</span>}<span>{som(hi)}</span></div>
    </div>
  );
}

export function Sparkline({ series, estimate }) {
  const all = [...series, ...estimate];
  if (series.length < 2) return null;
  const vals = all.map((p) => p.price);
  const lo = Math.min(...vals), hi = Math.max(...vals), n = all.length;
  const X = (i) => 2 + 96 * i / (n - 1), Y = (v) => (hi === lo ? 14 : 26 - 22 * (v - lo) / (hi - lo));
  const path = (pts, from) => pts.map((p, i) => `${i ? "L" : "M"}${X(from + i).toFixed(1)},${Y(p.price).toFixed(1)}`).join(" ");
  const last = series.length - 1;
  const rising = series[last].price >= series[0].price;
  return (
    <svg className={`spark ${rising ? "up" : "down"}`} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${path(series, 0)} L${X(last)},30 L${X(0)},30 Z`} className="sp-fill" />
      <path d={path(series, 0)} className="sp-line" />
      {estimate.length > 0 && <path d={path([series[last], ...estimate], last)} className="sp-est" />}
    </svg>
  );
}
