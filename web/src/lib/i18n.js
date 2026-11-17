// All on-screen text in three languages. To change a word, change it here.
// Use t("key", {param: value}) in code; {param} is replaced in the text.

export const LANGS = {
  uz: { label: "O'zbek", short: "UZ", speech: "uz-UZ", locale: "uz-UZ" },
  ru: { label: "Русский", short: "RU", speech: "ru-RU", locale: "ru-RU" },
  en: { label: "English", short: "EN", speech: "en-US", locale: "en-GB" },
};

const T = {
  // ---------- top bar ----------
  nav_ask: { uz: "So'rash", ru: "Спросить", en: "Ask" },
  nav_market: { uz: "Bozor", ru: "Рынок", en: "Market" },
  nav_team: { uz: "Agentlar", ru: "Агенты", en: "Agents" },
  nav_seller: { uz: "Sotuvchiman", ru: "Я продавец", en: "I'm a seller" },
  sound_on: { uz: "Ovoz yoqilgan", ru: "Звук включён", en: "Sound on" },
  sound_off: { uz: "Ovoz o'chirilgan", ru: "Звук выключен", en: "Sound off" },

  // ---------- hero ----------
  kicker: { uz: "Milliy AI hakaton · Toshkent 2026 · Tadbirkorlik", ru: "Национальный AI-хакатон · Ташкент 2026 · Предпринимательство", en: "National AI Hackathon · Tashkent 2026 · Entrepreneurship" },
  data_as_of: { uz: "stat.uz rasmiy narxlari · {month} holatiga", ru: "Официальные цены stat.uz · на {month}", en: "Official stat.uz prices · as of {month}" },
  hero_1: { uz: "Xarid ro'yxatini ayting.", ru: "Скажите, что купить.", en: "Say what you need." },
  hero_2: { uz: "Arzonini AI topadi.", ru: "AI найдёт дешевле.", en: "AI finds it cheaper." },
  hero_sub: {
    uz: "O'zbek, rus yoki ingliz tilida, yozib yoki ovoz bilan. 4 ta AI agent eng arzon sotuvchini, hozir olish yoki kutishni va pul yetishini hisoblaydi.",
    ru: "На узбекском, русском или английском, текстом или голосом. 4 AI-агента находят самого дешёвого продавца, говорят, покупать сейчас или ждать, и хватит ли денег.",
    en: "In Uzbek, Russian or English, by text or voice. 4 AI agents find the cheapest seller, tell you to buy now or wait, and check if your cash is enough.",
  },
  placeholder: { uz: "Masalan: 200 kg guruch va 100 litr yog' kerak, 4 mln so'm bor", ru: "Например: нужно 200 кг риса и 100 л масла, есть 4 млн сум", en: "E.g. I need 200 kg rice and 100 L oil, I have 4 million so'm" },
  ex_1: { uz: "Choyxonam uchun 200 kg guruch va 100 litr yog' kerak, qo'limda 4 mln so'm bor", ru: "Для чайханы нужно 200 кг риса и 100 литров масла, есть 4 млн сум", en: "For my teahouse I need 200 kg rice and 100 litres of oil, I have 4 million so'm" },
  ex_2: { uz: "Oshxona uchun 40 kg mol go'shti, 30 kg piyoz va 25 kg sabzi, ertaga kerak", ru: "Для столовой 40 кг говядины, 30 кг лука и 25 кг моркови, к завтра", en: "Canteen needs 40 kg beef, 30 kg onions and 25 kg carrots by tomorrow" },
  ex_3: { uz: "Do'konim uchun 50 kg shakar, 300 ta tuxum va 50 kg un, 2 mln so'm bor", ru: "Для магазина 50 кг сахара, 300 яиц и 50 кг муки, есть 2 млн", en: "Shop needs 50 kg sugar, 300 eggs and 50 kg flour, I have 2 million" },
  regions_label: { uz: "Viloyatlar", ru: "Регионы", en: "Regions" },
  regions_hint: { uz: "★ rasmiy narx bor. Agentlar faqat belgilangan viloyatlarni ko'radi.", ru: "★ есть официальная цена. Агенты смотрят только отмеченные регионы.", en: "★ has official prices. Agents only look at ticked regions." },
  regions_more: { uz: "+{n} ta", ru: "+{n}", en: "+{n} more" },
  done: { uz: "Tayyor", ru: "Готово", en: "Done" },
  stat_prices: { uz: "rasmiy narx", ru: "офиц. цен", en: "official prices" },
  stat_products: { uz: "mahsulot", ru: "товаров", en: "products" },
  stat_offers: { uz: "sotuvchi taklifi (demo + jonli)", ru: "предложений продавцов (демо + живые)", en: "seller offers (demo + live)" },
  stat_agents: { uz: "AI agent", ru: "AI-агента", en: "AI agents" },

  // ---------- voice ----------
  mic_start: { uz: "Gapiring", ru: "Говорите", en: "Speak" },
  mic_listening: { uz: "Tinglayapman… yana bosing", ru: "Слушаю… нажмите ещё раз", en: "Listening… tap again to stop" },
  mic_working: { uz: "Ovoz matnga aylantirilmoqda…", ru: "Распознаю речь…", en: "Transcribing…" },
  mic_check: { uz: "Matnni tekshiring, kerak bo'lsa tuzating va yuboring ↑", ru: "Проверьте текст, при необходимости исправьте и отправьте ↑", en: "Check the text, edit if needed, then send ↑" },
  mic_denied: { uz: "Mikrofonga ruxsat berilmadi", ru: "Нет доступа к микрофону", en: "Microphone access denied" },
  mic_unsupported: { uz: "Bu brauzer ovozni qo'llamaydi", ru: "Браузер не поддерживает голос", en: "This browser has no voice input" },
  read_aloud: { uz: "O'qib berish", ru: "Прочитать", en: "Read aloud" },
  stop_reading: { uz: "To'xtatish", ru: "Стоп", en: "Stop" },

  // ---------- simple agent lines ----------
  s_best_line: { uz: "{seller} ({region}): {price}, yetkazib berish bilan jami {total}", ru: "{seller} ({region}): {price}, с доставкой {total}", en: "{seller} ({region}): {price}, {total} with delivery" },
  s_min: { uz: "Min.", ru: "Мин.", en: "Min." },
  s_more: { uz: "yana {n} ta taklifdan arzonroq: ro'yxatni ko'rish", ru: "дешевле ещё {n} предложений: показать список", en: "cheaper than {n} other offers: see the list" },
  a_cheaper: { uz: "rasmiy narxdan {pct} arzon ✓", ru: "на {pct} дешевле официальной ✓", en: "{pct} below the official price ✓" },
  a_dearer: { uz: "rasmiy narxdan {pct} qimmat", ru: "на {pct} дороже официальной", en: "{pct} above the official price" },
  a_flag: { uz: "{seller}: {pct} qimmat, tanlanmadi", ru: "{seller}: дороже на {pct}, не выбран", en: "{seller}: {pct} overpriced, not chosen" },
  a_flag_low: { uz: "{seller}: {pct} arzon, sifatini tekshiring", ru: "{seller}: дешевле на {pct}, проверьте качество", en: "{seller}: {pct} cheaper, check quality" },
  fin_enough: { uz: "✓ Pul yetadi, {left} qoladi", ru: "✓ Денег хватает, останется {left}", en: "✓ Enough cash, {left} left over" },
  fin_short: { uz: "{short} yetmaydi", ru: "Не хватает {short}", en: "Short by {short}" },
  fin_borrow: { uz: "Qarz olib hozir olish foydaliroq (1 oylik foiz ~{sum})", ru: "Выгоднее взять кредит и купить сейчас (проценты за месяц ~{sum})", en: "Borrowing and buying now is cheaper (1 month interest ~{sum})" },
  fin_wait: { uz: "Qarz qimmat (1 oyga ~{sum}): hozir pul yetganini oling", ru: "Кредит дорогой (~{sum} за месяц): купите сейчас на свои", en: "A loan costs more (~{sum}/month): buy what your cash covers now" },
  // ---------- final advice ----------
  fa_title: { uz: "Yakuniy maslahat", ru: "Итоговый совет", en: "Final advice" },
  fa_rising: { uz: "Bugun yoki ertaga oling: keyingi oy narx ~{pct} oshishi kutilmoqda. Hozir olsangiz ~{sum} tejaysiz.", ru: "Купите сегодня или завтра: в следующем месяце цена вырастет на ~{pct}. Сэкономите ~{sum}.", en: "Buy today or tomorrow: the price is expected to rise ~{pct} next month. Buying now saves ~{sum}." },
  fa_falling: { uz: "Shoshilmang: ~{days} kun kuting (oy boshigacha), narx ~{pct} tushishi kutilmoqda. ~{sum} tejaysiz.", ru: "Не спешите: подождите ~{days} дн. (до начала месяца), цена снизится на ~{pct}. Экономия ~{sum}.", en: "No rush: wait ~{days} days (start of next month), the price should drop ~{pct}. Saves ~{sum}." },
  fa_deadline: { uz: "Sizga {days} kunda kerak, shuning uchun hozir oling (narx keyinroq ~{pct} tushishi mumkin).", ru: "Нужно через {days} дн., поэтому покупайте сейчас (позже цена может снизиться на ~{pct}).", en: "You need it in {days} days, so buy now (the price may drop ~{pct} later)." },
  fa_stable: { uz: "Narx barqaror: kerak bo'lganda oling, shoshilish shart emas.", ru: "Цена стабильна: покупайте, когда нужно, спешить не обязательно.", en: "Price is stable: buy when you need it, no rush." },
  fa_trend_up: { uz: "So'nggi 3 oyda narx {pct} oshgan: 1–2 kun ichida olgan ma'qul.", ru: "За 3 месяца цена выросла на {pct}: лучше купить в ближайшие 1–2 дня.", en: "The price rose {pct} over 3 months: better buy within 1–2 days." },
  fa_trend_down: { uz: "So'nggi 3 oyda narx {pct} tushgan: shoshilmang, narxni kuzatib boring.", ru: "За 3 месяца цена снизилась на {pct}: не спешите, следите за ценой.", en: "The price fell {pct} over 3 months: no rush, keep an eye on it." },
  fa_no_data: { uz: "Prognoz yo'q: kerak bo'lganda oling.", ru: "Прогноза нет: покупайте, когда нужно.", en: "No forecast: buy when you need it." },
  fa_where: { uz: "Qayerdan: {seller}, {region} · {price}", ru: "Где: {seller}, {region} · {price}", en: "Where: {seller}, {region} · {price}" },
  fa_total: { uz: "Jami {total}, rasmiy narxdan {saved} arzon.", ru: "Всего {total}, на {saved} дешевле официальных цен.", en: "Total {total}, {saved} below official prices." },
  fa_timing: { uz: "To'g'ri vaqtda olsangiz yana ~{sum} tejaysiz.", ru: "Если купить в правильное время, сэкономите ещё ~{sum}.", en: "Buying at the right time saves another ~{sum}." },
  fa_note: { uz: "Prognoz — mavsumiy taxmin (Toshkent shahri ma'lumotlari), kafolat emas.", ru: "Прогноз — сезонная оценка (данные Ташкента), не гарантия.", en: "Forecasts are a seasonal estimate (Tashkent city data), not a guarantee." },
  // ---------- agents ----------
  agents_title: { uz: "AI agentlar ishlamoqda", ru: "AI-агенты работают", en: "AI agents at work" },
  agents_title_done: { uz: "AI agentlar xulosasi", ru: "Выводы AI-агентов", en: "What the AI agents found" },
  a1_name: { uz: "Mirzo", ru: "Мирзо", en: "Mirzo" },
  a1_title: { uz: "Kotib · rejachi", ru: "Писарь · планировщик", en: "The scribe · planner" },
  a2_name: { uz: "Dallol", ru: "Даллол", en: "Dallol" },
  a2_title: { uz: "Bozor dalloli · narx izlovchi", ru: "Базарный посредник · ищет цены", en: "The bazaar broker · price scout" },
  a3_name: { uz: "Tarozibon ota", ru: "Тарозибон-ота", en: "Tarozibon ota" },
  a3_title: { uz: "Tarozi egasi · bozor tahlilchisi", ru: "Хранитель весов · аналитик рынка", en: "Keeper of the scales · market analyst" },
  a4_name: { uz: "Xazinachi opa", ru: "Хазиначи-опа", en: "Xazinachi opa" },
  a4_title: { uz: "Xazinachi · moliya maslahatchisi", ru: "Казначей · финансовый советник", en: "The treasurer · finance advisor" },
  and: { uz: "va", ru: "и", en: "and" },
  hero_agents_tail: { uz: "sizga eng muqobil xaridni topib berishadi.", ru: "найдут для вас самую выгодную покупку.", en: "find you the best-value purchase." },
  team_sub: { uz: "To'rt AI agent, har birining o'z ishi bor. Raqamlarni kod hisoblaydi, AI faqat gapingizni o'qiydi va izoh yozadi.", ru: "Четыре AI-агента, у каждого своя работа. Цифры считает код, AI только читает запрос и пишет пояснение.", en: "Four AI agents, each with one job. Code computes the numbers; the AI only reads your request and writes the explanation." },
  crew_title: { uz: "Sizning bozor jamoangiz", ru: "Ваша базарная команда", en: "Your bazaar crew" },
  a1_role: { uz: "Gapni o'qiydi: mahsulot, miqdor, pul, muddat", ru: "Читает запрос: товары, объём, деньги, срок", en: "Reads the order: products, amounts, cash, deadline" },
  a2_role: { uz: "Sotuvchilar takliflarini yetkazish bilan solishtiradi", ru: "Сравнивает предложения продавцов с доставкой", en: "Ranks seller offers by delivered cost" },
  a3_role: { uz: "Rasmiy narx, trend va prognoz bilan tekshiradi", ru: "Сверяет с официальной ценой, трендом и прогнозом", en: "Checks against official price, trend and forecast" },
  a4_role: { uz: "Pul yetadimi, qarz olish kerakmi", ru: "Хватит ли денег, нужен ли кредит", en: "Is the cash enough, should you borrow" },
  st_wait: { uz: "kutmoqda", ru: "ожидает", en: "waiting" },
  st_run: { uz: "ishlamoqda", ru: "работает", en: "working" },
  st_done: { uz: "tayyor", ru: "готово", en: "done" },

  p_reading: { uz: "Gapni o'qiyapman…", ru: "Читаю запрос…", en: "Reading your order…" },
  p_by_claude: { uz: "Claude (AI) o'qidi", ru: "Прочитал Claude (AI)", en: "Read by Claude (AI)" },
  p_by_keywords: { uz: "Kalit so'zlar bo'yicha o'qildi (zaxira usul)", ru: "Разобрано по ключевым словам (запасной режим)", en: "Parsed with keywords (fallback mode)" },
  p_cash: { uz: "Pul", ru: "Деньги", en: "Cash" },
  p_deadline: { uz: "Muddat", ru: "Срок", en: "Deadline" },
  p_days: { uz: "{n} kun", ru: "{n} дн.", en: "{n} days" },
  p_not_said: { uz: "aytilmadi", ru: "не указано", en: "not given" },
  p_default_qty: { uz: "miqdor aytilmadi, {n} deb oldim", ru: "объём не указан, взял {n}", en: "no amount given, using {n}" },
  p_off_topic: { uz: "Kechirasiz, bu savolga javob bera olmayman. Men faqat biznesingiz uchun xarid bo'yicha yordam beraman: qayerdan arzon olish, hozir olish yoki kutish va pul yetadimi. Masalan: “Choyxonamga 200 kg guruch va 100 litr yog' kerak”.", ru: "Извините, на этот вопрос я не отвечаю. Я помогаю только с закупками для вашего бизнеса: где купить дешевле, покупать сейчас или подождать и хватит ли денег. Например: «Для чайханы нужно 200 кг риса и 100 л масла».", en: "Sorry, I can't answer that. I only help with purchases for your business: where to buy cheapest, whether to buy now or wait, and whether your cash is enough. For example: “I need 200 kg of rice and 100 litres of oil for my teahouse”." },
  p_nothing: { uz: "Mahsulot topilmadi. Masalan: “200 kg guruch, 100 litr yog'”.", ru: "Товары не найдены. Например: «200 кг риса, 100 л масла».", en: "No products found. Try: “200 kg rice, 100 litres of oil”." },

  s_loading: { uz: "{r} ta viloyatdan takliflarni olyapman…", ru: "Загружаю предложения из {r} регион(ов)…", en: "Loading offers from {r} region(s)…" },
  s_checked: { uz: "{n} ta taklif tekshirildi", ru: "Проверено предложений: {n}", en: "{n} offers checked" },
  s_none: { uz: "taklif yo'q", ru: "нет предложений", en: "no offers" },
  s_best: { uz: "eng arzon", ru: "дешевле всех", en: "cheapest" },
  s_total: { uz: "jami", ru: "итого", en: "total" },

  m_official: { uz: "Rasmiy o'rtacha", ru: "Офиц. средняя", en: "Official average" },
  m_trend3: { uz: "3 oyda", ru: "за 3 мес.", en: "3-month" },
  m_next: { uz: "keyingi oy (taxmin)", ru: "след. месяц (оценка)", en: "next month (estimate)" },
  m_flag_high: { uz: "qimmat", ru: "дорого", en: "overpriced" },
  m_flag_low: { uz: "juda arzon, sifatini tekshiring", ru: "слишком дёшево, проверьте качество", en: "very cheap, check quality" },
  m_no_flags: { uz: "Keskin farq qiladigan taklif yo'q", ru: "Резких отклонений нет", en: "No offer far from the official price" },
  m_flags: { uz: "{n} ta taklif belgilandi", ru: "Отмечено предложений: {n}", en: "{n} offers flagged" },
  sig_buy: { uz: "Hozir oling", ru: "Покупать сейчас", en: "Buy now" },
  sig_wait: { uz: "Kutish mumkin", ru: "Можно подождать", en: "Can wait" },
  sig_neutral: { uz: "Narx barqaror", ru: "Цена стабильна", en: "Price stable" },
  m_no_official: { uz: "rasmiy narx yo'q", ru: "нет офиц. цены", en: "no official price" },

  f_need: { uz: "Kerak", ru: "Нужно", en: "Needed" },
  f_have: { uz: "Bor", ru: "Есть", en: "You have" },
  f_enough: { uz: "Pul yetadi: {left} qoladi", ru: "Денег хватает: останется {left}", en: "Cash is enough: {left} left over" },
  f_short: { uz: "Yetmaydi: {short}", ru: "Не хватает: {short}", en: "Short by {short}" },
  f_interest: { uz: "1 oylik foiz ({rate}%): ~{sum}", ru: "Проценты за 1 мес. ({rate}%): ~{sum}", en: "1 month of interest ({rate}%): ~{sum}" },
  f_wait_up: { uz: "1 oy kutsangiz ~{sum} qimmatroq (taxmin)", ru: "Если ждать месяц, ~{sum} дороже (оценка)", en: "Waiting a month costs ~{sum} more (estimate)" },
  f_wait_down: { uz: "1 oy kutsangiz ~{sum} arzonroq (taxmin)", ru: "Если ждать месяц, ~{sum} дешевле (оценка)", en: "Waiting a month saves ~{sum} (estimate)" },
  f_wait_flat: { uz: "1 oyda narx deyarli o'zgarmaydi (taxmin)", ru: "За месяц цена почти не изменится (оценка)", en: "Prices barely move in a month (estimate)" },
  f_nocash: { uz: "Pulingizni ayting (masalan “4 mln so'm bor”), qarz kerakmi hisoblayman", ru: "Укажите сумму (например «есть 4 млн»), и я посчитаю, нужен ли кредит", en: "Tell me your cash (e.g. “I have 4 million”) and I'll check if you need a loan" },
  loan_wc: { uz: "Aylanma mablag' krediti (yuridik shaxs)", ru: "Кредит на оборотные средства (юр. лица)", en: "Working-capital loan (companies)" },
  loan_micro: { uz: "Mikroqarz (jismoniy shaxs, YaTT)", ru: "Микрозайм (физлица, ИП)", en: "Microloan (individuals, sole traders)" },
  avg: { uz: "o'rtacha", ru: "в среднем", en: "average" },

  v_enough: { uz: "Pul yetadi: hozir sotib olishingiz mumkin.", ru: "Денег хватает: можно покупать сейчас.", en: "Your cash is enough: you can buy now." },
  v_borrow: { uz: "Pul yetmaydi. Narx oshishi kutilmoqda, qarz foizi undan arzon: qarz olib hozir olish foydaliroq.", ru: "Денег не хватает. Цены вырастут сильнее, чем проценты по кредиту: выгоднее занять и купить сейчас.", en: "Not enough cash. Prices are expected to rise more than the loan interest: borrowing and buying now is cheaper." },
  v_wait: { uz: "Pul yetmaydi. Qarz foizi kutilayotgan narx o'zgarishidan qimmat: hozir pulingiz yetganini oling, qolganini keyinroq.", ru: "Денег не хватает. Кредит дороже ожидаемого роста цен: купите сейчас на имеющиеся деньги, остальное позже.", en: "Not enough cash. The loan costs more than the expected price change: buy what your cash covers now, the rest later." },
  v_nocash: { uz: "Pul miqdori aytilmadi.", ru: "Сумма денег не указана.", en: "Cash amount not given." },

  // ---------- plan ----------
  plan_title: { uz: "Xarid rejasi", ru: "План закупки", en: "Purchase plan" },
  col_product: { uz: "Mahsulot", ru: "Товар", en: "Product" },
  col_where: { uz: "Qayerdan", ru: "Где купить", en: "Where" },
  col_price: { uz: "Narx", ru: "Цена", en: "Price" },
  col_vs: { uz: "Rasmiyga nisbatan", ru: "К офиц. цене", en: "vs official" },
  col_sum: { uz: "Summa", ru: "Сумма", en: "Amount" },
  delivery: { uz: "yetkazish", ru: "доставка", en: "delivery" },
  free: { uz: "bepul", ru: "бесплатно", en: "free" },
  min_order: { uz: "eng kam buyurtma {q}", ru: "мин. заказ {q}", en: "min. order {q}" },
  official: { uz: "rasmiy", ru: "офиц.", en: "official" },
  no_offer_row: { uz: "Belgilangan viloyatlarda taklif yo'q. Boshqa viloyatni qo'shing.", ru: "В выбранных регионах нет предложений. Добавьте регион.", en: "No offers in the ticked regions. Add another region." },
  t_goods: { uz: "Mahsulotlar", ru: "Товары", en: "Goods" },
  t_delivery: { uz: "Yetkazib berish", ru: "Доставка", en: "Delivery" },
  t_total: { uz: "Jami", ru: "Итого", en: "Total" },
  t_savings: { uz: "Rasmiy o'rtachadan tejash", ru: "Экономия к офиц. средней", en: "Saved vs official average" },
  finance: { uz: "Moliya", ru: "Финансы", en: "Finance" },
  explain_template: { uz: "Izoh: shablon matn", ru: "Пояснение: шаблон", en: "Explanation: template text" },
  explain_claude: { uz: "Izoh: Claude (raqamlar agentlardan)", ru: "Пояснение: Claude (цифры от агентов)", en: "Explanation: Claude (numbers from the agents)" },
  rates_title: { uz: "Bank stavkalari (Markaziy bank, {date})", ru: "Ставки банков (ЦБ, {date})", en: "Bank rates (Central Bank, {date})" },
  rates_note: { uz: "MB asosiy stavkasi {rate}. Bu taqqoslash, taklif emas: yakuniy stavkani bank belgilaydi.", ru: "Ключевая ставка ЦБ {rate}. Это сравнение, а не оферта: итоговую ставку устанавливает банк.", en: "CBU policy rate {rate}. This is a comparison, not an offer: the bank sets the final rate." },
  tax_title: { uz: "Soliq bo'yicha eslatma (2026)", ru: "Налоги: кратко (2026)", en: "Tax notes (2026)" },
  tax_1: { uz: "Aylanmadan olinadigan soliq: {std} (YaTT va o'zini o'zi band qilganlar, aylanma 1 mlrd gacha: {ip}).", ru: "Налог с оборота: {std} (ИП и самозанятые с оборотом до 1 млрд: {ip}).", en: "Turnover tax: {std} (sole traders and self-employed up to 1 bn turnover: {ip})." },
  tax_2: { uz: "Aylanma {lim} dan oshsa: QQS + foyda solig'i.", ru: "При обороте свыше {lim}: НДС + налог на прибыль.", en: "Above {lim} turnover: VAT + profit tax." },
  tax_3: { uz: "Umumiy ovqatlanish va savdo uchun ixtiyoriy rejim: QQS 6%, foyda solig'i 0% (2030 gacha).", ru: "Для общепита и торговли по желанию: НДС 6%, налог на прибыль 0% (до 2030).", en: "Optional regime for catering and trade: 6% VAT, 0% profit tax (until 2030)." },
  tax_note: { uz: "Soliq qoidalari o'zgarishi mumkin, inspeksiyada tekshiring.", ru: "Правила могут меняться, уточняйте в налоговой.", en: "Tax rules change; check with the tax office." },
  tmpl: {
    uz: "Eng arzon takliflar: {items}. Jami {total}, rasmiy o'rtachadan {saved} tejaysiz. {verdict}",
    ru: "Самые выгодные предложения: {items}. Итого {total}, экономия к официальной средней {saved}. {verdict}",
    en: "Best offers: {items}. Total {total}, {saved} below the official average. {verdict}",
  },

  // ---------- dashboard ----------
  dash_title: { uz: "Bozor holati", ru: "Состояние рынка", en: "Market pulse" },
  dash_sub: { uz: "Rasmiy statistika va jonli takliflar bir joyda", ru: "Официальная статистика и живые предложения в одном месте", en: "Official statistics and live offers in one place" },
  dash_more: { uz: "Batafsil bozor →", ru: "Подробнее о рынке →", en: "Full market view →" },
  kpi_offers: { uz: "Sotuvchilar takliflari", ru: "Предложения продавцов", en: "Seller offers" },
  kpi_sellers: { uz: "Sotuvchilar", ru: "Продавцы", en: "Sellers" },
  kpi_regions: { uz: "Rasmiy narxli viloyatlar", ru: "Регионы с офиц. ценами", en: "Regions with official prices" },
  kpi_month: { uz: "Oxirgi rasmiy oy", ru: "Последний офиц. месяц", en: "Latest official month" },
  kpi_demo_note: { uz: "{d} demo · {l} jonli", ru: "{d} демо · {l} живых", en: "{d} demo · {l} live" },
  movers_title: { uz: "3 oyda eng ko'p o'zgargan narxlar (Toshkent shahri)", ru: "Больше всего изменились за 3 мес. (Ташкент)", en: "Biggest 3-month moves (Tashkent city)" },
  chart_title: { uz: "Narx tarixi va taxmin (Toshkent shahri)", ru: "История цен и прогноз (Ташкент)", en: "Price history and forecast (Tashkent city)" },
  cheapest_title: { uz: "Qayerda arzon? (rasmiy o'rtacha)", ru: "Где дешевле? (офиц. средняя)", en: "Where is it cheaper? (official average)" },
  cheapest_region: { uz: "Eng arzon viloyat", ru: "Дешевле всего", en: "Cheapest region" },
  vs_tashkent: { uz: "Toshkentga nisbatan", ru: "К Ташкенту", en: "vs Tashkent" },
  legend_official: { uz: "Rasmiy o'rtacha (stat.uz)", ru: "Офиц. средняя (stat.uz)", en: "Official average (stat.uz)" },
  legend_forecast: { uz: "Taxmin", ru: "Прогноз", en: "Estimate" },

  // ---------- market page ----------
  market_title: { uz: "Bozor narxlari", ru: "Цены на рынке", en: "Market prices" },
  m_product: { uz: "Mahsulot", ru: "Товар", en: "Product" },
  m_region: { uz: "Viloyat", ru: "Регион", en: "Region" },
  m_stores: { uz: "O'zbekiston do'konlari (o'rtacha)", ru: "Магазины Узбекистана (среднее)", en: "Uzbekistan stores (average)" },
  m_chart_hint: { uz: "Chiziq: rasmiy oylik o'rtacha (stat.uz). Uzuq chiziq: taxmin (mavsumiy model, faqat Toshkent shahri), rasmiy ma'lumot emas.", ru: "Линия: официальная средняя за месяц (stat.uz). Пунктир: оценка (сезонная модель, только Ташкент), не официальные данные.", en: "Line: official monthly average (stat.uz). Dashed: estimate (seasonal model, Tashkent city only), not official data." },
  offers_now: { uz: "Hozirgi takliflar", ru: "Текущие предложения", en: "Current offers" },
  col_seller: { uz: "Sotuvchi", ru: "Продавец", en: "Seller" },
  col_region: { uz: "Viloyat", ru: "Регион", en: "Region" },
  no_offers: { uz: "Hozircha taklif yo'q", ru: "Пока нет предложений", en: "No offers yet" },

  // ---------- seller page ----------
  seller_title: { uz: "Narxingizni joylang", ru: "Разместите свою цену", en: "Post your price" },
  seller_sub: { uz: "Taklifingiz 7 kun ko'rinadi va AI agentlar uni darhol xaridorlarga tavsiya qila boshlaydi. Shu mahsulotga yangi narx yozsangiz, eskisi almashadi.", ru: "Предложение видно 7 дней, и AI-агенты сразу начинают рекомендовать его покупателям. Новая цена на тот же товар заменяет старую.", en: "Your offer stays live for 7 days and the AI agents start recommending it to buyers right away. A new price for the same product replaces the old one." },
  f_name: { uz: "Ism yoki do'kon nomi", ru: "Имя или название магазина", en: "Name or shop name" },
  f_phone: { uz: "Telefon (ixtiyoriy)", ru: "Телефон (необязательно)", en: "Phone (optional)" },
  f_consent: { uz: "Telefonim xaridorlarga ko'rsatilishiga roziman", ru: "Согласен показывать телефон покупателям", en: "I agree to show my phone to buyers" },
  f_region: { uz: "Viloyat", ru: "Регион", en: "Region" },
  f_market: { uz: "Bozor", ru: "Рынок", en: "Market" },
  f_market_ph: { uz: "Masalan: Oloy dehqon bozori", ru: "Например: рынок Алай", en: "E.g. Oloy dehqon bozori" },
  f_product: { uz: "Mahsulot", ru: "Товар", en: "Product" },
  f_price: { uz: "Narx (so'm, {unit} uchun)", ru: "Цена (сум за {unit})", en: "Price (so'm per {unit})" },
  f_min: { uz: "Eng kam miqdor", ru: "Мин. объём", en: "Minimum quantity" },
  f_fee: { uz: "Yetkazib berish narxi (so'm, 0 = bepul)", ru: "Доставка (сум, 0 = бесплатно)", en: "Delivery fee (so'm, 0 = free)" },
  f_submit: { uz: "Joylash", ru: "Разместить", en: "Post offer" },
  f_sending: { uz: "Yuborilmoqda…", ru: "Отправка…", en: "Sending…" },
  f_ok: { uz: "✓ Taklifingiz joylandi. Endi xaridorlar rejasida ko'rinadi.", ru: "✓ Предложение размещено. Теперь оно в планах покупателей.", en: "✓ Your offer is live. Buyers' plans will now include it." },
  f_err: { uz: "Xatolik: {msg}", ru: "Ошибка: {msg}", en: "Error: {msg}" },
  f_cmp_none: { uz: "Bu viloyat uchun rasmiy narx yo'q.", ru: "Для этого региона нет официальной цены.", en: "No official price for this region." },
  f_cmp_base: { uz: "Rasmiy o'rtacha ({month}): {price}", ru: "Офиц. средняя ({month}): {price}", en: "Official average ({month}): {price}" },
  f_cmp_yours: { uz: "Sizning narxingiz {pct}", ru: "Ваша цена {pct}", en: "Your price is {pct}" },
  f_cmp_high: { uz: "Tarozibon ota buni “qimmat” deb belgilaydi", ru: "Тарозибон-ота отметит её как «дорого»", en: "Tarozibon ota will flag it as overpriced" },
  f_cmp_low: { uz: "xaridorlar uchun arzon", ru: "выгодно для покупателей", en: "a good deal for buyers" },

  // ---------- units, misc ----------
  unit_kg: { uz: "kg", ru: "кг", en: "kg" },
  unit_litre: { uz: "litr", ru: "л", en: "L" },
  unit_10pcs: { uz: "×10 dona", ru: "×10 шт.", en: "×10 pcs" },
  per_kg: { uz: "1 kg", ru: "1 кг", en: "1 kg" },
  per_litre: { uz: "1 litr", ru: "1 л", en: "1 litre" },
  per_10pcs: { uz: "10 dona", ru: "10 шт.", en: "10 pcs" },
  som: { uz: "so'm", ru: "сум", en: "so'm" },
  mln: { uz: "mln so'm", ru: "млн сум", en: "mln so'm" },
  demo: { uz: "Demo", ru: "Демо", en: "Demo" },
  live: { uz: "Jonli", ru: "Живое", en: "Live" },
  estimate: { uz: "taxmin", ru: "оценка", en: "estimate" },
  loading: { uz: "Ma'lumotlar yuklanmoqda…", ru: "Загрузка данных…", en: "Loading data…" },
  load_error: { uz: "Ma'lumotlarni yuklab bo'lmadi: {msg}", ru: "Не удалось загрузить данные: {msg}", en: "Could not load data: {msg}" },
  run_error: { uz: "Xatolik: {msg}. Internetni tekshirib, qayta urinib ko'ring.", ru: "Ошибка: {msg}. Проверьте интернет и попробуйте ещё раз.", en: "Error: {msg}. Check your connection and try again." },
  pick_region: { uz: "Kamida bitta viloyatni belgilang.", ru: "Отметьте хотя бы один регион.", en: "Tick at least one region." },
  footer: {
    uz: "Rasmiy narxlar: O'zbekiston Milliy statistika qo'mitasi (stat.uz, SIAT), CC BY 4.0. Kredit stavkalari: Markaziy bank taqqoslashi (19.10.2026), taklif emas. Demo sotuvchilar namuna ma'lumot; prognozlar taxmin. Ovoz: VoiceLab. AI: Gemini (zaxira: Claude).",
    ru: "Официальные цены: Национальный комитет по статистике (stat.uz, SIAT), CC BY 4.0. Ставки: сравнение ЦБ (19.10.2026), не оферта. Демо-продавцы — образец данных; прогнозы — оценки. Голос: VoiceLab. AI: Gemini (резерв: Claude).",
    en: "Official prices: National Statistics Committee of Uzbekistan (stat.uz, SIAT), CC BY 4.0. Loan rates: Central Bank comparison (19.10.2026), not an offer. Demo sellers are sample data; forecasts are estimates. Voice: VoiceLab. AI: Gemini (backup: Claude).",
  },
  // ---------- business model (plan card + Agents page; numbers in lib/business.js) ----------
  earn_title: { uz: "Siz uchun bepul.", ru: "Для вас бесплатно.", en: "Free for you." },
  earn_seller: { uz: "Sotuvchi BuyAI'ga buyurtmaning {pct}% ini to'laydi: bu rejada {fee} (rejalashtirilgan).", ru: "Продавец платит BuyAI {pct}% от заказа: по этому плану {fee} (план).", en: "The seller pays BuyAI {pct}% of the order: {fee} on this plan (planned)." },
  earn_bank: { uz: "Hamkor bankdan kredit olsangiz, bank bizga tavsiya haqi to'laydi; sizning stavkangiz o'zgarmaydi.", ru: "Если возьмёте кредит в банке-партнёре, банк платит нам за рекомендацию; ваша ставка не меняется.", en: "If you borrow from a partner bank, the bank pays us a referral fee; your rate stays the same." },
  earn_more: { uz: "BuyAI qanday daromad qiladi →", ru: "Как зарабатывает BuyAI →", en: "How BuyAI earns →" },
  bm_title: { uz: "BuyAI qanday daromad qiladi", ru: "Как зарабатывает BuyAI", en: "How BuyAI earns" },
  bm_sub: { uz: "Xaridor uchun bepul. Pulni sotuvchilar, banklar va ma'lumot oluvchilar to'laydi. Narxlar rejalashtirilgan, hali daromad yo'q.", ru: "Для покупателя бесплатно. Платят продавцы, банки и покупатели данных. Цены плановые, выручки пока нет.", en: "Free for buyers. Sellers, banks and data customers pay. Prices are planned; no revenue yet." },
  bm_s1_h: { uz: "Sotuvchi komissiyasi", ru: "Комиссия продавца", en: "Seller commission" },
  bm_s1_p: { uz: "BuyAI orqali kelgan buyurtmadan {pct}%. Sotuvchi faqat sotganda to'laydi.", ru: "{pct}% с заказа, пришедшего через BuyAI. Продавец платит только за продажу.", en: "{pct}% of each order that came through BuyAI. Sellers pay only when they sell." },
  bm_s2_h: { uz: "Bank tavsiyasi", ru: "Реферал банка", en: "Bank referral" },
  bm_s2_p: { uz: "Tasdiqlangan har bir kredit uchun ~${usd}. Moliya maslahatchisi kredit kerakligini allaqachon aniqlaydi.", ru: "~${usd} за каждый одобренный кредит. Финансовый советник уже определяет, нужен ли кредит.", en: "~${usd} per approved loan. The Finance Advisor already spots who needs one." },
  bm_s3_h: { uz: "Narx ma'lumotlari obunasi", ru: "Подписка на данные", en: "Price data subscription" },
  bm_s3_p: { uz: "Banklar, ulgurji sotuvchilar, tahlilchilar uchun oyiga ~${usd}: jonli takliflar + rasmiy narxlar, 14 viloyat.", ru: "~${usd}/мес для банков, оптовиков, аналитиков: живые предложения + официальные цены, 14 регионов.", en: "~${usd}/month for banks, wholesalers, analysts: live offers + official prices, 14 regions." },
  bm_s4_h: { uz: "Premium", ru: "Премиум", en: "Premium" },
  bm_s4_p: { uz: "Bir nechta filialli biznes uchun oyiga ~${usd}: umumiy xarid, hisobotlar.", ru: "~${usd}/мес для бизнеса с филиалами: общие закупки, отчёты.", en: "~${usd}/month for multi-branch businesses: joint buying, reports." },
  bm_cost_title: { uz: "Bitta foydalanuvchi bizga qanchaga tushadi", ru: "Сколько нам стоит один пользователь", en: "What one user costs us" },
  bm_c_plan: { uz: "Bitta xarid rejasi (2 ta AI so'rov, Gemini Flash)", ru: "Один план закупки (2 запроса к AI, Gemini Flash)", en: "One purchase plan (2 AI calls, Gemini Flash)" },
  bm_c_ai: { uz: "AI, oyiga {n} ta reja", ru: "AI, {n} планов в месяц", en: "AI, {n} plans a month" },
  bm_c_host: { uz: "Server (Vercel + Supabase) ulushi, {n} ta biznesda", ru: "Доля сервера (Vercel + Supabase) при {n} бизнесах", en: "Server share (Vercel + Supabase) at {n} businesses" },
  bm_c_total: { uz: "Xarajat: 1 biznes / oy", ru: "Затраты: 1 бизнес / мес", en: "Cost: 1 business / month" },
  bm_c_rev: { uz: "Daromad: oyiga {mln} mln so'm xarid × {pct}% komissiya", ru: "Доход: закупки {mln} млн сум/мес × {pct}% комиссии", en: "Revenue: {mln} mln so'm bought a month × {pct}% fee" },
  bm_c_margin: { uz: "Foyda: 1 biznes / oy (faqat komissiyadan)", ru: "Прибыль: 1 бизнес / мес (только комиссия)", en: "Margin: 1 business / month (commission only)" },
  bm_note: { uz: "Taxmin, 1 $ ≈ 12 000 so'm. Gemini 3.8 Flash narxi: 1M token uchun $0.75 kirish / $3.75 chiqish (18.11.2026). Ovoz: VoiceLab oyiga 2 000 bepul kredit, keyin brauzer ovozi (bepul). Hozir hammasi bepul tarifda ishlaydi.", ru: "Оценка, 1 $ ≈ 12 000 сум. Цена Gemini 3.8 Flash: $0.75 вход / $3.75 выход за 1M токенов (18.11.2026). Голос: VoiceLab 2 000 бесплатных кредитов в месяц, затем голос браузера (бесплатно). Сейчас всё работает на бесплатных тарифах.", en: "Estimate, $1 ≈ 12,000 so'm. Gemini 3.8 Flash price: $0.75 in / $3.75 out per 1M tokens (18 Nov 2026). Voice: VoiceLab 2,000 free credits a month, then the browser voice (free). Today everything runs on free tiers." },

  months: {
    uz: "Yan,Fev,Mar,Apr,May,Iyun,Iyul,Avg,Sen,Okt,Noy,Dek",
    ru: "янв,фев,мар,апр,май,июн,июл,авг,сен,окт,ноя,дек",
    en: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
  },
};

// ---------- current language ----------
function initialLang() {
  try { const saved = localStorage.getItem("lang"); if (LANGS[saved]) return saved; } catch { /* private mode */ }
  return "uz";   // Uzbek first; the visitor's choice is remembered after that
}
export let lang = initialLang();
const listeners = [];
// React components subscribe here (see useLang in App.jsx); returns an unsubscribe function
export function onLangChange(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); }
export function setLang(l) {
  if (!LANGS[l] || l === lang) return;
  lang = l;
  try { localStorage.setItem("lang", l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn(l));
}

export function t(key, params = {}) {
  const entry = T[key];
  if (!entry) return key;
  let s = entry[lang] ?? entry.uz;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Names from the database in the current language
export const nameOf = (row) => (lang === "ru" ? row?.name_ru : lang === "en" ? row?.name_en : row?.name_uz) ?? row?.name_uz ?? "";
