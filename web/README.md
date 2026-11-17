# BuyAI web app (React + Vite)

## Run it
```bash
cd web
npm install        # first time only
npm run dev        # http://localhost:5174
npm run build      # makes web/dist (what gets deployed)
```
Deploy to production: `python3 scripts/deploy.py` from the project folder.

## Where things are
| Folder / file | What it does |
|---|---|
| `src/main.jsx`, `src/App.jsx` | Start-up: load reference data once, top bar, which page is open (`#ask`, `#market`, `#seller`, `#team`) |
| `src/pages/AskPage.jsx` | Home: headline, order box (text or voice), regions, example orders |
| `src/pages/ask/useAgentRun.js` | Runs the 4 agents in order and records what each one says |
| `src/pages/ask/AgentCards.jsx` | The 4 agent cards and their live feeds |
| `src/pages/ask/PlanCard.jsx` | Final plan, totals, finance verdict, AI explanation, loan rates, tax notes |
| `src/pages/Dashboard.jsx` | Market overview under the ask box |
| `src/pages/MarketPage.jsx`, `SellerPage.jsx`, `TeamPage.jsx` | The other tabs |
| `src/components/` | Small shared pieces: top bar, chart, count-up number, Demo/Live badge, background |
| `src/lib/agents/` | **The 4 agents' logic** (Mirzo, Dallol, Tarozibon ota, Xazinachi opa). Pure JavaScript, no React. Numbers are computed here. |
| `src/lib/db.js` | All Supabase reads and the one write (`post_offer`) |
| `src/lib/i18n.js` | Every on-screen word in Uzbek, Russian, English |
| `src/lib/voice.js` | Voice input/output (VoiceLab via our server, browser voice as fallback) |
| `src/styles.css` | All styling (one file, colours are variables at the top) |
| `public/img/` | Logo, icon, agent avatars |

Rule: agents compute numbers in code; the AI only reads the sentence and writes the explanation.
