# KfW Programmes

Two KfW programmes are relevant to this calculator. They serve completely different purposes and operate at different levels.

## KfW 134 — Genossenschaftsanteile (Personal Member Loan)

**What it is**: A near-zero-interest personal loan that individual cooperative members can use to finance their compulsory cooperative shares (Pflichtanteile).

**Who borrows**: The individual member, not the cooperative.

**Who repays**: The individual member, directly to KfW.

**Eligibility**: Only members in **single-household units**. WG residents are not eligible because they are not sole occupants of a specific Wohneinheit. This is confirmed by KfW programme rules — WG members must fund their coop shares entirely from cash.

### Terms

| Parameter | Value |
|-----------|-------|
| Max loan per member | **€150,000** |
| Repayment grant (Tilgungszuschuss) | **15%** — borrower only repays 85% of principal |
| Grace period (tilgungsfreie Anlaufzeit) | 1–3 years (short term) or 1–5 years (long term) |

### Interest Rate Table

The rate is determined by two factors: loan duration and interest rate commitment period.

| Duration | Commitment Period | Annual Rate |
|----------|------------------|-------------|
| 4–25 years | 5 years | 0.01% |
| 4–25 years | 10 years | 0.18% |
| 26–35 years | 5 years | 0.01% |
| 26–35 years | 10 years | 0.47% |

In the calculator, users set the term and commitment period; the rate is auto-determined from this table (not manually adjustable).

### How It's Modelled

The calculator shows KfW 134 as **informational per-household data**, not in the cooperative's financing stack:

1. **Grace period monthly payment** = `loanAmount × annualRate / 12` (interest only)
2. **Post-grace monthly payment** = standard annuity on the **reduced principal** (after 15% grant) over the remaining term (total term minus grace years)
3. **Upfront cash** = coop share minus loan amount (€0 if share ≤ €150k)

The grace period payment is shown as the primary figure since it's what members pay in the early years. The post-grace payment (which is significantly higher due to principal repayment starting) is shown as secondary.

### Why It's Excluded from Coop-Level Finances

From the cooperative's perspective, it simply receives member equity — the total of all coop shares paid by members. Whether a member funded their share with cash or a KfW 134 loan is irrelevant to the cooperative's balance sheet. Including KfW 134 in the financing stack would double-count the member equity that it finances.

See [design-decisions.md](design-decisions.md) for more context.

## KfW 298 — Klimafreundlicher Neubau (Cooperative Construction Loan)

**What it is**: A subsidized construction loan to the cooperative for building energy-efficient housing.

**Who borrows**: The cooperative (Genossenschaft).

**Who repays**: The cooperative, from its operating revenue (i.e. member rents).

### Terms

| Parameter | Value |
|-----------|-------|
| Max per housing unit | **€100,000** (EH55 or EH40) or **€150,000** (EH40-QNG) |
| Interest rate | ~0.60% (EH40+QNG) to ~1.0% (EH55) — check kfw.de/konditionen |
| Term | Up to 35 years |
| Grace period | 1–5 years (interest-only before amortization begins) |

### Energy Standard Requirement

| Standard | KfW 298 Max/Unit | Requires QNG? |
|----------|-------------------|---------------|
| EH55 | €100,000 | No |
| EH40 | €100,000 | No |
| EH40-QNG | €150,000 | Yes (adds €15–25k certification cost) |

The calculator auto-sets the max-per-unit based on the energy standard selection.

### How It's Modelled

KfW 298 is part of the cooperative's financing stack. The total is `min(maxPerUnit, constructionCostPerUnit) × totalUnits`. It reduces the bank loan requirement. Annual payments are standard annuity over the term.

## Interaction Between the Two

KfW 134 and KfW 298 don't interact directly — they finance different things (member shares vs. construction). However:
- Both reduce the amount the cooperative needs from the bank
- KfW 298 reduces project cost directly; KfW 134 increases member equity (which also reduces the bank loan)
- Banks may count KfW loans as equity-equivalent when assessing the equity ratio
