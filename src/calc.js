// UK tax calc — 2025/26 rates (6 Apr 2025 – 5 Apr 2026). General information only.
(function (root) {
  const R25 = {
    year: '2025/26', due: '31 January 2027', pa: 12570, paTaper: 100000,
    ruk: [[37700, .20], [87440, .40], [Infinity, .45]], // bands above PA (to 50,270 / 125,140)
    sco: [[2827, .19], [12094, .20], [16171, .21], [31338, .42], [62710, .45], [Infinity, .48]],
    ni: { pt: 12570, uel: 50270, main: .08, upper: .02 }, // Class 1 employee
    c4: { lpl: 12570, upl: 50270, main: .06, upper: .02 },
    div: { allow: 500, rates: [.0875, .3375, .3935] },
    sav: { start: 5000, psa: [1000, 500, 0] },
    allowance: 1000, mile: [.45, .25], // trading & property allowances
    loans: { none: [0, 0], plan1: [26065, .09], plan2: [28470, .09], plan4: [32745, .09], plan5: [25000, 0] /* Plan 5 repayments only start April 2026 */ },
    pg: [21000, .06],
    cb: { first: 26.05 * 52, extra: 17.25 * 52, from: 60000, to: 80000 },
    ct: { small: 50000, main: 250000, lo: .19, hi: .25 }
  };
  // 2024/25: only items that differ from 2025/26 (NI, PA, rUK bands, dividends, CT unchanged)
  const R24 = Object.assign({}, R25, { year: '2024/25', due: '31 January 2026',
    sco: [[2306, .19], [11685, .20], [17101, .21], [31338, .42], [62710, .45], [Infinity, .48]],
    loans: { none: [0, 0], plan1: [24990, .09], plan2: [27295, .09], plan4: [31395, .09], plan5: [25000, 0] },
    cb: { first: 25.60 * 52, extra: 16.95 * 52, from: 60000, to: 80000 } });
  // 2026/27 (6 Apr 2026 – 5 Apr 2027) — GOV.UK employer rates 2026-27, Budget 2025 Annex A, Child Benefit rates table
  const R26 = Object.assign({}, R25, { year: '2026/27', due: '31 January 2028',
    sco: [[3967, .19], [12989, .20], [14136, .21], [31338, .42], [62710, .45], [Infinity, .48]],
    div: { allow: 500, rates: [.1075, .3575, .3935] },
    loans: { none: [0, 0], plan1: [26900, .09], plan2: [29385, .09], plan4: [33795, .09], plan5: [25000, .09] },
    cb: { first: 27.05 * 52, extra: 17.90 * 52, from: 60000, to: 80000 },
    mile: [.55, .25] }); // car mileage rate raised to 55p (HMRC update 5 June 2026)
  const YEARS = { '2026/27': R26, '2025/26': R25, '2024/25': R24 }, R = R25;
  const r2 = n => Math.round(n * 100) / 100;
  function bandTax(amount, bands) { let t = 0, left = Math.max(0, amount), parts = [];
    for (const [w, rate] of bands) { const x = Math.min(left, w); if (x > 0) { t += x * rate; parts.push({ rate, amount: x, tax: x * rate }); } left -= x; if (left <= 0) break; }
    return { tax: t, parts }; }
  function corpTax(p) { if (p <= R.ct.small) return p * R.ct.lo; if (p >= R.ct.main) return p * R.ct.hi;
    return p * R.ct.hi - (R.ct.main - p) * 0.015; } // marginal relief, fraction 3/200
  function calc(i) {
    const R = YEARS[i.year] || R25;
    const n = k => Math.max(0, +i[k] || 0);
    const scot = false; // Scotland not supported — always rUK bands
    // Trading profit (sole trader / CIS / taxi / locum / seller): choose expenses or £1,000 allowance
    const miles = i.useMileage && !i.blackCab ? Math.min(n('miles'), 10000) * R.mile[0] + Math.max(0, n('miles') - 10000) * R.mile[1] : 0;
    const turnover = n('selfIncome'), exp = n('selfExpenses') + miles;
    const capAllow = n('capAllow'); // capital allowances (AIA etc.) — can't be combined with the £1,000 trading allowance
    const allow = turnover ? Math.min(R.allowance, turnover) : 0, usedTradingAllowance = allow > exp + capAllow, expensesClaimed = usedTradingAllowance ? allow : exp;
    const capClaimed = usedTradingAllowance ? 0 : capAllow;
    const tradeProfit = Math.max(0, turnover - expensesClaimed - capClaimed);
    const rent = n('rentIncome'), rentExp = n('rentExpenses'), mortgage = n('mortgageInterest');
    const rentProfit = Math.max(0, rent - Math.max(rentExp, rent ? Math.min(R.allowance, rent) : 0));
    const salary = n('salary') + n('directorSalary'), pension = n('pension');
    const empIncome = Math.max(0, salary - pension - n('jobExpenses')); // net-pay pension
    const other = n('otherIncome'), savings = n('savings'), divs = n('dividends');
    const nonSav = empIncome + tradeProfit + rentProfit + other;
    const total = nonSav + savings + divs;
    const pa = Math.max(0, R.pa - Math.max(0, total - R.paTaper) / 2);
    // allocate PA: non-savings, then savings, then dividends
    let paLeft = pa; const take = x => { const u = Math.min(paLeft, x); paLeft -= u; return x - u; };
    const nsT = take(nonSav), svT = take(savings), dvT = take(divs);
    const bands = scot ? R.sco : R.ruk;
    const ns = bandTax(nsT, bands);
    // savings & dividends use rUK bands everywhere
    const basicW = 37700, higherTop = 125140;
    const band = used => used < basicW ? 0 : used < higherTop ? 1 : 2;
    const upper = u => [[Math.max(0, basicW - u), 0], [Math.max(0, higherTop - Math.max(u, basicW)), 1], [Infinity, 2]];
    const banded = (amt, u, rates) => bandTax(amt, upper(u).map(([w, k]) => [w, rates[k]])).tax;
    const psa = R.sav.psa[band(nsT + svT + dvT)];
    let used = nsT, s = svT;
    const st = Math.min(s, Math.max(0, R.sav.start - nsT)); s -= st; used += st;
    const free = Math.min(s, psa); s -= free; // nil-rate bands still use up the band
    const savTax = banded(s, used + free, [.2, .4, .45]); used += free + s;
    let d = dvT; const dFree = Math.min(d, R.div.allow); used += dFree; d -= dFree;
    const dr = R.div.rates;
    const divTax = banded(d, used, dr);
    const usedPropAllowance = rent && rentExp < Math.min(R.allowance, rent); // allowance & finance-cost credit can't both be claimed
    const mortgageCredit = usedPropAllowance ? 0 : Math.min(mortgage, rentProfit, Math.max(0, total - pa)) * 0.20;
    const incomeTax = Math.max(0, ns.tax + savTax + divTax - mortgageCredit);
    const c1 = salary ? Math.max(0, Math.min(salary, R.ni.uel) - R.ni.pt) * R.ni.main + Math.max(0, salary - R.ni.uel) * R.ni.upper : 0;
    const c4 = Math.max(0, Math.min(tradeProfit, R.c4.upl) - R.c4.lpl) * R.c4.main + Math.max(0, tradeProfit - R.c4.upl) * R.c4.upper;
    const [th, rate] = R.loans[i.loan || 'none'] || [0, 0];
    const loanBase = salary + tradeProfit + rentProfit + other + (savings + divs > 2000 ? savings + divs : 0);
    const studentLoan = rate ? Math.max(0, loanBase - th) * rate : 0;
    const pgLoan = i.pgLoan ? Math.max(0, loanBase - R.pg[0]) * R.pg[1] : 0;
    const kids = Math.floor(n('children')); const cbAmt = kids ? R.cb.first + (kids - 1) * R.cb.extra : 0;
    const anI = total; // adjusted net income approx
    const hicbc = kids && i.claimCB ? cbAmt * Math.min(1, Math.max(0, Math.floor((anI - R.cb.from) / 200) / 100)) : 0;
    const compProfit = n('companyProfit'); const ct = corpTax(compProfit);
    const due = incomeTax + c1 + c4 + studentLoan + pgLoan + hicbc;
    const paid = n('payeTaxPaid') + n('niPaid') + n('cisDeducted') + n('poaPaid') + n('loanPaid');
    const diff = due - paid;
    // Payments on account estimate: Self Assessment balance (tax not taken at source); none if ≤ £1,000 or ≥ 80% collected at source
    const atSource = n('payeTaxPaid') + n('cisDeducted'), saBal = Math.max(0, incomeTax + c4 - atSource);
    const poaEach = (turnover || rent) && saBal > 1000 && atSource < 0.8 * (incomeTax + c4) ? saBal / 2 : 0;
    const julyDue = R.due.replace('January', 'July');
    const gross = salary + turnover + rent + other + savings + divs;
    const cash = gross - n('jobExpenses') - exp - rentExp - mortgage - pension - due + (i.claimCB ? cbAmt : 0);
    return { mile: R.mile, year: R.year, due31: R.due, scot, pa, total, tradeProfit, turnover, expensesEntered: r2(exp), expensesClaimed: r2(Math.min(expensesClaimed, turnover)), usedTradingAllowance, mileageClaim: r2(miles), capClaimed: r2(capClaimed), rentProfit, incomeTax: r2(incomeTax), nsTax: r2(ns.tax), nsParts: ns.parts,
      savTax: r2(savTax), divTax: r2(divTax), mortgageCredit: r2(mortgageCredit), ni1: r2(c1), ni4: r2(c4),
      studentLoan: r2(studentLoan), pgLoan: r2(pgLoan), childBenefit: r2(cbAmt), hicbc: r2(hicbc), corpTax: r2(ct),
      due: r2(due), paid: r2(paid), diff: r2(diff), status: Math.abs(diff) <= Math.max(50, due * 0.02) ? 'right' : diff > 0 ? 'under' : 'over',
      saBalance: r2(saBal), poaEach: r2(poaEach), julyDue, takeHome: r2(cash), monthly: r2(cash / 12) };
  }
// Only pass answers that belong to the earner types currently ticked (hidden old answers must not count)
const FIELDS = { paye: ['salary', 'pension', 'jobExpenses', 'payeTaxPaid', 'niPaid'],
  self: ['selfIncome', 'selfExpenses', 'useMileage', 'miles', 'capAllow', 'poaPaid'], cis: ['selfIncome', 'selfExpenses', 'useMileage', 'miles', 'capAllow', 'cisDeducted', 'poaPaid'], taxi: ['selfIncome', 'selfExpenses', 'useMileage', 'miles', 'blackCab', 'capAllow', 'poaPaid'],
  locum: ['selfIncome', 'selfExpenses', 'useMileage', 'miles', 'capAllow', 'poaPaid'], seller: ['selfIncome', 'selfExpenses', 'useMileage', 'miles', 'capAllow', 'poaPaid'],
  investor: ['savings', 'dividends'], pension: ['otherIncome'] };
const SCALE = ['salary', 'selfIncome', 'selfExpenses', 'dividends', 'otherIncome', 'savings', 'pension', 'jobExpenses', 'miles'];
const ALWAYS = ['ytdMonths', 'year', 'otherIncome', 'savings', 'loan', 'pgLoan', 'loanPaid', 'children', 'claimCB', 'fullYear', 'taxCode'];
function pick(types, d) { const keep = new Set([...ALWAYS, ...types.flatMap(t => FIELDS[t] || [])]), o = {};
  for (const k of keep) if (d[k] !== undefined) o[k] = d[k];
  if (o.loan === 'none' || !o.loan) delete o.loanPaid;
  // Year-to-date projection: scale income & cost figures to 12 months (already-paid figures are left as entered)
  const m = +d.ytdMonths || 12;
  if (m > 0 && m < 12) for (const k of SCALE) if (o[k] !== undefined && o[k] !== '') o[k] = (+o[k] || 0) * 12 / m;
  o.projectedFrom = m;
  return o; }
  const api = { R, YEARS, calc, corpTax, bandTax, pick, FIELDS };
  if (typeof module !== 'undefined') module.exports = api; else root.TaxCalc = api;
})(this);
