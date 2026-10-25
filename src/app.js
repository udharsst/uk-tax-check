// Interview-style UI. State in localStorage. Recalculates on every keystroke.
const KEY = 'ukTaxCheck25';
let S = JSON.parse(localStorage.getItem(KEY) || 'null') || { step: 0, types: [], d: { loan: 'none', fullYear: true, year: '2026/27' } };
if (S.d && 'scotland' in S.d) { delete S.d.scotland; localStorage.setItem(KEY, JSON.stringify(S)); }
if ((S.types || []).some(t => t === 'landlord' || t === 'director')) { S.types = S.types.filter(t => t !== 'landlord' && t !== 'director'); ['rentIncome', 'rentExpenses', 'mortgageInterest', 'directorSalary', 'companyProfit'].forEach(k => delete S.d[k]); if (!S.types.includes('investor')) delete S.d.dividends; localStorage.setItem(KEY, JSON.stringify(S)); }
if (!S.d.year) S.d.year = '2026/27';
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const gbp = n => (n < 0 ? '-' : '') + '£' + Math.abs(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
const has = t => S.types.includes(t);
const self = () => ['self', 'cis', 'taxi', 'locum', 'seller'].some(has);
const TYPES = [['paye', 'Employee (payslip / PAYE)'], ['self', 'Sole trader / freelancer'], ['cis', 'Builder or trade (CIS)'],
  ['taxi', 'Taxi, Uber or delivery driver'], ['locum', 'Healthcare locum / agency'], ['seller', 'Online or market seller'],
  ['investor', 'Savings or dividend income'], ['pension', 'Pensioner / other taxable income']];
const num = (k, label, hint = '', req = false) => `<label>${label} <span class="hint">${hint}${req ? ' (needed for the estimate)' : ' (optional — blank = 0)'}</span></label><input type="number" inputmode="decimal" min="0" data-k="${k}" ${req ? 'data-req' : ''} value="${S.d[k] ?? ''}" placeholder="${req ? 'Required' : '0'}">`;
const tick = (k, label) => `<label class="opt"><input type="checkbox" data-k="${k}" ${S.d[k] ? 'checked' : ''}>${label}</label>`;

const STEPS = [
  { t: 'How do you earn money?', q: () => '<p class="hint">Tick all that apply — this shapes the next questions.</p>' +
      TYPES.map(([k, l]) => `<label class="opt"><input type="checkbox" data-type="${k}" ${has(k) ? 'checked' : ''}>${l}</label>`).join('') },
  { t: 'Tax year', q: () => `<label>Which tax year?</label><select data-k="year"><option value="2026/27" ${S.d.year === '2026/27' ? 'selected' : ''}>2026/27 — current year, projection (6 Apr 2026 – 5 Apr 2027)</option><option value="2025/26" ${S.d.year === '2025/26' ? 'selected' : ''}>2025/26 — last year, return due 31 Jan 2027</option><option value="2024/25" ${S.d.year === '2024/25' ? 'selected' : ''}>2024/25 — two years ago</option></select><p class="hint">Uses rates for England, Wales and Northern Ireland. Scottish income tax rates are not covered.</p>` },
  { t: 'Your income this tax year', q: () => [
      `<div class="opt" style="display:block"><label style="margin-top:0">Your figures cover… <span class="hint">only know the year so far? We project to 12 months (e.g. 5 months × 12/5)</span></label><select data-k="ytdMonths">${Array.from({ length: 12 }, (_, i) => 12 - i).map(m => `<option value="${m}" ${String(S.d.ytdMonths || 12) === String(m) ? 'selected' : ''}>${m === 12 ? 'The full tax year' : m + ' month' + (m > 1 ? 's' : '') + ' so far (year to date)'}</option>`).join('')}</select></div>`,
      has('taxi') && taxiGuide(),
      has('taxi') && tick('blackCab', 'I drive a black cab / hackney carriage (purpose-built taxi)'),
      has('taxi') && driver(),
      has('paye') && self() && '<p class="hint"><b>Job + self-employment:</b> enter your job pay and your business turnover separately. Business expenses only reduce the business profit; your employer already takes tax and NI from your wages, and Class 4 NI applies only to business profit over £12,570.</p>',
      has('paye') && num('salary', 'Salary / wages before tax (gross)', '— use "Pay" on your P60, or "gross pay year to date" on your latest payslip. Include overtime & bonus. Not your take-home.', true) + hourly(),
      self() && num('selfIncome', has('cis') ? 'Total CIS & other trade income (gross)' : has('taxi') ? 'Total fares / platform earnings' : 'Self-employed turnover', has('cis') ? '— add up the gross amounts on your CIS statements (before the 20%/30% deduction) plus any non-CIS jobs. Not profit.' : has('taxi') ? '— total fares/earnings before platform fees and costs (Uber/Bolt annual tax summary, or your fare records). Not profit.' : '— total sales/invoices for the year before expenses (box "turnover" on SA103). Not profit.', true),
      has('investor') && num('savings', 'Bank/savings interest', '', true) + num('dividends', 'Dividends', '', true),
      has('pension') ? num('otherIncome', 'State/private pension or other taxable income', '', true) : num('otherIncome', 'Any other taxable income', 'e.g. tips, pension, benefits like Carer\'s Allowance'),
      !has('investor') && num('savings', 'Bank/savings interest', 'gross interest this year'),
    ].filter(Boolean).join('') || '<p>Go back and pick at least one way you earn.</p>' },
  { t: 'Your costs', show: () => self() || has('paye'), q: () => [
      self() && tick('useMileage', `Use HMRC simplified mileage for a car/van (${Math.round(TaxCalc.YEARS[S.d.year || '2026/27'].mile[0] * 100)}p a mile for the first 10,000 business miles, 25p after) instead of actual vehicle costs`) + num('miles', 'Business miles this year (if using mileage)', '— keep a log; home to a regular workplace does not count. If you use mileage, leave fuel, insurance and repairs for that vehicle out of your expenses.' + (has('taxi') && S.d.blackCab ? ' Black cabs cannot use mileage — enter actual costs instead.' : ''), !!S.d.useMileage),
      self() && `<p class="hint"><b>Allowable expenses</b> are the day-to-day costs of running your business. They are <b>deducted from your turnover</b> to give your taxable profit, so you only pay tax and NI on the profit. Only business costs count — not personal spending (for mixed use, claim just the business share). GOV.UK calls these “allowable expenses” (search “expenses if you're self-employed”).</p>`,
      self() && num('selfExpenses', has('taxi') ? 'Total allowable expenses — deducted from fares' : has('cis') ? 'Total allowable expenses — deducted from CIS income' : 'Total allowable expenses — deducted from turnover', has('taxi') ? 'fuel, insurance, licence, repairs — or mileage at 45p/25p' : has('cis') ? 'materials, tools, van, phone' : 'e.g. office/phone, travel, stock, insurance, accountant, marketing, tools. If your expenses are under £1,000 we automatically use the £1,000 trading allowance instead when that is better.') + expenses(),
      self() && num('capAllow', 'Capital allowances this year (optional)', '— for things you buy to keep and use in the business: equipment, tools, machinery, computers, vans (and cars, at lower rates). The Annual Investment Allowance lets most businesses deduct the full cost (up to £1 million) in the year bought. Leave out any vehicle you claim mileage for. Deducted from profit as well as expenses; claiming this means you cannot use the £1,000 trading allowance.'),
      has('paye') && num('pension', 'Your pension contributions taken from pay', 'net-pay scheme'),
      has('paye') && num('jobExpenses', 'Unpaid work expenses / uniform / professional fees', 'not reimbursed'),
    ].filter(Boolean).join('') },
  { t: 'A few quick extras', q: () => `<label>Student loan</label><select data-k="loan">${['none', 'plan1', 'plan2', 'plan4', 'plan5'].map(p => `<option ${S.d.loan === p ? 'selected' : ''} value="${p}">${p === 'none' ? 'None' : 'Plan ' + p.slice(4)}</option>`).join('')}</select>` +
      tick('pgLoan', 'I have a Postgraduate loan') + num('children', 'Children under 16 (or 20 in education)') + tick('claimCB', 'We claim Child Benefit') },
  { t: 'Already paid? (optional)', q: () => '<p class="hint">Optional. We already estimate your tax and NI from your income. Fill these only if you want to compare with what has been taken.</p>' + [
      has('paye') && `<label>Tax code on your payslip <span class="hint">(optional, e.g. 1257L)</span></label><input data-k="taxCode" value="${S.d.taxCode ?? ''}" placeholder="1257L">` + num('payeTaxPaid', 'Income tax on payslips (year to date / P60)', 'leave blank if unsure', false) + num('niPaid', 'National Insurance on payslips', 'leave blank if unsure', false),
      has('cis') && num('cisDeducted', 'CIS deducted by contractors', 'from your CIS statements', false),
      self() && num('poaPaid', 'Payments on account already made to HMRC', '', false),
      S.d.loan !== 'none' && num('loanPaid', 'Student loan already deducted', '', false),
    ].filter(Boolean).join('') || '<p class="hint">Nothing to enter — continue.</p>' },
  { t: 'Check your answers', q: review },
  { t: 'Your results', q: results },
];

const inputs = () => TaxCalc.pick(S.types, S.d);
// Optional helper: hourly pay + overtime -> annual gross salary
const hv = k => S.d[k] ?? '';
const hourly = () => `<details class="opt" style="display:block" ${hv('hr') ? 'open' : ''}><summary><b>Paid hourly? Work it out</b></summary>
  <label>Hourly rate (£)</label><input type="number" inputmode="decimal" data-k="hr" value="${hv('hr')}" placeholder="e.g. 12.21">
  <label>Normal hours per week</label><input type="number" inputmode="decimal" data-k="hrs" value="${hv('hrs')}" placeholder="e.g. 37.5">
  <label>Overtime hours per week <span class="hint">(average, optional)</span></label><input type="number" inputmode="decimal" data-k="oth" value="${hv('oth')}" placeholder="0">
  <label>Overtime pay</label><select data-k="otm">${[1, 1.25, 1.5, 2].map(m => `<option value="${m}" ${String(hv('otm') || 1.5) === String(m) ? 'selected' : ''}>${m === 1 ? 'Same as normal rate' : m + '× (e.g. ' + (m === 1.5 ? 'time and a half' : m === 2 ? 'double time' : 'time and a quarter') + ')'}</option>`).join('')}</select>
  <label>Weeks paid per year <span class="hint">(52 includes paid holiday)</span></label><input type="number" inputmode="decimal" data-k="wks" value="${hv('wks') || 52}">
  <p class="hint" id="hrout"></p></details>`;
// Optional helper: add up allowable expense categories -> selfExpenses (raw, not scaled separately)
const EXK = [['exOffice', 'Office costs', 'phone, internet, software, stationery'], ['exTravel', 'Travel and vehicle', 'public transport, parking; fuel/repairs only if NOT using the mileage rate'],
  ['exStock', 'Stock / materials / goods for resale', ''], ['exStaff', 'Staff / subcontractors you pay', ''], ['exPremises', 'Premises / workspace rent and utilities', 'business share only'],
  ['exFinance', 'Insurance, bank and finance charges', ''], ['exMarketing', 'Marketing and advertising', ''], ['exFees', 'Accountancy / professional fees', ''], ['exOther', 'Other allowable business costs', 'e.g. tools and small equipment, platform/app fees, uniforms/protective clothing, training to update existing skills, trade subscriptions, business share of home running costs (or £10–£26/month flat rate)']];
const expenses = () => `<details class="opt" style="display:block" ${EXK.some(([k]) => hv(k)) || hv('homeHrs') ? 'open' : ''}><summary><b>Add up allowable expenses</b></summary>
  <p class="hint">Fill any that apply for the same period as your turnover — the total box above is updated. Not allowable: personal costs, fines, entertaining clients, your own wages/drawings, loan repayments (interest only is allowed). Larger equipment/vans are usually claimed via capital allowances — include their cost here for a rough estimate.</p>
  ${EXK.map(([k, l, h]) => `<label>${l}${h ? ` <span class="hint">${h}</span>` : ''}</label><input type="number" inputmode="decimal" data-k="${k}" value="${hv(k)}" placeholder="0">`).join('')}
  <label>Working from home — hours a month <span class="hint">GOV.UK simplified flat rate: 25–50 hrs £10, 51–100 hrs £18, 101+ hrs £26 a month. Use this OR the business share of actual home bills in Premises — not both.</span></label><select data-k="homeHrs">${[['', 'Not claiming'], ['10', '25 to 50 hours'], ['18', '51 to 100 hours'], ['26', '101 hours or more']].map(([v, l]) => `<option value="${v}" ${String(hv('homeHrs')) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
  <label>Months worked from home this way</label><input type="number" inputmode="decimal" data-k="homeMonths" value="${hv('homeMonths')}" placeholder="12">
  <p class="hint" id="exout"></p></details>`;
function expLine() {
  const out = document.getElementById('exout'); if (!out) return;
  const r = TaxCalc.calc(inputs());
  out.innerHTML = `Turnover ${gbp(r.turnover)} − ${r.usedTradingAllowance ? `trading allowance ${gbp(r.expensesClaimed)} (beats your expenses of ${gbp(r.expensesEntered)})` : `expenses ${gbp(r.expensesClaimed)}${r.mileageClaim ? ` (incl. mileage ${gbp(r.mileageClaim)})` : ''}${r.capClaimed ? ` − capital allowances ${gbp(r.capClaimed)}` : ''}`} → taxable profit <b>${gbp(r.tradeProfit)}</b>${(+S.d.ytdMonths || 12) < 12 ? ' (full-year projection)' : ''}`;
}
function applyExpenses(k) {
  if (!EXK.some(([x]) => x === k) && k !== 'homeHrs' && k !== 'homeMonths') return;
  const home = (+S.d.homeHrs || 0) * (S.d.homeMonths === undefined || S.d.homeMonths === '' ? 12 : Math.min(12, +S.d.homeMonths || 0));
  const total = Math.round((EXK.reduce((s, [x]) => s + (+S.d[x] || 0), 0) + home) * 100) / 100;
  S.d.selfExpenses = String(total); const el = document.querySelector('[data-k=selfExpenses]'); if (el) el.value = total;
}
function applyHourly(k) {
  if (!['hr', 'hrs', 'oth', 'otm', 'wks'].includes(k)) return;
  const n = x => +S.d[x] || 0, wks = S.d.wks === undefined || S.d.wks === '' ? 52 : n('wks'), m = +(S.d.otm || 1.5);
  const total = Math.round((n('hr') * n('hrs') + n('hr') * m * n('oth')) * wks);
  const out = document.getElementById('hrout'), sal = document.querySelector('[data-k=salary]');
  if (!n('hr') || !n('hrs')) { if (out) out.textContent = 'Enter rate and hours to fill your salary.'; return; }
  S.d.salary = String(total); if (sal) sal.value = total;
  if (out) out.textContent = `= ${gbp(total)} a year (£${n('hr')} × ${n('hrs')} hrs${n('oth') ? ` + ${n('oth')} overtime hrs × ${m}` : ''} × ${wks} weeks). Salary box updated.`;
}
const taxiGuide = () => { const y = S.d.year || '2026/27', mr = TaxCalc.YEARS[y].mile;
  return `<details class="opt" style="display:block"><summary><b>Taxi / private hire / delivery: what counts (${y})</b></summary><ul class="hint" style="margin:6px 0">
  <li><b>Income</b> = everything riders/customers paid for your trips, before the app/operator fee. Your platform's annual tax summary shows it.</li>
  <li><b>Fees</b> to Uber, Bolt, an operator or a radio circuit are an allowable cost.</li>
  <li><b>Car costs — pick one method per car:</b> actual costs (fuel, insurance, repairs, plus capital allowances for the car) <i>or</i> HMRC mileage: ${Math.round(mr[0] * 100)}p a mile for the first 10,000 business miles, then 25p${y === '2026/27' ? ' (raised from 45p for 2026/27)' : ''}. Once you choose one for a car, you keep it until you change the car. Parking, tolls and congestion charges can be added on top.</li>
  <li><b>Black cabs / hackney carriages</b> cannot use the mileage rate — use actual costs.</li>
  <li>Only business miles count (not home-to-first-job or private trips). Keep a mileage log.</li>
  <li><b>VAT:</b> you only have to register if your own turnover goes over £90,000 in 12 months. Uber already accounts for VAT on UK rides itself. The VAT Flat Rate Scheme only matters if you are VAT-registered.</li>
  <li><b>Licence renewal</b> needs an HMRC tax check code (valid 120 days).</li>
  <li><b>Making Tax Digital:</b> needed if your turnover was over £50,000 in 2024/25 (from April 2026), over £30,000 in 2025/26 (from April 2027), or over £20,000 in 2026/27 (from April 2028).</li></ul>
  <a href="https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles" target="_blank" rel="noopener">GOV.UK: mileage rates</a> · <a href="https://www.gov.uk/guidance/complete-a-tax-check-for-a-taxi-private-hire-or-scrap-metal-licence" target="_blank" rel="noopener">Licence tax check</a></details>`; };
// Optional helper for taxi / delivery drivers: project the year from a typical week
const driver = () => `<details class="opt" style="display:block" ${hv('dwk') ? 'open' : ''}><summary><b>Driver? Project your year from a typical week</b></summary>
  <label>Average weekly earnings (£) <span class="hint">gross fares/fees before platform cut — see your app's weekly statements</span></label><input type="number" inputmode="decimal" data-k="dwk" value="${hv('dwk')}" placeholder="e.g. 700">
  <label>Weeks you expect to work in the whole tax year <span class="hint">52 minus holidays/time off</span></label><input type="number" inputmode="decimal" data-k="dweeks" value="${hv('dweeks') || 48}">
  <label>Platform / operator fee % <span class="hint">e.g. Uber ~25%; 0 if none</span></label><input type="number" inputmode="decimal" data-k="dfee" value="${hv('dfee')}" placeholder="0">
  <label>Other weekly costs (£) <span class="hint">insurance, licence, phone — leave out fuel/repairs if using mileage</span></label><input type="number" inputmode="decimal" data-k="dcost" value="${hv('dcost')}" placeholder="0">
  <label>Business miles per week <span class="hint">optional — HMRC mileage rate (45p 2025/26, 55p 2026/27, then 25p)</span></label><input type="number" inputmode="decimal" data-k="dmiles" value="${hv('dmiles')}" placeholder="0">
  <button type="button" class="sec" id="uberdef" style="margin-top:8px">Fill typical defaults (48 weeks, 25% fee)</button><p class="hint" id="drout"></p></details>`;
function applyDriver(k) {
  if (!['dwk', 'dweeks', 'dfee', 'dcost', 'dmiles'].includes(k)) return;
  const n = x => +S.d[x] || 0, wks = S.d.dweeks === undefined || S.d.dweeks === '' ? 48 : n('dweeks'), out = document.getElementById('drout');
  if (!n('dwk')) { if (out) out.textContent = 'Enter your average weekly earnings.'; return; }
  const turnover = Math.round(n('dwk') * wks), costs = Math.round(turnover * n('dfee') / 100 + n('dcost') * wks), miles = Math.round(n('dmiles') * wks);
  Object.assign(S.d, { selfIncome: String(turnover), selfExpenses: String(costs), useMileage: miles > 0, miles: String(miles), ytdMonths: '12' });
  const sel = document.querySelector('[data-k=selfIncome]'); if (sel) sel.value = turnover;
  const ym = document.querySelector('[data-k=ytdMonths]'); if (ym) ym.value = '12';
  const mr = TaxCalc.YEARS[S.d.year || '2026/27'].mile, mile = miles && !S.d.blackCab ? Math.min(miles, 10000) * mr[0] + Math.max(0, miles - 10000) * mr[1] : 0;
  if (out) out.textContent = `Full-year projection: turnover ${gbp(turnover)} · costs ${gbp(costs)}${miles ? ` · ${miles.toLocaleString('en-GB')} miles = ${gbp(mile)}` : ''} → estimated profit ${gbp(Math.max(0, turnover - costs - mile))}. Boxes updated and “Your figures cover” set to the full year (you can edit them).`;
}
function advice(r) {
  const a = [], d = S.d;
  if (!r.paid) a.push(`Estimated Income Tax and NI for the year under HMRC rules: <b>${gbp(r.due)}</b>. This is not a statement that you have underpaid — if you are on PAYE, much of this is normally taken from your pay already.`);
  else if (r.status === 'under') a.push(`Compared with what you entered, there is a <b>possible tax due of about ${gbp(r.diff)}</b> (estimate). HMRC confirms the actual figure.`);
  else if (r.status === 'over') a.push(`Compared with what you entered, there may be a <b>possible adjustment in your favour of about ${gbp(-r.diff)}</b>${has('cis') ? ' — CIS workers often see this through Self Assessment' : ''}. Only HMRC can confirm a repayment.`);
  else a.push('The estimate is close to what you entered as already paid.');
  const pm = +S.d.ytdMonths || 12;
  if (r.year === '2026/27') a.push('2026/27 is the current year, so this is a projection. Self Assessment balance would be due 31 January 2028.');
  if (r.year === '2025/26' && self()) a.push('2025/26 Self Assessment returns are due online by 31 January 2027.');
  if (pm < 12) a.push(`Projected to a full year from ${pm} month${pm > 1 ? 's' : ''} of figures (× 12/${pm}). Already-paid amounts are compared as you entered them, so the difference will change as the year goes on.`);
  if (r.year === '2024/25') a.push('Checking 2024/25: the online return deadline was 31 January 2026. If you have not filed yet, filing soon may limit penalties and interest.');
  if (S.d.taxCode && !/^1257L$/i.test(S.d.taxCode.trim())) a.push(`Your tax code ${S.d.taxCode} differs from the standard 1257L — worth checking it on your HMRC personal tax account.`);
  if (r.total > 100000 && r.total < 125140) a.push('Your Personal Allowance is being reduced (60% effective rate). Pension contributions can restore it.');
  if (r.hicbc) a.push(`High Income Child Benefit Charge of ${gbp(r.hicbc)} applies — register for Self Assessment. Only the higher-earning partner pays it (taper £60k–£80k); pension contributions or Gift Aid can reduce it.`);
  const q = (self() ? +d.selfIncome || 0 : 0), mtd = { '2024/25': [50000, 'April 2026'], '2025/26': [30000, 'April 2027'], '2026/27': [20000, 'April 2028'] }[r.year];
  if (mtd && q > mtd[0]) a.push(`Turnover over £${mtd[0].toLocaleString('en-GB')} in ${r.year}: Making Tax Digital for Income Tax may apply from ${mtd[1]}.`);
  if (self() && r.capClaimed) a.push(`Capital allowances of ${gbp(r.capClaimed)} were deducted as well as day-to-day expenses.`);
  if (self() && +d.capAllow && r.usedTradingAllowance) a.push('The £1,000 trading allowance was better than your expenses plus capital allowances, so capital allowances were not used (you cannot claim both).');
  if (has('taxi') && d.blackCab && d.useMileage) a.push('Black cabs / hackney carriages cannot use the mileage rate, so it has been ignored. Enter actual vehicle costs instead.');
  if (self() && (+d.selfIncome || 0) > 90000) a.push('Turnover above £90,000 — you must register for VAT.');
  if (self() && r.tradeProfit > 0 && r.usedTradingAllowance) a.push('We applied the £1,000 trading allowance as it beats your expenses.');
  else if (self() && r.expensesClaimed > 0) a.push(`Allowable expenses of ${gbp(r.expensesClaimed)} were deducted from your turnover of ${gbp(r.turnover)}, leaving taxable profit of ${gbp(r.tradeProfit)}.`);

  return a.map(x => `<li>${x}</li>`).join('');
}
function results() {
  const r = TaxCalc.calc(inputs()), row = (l, v, c = '') => v ? `<tr class="${c}"><td>${l}</td><td>${gbp(v)}</td></tr>` : '';
  const msg = !r.paid ? 'Estimated tax & NI for the year' : { under: 'Possible tax due vs what you entered (estimate)', over: 'Possible adjustment in your favour (estimate)', right: 'Estimate close to what you entered' }[r.status];
  return `<div class="card ${r.paid ? r.status : 'right'}"><div class="hint">${msg}</div><div class="big">${gbp(r.paid ? Math.abs(r.diff) : r.due)}</div>
  <div>Income Tax ${gbp(r.incomeTax)} · NI ${gbp(r.ni1 + r.ni4)}${r.paid ? ` · you entered ${gbp(r.paid)} already paid` : ''}</div></div>
  <div class="card"><h2>Projected take-home</h2><div class="big">${gbp(r.takeHome)}</div><div class="hint">${gbp(r.monthly)} a month after tax, NI, loans and costs${S.d.claimCB ? ', incl. Child Benefit' : ''}</div></div>
  <div class="card"><h2>Detailed breakdown — ${r.year}${(+S.d.ytdMonths || 12) < 12 ? ' (full-year projection)' : ''}</h2><table>
  ${row('Total taxable income', r.total)}${row('Personal Allowance', r.pa)}${self() ? row('Self-employed turnover', r.turnover) + row(r.usedTradingAllowance ? 'Less trading allowance (£1,000)' : r.mileageClaim ? 'Less allowable expenses (incl. mileage ' + gbp(r.mileageClaim) + ')' : 'Less allowable expenses deducted', r.expensesClaimed) + row('Less capital allowances', r.capClaimed) + row('Trading profit', r.tradeProfit) : ''}${row('Rental profit', r.rentProfit)}
  ${r.nsParts.map(p => row(`Income tax at ${Math.round(p.rate * 100)}% on ${gbp(p.amount)}`, p.tax)).join('')}
  ${row('Tax on savings', r.savTax)}${row('Tax on dividends', r.divTax)}
  ${row('Income tax', r.incomeTax, 'tot')}${row('Employee NI (Class 1)', r.ni1)}${row('Self-employed NI (Class 4)', r.ni4)}
  ${row('Student loan', r.studentLoan)}${row('Postgraduate loan', r.pgLoan)}${row('Child Benefit charge', r.hicbc)}
  ${row('Estimated total tax & deductions', r.due, 'tot')}${r.paid ? row('Already paid (as you entered)', r.paid) + row(r.diff > 0 ? 'Possible difference: tax due' : 'Possible difference: in your favour', Math.abs(r.diff), 'tot') : ''}</table></div>
  ${self() && r.poaEach ? `<div class="card"><h2>Payments on account — rough forecast</h2><p>Your Self Assessment bill (tax not taken at source) looks like about <b>${gbp(r.saBalance)}</b>. Because it is over £1,000, HMRC will usually ask for advance payments towards next year: about <b>${gbp(r.poaEach)}</b> by ${r.due31} (on top of this year's balance) and about <b>${gbp(r.poaEach)}</b> by ${r.julyDue}.</p><p class="hint">Estimate only — each is normally half of the previous year's bill. If you expect lower profit next year you can ask HMRC to reduce them (form SA303 or online). Not needed if 80%+ of your tax is taken at source.</p></div>` : ''}
  <div class="card"><h2>What this means</h2><ul>${advice(r)}</ul><p class="hint">Change any answer — results update instantly. <a href="https://www.gov.uk/check-income-tax-current-year" target="_blank" rel="noopener">Check on GOV.UK</a></p></div>`;
}
function missing() { // required fields across all question steps for this path
  const div = document.createElement('div'), out = [];
  STEPS.forEach((st, i) => { if (st.q === results || st.q === review || (st.show && !st.show())) return;
    div.innerHTML = st.q(); div.querySelectorAll('[data-req]').forEach(el => { if (S.d[el.dataset.k] === undefined || S.d[el.dataset.k] === '') out.push(el.previousElementSibling.firstChild.textContent.trim()); }); });
  if (!S.types.length) out.unshift('How you earn money');
  return out; }
function review() { const m = missing();
  return m.length ? `<p>Before we estimate anything we need a few more answers:</p><ul>${m.map(x => `<li>${x}</li>`).join('')}</ul><p class="hint">Use Back to fill them in (enter 0 if something doesn't apply).</p>`
    : '<p>Your core income is in. Tap <b>See estimate</b> — you can add more details afterwards and the estimate updates instantly.</p>'; }
const visible = () => STEPS.map((s, i) => i).filter(i => !STEPS[i].show || STEPS[i].show());
function render() {
  document.getElementById('yr').textContent = `Tax year ${S.d.year || '2026/27'}`;
  const v = visible(); if (!v.includes(S.step)) S.step = v[0];
  if (STEPS[S.step].q === results && missing().length) S.step = STEPS.findIndex(x => x.q === review);
  const pos = v.indexOf(S.step), s = STEPS[S.step], last = pos === v.length - 1;
  document.getElementById('app').innerHTML = `<div class="steps" style="display:flex;justify-content:space-between;align-items:center"><span>Step ${pos + 1} of ${v.length}</span>${pos ? '<button class="link" id="home">⌂ Home (first question)</button>' : ''}</div><div class="card"><h2>${s.t}</h2><div id="q">${s.q()}</div></div>
   ${last || s.q === review ? '' : `<div id="live"></div>`}<div id="nowwrap"></div><div class="nav">${pos ? '<button class="sec" id="back">Back</button>' : ''}${last ? '<button class="sec" id="edit">Add more details</button><button class="sec" id="home">Home</button>' : `<button id="next">${s.q === review ? 'See estimate' : 'Next'}</button>`}</div>`;
  live();
}
function live() { expLine(); const w = document.getElementById('nowwrap'); if (w) w.innerHTML = S.step > 1 && S.types.length && !missing().length && STEPS[S.step].q !== review && STEPS[S.step].q !== results ? '<div class="nav"><button class="sec" id="now">See estimate now</button></div>' : '';
  const el = document.getElementById('live'); if (el && S.step > 1) { const r = TaxCalc.calc(inputs()); const p = inputs(), m = +S.d.ytdMonths || 12, lab = { salary: 'salary', selfIncome: 'turnover', selfExpenses: 'expenses', otherIncome: 'other income', savings: 'savings', dividends: 'dividends' };
    const proj = m < 12 ? '<b>Full-year projection (× 12/' + m + '):</b> ' + Object.keys(lab).filter(k => +p[k]).map(k => lab[k] + ' ' + gbp(p[k])).join(' · ') + '<br>' : '';
    el.innerHTML = `<div class="card hint">${proj}${m < 12 ? '<b>If this income continues for the full year:</b>' : 'Estimate so far:'} Income Tax <b>${gbp(r.incomeTax)}</b> · NI <b>${gbp(r.ni1 + r.ni4)}</b> · take-home <b>${gbp(r.takeHome)}</b></div>`; } }
document.addEventListener('input', e => {
  const k = e.target.dataset.k, t = e.target.dataset.type;
  if (t) { S.types = e.target.checked ? [...new Set([...S.types, t])] : S.types.filter(x => x !== t);
    if (!e.target.checked) { const still = new Set(Object.keys(TaxCalc.pick(S.types, S.d))); (TaxCalc.FIELDS[t] || []).forEach(k => { if (!still.has(k)) delete S.d[k]; }); } }
  if (k) S.d[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  applyHourly(k); applyDriver(k); applyExpenses(k); save(); if (k === 'year') document.getElementById('yr').textContent = `Tax year ${S.d.year}`;
  if (S.step === STEPS.length - 1) { document.getElementById('q').innerHTML = results(); } else live();
});
document.addEventListener('click', e => {
  const v = visible(), pos = v.indexOf(S.step);
  if (e.target.id === 'next') {
    const empty = [...document.querySelectorAll('#q [data-req]')].filter(el => el.value === '');
    if ((S.step === 0 && !S.types.length) || empty.length) { empty.forEach(el => el.style.borderColor = '#c0392b'); alert('Please answer every question on this screen (enter 0 if it does not apply).'); return; }
    if (STEPS[v[pos + 1]].q === results && missing().length) return;
    S.step = v[pos + 1]; } else if (e.target.id === 'back') S.step = v[pos - 1];
  else if (e.target.id === 'edit') S.step = v[2];
  else if (e.target.id === 'uberdef') { Object.assign(S.d, { dweeks: '48', dfee: '25' }); ['dweeks', 'dfee'].forEach(k => { const el = document.querySelector(`[data-k=${k}]`); if (el) el.value = S.d[k]; }); applyDriver('dfee'); save(); live(); return; }
  else if (e.target.id === 'home') S.step = 0;
  else if (e.target.id === 'now') S.step = v[v.length - 1];
  else if (e.target.id === 'reset') { if (!confirm('Clear all answers?')) return; S = { step: 0, types: [], d: { loan: 'none', fullYear: true, year: '2026/27' } }; }
  else return; save(); render(); scrollTo(0, 0);
});
render();
