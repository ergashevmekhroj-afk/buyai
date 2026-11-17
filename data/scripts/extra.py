"""Adds loan rates, tax rules and the bazaar directory to the price database."""
import sqlite3, csv, os

OUT = "out"
CBU_PDF = "https://cbu.uz/upload/medialibrary/8e7/w4miicn9b3vy3n6mdd1dv412ynf6m078/Foiz_stavkalar_19_10_2026.pdf"
AS_OF = "2026-10-19"  # CBU: last 10 working days as of 19 Oct 2026

working_capital = """Apex bank 19.8;Milliy bank 20.3;Ipak yuli bank 21.5;Aloqabank 21.6;Infinbank 21.6;Mikrokreditbank 21.7;Trastbank 22.2;Hamkorbank 22.4;OFB 22.6;Xalq banki 22.9;Agrobank 22.9;Kapital bank 23.0;Asia Alliance bank 23.1;Ipoteka bank 23.2;BRB 23.3;Asaka bank 24.3;Universal bank 24.5;Ziraat bank 24.8;Garant bank 25.5;Tenge bank 25.5;Turon bank 25.8;Davr bank 26.9;SQB 27.1;Anor bank 28.1;Hayot bank 28.9;Tayanch bank 33.0;TBC bank 33.2"""
microloans = """Mikrokreditbank 21.8;Infinbank 24.0;Trastbank 24.4;SQB 24.4;Asia Alliance bank 24.5;Asaka bank 24.8;Milliy bank 24.9;Universal bank 25.2;Xalq banki 25.2;Aloqabank 25.3;Agrobank 25.8;Ziraat bank 26.4;Kapital bank 27.0;Poytaxt bank 27.4;OFB 28.3;BRB 29.3;Garant bank 30.2;Hamkorbank 30.3;Apex bank 31.1;Ipoteka bank 33.1;Anor bank 34.3;Davr bank 35.0;Tenge bank 35.2;Ipak yuli bank 36.7;Uzum bank 38.0;AVO bank 39.9;TBC bank 41.4"""
fixed_assets = """Ipoteka bank 19.5;Turon bank 20.1;Milliy bank 20.3;Ziraat bank 21.0;SQB 21.0;Xalq banki 21.7;Aloqabank 22.7;Ipak yuli bank 22.9;Trastbank 23.0;Agrobank 23.1;Infinbank 23.1;Asaka bank 23.2;Hamkorbank 23.6;Kapital bank 24.0;BRB 24.0;Universal bank 24.2;Davr bank 25.1;OFB 26.0;Anor bank 28.0"""
AVERAGES = {"working_capital": 22.8, "microloan": 28.3, "fixed_assets": 22.6}
LABELS = {"working_capital": "Working-capital loans to legal entities (aylanma mablag'larni to'ldirish)",
          "microloan": "Microloans (mikroqarzlar), individuals",
          "fixed_assets": "Loans to legal entities for buying fixed assets (asosiy vositalar xaridi)"}

loan_rows = []
for ltype, block in (("working_capital", working_capital), ("microloan", microloans), ("fixed_assets", fixed_assets)):
    for item in block.split(";"):
        bank, rate = item.rsplit(" ", 1)
        loan_rows.append((ltype, bank, float(rate), AS_OF, CBU_PDF))

TAX_RULES = [
    ("turnover_tax_standard", "Turnover tax (aylanmadan olinadigan soliq), standard rate", "4%", 4.0,
     "Unchanged for 2026", "https://kun.uz/news/2025/12/18/2026-yilda-asosiy-soliqlar-boyicha-stavkalar-ozgarmaydi"),
    ("turnover_tax_ip_small", "Turnover tax for individual entrepreneurs and self-employed with annual turnover up to 1 bn so'm", "1%", 1.0,
     "From 1 Jan 2026", "https://www.spot.uz/oz/2025/11/26/taxes-for-2026/"),
    ("general_regime_threshold", "Turnover above which a business moves to VAT + profit tax (12,000 x BHM)", "4,944,000,000 so'm", 4944000000,
     "From 1 Jun 2026; was 1 bn so'm since 2020", "https://kun.uz/news/2026/05/30/kichik-biznesga-soliq-erkinliklari-elon-qilindi-batafsil"),
    ("vat_6_catering_trade_services", "Optional regime for businesses whose main activity is catering, trade or services: VAT 6% on all sales, profit tax 0%", "6% VAT / 0% profit tax", 6.0,
     "1 Jun 2026 to 1 Jan 2030; excludes large taxpayers and firms 50%+ state-owned", "https://kun.uz/news/2026/05/30/kichik-biznesga-soliq-erkinliklari-elon-qilindi-batafsil"),
    ("vat_standard", "VAT, standard rate", "12%", 12.0, "2026", "https://gov.uz/oz/urganch/news/view/138410"),
    ("profit_tax_standard", "Profit tax, base rate", "15%", 15.0, "2026", "https://gov.uz/oz/urganch/news/view/138410"),
    ("profit_tax_exemption_first_year", "Businesses moving from turnover tax to VAT + profit tax for the first time are exempt from profit tax for one year", "1 year", None,
     "From 1 Jan 2026", "https://www.spot.uz/oz/2025/12/30/1st-january-changes/"),
    ("cbu_policy_rate", "Central Bank of Uzbekistan policy (key) rate", "14%", 14.0,
     "Held at 14% on 5 Nov 2026", "https://interfax.com/newsroom/top-stories/119812/"),
]

