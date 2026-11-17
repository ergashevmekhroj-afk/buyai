// Top bar: logo, page tabs (centered), seller button, sound on/off, language menu.
import { useEffect, useState } from "react";
import { LANGS, lang, setLang, t } from "../lib/i18n.js";

const TABS = [["ask", "nav_ask"], ["market", "nav_market"], ["team", "nav_team"]];

export default function Topbar({ page, soundOn, onToggleSound }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {                         // click anywhere else closes the language menu
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <header className="topbar">
      <a className="brand" href="#ask" aria-label="BuyAI">
        <img className="wordmark" src="/img/buyai-logo.svg" alt="BuyAI" width="96" height="47" />
      </a>

      <nav className="seg" aria-label="Sections">
        {TABS.map(([id, key]) => <a key={id} href={`#${id}`} className={page === id ? "active" : ""}>{t(key)}</a>)}
      </nav>

      <div className="top-actions">
        <a href="#seller" className={`btn-seller ${page === "seller" ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" /></svg>
          <span>{t("nav_seller")}</span>
        </a>
        <button className="icon-btn" aria-pressed={soundOn} title={t(soundOn ? "sound_on" : "sound_off")} aria-label={t(soundOn ? "sound_on" : "sound_off")} onClick={onToggleSound}>
          <svg className="ico-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
          <svg className="ico-on" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" /></svg>
        </button>
        <div className="lang">
          <button className="lang-btn" aria-haspopup="listbox" aria-expanded={menuOpen} onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
            <span>{LANGS[lang].short}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {menuOpen && (
            <ul className="lang-menu" role="listbox">
              {Object.entries(LANGS).map(([code, l]) => (
                <li key={code}><button role="option" aria-selected={code === lang} onClick={() => { setLang(code); setMenuOpen(false); }}>{l.label}<b>{l.short}</b></button></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}
