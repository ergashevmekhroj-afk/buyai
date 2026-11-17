import sqlite3, csv, os, statistics, datetime

OUT = "out"
os.makedirs(OUT, exist_ok=True)
RETRIEVED = "2026-11-17"

SOURCES = [
    dict(source_id="tsh_city_market", siat_id=3780, file="raw/3780_tashkent_city_markets.txt",
         title="Dynamics of average prices of some goods in the markets of Tashkent city",
         region="Tashkent city", outlet_type="dehqon bozori (farmers' markets)"),
    dict(source_id="tsh_region_market", siat_id=3781, file="raw/3781_tashkent_region_markets.txt",
         title="Dynamics of average prices of some goods in the markets of Tashkent region",
         region="Tashkent region", outlet_type="dehqon bozori and shops (per source note)"),
    dict(source_id="jizzakh_market", siat_id=3773, file="raw/3773_jizzakh_markets.txt",
         title="Dynamics of average prices of some goods in the markets of Djizzakh region",
         region="Jizzakh region", outlet_type="dehqon bozori (farmers' markets)"),
    dict(source_id="navoi_market", siat_id=3775, file="raw/3775_navoi_markets.txt",
         title="Dynamics of average prices of some goods in the markets of Navai region",
         region="Navoi region", outlet_type="dehqon bozori (farmers' markets)"),
    dict(source_id="fergana_market", siat_id=3782, file="raw/3782_fergana_markets.txt",
         title="Dynamics of average prices of some goods in the markets of Fergana region",
         region="Fergana region", outlet_type="dehqon bozori (farmers' markets)"),
    dict(source_id="karakalpakstan_market", siat_id=3784, file="raw/3784_karakalpakstan_markets.txt",
         title="Dynamics of average prices of some goods in the markets of Republic of Karakalpakstan",
         region="Republic of Karakalpakstan", outlet_type="dehqon bozori (farmers' markets)"),
    dict(source_id="uz_store", siat_id=1329, file="raw/1329_uzbekistan_stores.txt",
         title="Dynamics of average prices for individual goods in stores",
         region="Uzbekistan (national)", outlet_type="stores"),
]

# name_en (as in source) -> (product_id, name_uz, unit, category)
PRODUCTS = {
    "Rice": ("rice", "Guruch", "kg", "grains"),
    "Barley": ("barley", "Arpa", "kg", "grains"),
    "Wheat": ("wheat", "Bug'doy", "kg", "grains"),
    "Corn": ("corn", "Makkajo'xori", "kg", "grains"),
    "Compound feed": ("compound_feed", "Omuxta yem", "kg", "feed"),
    "High-grade wheat flour": ("flour_high", "Oliy navli bug'doy uni", "kg", "flour_bread"),
    "First grade wheat flour": ("flour_first", "1-navli bug'doy uni", "kg", "flour_bread"),
    "Wheat bread from 1st grade flour": ("bread", "1-navli undan non", "kg", "flour_bread"),
    "Beef": ("beef", "Mol go'shti", "kg", "meat_fish"),
    "Mutton": ("mutton", "Qo'y go'shti", "kg", "meat_fish"),
    "Poultry": ("poultry", "Parranda go'shti", "kg", "meat_fish"),
    "Fish of all kinds": ("fish", "Baliq", "kg", "meat_fish"),
    "Fresh milk (1 liter)": ("milk", "Sut", "litre", "dairy_eggs"),
    "Eggs (10 pieces )": ("eggs", "Tuxum", "10 pcs", "dairy_eggs"),
    "Butter": ("butter", "Sariyog'", "kg", "dairy_eggs"),
    "Cottonseed oil (1 liter)": ("oil_cottonseed", "Paxta yog'i", "litre", "oil_sugar"),
    "Sunflower oil (1 liter)": ("oil_sunflower", "Kungaboqar yog'i", "litre", "oil_sugar"),
    "Sugar": ("sugar", "Shakar", "kg", "oil_sugar"),
    "Lemons": ("lemons", "Limon", "kg", "fruit"),
    "Apples": ("apples", "Olma", "kg", "fruit"),
    "Pears": ("pears", "Nok", "kg", "fruit"),
    "Grape": ("grapes", "Uzum", "kg", "fruit"),
    "Watermelon": ("watermelon", "Tarvuz", "kg", "fruit"),
    "Melon": ("melon", "Qovun", "kg", "fruit"),
    "Kishmish": ("kishmish", "Mayiz (kishmish)", "kg", "fruit"),
    "Cabbage": ("cabbage", "Karam", "kg", "vegetables"),
    "Cucumbers": ("cucumbers", "Bodring", "kg", "vegetables"),
    "Tomatoes": ("tomatoes", "Pomidor", "kg", "vegetables"),
    "Eggplant": ("eggplant", "Baqlajon", "kg", "vegetables"),
    "Bell pepper": ("bell_pepper", "Bulg'or qalampiri", "kg", "vegetables"),
    "Pumpkin": ("pumpkin", "Qovoq", "kg", "vegetables"),
    "Carrot": ("carrot", "Sabzi", "kg", "vegetables"),
    "Garlic": ("garlic", "Sarimsoq", "kg", "vegetables"),
    "Onion": ("onion", "Piyoz", "kg", "vegetables"),
    "Potatoes": ("potatoes", "Kartoshka", "kg", "vegetables"),
    "Beans": ("beans", "Loviya", "kg", "legumes"),
    "Peas": ("peas", "No'xat", "kg", "legumes"),
    "Mash": ("mash", "Mosh", "kg", "legumes"),
}

