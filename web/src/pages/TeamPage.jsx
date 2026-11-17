// "Agentlar" page: who the four agents are and what each one does.
import { t } from "../lib/i18n.js";
import { AGENTS } from "../agentsInfo.js";
import BusinessModel from "./BusinessModel.jsx";

export default function TeamPage({ hidden }) {
  return (
    <section className="page" hidden={hidden}>
      <h1 className="page-title">{t("crew_title")}</h1>
      <p className="muted team-sub">{t("team_sub")}</p>
      <div className="team">
        {AGENTS.map((a) => (
          <article key={a.n} className={`member m${a.n}`}>
            <img src={a.img} alt="" width="120" height="120" />
            <span className="step">0{a.n} / 04</span>
            <h3>{t(`a${a.n}_name`)}</h3>
            <p className="epithet">{t(`a${a.n}_title`)}</p>
            <p>{t(`a${a.n}_role`)}</p>
          </article>
        ))}
      </div>
      <BusinessModel />
    </section>
  );
}
