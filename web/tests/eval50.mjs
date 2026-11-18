// 50-point test: runs the REAL agent pipeline (same code as the app) on 50 questions and scores it.
//   In-scope (30): 1 point if the plan has exactly the right products, quantities (±2%), cash and deadline
//                  (when the question gives them), every product gets a seller, and the finance verdict is computed.
//   Out-of-scope (20): 1 point if no purchase plan is produced (off-topic refusal or "nothing found").
// Run from web/:  node tests/eval50.mjs        (writes tests/eval50_<set>_result.json)
import { writeFileSync } from "node:fs";
import { loadReference } from "../src/lib/db.js";
import { plan } from "../src/lib/agents/planner.js";
import { scout } from "../src/lib/agents/priceScout.js";
import { analyse } from "../src/lib/agents/marketAnalyst.js";
import { advise } from "../src/lib/agents/financeAdvisor.js";
import { finalAdvice } from "../src/lib/agents/finalAdvice.js";
// which question set: node tests/eval50.mjs            -> questions.js (round 1)
//                     node tests/eval50.mjs questions2 -> questions2.js (round 2)
const SET = process.argv[2] ?? "questions";
const { IN_SCOPE, OUT_OF_SCOPE } = await import(`./${SET}.js`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ref = await loadReference();
const ALL_REGIONS = ref.regions.map((r) => r.region_id);   // all 14 ticked, so coverage never blocks a fair answer

async function runPipeline(q) {
  const order = await plan(q, ref.products);
  if (order.offTopic || !order.items.length) return { order, planned: false };
  const s = await scout(order, ALL_REGIONS);
  const a = await analyse(order, s, ALL_REGIONS, ref);
  const f = advise(order, s, a, ref);
  finalAdvice(order, s, a);
  return { order, s, f, planned: true };
}

function checkInScope(t, r) {
  const why = [];
  if (!r.planned) return [r.order.offTopic ? "refused as off-topic" : "no products found"];
  const got = Object.fromEntries(r.order.items.map((i) => [i.product_id, i.defaulted ? null : i.quantity]));
  const used = new Set();
  for (const [key, qty] of Object.entries(t.expect)) {
    const id = key.split("|").find((k) => k in got);
    if (!id) { why.push(`missing ${key}`); continue; }
    used.add(id);
    if (qty != null && (got[id] == null || Math.abs(got[id] - qty) > qty * 0.02)) why.push(`${id} qty ${got[id]} ≠ ${qty}`);
  }
  for (const id of Object.keys(got)) if (!used.has(id)) why.push(`extra ${id}`);
  if (t.cash != null && r.order.cash_som !== t.cash) why.push(`cash ${r.order.cash_som} ≠ ${t.cash}`);
  if (t.deadline != null && r.order.deadline_days !== t.deadline) why.push(`deadline ${r.order.deadline_days} ≠ ${t.deadline}`);
  for (const l of r.s.lines) if (!l.best) why.push(`no seller for ${l.item.product_id}`);
  if (!r.f?.verdict) why.push("no finance verdict");
  return why;
}

const rows = [];
let n = 0;
for (const t of [...IN_SCOPE.map((x) => ({ ...x, kind: "in" })), ...OUT_OF_SCOPE.map((q) => ({ q, kind: "out" }))]) {
  n++;
  let r, why;
  try {
    r = await runPipeline(t.q);
    why = t.kind === "in" ? checkInScope(t, r) : (r.planned ? [`made a plan: ${r.order.items.map((i) => i.product_id).join(", ")}`] : []);
  } catch (e) { r = { order: {} }; why = [`error: ${e.message}`]; }
  const pass = why.length === 0;
  rows.push({ n, kind: t.kind, q: t.q, pass, source: r.order.source, why, items: r.order.items, cash: r.order.cash_som, verdict: r.f?.verdict });
  console.log(`${String(n).padStart(2)} ${t.kind === "in" ? "IN " : "OUT"} ${pass ? "✓" : "✗"} [${r.order.source ?? "-"}] ${t.q}${pass ? "" : "  → " + why.join("; ")}`);
  await sleep(1500);   // be gentle with the free Gemini tier
}

const inPts = rows.filter((x) => x.kind === "in" && x.pass).length;
const outPts = rows.filter((x) => x.kind === "out" && x.pass).length;
console.log(`\nIn-scope ${inPts}/30 · Out-of-scope ${outPts}/20 · TOTAL ${inPts + outPts}/50`);
const engines = rows.reduce((m, x) => ({ ...m, [x.source ?? "error"]: (m[x.source ?? "error"] ?? 0) + 1 }), {});
console.log("Read by:", engines);
writeFileSync(new URL(`./eval50_${SET}_result.json`, import.meta.url), JSON.stringify({ date: new Date().toISOString(), inPts, outPts, total: inPts + outPts, engines, rows }, null, 2));
process.exit(0);
