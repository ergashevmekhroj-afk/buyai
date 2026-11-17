// Home page: headline, order box (text or voice), region picker, example orders,
// then the four agents working live, the final plan, and the market dashboard.
import { useEffect, useRef, useState } from "react";
import { t, nameOf } from "../lib/i18n.js";
import { startListening } from "../lib/voice.js";
import { AGENTS } from "../agentsInfo.js";
import CountUp from "../components/CountUp.jsx";
import AgentCards from "./ask/AgentCards.jsx";
import PlanCard from "./ask/PlanCard.jsx";
import Dashboard from "./Dashboard.jsx";
import { useAgentRun } from "./ask/useAgentRun.js";

const MIC_TEXT = { listening: "mic_listening", working: "mic_working", denied: "mic_denied", unsupported: "mic_unsupported" };

export default function AskPage({ refData: ref, soundOn, hidden }) {
  const [text, setText] = useState("");
  const [ticked, setTicked] = useState(() => new Set(["tashkent_city", "jizzakh"]));   // the demo script regions
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [micState, setMicState] = useState("idle");
  const [note, setNote] = useState(null);            // a message key under the order box
  const { cards, phase, result, error, start } = useAgentRun(ref);
  const box = useRef(null), agentsEl = useRef(null), planEl = useRef(null), mic = useRef(null);

  const withData = new Set(ref.sources.map((s) => s.region_id).filter(Boolean));
  const tickedNames = ref.regions.filter((r) => ticked.has(r.region_id)).map(nameOf);
  const summary = tickedNames.length > 2 ? `${tickedNames.slice(0, 2).join(", ")} ${t("regions_more", { n: tickedNames.length - 2 })}` : tickedNames.join(", ");

  // the order box grows with the text (up to 120px)
  useEffect(() => { const el = box.current; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }, [text]);
  // scroll to the agents when a run starts, and to the plan when it is ready
  useEffect(() => { if (phase === "running") agentsEl.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [phase]);
  useEffect(() => { if (result || error) { const id = setTimeout(() => planEl.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300); return () => clearTimeout(id); } }, [result, error]);

  function ask(sentence = text) {
    if (!sentence.trim()) { box.current.focus(); return; }
    if (!ticked.size) { setRegionsOpen(true); setNote("pick_region"); return; }
    setNote(null); setRegionsOpen(false);
    start(sentence.trim(), [...ticked]);
  }

  async function toggleMic() {
    if (mic.current) { mic.current.stop(); mic.current = null; return; }
    mic.current = await startListening({
      // put what was heard into the box; the user checks or edits it, then presses send
      onText: (heard) => { setText(heard); setNote("mic_check"); setTimeout(() => box.current?.focus(), 0); },
      onState: (st) => { setMicState(st); if (st !== "idle") setNote(MIC_TEXT[st] ?? null); if (st !== "listening") mic.current = null; },
    });
  }

  const toggleRegion = (id) => setTicked((old) => { const n = new Set(old); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <section className="page" hidden={hidden}>
      <div className="hero">
        {/* landing: one centered column on a frosted-glass panel */}
        <div className="hero-panel">
          <h1>{t("hero_1")}<br /><em>{t("hero_2")}</em></h1>
          <p className="hero-agents">
            {AGENTS.map((a, i) => (
              <span key={a.n}>
                {i === 3 ? <> {t("and")} </> : i > 0 ? ", " : ""}
                <a href="#team" className={`ag ag${a.n}`}>{t(`a${a.n}_name`)}</a>
              </span>
            ))}{" "}{t("hero_agents_tail")}
          </p>

          <form className="askbox" autoComplete="off" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <textarea ref={box} rows={1} value={text} placeholder={t("placeholder")} aria-label="Order"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
            <button type="button" className={`mic ${micState === "listening" ? "rec" : ""} ${micState === "working" ? "busy" : ""}`}
              title={t("mic_start")} aria-label={t("mic_start")} onClick={toggleMic}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
            </button>
            <button type="submit" className="send" aria-label="Send" disabled={phase === "running"}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </form>
          <p className="mic-status" aria-live="polite">{note ? t(note) : ""}</p>

          <div className="region-row">
            <button type="button" className="region-pill" aria-expanded={regionsOpen} onClick={() => setRegionsOpen(!regionsOpen)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              <span>{t("regions_label")}</span>: <b>{summary}</b>
            </button>
            {regionsOpen && (
              <div className="region-panel">
                <div className="chips">
                  {ref.regions.map((r) => (
                    <label key={r.region_id} className={`chip ${ticked.has(r.region_id) ? "on" : ""}`}>
                      <input type="checkbox" checked={ticked.has(r.region_id)} onChange={() => toggleRegion(r.region_id)} />
                      {nameOf(r)}{withData.has(r.region_id) && <> <span className="star">★</span></>}
                    </label>
                  ))}
                </div>
                <p className="hint">{t("regions_hint")}</p>
                <button type="button" className="btn-small" onClick={() => setRegionsOpen(false)}>{t("done")}</button>
              </div>
            )}
          </div>

          <div className="suggestions">
            {["ex_1", "ex_2", "ex_3"].map((k) => (
              <button key={k} type="button" className="sugg" onClick={() => { setText(t(k)); ask(t(k)); }}>{t(k)}</button>
            ))}
          </div>
        </div>

        <div className="stats">
          {[[ref.officialCount, "stat_prices"], [ref.products.length, "stat_products"], [ref.offerStats.offers, "stat_offers"], [4, "stat_agents"]].map(([n, key]) => (
            <div className="stat" key={key}><b><CountUp to={n} /></b><span>{t(key)}</span></div>
          ))}
        </div>
      </div>

      {phase !== "idle" && <section ref={agentsEl} className="agents-wrap"><AgentCards cards={cards} phase={phase} refData={ref} /></section>}
      {(result || error) && (
        <section ref={planEl} className="card plan">
          {error ? <p className="result err">{t("run_error", { msg: error })}</p> : <PlanCard result={result} refData={ref} soundOn={soundOn} />}
        </section>
      )}

      <Dashboard refData={ref} />
    </section>
  );
}
