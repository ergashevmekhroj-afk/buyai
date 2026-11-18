// Seller page ("Sotuvchiman"). Sellers must log in, so nobody can post prices in someone else's name.
//   1. Not logged in  -> log in / sign up with phone + password
//   2. Logged in, no shop yet -> shop profile (name, region, market, show phone to buyers?)
//   3. Shop ready -> post a price (with "your price vs official average"), see and delete my offers
// All writes go through database functions that only touch the logged-in seller's own shop.
import { useCallback, useEffect, useState } from "react";
import { onAuth, signUp, logIn, logOut, phoneDigits, phoneOfUser, myShop, saveMyShop, postOffer, deleteMyOffer, sellerCard } from "../lib/db.js";
import { t, nameOf } from "../lib/i18n.js";
import { som, pct, monthName, perUnit } from "../lib/util.js";
import ProductIcon from "../components/ProductIcon.jsx";

export default function SellerPage({ refData: ref, hidden }) {
  const [user, setUser] = useState(undefined);     // undefined = still checking, null = logged out
  const [shop, setShop] = useState(undefined);     // undefined = loading, null = none yet
  const [editing, setEditing] = useState(false);

  useEffect(() => onAuth(setUser), []);
  const loadShop = useCallback(() => { setShop(undefined); myShop().then(setShop).catch(() => setShop(null)); }, []);
  useEffect(() => { if (user) loadShop(); else setShop(undefined); }, [user, loadShop]);

  return (
    <section className="page" hidden={hidden}>
      <div className="seller-wrap">
        <h1 className="page-title">{t("seller_title")}</h1>
        <p className="muted">{t("seller_sub")}</p>
        {user === undefined && <p className="muted">{t("loading")}</p>}
        {user === null && <AuthForm />}
        {user && (
          <>
            <div className="who">
              <span>👤 +{phoneOfUser(user)}{shop ? <> · <b>{shop.name}</b></> : null}</span>
              {shop && !editing && <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>{t("a_edit_shop")}</button>}
              <button type="button" className="btn-ghost" onClick={logOut}>{t("a_logout")}</button>
            </div>
            {shop === undefined && <p className="muted">{t("loading")}</p>}
            {(shop === null || editing) && (
              <ShopForm refData={ref} shop={shop} phone={phoneOfUser(user)}
                onSaved={() => { setEditing(false); loadShop(); }} onCancel={shop ? () => setEditing(false) : null} />)}
            {shop && !editing && <OfferForm refData={ref} shop={shop} />}
          </>
        )}
      </div>
    </section>
  );
}

// ---------- 1. log in / sign up ----------
function AuthForm() {
  const [mode, setMode] = useState("login");        // "login" | "signup"
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!phoneDigits(phone)) { setMsg({ cls: "err", text: t("a_bad_phone") }); return; }
    if (mode === "signup" && pass !== pass2) { setMsg({ cls: "err", text: t("a_pass_mismatch") }); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") await signUp(phone, pass); else await logIn(phone, pass);
    } catch (err) {
      const m = err.message;
      const text = /invalid login/i.test(m) ? t("a_wrong") : /already registered|already exists/i.test(m) ? t("a_exists") : t("f_err", { msg: m });
      setMsg({ cls: "err", text });
    } finally { setBusy(false); }
  }

  return (
    <form className="card form auth" onSubmit={submit}>
      <div className="seg auth-tabs">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMsg(null); }}>{t("a_login")}</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMsg(null); }}>{t("a_signup")}</button>
      </div>
      <p className="muted">{t(mode === "login" ? "a_login_sub" : "a_signup_sub")}</p>
      <label><span>{t("a_phone")}</span><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" required placeholder="+998 90 123 45 67" autoComplete="username" /></label>
      <label><span>{t("a_password")}</span><input value={pass} onChange={(e) => setPass(e.target.value)} type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      {mode === "signup" && <label><span>{t("a_password2")}</span><input value={pass2} onChange={(e) => setPass2(e.target.value)} type="password" required minLength={6} autoComplete="new-password" /></label>}
      <button className="btn-primary" type="submit" disabled={busy}>{t(mode === "login" ? "a_login" : "a_signup")}</button>
      {msg && <p className={`result ${msg.cls}`} aria-live="polite">{msg.text}</p>}
    </form>
  );
}

// ---------- 2. shop profile ----------
function ShopForm({ refData: ref, shop, phone, onSaved, onCancel }) {
  const [f, setF] = useState({ name: shop?.name ?? "", region: shop?.region_id ?? "tashkent_city", market: shop?.market_name ?? "",
    showPhone: !!shop?.phone, phone: shop?.phone ?? `+${phone}` });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    try { await saveMyShop(f); onSaved(); } catch (err) { setMsg(t("f_err", { msg: err.message })); }
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h3>{t(shop ? "a_edit_shop" : "a_new_shop")}</h3>
      <label><span>{t("f_name")}</span><input value={f.name} onChange={set("name")} required minLength={2} maxLength={80} autoComplete="organization" /></label>
      <div className="row">
        <label><span>{t("f_region")}</span>
          <select value={f.region} onChange={set("region")} required>
            {ref.regions.map((r) => <option key={r.region_id} value={r.region_id}>{nameOf(r)}</option>)}
          </select></label>
        <label><span>{t("f_market")}</span><input value={f.market} onChange={set("market")} list="market-list" maxLength={80} placeholder={t("f_market_ph")} /></label>
      </div>
      <datalist id="market-list">{ref.markets.map((m) => <option key={m.name} value={m.name} />)}</datalist>
      <label className="check"><input type="checkbox" checked={f.showPhone} onChange={set("showPhone")} /> <span>{t("f_consent")}</span></label>
      {f.showPhone && <label><span>{t("a_contact_phone")}</span><input value={f.phone} onChange={set("phone")} type="tel" maxLength={30} /></label>}
      <div className="row-btns">
        <button className="btn-primary" type="submit">{t("a_save_shop")}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>{t("a_cancel")}</button>}
      </div>
      {msg && <p className="result err">{msg}</p>}
    </form>
  );
}

