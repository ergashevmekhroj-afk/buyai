// AGENT 4: FINANCE ADVISOR
// 1) Is the cash enough for the plan?
// 2) If not: what do real bank rates (Central Bank comparison) cost for the missing amount?
// 3) Borrow now or wait? Compare: expected price rise over one month (Market Analyst)
//    vs one month of loan interest on the shortfall.
// 4) Tax basics for small food businesses.
// This is a comparison, not financial advice; the bank sets the final rate.

const LOAN_MONTHS = 1;   // we compare over one month (time to the next purchase)

export function advise(order, scoutResult, analysis, ref) {
  const total = scoutResult.total;
  const cash = order.cash_som;

  // expected cost of waiting one month = sum over products of (cost x expected price change)
  const riseCost = scoutResult.lines.reduce((s, l) => {
    const a = analysis.products.find((p) => p.product_id === l.item.product_id);
    return s + (l.best && a?.outlookPct != null ? l.best.goodsCost * a.outlookPct / 100 : 0);
  }, 0);

  const cheapest = (type) => ref.loanRates.filter((r) => r.loan_type === type).slice(0, 3);
  const average = (type) => ref.loanTypes.find((t) => t.loan_type === type)?.average_rate;
  const loans = [
    { type: "working_capital", labelKey: "loan_wc", avg: average("working_capital"), banks: cheapest("working_capital") },
    { type: "microloan", labelKey: "loan_micro", avg: average("microloan"), banks: cheapest("microloan") },
  ];

  let verdict, shortfall = 0, interest = null, bestRate = null;
  if (cash == null) {
    verdict = "nocash";
  } else if (cash >= total) {
    verdict = "enough";
  } else {
    shortfall = total - cash;
    bestRate = Number(loans[0].banks[0]?.rate_pct);
    interest = shortfall * bestRate / 100 * LOAN_MONTHS / 12;
    verdict = riseCost > interest ? "borrow" : "wait";
  }

  const rule = (id) => ref.rules.find((r) => r.rule_id === id);
  const tax = { std: rule("turnover_tax_standard")?.value_text, ip: rule("turnover_tax_ip_small")?.value_text,
                lim: rule("general_regime_threshold")?.value_text };

  return { total, cash, shortfall, interest, bestRate, riseCost, verdict, loans, tax,
           ratesAsOf: ref.loanTypes[0]?.as_of, policyRate: rule("cbu_policy_rate")?.value_text };
}