def months(start, n):
    y, m = map(int, start.split("-M"))
    for _ in range(n):
        yield f"{y:04d}-{m:02d}"
        m += 1
        if m > 12: y, m = y + 1, 1

prices = []  # (source_id, product_id, month, price or None)
for s in SOURCES:
    lines = open(s["file"]).read().strip().split("\n")
    rng = lines[0].split("|")[1]
    start, end = rng.split("..")
    s["first_month"] = start.replace("-M", "-"); s["last_month"] = end.replace("-M", "-")
    s["url"] = f"https://siat.stat.uz/data/{s['siat_id']}/?lang=en"
    for l in lines[1:]:
        name, vals = l.split("|")
        vals = [int(v) for v in vals.split(",")]
        pid = PRODUCTS[name][0]
        for mon, v in zip(months(start, len(vals)), vals):
            prices.append((s["source_id"], pid, mon, v if v > 0 else None))

# ---- forecast: seasonal ratio model on Tashkent city markets ----
city = {}
for sid, pid, mon, v in prices:
    if sid == "tsh_city_market": city.setdefault(pid, {})[mon] = v
LAST = "2026-10"
def add(mon, k):
    y, m = map(int, mon.split("-")); m += k
    while m > 12: y, m = y + 1, m - 12
    return f"{y:04d}-{m:02d}"
forecasts = []
for pid, ser in city.items():
    base = ser.get(LAST)
    if not base: continue
    for h in (1, 2, 3):
        ratios = []
        for yr in range(2019, 2026):
            a, b = ser.get(f"{yr}-10"), ser.get(add(f"{yr}-10", h))
            if a and b: ratios.append(b / a)
        if len(ratios) < 4: continue
        med = statistics.median(ratios)
        lo, hi = min(ratios), max(ratios)
        forecasts.append(("tsh_city_market", pid, add(LAST, h), round(base * med), round(base * lo), round(base * hi),
                          len(ratios), "Oct-2026 price x median of same-season change in 2019-2025 (min/max = range)"))

# ---- write SQLite ----
db = os.path.join(OUT, "uz_market_prices.sqlite")
if os.path.exists(db): os.remove(db)
con = sqlite3.connect(db)
SCHEMA = open("schema.sql").read()
con.executescript(SCHEMA)
con.executemany("insert into sources values (?,?,?,?,?,?,?,?,?,?)",
    [(s["source_id"], s["siat_id"], s["title"], s["region"], s["outlet_type"], "monthly", "so'm per unit (kg unless product unit says otherwise)",
      s["first_month"], s["last_month"], s["url"]) for s in SOURCES])
con.execute("update sources set retrieved_at = ?", (RETRIEVED,)) if False else None
con.executemany("insert into products values (?,?,?,?,?)",
    [(p[0], n, p[1], p[2], p[3]) for n, p in PRODUCTS.items()])
con.executemany("insert into prices values (?,?,?,?)", [(a, b, c + "-01", d) for a, b, c, d in prices])
con.executemany("insert into forecasts values (?,?,?,?,?,?,?,?)", [(a, b, c + "-01", d, e, f, g, h) for a, b, c, d, e, f, g, h in forecasts])
con.commit()

# ---- CSV exports (one per table, plus views) ----
def dump(q, name):
    cur = con.execute(q); cols = [d[0] for d in cur.description]
    with open(os.path.join(OUT, name), "w", newline="") as f:
        w = csv.writer(f); w.writerow(cols); w.writerows(cur.fetchall())
for t in ("sources", "products", "prices", "forecasts"):
    dump(f"select * from {t}", f"{t}.csv")
dump("select * from latest_comparison", "latest_comparison.csv")
print("prices rows", len(prices), "non-null", sum(1 for p in prices if p[3]), "forecasts", len(forecasts))
con.close()