// ---------- 3. post a price + my offers ----------
const EMPTY = { product: "rice", price: "", minQty: "10", fee: "0" };

function OfferForm({ refData: ref, shop }) {
  const [f, setF] = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const product = ref.products.find((p) => p.product_id === f.product);
  const products = [...ref.products].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const reload = useCallback(() => sellerCard(shop.seller_id).then((d) => setMine(d.offers)).catch(() => {}), [shop.seller_id]);
  useEffect(() => { reload(); }, [reload]);

  async function submit(e) {
    e.preventDefault();
    setSending(true); setResult({ cls: "", text: t("f_sending") });
    try {
      await postOffer({ product: f.product, price: Math.round(Number(f.price)), minQty: Number(f.minQty), fee: Math.round(Number(f.fee)) });
      setResult({ cls: "ok", text: t("f_ok") });
      setF({ ...f, price: "" });
      reload();
    } catch (err) { setResult({ cls: "err", text: t("f_err", { msg: err.message }) }); }
    finally { setSending(false); }
  }
  async function remove(id) { await deleteMyOffer(id).catch(() => {}); reload(); }

  return (
    <>
      <form className="card form" onSubmit={submit}>
        <h3>{t("a_new_offer")}</h3>
        <label><span>{t("f_product")}</span>
          <select value={f.product} onChange={set("product")} required>
            {products.map((p) => <option key={p.product_id} value={p.product_id}>{nameOf(p)}</option>)}
          </select></label>
        <div className="row">
          <label><span>{t("f_price", { unit: perUnit(product.unit) })}</span><input value={f.price} onChange={set("price")} type="number" inputMode="numeric" min="1" max="9999999" required /></label>
          <label><span>{t("f_min")}</span><input value={f.minQty} onChange={set("minQty")} type="number" inputMode="decimal" min="0.1" step="any" required /></label>
        </div>
        <label><span>{t("f_fee")}</span><input value={f.fee} onChange={set("fee")} type="number" inputMode="numeric" min="0" required /></label>
        <p className="compare"><Compare refData={ref} region={shop.region_id} product={f.product} price={Number(f.price)} /></p>
        <button className="btn-primary" type="submit" disabled={sending}>{t("f_submit")}</button>
        <p className={`result ${result?.cls ?? ""}`} aria-live="polite">{result?.text}</p>
      </form>

      <div className="card">
        <h3>{t("a_my_offers", { n: mine.length })}</h3>
        {!mine.length && <p className="muted">{t("no_offers")}</p>}
        <div className="sc-offers">
          {mine.map((o) => {
            const p = ref.products.find((x) => x.product_id === o.product_id);
            return (
              <div key={o.offer_id} className="sc-offer">
                <ProductIcon id={o.product_id} size={28} />
                <div className="sc-o-name"><b>{nameOf(p)}</b><small>min {Number(o.min_qty)} · {t("delivery")} {o.delivery_fee_som ? som(o.delivery_fee_som) : t("free")}</small></div>
                <div className="sc-o-price"><b>{som(o.price_som)}</b>{o.vs_official_pct != null && <small>{pct(o.vs_official_pct)} {t("official")}</small>}</div>
                <button type="button" className="btn-ghost sc-del" onClick={() => remove(o.offer_id)} aria-label={t("a_delete")}>🗑</button>
              </div>);
          })}
        </div>
      </div>
    </>
  );
}

// "Official average in this region was X. Your price: +12%" (flags 20%+ as overpriced, like the Market Analyst)
function Compare({ refData: ref, region, product, price }) {
  const b = ref.benchmark.find((x) => x.region_id === region && x.product_id === product);
  if (!b) return <span className="muted">{t("f_cmp_none")}</span>;
  const [before, after] = t("f_cmp_base", { month: monthName(b.month), price: "\u0000" }).split("\u0000");
  const base = <>{before}<b>{som(b.price_som)}</b>{after}</>;
  if (!price) return base;
  const diff = 100 * (price - b.price_som) / b.price_som;
  const cls = diff >= 20 ? "flag-high" : diff < 0 ? "down" : "";
  const note = diff >= 20 ? ` — ${t("f_cmp_high")}` : diff < 0 ? ` — ${t("f_cmp_low")}` : "";
  const [y1, y2] = t("f_cmp_yours", { pct: "\u0000" }).split("\u0000");
  return <>{base}. {y1}<span className={cls}>{pct(diff)}</span>{y2}{note}.</>;
}
