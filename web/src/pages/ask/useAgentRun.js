// Runs the four agents one after another and records what each one "says" in its card.
// Agents compute the numbers (src/lib/agents); this file only paces them so people can watch.
// Each card = { state: "wait" | "running" | "done", items: [...] }. An item is plain data
// (kind + numbers), and AgentCards.jsx turns it into text, so a language switch re-translates everything.
import { useRef, useState } from "react";
import { plan } from "../../lib/agents/planner.js";
import { scout } from "../../lib/agents/priceScout.js";
import { analyse, loadAnalystData } from "../../lib/agents/marketAnalyst.js";
import { advise } from "../../lib/agents/financeAdvisor.js";
import { finalAdvice } from "../../lib/agents/finalAdvice.js";
import { sleep } from "../../lib/util.js";
import { stopSpeaking } from "../../lib/voice.js";

// Pauses only exist so people can watch the agents work. PACE 0.5 = half of the original pauses
// (the full version felt slow in testing). 0 = no animation at all.
const PACE = 0.5;
const pause = (ms) => sleep(ms * PACE);

const freshCards = () => [0, 1, 2, 3].map(() => ({ state: "wait", items: [] }));
let uid = 0;

export function useAgentRun(ref) {
  const [cards, setCards] = useState(freshCards);
  const [phase, setPhase] = useState("idle");      // idle | running | done
  const [result, setResult] = useState(null);      // { text, order, s, a, f, id } when all four finished
  const [error, setError] = useState(null);
  const runId = useRef(0);                          // a newer run cancels an older one

  async function start(text, regionIds) {
    const my = ++runId.current;
    const alive = () => my === runId.current;
    // helpers: change one card (n = 0..3); they do nothing once a newer run has started
    const update = (n, fn) => alive() && setCards((cs) => cs.map((c, i) => (i === n ? fn(c) : c)));
    const state = (n, st) => update(n, (c) => ({ ...c, state: st }));
    const clear = (n) => update(n, (c) => ({ ...c, items: [] }));
    const add = (n, item) => { const id = ++uid; update(n, (c) => ({ ...c, items: [...c.items, { id, ...item }] })); return id; };
    const patch = (n, id, fn) => update(n, (c) => ({ ...c, items: c.items.map((it) => (it.id === id ? { ...it, ...fn(it) } : it)) }));

    stopSpeaking();
    setCards(freshCards()); setPhase("running"); setResult(null); setError(null);
    try {
      // ---- 1. Mirzo (Planner): read the sentence ----
      state(0, "running");
      add(0, { kind: "muted", key: "p_reading" });
      const order = await plan(text, ref.products);
      if (!alive()) return;
      clear(0);
      add(0, { kind: "sentence", text, spans: order.spans });
      if (order.offTopic) {               // not a purchase question: refuse politely, the other agents stay idle
        add(0, { kind: "offTopic" });
        add(0, { kind: "source", source: order.source });
        state(0, "done"); setPhase("done"); return;
      }
      await pause(300);
      const tags = add(0, { kind: "tags", tags: [] });
      for (const it of order.items) { patch(0, tags, (x) => ({ tags: [...x.tags, { type: "item", ...it }] })); await pause(220); }
      patch(0, tags, (x) => ({ tags: [...x.tags, { type: "cash", value: order.cash_som }, { type: "deadline", value: order.deadline_days }] }));
      if (order.items.some((i) => i.defaulted)) add(0, { kind: "defaultQty" });
      add(0, { kind: "source", source: order.source });
      await pause(250);
      if (!order.items.length) { add(0, { kind: "text", key: "p_nothing" }); state(0, "done"); setPhase("done"); return; }
      state(0, "done");

      // ---- 2. Dallol (Price Scout): offers in the ticked regions, cheapest delivered cost first ----
      state(1, "running");
      add(1, { kind: "muted", key: "s_loading", params: { r: regionIds.length } });
      const analystData = loadAnalystData(order, regionIds, ref);   // start Tarozibon ota's download now, in parallel
      analystData.catch(() => {});                                   // (an error shows up when he uses it)
      const s = await scout(order, regionIds);
      if (!alive()) return;
      clear(1);
      const counter = add(1, { kind: "counter", seen: 0, total: s.offersChecked });
      let seen = 0;
      for (const l of s.lines) {
        add(1, { kind: "label", product_id: l.item.product_id });
        if (!l.candidates.length) { add(1, { kind: "muted", key: "s_none" }); continue; }
        // show a few offers arriving, then collapse to one plain line: the cheapest delivered offer
        const shown = [...l.candidates].sort((x, y) => x.offer_id.localeCompare(y.offer_id)).slice(0, 4);
        if (!shown.includes(l.best)) shown[shown.length - 1] = l.best;
        const scan = add(1, { kind: "scan", rows: [], best: null, others: l.candidates.length - 1, all: l.candidates, unit: l.item.product_id });
        for (const o of shown) {
          if (!alive()) return;
          patch(1, scan, (x) => ({ rows: [...x.rows, o] }));
          seen = Math.min(seen + 1, s.offersChecked);
          const v = seen;
          patch(1, counter, () => ({ seen: v }));
          await pause(110);
        }
        await pause(200);
        patch(1, scan, () => ({ best: l.best }));
        await pause(250);
      }
      patch(1, counter, () => ({ seen: s.offersChecked }));
      state(1, "done");

      // ---- 3. Tarozibon ota (Market Analyst): official price, trend, outlook, overpriced flags ----
      state(2, "running");
      const a = await analyse(order, s, regionIds, ref, analystData);
      if (!alive()) return;
      for (const pa of a.products) {
        const best = s.lines.find((l) => l.item.product_id === pa.product_id)?.best;
        // one compact block per product: signal, % vs official, a small price chart, and the warnings folded into one line
        add(2, { kind: "verdictLine", product_id: pa.product_id, vs: best?.vs_official_pct ?? null, signal: pa.signal, outlookPct: pa.outlookPct,
          series: pa.series, estimate: pa.estimate, flags: pa.flagged });
        await pause(300);
      }
      state(2, "done");

      // ---- 4. Xazinachi opa (Finance Advisor): enough cash? borrow now or wait? ----
      state(3, "running");
      const f = advise(order, s, a, ref);
      add(3, { kind: "money", need: f.total, have: f.cash });
      add(3, { kind: "gauge", pct: f.cash != null ? Math.min(100, 100 * f.cash / f.total) : 0, short: !!f.shortfall });
      await pause(650);
      add(3, { kind: "finVerdict", verdict: f.verdict, left: f.cash != null ? f.cash - f.total : null, short: f.shortfall, interest: f.interest });
      state(3, "done");

      const advice = finalAdvice(order, s, a);      // when to buy each product, and how much that saves
      if (alive()) { setResult({ text, order, s, a, f, advice, id: my }); setPhase("done"); }
    } catch (err) {
      console.error(err);
      if (alive()) { setError(err.message); setPhase("done"); }
    }
  }

  return { cards, phase, result, error, start };
}
