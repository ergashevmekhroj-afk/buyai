// Small React hooks shared by the pages.
import { useEffect, useState } from "react";
import { lang, onLangChange } from "./lib/i18n.js";

// Current language; the component re-renders when the user switches UZ / RU / EN.
export function useLang() {
  const [current, setCurrent] = useState(lang);
  useEffect(() => onLangChange(setCurrent), []);
  return current;
}

// Which page is open: #ask (home), #market, #seller, #team. A QR code can open .../#seller directly.
export const PAGES = ["ask", "market", "seller", "team"];
const readHash = () => (PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "ask");

export function useRoute() {
  const [page, setPage] = useState(readHash);
  useEffect(() => {
    const onHash = () => { setPage(readHash()); if (readHash() !== "ask") window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return page;
}

// Remember a small setting in the browser (sound on/off). Works even when storage is blocked.
export function useStoredFlag(key) {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  const set = (v) => { setOn(v); try { localStorage.setItem(key, v ? "1" : "0"); } catch { /* ignore */ } };
  return [on, set];
}
