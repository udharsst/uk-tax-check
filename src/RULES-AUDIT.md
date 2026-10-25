# UK Tax Check — rules audit (tax year 2025/26)
Sources: GOV.UK "Rates and thresholds for employers 2025 to 2026" (PAYE bands, Scottish bands, Class 1 NI, student loans, mileage), GOV.UK "Corporation Tax rates and allowances", GOV.UK income tax / dividend / savings / Child Benefit / trading & property allowance guidance.

## Correct
| Item | App value | Official |
|---|---|---|
| Personal Allowance & taper | £12,570, -£1 per £2 over £100k | Same |
| rUK bands | 20% to £37,700 taxable, 40% to £125,140, 45% above | Same |
| Class 1 employee NI | 8% £12,570–£50,270, 2% above | Same (cat. A) |
| Class 4 NI | 6% £12,570–£50,270, 2% above; no compulsory Class 2 | Same |
| Trading / property allowance | £1,000 each, used if bigger than expenses | Same |
| Dividends | £500 allowance; 8.75 / 33.75 / 39.35% | Same |
| Savings | £5,000 starting rate (reduced by other income), PSA £1,000/£500/£0 | Same |
| Student loans | Plan 1 £26,065, Plan 2 £28,470, Plan 4 £32,745 at 9%; PG £21,000 at 6% | Same |
| Child Benefit / HICBC | £26.05 + £17.25/wk; 1% per £200 over £60k, 100% at £80k | Same |
| Corporation tax | 19% ≤£50k, 25% ≥£250k, marginal relief fraction 3/200 | Same |
| Mileage | 45p first 10,000 miles, 25p after | Same |
| CIS | Deductions treated as tax already paid against the final bill | Correct treatment |
| Scotland | Scottish bands on wages/profits/rent only; savings & dividends use UK bands | Correct |
| Mortgage interest | Not deductible; 20% basic-rate tax credit | Correct |
| Dual income | Class 1 on salary and Class 4 on profits charged separately; one Personal Allowance across all income | Correct |

## Found wrong — FIXED (tests added, 21/21 pass)
1. **HIGH: Scottish top rate (48%) started too early.** Advanced band was £50,140 wide, so 48% kicked in at about £116,760 gross instead of £125,140. Fixed: advanced band now runs to £125,140 taxable, as in the HMRC table.
2. **MEDIUM: Plan 5 student loan.** Plan 5 repayments don't start until April 2026, so nothing is due in 2025/26. The app was charging 9% over £25,000. Fixed: £0 in 2025/26.
3. **MEDIUM: Property allowance plus mortgage credit.** You can't claim the £1,000 property allowance and the finance-cost credit together. The credit is also capped at income above the Personal Allowance. Both fixed.
4. **LOW: MTD wording** said it "starts April 2026 for you". It now says "may apply", because HMRC decides from the 2024/25 return. MTD is also based on combined self-employed and property income; the app only checks trade turnover.

## Approximations / risks (not changed)
- **MEDIUM:** Losses aren't offset; a loss shows as £0 profit.
- **MEDIUM:** Pension: only net-pay schemes (deducted before tax). Relief-at-source / personal pensions (basic-rate relief and band extension) and salary sacrifice (which also cuts NI) aren't modelled.
- **MEDIUM:** HICBC is worked out on this person's income. In real life it falls on the higher-earning partner.
- **LOW:** NI is worked out on annual pay. Real payslips work per pay period, so irregular pay can differ.
- **LOW:** Student loan unearned-income rule is simplified (unearned income added only when over £2,000).
- **LOW:** Not covered: Marriage Allowance, Gift Aid, Blind Person's Allowance, capital gains, benefits in kind, rent-a-room, the £2,000 annual NI maximum for multiple jobs, associated companies / short periods for corporation tax, and linking director dividends to company profit.
- **LOW:** Taxi mileage method plus actual vehicle costs could be double counted if the user enters fuel too. The hint warns about this.
- **LOW:** "About right" means within ±£50 or 2%.

## 2024/25 option (added)
These differ from 2025/26:
- **Scottish bands:** starter £2,306, basic £11,685, intermediate £17,101, then higher and advanced as in 2025/26.
- **Student loan thresholds:** Plan 1 £24,990, Plan 2 £27,295, Plan 4 £31,395, PG £21,000. No Plan 5 repayments.
- **Child Benefit:** £25.60 / £16.95 a week.

Everything else is unchanged: Personal Allowance, rUK bands, NI 8%/6%, dividends, savings and corporation tax.

Note: 2026/27 is now built in — see below.

## 2026/27 added (now the default "current year")
Sources: GOV.UK "Rates and thresholds for employers 2026 to 2027", Budget 2025 Annex A, GOV.UK Child Benefit rates table, GOV.UK "Tax on dividends".
- **Unchanged from 2025/26:** Personal Allowance £12,570 and taper, rUK bands, NI 8%/2% and 6%/2%, savings rates, dividend additional rate 39.35%, corporation tax.
- **Dividend rates:** 10.75% basic, 35.75% higher.
- **Scottish bands:** starter £3,967, basic to £16,956, intermediate to £31,092, higher to £62,430, advanced to £125,140, top rate 48% above.
- **Student loan thresholds:** Plan 1 £26,900, Plan 2 £29,385, Plan 4 £33,795, Plan 5 £25,000 (repayments start), PG £21,000.
- **Child Benefit:** £27.05 / £17.90 a week.
- **Car mileage:** 55p for the first 10,000 miles, then 25p. This is from HMRC's 5 June 2026 update to employee mileage allowance payments. The app also uses it for self-employed simplified mileage; check HMRC simplified-expenses guidance to confirm it applies there too.
- **Not modelled:** 2027/28 changes (savings and property rates rising to 22/42/47%).