# Bazaar directory: only facts found in sources; empty = not confirmed
MARKETS = [
    ("eski_jova", "Eski Jo'va (Chorsu) dehqon bozori", "", "", "bazaar", 1, "https://stat.uz/images/uploads/reliz2021/minmax_31_08_22_english.pdf"),
    ("oloy", "Oloy dehqon bozori", "", "", "bazaar", 1, "https://stat.uz/images/uploads/reliz2021/minmax_31_08_22_english.pdf"),
    ("mirobod", "Mirobod dehqon bozori", "Mirobod", "Avliyoota ko'chasi", "bazaar", 1, "https://www.afisha.uz/uz/gorod/2026/08/18/school-bazaar"),
    ("farhod", "Farhod dehqon bozori", "Uchtepa", "Chilonzor-G9A massivi", "bazaar_with_wholesale_section", 1, "https://www.yellowpages.uz/en/rubric/markets/tashkent"),
    ("qoyliq", "Qo'yliq dehqon bozori", "", "", "bazaar", 1, "https://stat.uz/images/uploads/reliz2021/minmax_31_08_22_english.pdf"),
    ("yunusobod", "Yunusobod dehqon bozori", "Yunusobod", "", "bazaar", 0, "https://www.afisha.uz/uz/gorod/2026/08/18/school-bazaar"),
    ("chilonzor", "Chilonzor dehqon bozori", "Chilonzor", "Bunyodkor va Farhod ko'chalari kesishuvi", "bazaar", 0, "https://www.afisha.uz/uz/gorod/2026/08/18/school-bazaar"),
    ("askiya", "Askiya dehqon bozori", "Chilonzor", "Bunyodkor shoh ko'chasi, 156A", "bazaar", 0, "https://www.yellowpages.uz/en/rubric/markets/tashkent"),
    ("navroz", "Navro'z dehqon bozori", "Mirzo Ulug'bek", "TTZ-2 dahasi, Buyuk Ipak Yo'li va Gulsanam ko'chalari kesishuvi", "bazaar", 0, "https://www.goldenpages.uz/uz/company/?Id=5058"),
    ("aviasozlar", "Aviasozlar dehqon bozori", "", "", "bazaar", 0, "https://www.afisha.uz/uz/gorod/2026/08/18/school-bazaar"),
    ("sergeli", "Sergeli dehqon bozori", "Sergeli", "", "bazaar", 0, "https://talimxabarlari.uz/40909/"),
    ("qoraqamish", "Qoraqamish dehqon bozori", "", "", "bazaar", 0, "https://talimxabarlari.uz/40909/"),
    ("qoyliq_wholesale", "Qo'yliq ulgurji bozori (agricultural wholesale market)", "", "", "wholesale (closed for reconstruction Jan 2024; current status not confirmed)", 0, "https://kun.uz/en/news/2024/01/05/kuylik-wholesale-market-in-tashkent-closed-for-reconstruction"),
    ("food_city", "Food City (wholesale food complex)", "", "", "wholesale", 0, "https://kun.uz/en/news/2024/01/05/kuylik-wholesale-market-in-tashkent-closed-for-reconstruction"),
]

con = sqlite3.connect(os.path.join(OUT, "uz_market_prices.sqlite"))
con.executescript(open("schema_extra.sql").read())
con.executemany("insert into loan_rate_types values (?,?,?,?,?)", [(k, LABELS[k], AVERAGES[k], AS_OF, CBU_PDF) for k in LABELS])
con.executemany("insert into loan_rates values (?,?,?,?,?)", loan_rows)
con.executemany("insert into business_rules values (?,?,?,?,?,?)", TAX_RULES)
con.executemany("insert into markets values (?,?,?,?,?,?,?)", MARKETS)
con.commit()

def dump(q, name):
    cur = con.execute(q); cols = [d[0] for d in cur.description]
    with open(os.path.join(OUT, name), "w", newline="") as f:
        w = csv.writer(f); w.writerow(cols); w.writerows(cur.fetchall())
for t in ("loan_rate_types", "loan_rates", "business_rules", "markets"):
    dump(f"select * from {t}", f"{t}.csv")
print("loan rows", len(loan_rows), "rules", len(TAX_RULES), "markets", len(MARKETS))
