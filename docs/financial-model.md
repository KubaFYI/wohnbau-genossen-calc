# Financial Model

This document explains how the calculator arrives at its numbers. Follow along in `calc.js` where each section is marked with comments.

## Overview

The calculation flows in one direction:

```
Inputs (state + unitTypes)
  → People counts
  → Space requirements (NUF, BGF, land)
  → Construction cost
  → Land cost
  → Soft costs
  → Total project cost
  → Financing stack (who pays for what)
  → Annual debt service + operating costs
  → Total annual cooperative cost
  → Per-household monthly rent
  → Per-household KfW 134 estimates (informational)
```

## Two Levels of Finance

The model deliberately separates **cooperative-level** and **individual-level** finances:

### Cooperative Level
Everything the cooperative as an entity needs to fund and service:
- Construction, land, soft costs → total project cost
- Bank loan, KfW 298, Direktkredite → annual debt service
- Maintenance, management, insurance, tax, utilities → annual operating costs
- Sum of the above → **total annual cost**, divided among households as **rent**

### Individual Level (informational only)
- **Coop share**: what each member owes the cooperative to join (Pflichtanteile + common share)
- **KfW 134**: a personal loan the member can take to finance their coop share

KfW 134 is intentionally excluded from the cooperative's financing stack. From the coop's perspective, it simply receives member equity (shares) regardless of whether members funded them with cash or a personal KfW loan. This avoids double-counting and keeps the coop-level model clean.

## Space Calculation

```
privateNUF = Σ (units of each type × m² per unit)
sharedNUF  = adultEquivalents × sharedSpacePerAdultEq
totalNUF   = privateNUF + sharedNUF
totalBGF   = totalNUF × bgfToNufRatio
```

- **NUF** (Nutzfläche): net usable floor area — living space + community space
- **BGF** (Bruttogrundfläche): gross floor area — includes walls, stairs, hallways, elevator shafts, technical rooms
- The BGF-to-NUF ratio (default 1.30) accounts for this overhead. A ratio of 1.30 means 30% of gross area is "lost" to structure and circulation.

Land requirement: `footprint / GFZ` where `footprint = totalBGF / numFloors`.

## Construction Cost

```
base           = totalBGF × baseCostPerM2
energyPremium  = base × energyPremiumPct
sharedKitchens = numKitchens × costPerKitchen
perUnitFitout  = Σ (units × kitchenCost per type)
subtotal       = base + energyPremium + sharedKitchens + perUnitFitout
contingency    = subtotal × contingencyPct
total          = subtotal + contingency
```

The base cost uses **KG 300+400 per DIN 276** (building construction + technical systems) per m² of BGF. This is the standard German cost classification for the building itself, excluding land, soft costs, and fit-out.

## Financing Stack

The total project cost is covered by these sources (in order of priority):

1. **Member equity** — coop shares from all members (unit-type Pflichtanteile + common share per adult)
2. **KfW 298** — subsidized construction loan, per housing unit, capped at €100k (or €150k with QNG)
3. **Direktkredite** — subordinated loans from supporters at below-market rates
4. **Bank loan** — whatever remains (`totalProjectCost - everything above`)

The **equity ratio** = `(memberEquity + Direktkredite) / totalProjectCost`. Banks typically require 20%. KfW 298 is a loan (not equity) but banks may treat it favorably.

## Annual Costs

### Debt Service
- **Bank loan**: standard annuity (`PMT(rate, term, principal)`) or interest-only if toggled
- **KfW 298**: standard annuity
- **Direktkredite**: interest-only (principal repaid on notice)

### Operating
- Maintenance reserve (€/m² NUF/year)
- Property management (€/unit/month)
- Building insurance (€/m² BGF/year)
- Property tax (€/m² NUF/year)
- Common area utilities (€/adult-equivalent/month)
- Erbbauzins (if Erbbaurecht land model)

### Total
```
totalAnnual = (debtService + operating) × (1 + vacancyBufferPct)
```

## Cost Allocation to Households

Currently uses simple NUF-proportional allocation:

```
typeShare = (unitsOfType × m²PerUnit) / totalNUF
monthlyRent = (totalAnnualCost × typeShare) / householdsInType / 12
```

This means every m² of NUF (private or shared) costs the same per month. A household in a 35m² studio pays for 35m² worth, while a household in a 5-person WG (140m² total) pays for 28m² worth.

**TODO**: The original spec describes a two-part allocation where private-space costs are allocated by m² but shared/common costs are allocated per adult-equivalent. This would make the model fairer (a single person in a studio shouldn't pay the same share of community kitchen costs as a family of four).

## Rent per m²

Two versions exist:

- **Top-level card** (`avgRentPerM2`): `totalAnnualCost / totalNUF / 12` — a project-wide average.
- **Per-type column** (`rentPerM2`): `monthlyRent / (privateM2PerHH + commonM2PerHH)` — includes each household's proportional share of common space, but not BGF overhead.

Neither includes KfW 134 repayments (those are personal, not cooperative costs).
