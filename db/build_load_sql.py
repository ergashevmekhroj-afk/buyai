"""Build SQL files that load data/uz_market_prices.sqlite into Supabase.

Run:  python3 db/build_load_sql.py
Out:  db/002_reference_data.sql   (regions, products + keywords, sources, finance, markets, forecasts)
      db/003_official_prices_N.sql (official prices, split into chunks so each file is small)

Rules: official values are copied exactly; empty prices stay NULL (never 0).
Every statement uses "on conflict do nothing", so running a file twice is safe.
"""
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "uz_market_prices.sqlite"
OUT = ROOT / "db"

# ---------- regions (all 14; the UI shows which ones have official data) ----------
REGIONS = [  # region_id, name_en, name_uz
    ("tashkent_city", "Tashkent city", "Toshkent shahri"),
    ("tashkent_region", "Tashkent region", "Toshkent viloyati"),
    ("andijan", "Andijan region", "Andijon viloyati"),
    ("bukhara", "Bukhara region", "Buxoro viloyati"),
    ("fergana", "Fergana region", "Farg'ona viloyati"),
    ("jizzakh", "Jizzakh region", "Jizzax viloyati"),
    ("kashkadarya", "Kashkadarya region", "Qashqadaryo viloyati"),
    ("khorezm", "Khorezm region", "Xorazm viloyati"),
    ("namangan", "Namangan region", "Namangan viloyati"),
    ("navoi", "Navoi region", "Navoiy viloyati"),
    ("samarkand", "Samarkand region", "Samarqand viloyati"),
    ("sirdarya", "Sirdarya region", "Sirdaryo viloyati"),
    ("surkhandarya", "Surkhandarya region", "Surxondaryo viloyati"),
    ("karakalpakstan", "Republic of Karakalpakstan", "Qoraqalpog'iston Respublikasi"),
]

# sqlite source_id -> Supabase region_id (None = national stores)
SOURCE_REGION = {
    "tsh_city_market": "tashkent_city", "tsh_region_market": "tashkent_region",
    "jizzakh_market": "jizzakh", "navoi_market": "navoi", "fergana_market": "fergana",
    "karakalpakstan_market": "karakalpakstan", "uz_store": None,
}

# ---------- Planner keywords: Uzbek Latin, Uzbek Cyrillic, Russian, English ----------
# Comma-separated. Put the more specific words first; the Planner matches lowercase text.
KEYWORDS = {
    "rice": "guruch, гуруч, rice, рис",
    "barley": "arpa, арпа, barley, ячмен",
    "wheat": "bug'doy, bugdoy, буғдой, wheat, пшениц",
    "corn": "makkajo'xori, makkajoxori, маккажўхори, corn, maize, кукуруз",
    "compound_feed": "omuxta yem, yem, омухта ем, compound feed, feed, комбикорм",
    "flour_high": "oliy navli un, oliy nav un, олий навли ун, high-grade flour, premium flour, мука высшего сорта, высш сорт",
    "flour_first": "1-navli un, birinchi nav un, un, ун, flour, мука первого сорта, мук",
    "bread": "non, нон, bread, хлеб",
    "beef": "mol go'shti, mol goshti, мол гўшти, beef, go'sht, гўшт, meat, говядин, мяс",
    "mutton": "qo'y go'shti, qoy goshti, қўй гўшти, mutton, lamb, баранин",
    "poultry": "tovuq, parranda go'shti, товуқ, парранда, chicken, poultry, куриц, курят, птиц",
    "fish": "baliq, балиқ, fish, рыб",
    "milk": "sut, сут, milk, молок",
    "eggs": "tuxum, тухум, eggs, egg, яйц, яиц",
    "butter": "sariyog', sariyog, сариёғ, butter, сливочное масло, сливочного масла, сливочн",
    "oil_cottonseed": "paxta yog'i, paxta yogi, пахта ёғи, cottonseed oil, хлопков",
    "oil_sunflower": "kungaboqar yog'i, kungaboqar yogi, yog', yog, кунгабоқар ёғи, ёғ, sunflower oil, oil, подсолнечн, масл",
    "sugar": "shakar, шакар, sugar, сахар",
    "lemons": "limon, лимон, lemon, lemons",
    "apples": "olma, олма, apples, apple, яблок",
    "pears": "nok, нок, pears, pear, груш",
    "grapes": "uzum, узум, grapes, grape, виноград",
    "watermelon": "tarvuz, тарвуз, watermelon, арбуз",
    "melon": "qovun, қовун, melon, дын",
    "kishmish": "mayiz, kishmish, майиз, кишмиш, raisins, kishmish, изюм",
    "cabbage": "karam, карам, cabbage, капуст",
    "cucumbers": "bodring, бодринг, cucumbers, cucumber, огурц, огурец",
    "tomatoes": "pomidor, помидор, tomatoes, tomato, томат",
    "eggplant": "baqlajon, бақлажон, eggplant, aubergine, баклажан",
    "bell_pepper": "bulg'or qalampiri, bulgor qalampiri, qalampir, булғор қалампири, bell pepper, pepper, болгарск, перец, перц",
    "pumpkin": "qovoq, қовоқ, pumpkin, тыкв",
    "carrot": "sabzi, сабзи, carrot, carrots, морков",
    "garlic": "sarimsoq, саримсоқ, garlic, чеснок",
    "onion": "piyoz, пиёз, onion, onions, лук",
    "potatoes": "kartoshka, картошка, potatoes, potato, картоф, картош",
    "beans": "loviya, ловия, beans, фасол",
    "peas": "no'xat, noxat, нўхат, chickpeas, peas, горох, нут",
    "mash": "mosh, мош, mung beans, mash, маш",
}


