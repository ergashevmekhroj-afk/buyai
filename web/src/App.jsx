// The whole app: load reference data once, then show the top bar and the open page.
// Pages stay mounted (just hidden) so a finished plan is still there when you come back to it.
import { useEffect, useState } from "react";
import { loadReference } from "./lib/db.js";
import { t } from "./lib/i18n.js";
import { monthName } from "./lib/util.js";
import { stopSpeaking } from "./lib/voice.js";
import { useLang, useRoute, useStoredFlag } from "./hooks.js";
import Background from "./components/Background.jsx";
import Topbar from "./components/Topbar.jsx";
import AskPage from "./pages/AskPage.jsx";
import MarketPage from "./pages/MarketPage.jsx";
import SellerPage from "./pages/SellerPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";

export default function App() {
  useLang();                         // re-render everything when the language changes
  const page = useRoute();
  const [soundOn, setSoundOn] = useStoredFlag("sound");
  const [ref, setRef] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { loadReference().then(setRef).catch((e) => { console.error(e); setError(e.message); }); }, []);

  const toggleSound = () => { if (soundOn) stopSpeaking(); setSoundOn(!soundOn); };
  const latest = ref?.benchmark.map((b) => b.month).sort().at(-1);

  return (
    <>
      <Background />
      <Topbar page={page} soundOn={soundOn} onToggleSound={toggleSound} />
      <main>
        {!ref && <p className="load-status">{error ? t("load_error", { msg: error }) : t("loading")}</p>}
        {ref && (
          <>
            <AskPage refData={ref} soundOn={soundOn} hidden={page !== "ask"} />
            <MarketPage refData={ref} active={page === "market"} />
            <SellerPage refData={ref} hidden={page !== "seller"} />
            <TeamPage hidden={page !== "team"} />
          </>
        )}
      </main>
      <footer className="footer">
        {latest && <p className="asof">{t("data_as_of", { month: monthName(latest) })}</p>}
        <p>{t("footer")}</p>
      </footer>
    </>
  );
}