def q(v):
    """SQL literal: None -> NULL, numbers as-is, text quoted."""
    if v is None or v == "":
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, cols, rows, conflict="on conflict do nothing"):
    vals = ",\n".join("(" + ", ".join(q(v) for v in r) + ")" for r in rows)
    return f"insert into {table} ({', '.join(cols)}) values\n{vals}\n{conflict};\n"


def insert_const(table, cols, rows, const):
    """Like insert(), but columns in `const` get the same value on every row."""
    vals = ",\n".join("(" + ", ".join(q(v) for v in r) + ")" for r in rows)
    casts = {"month": "::date", "as_of": "::date"}
    sel = ", ".join(f"v.{c}{casts.get(c, '')}" for c in cols) + ", " + ", ".join(f"{q(v)}{casts.get(k, '')}" for k, v in const.items())
    return (f"insert into {table} ({', '.join(cols + list(const))})\nselect {sel} from (values\n{vals}\n) as v({', '.join(cols)})\n"
            "on conflict do nothing;\n")


def month(ym):  # 'YYYY-MM' -> 'YYYY-MM-01'
    return ym if len(ym) == 10 else ym + "-01"


def main():
    con = sqlite3.connect(DB)
    c = con.cursor()
    parts = []

    parts.append(insert("regions", ["region_id", "name_en", "name_uz", "sort_order"],
                        [(r[0], r[1], r[2], i + 1) for i, r in enumerate(REGIONS)]))

    prods = c.execute("select product_id, name_en, name_uz, unit, category from products").fetchall()
    missing = {p[0] for p in prods} - KEYWORDS.keys()
    assert not missing, f"no keywords for {missing}"
    parts.append(insert("products", ["product_id", "name_en", "name_uz", "unit", "category", "keywords"],
                        [p + (KEYWORDS[p[0]],) for p in prods]))

    srcs = c.execute("select source_id, siat_id, title, outlet_type, first_month, last_month, url from sources").fetchall()
    parts.append(insert("sources", ["source_id", "siat_id", "title", "region_id", "outlet_type",
                                    "first_month", "last_month", "url"],
                        [(s[0], s[1], s[2], SOURCE_REGION[s[0]], s[3], month(s[4]), month(s[5]), s[6]) for s in srcs]))

    parts.append(insert("loan_rate_types", ["loan_type", "description", "average_rate", "as_of", "source_url"],
                        c.execute("select loan_type, description, average_rate, as_of, source_url from loan_rate_types").fetchall()))
    # loan_rates / forecasts repeat the same date, URL and method on every row, so we send those once
    lr = c.execute("select loan_type, bank, rate_pct, as_of, source_url from loan_rates").fetchall()
    assert len({(r[3], r[4]) for r in lr}) == 1
    parts.append(insert_const("loan_rates", ["loan_type", "bank", "rate_pct"], [r[:3] for r in lr],
                              {"as_of": lr[0][3], "source_url": lr[0][4]}))
    parts.append(insert("business_rules", ["rule_id", "description", "value_text", "value_num", "valid_note", "source_url"],
                        c.execute("select rule_id, description, value_text, value_num, valid_note, source_url from business_rules").fetchall()))
    # all current markets are Tashkent city bazaars
    parts.append(insert("markets", ["market_id", "name", "region_id", "district", "address", "market_type", "source_url"],
                        [(m[0], m[1], "tashkent_city", m[2], m[3], m[4], m[5]) for m in
                         c.execute("select market_id, name, district, address, market_type, source_url from markets")]))
    fc = c.execute("select source_id, product_id, month, price_som, low_som, high_som, years_used, method from forecasts").fetchall()
    assert len({(r[0], r[7]) for r in fc}) == 1
    parts.append(insert_const("forecasts", ["product_id", "month", "price_som", "low_som", "high_som", "years_used"],
                              [r[1:7] for r in fc], {"source_id": fc[0][0], "method": fc[0][7]}))

    (OUT / "002_reference_data.sql").write_text("-- generated by db/build_load_sql.py\n" + "\n".join(parts))

    # Official prices, compact form: one row per (source, product) = first month + array of
    # monthly prices (NULL = not observed). Every series in the sqlite has no missing months
    # (checked), so array position i is month first_month + i. SQL unnest() expands it back.
    prices = c.execute("select source_id, product_id, month, price_som from prices order by source_id, product_id, month").fetchall()
    series = {}
    for s, p, m, v in prices:
        series.setdefault((s, p), [m, []])[1].append("NULL" if v is None else str(v))
    for old in OUT.glob("003_official_prices*.sql"):
        old.unlink()
    keys = sorted(series)
    for n, i in enumerate(range(0, len(keys), 140), 1):
        rows = ",\n".join(f"('{s}','{p}','{series[(s, p)][0]}',array[{','.join(series[(s, p)][1])}]::int[])"
                          for s, p in keys[i:i + 140])
        sql = ("insert into official_prices (source_id, product_id, month, price_som)\n"
               "select v.s, v.p, (v.first::date + make_interval(months => (u.i - 1)::int))::date, u.price\n"
               f"from (values\n{rows}\n) as v(s, p, first, prices)\n"
               "cross join lateral unnest(v.prices) with ordinality as u(price, i)\n"
               "on conflict do nothing;\n")
        (OUT / f"003_official_prices_{n}.sql").write_text("-- generated by db/build_load_sql.py\n" + sql)
    print(f"products={len(prods)} sources={len(srcs)} prices={len(prices)} series={len(keys)} files={n}")


if __name__ == "__main__":
    main()
