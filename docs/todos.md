# TODOs and Known Limitations

## High Priority

### Two-part cost allocation model
Currently all costs are allocated proportionally to NUF (floor area). The original spec describes a fairer two-part model:
1. **Private-space costs** (construction debt on private areas, unit maintenance) → allocated by m² of the unit type
2. **Shared/common costs** (shared space debt, operating costs, Erbbauzins) → allocated equally per adult-equivalent

This would mean a single person in a studio pays less for community kitchen upkeep than a family of four in a large unit. Implementing this requires splitting the annual costs into "private" and "shared" buckets and applying different allocation keys.

Open question: should Erbbauzins be allocated per m² or per household?

### Household-to-unit rounding
When `numHouseholds × typePercentage` doesn't divide evenly by `householdsPerUnit`, the calculator uses basic `Math.round`. This can silently lose or gain households. For example: 20 households × 30% = 6 households in large WGs (5 per unit) → 1.2 units → rounds to 1 unit → only 5 households fit → 1 household lost.

Options to explore:
- Show a warning when rounding causes significant drift
- Let users override with absolute household counts per type
- Use a smarter allocation algorithm that minimizes total drift

### Time-series projections
The spec describes several 30-year trajectory charts:
- Monthly cost per type over time (shows the jump when KfW 134 grace period ends)
- Outstanding debt by financing layer
- Cumulative cost vs. equivalent market rent

This would be the most impactful feature for helping members understand long-term costs.

## Medium Priority

### Sensitivity analysis
"If construction costs are 10% higher, your monthly cost becomes X." Could be a simple ±10% toggle or a more sophisticated Monte Carlo-style range.

### Erbbauzins escalation
Ground rent is typically adjusted every 3–5 years based on the consumer price index. This isn't modelled yet — the calculator assumes a fixed annual Erbbauzins forever. For 30-year projections this matters significantly.

### KfW 298 grace period in annual payment
The calculator currently computes KfW 298 annual payments as a standard annuity over the full term. During the grace period, only interest is paid (no principal). This should be modelled to show accurate early-year costs.

### IBB social housing funding
IBB funding (Wohnungsneubaufonds, Genossenschaftsförderung) was deliberately removed from this version of the calculator to reduce complexity. If the project pursues Konzeptverfahren land that requires ≥30% social housing, IBB funding would need to be added back. Key parameters that were in the original spec (v2):
- IBB loan per m² (funded units): ~€3,500/m² NUF, interest-free
- IBB grant per m²: ~€1,800/m² NUF, non-repayable
- IBB max starting rent: €6.50/m², with €0.20/m² increase every 2 years
- IBB Genossenschaftsförderung: additional €50k/unit cooperative supplement

The complexity is in modelling the cross-subsidy: IBB-funded units have capped rents, so other units effectively subsidise them.

## Low Priority

### Mietshäuser Syndikat model
The spec mentions this as a future top-level toggle (Genossenschaft vs. Syndikat). The Syndikat model has different ownership structure, financing patterns, and cost allocation.

### Export / sharing
No way to share a specific configuration with someone else (e.g. via URL parameters or a "share" button that generates a link with encoded state).

### Validation and guardrails
- No warning when unit type percentages don't sum to 100% (besides the derived info block)
- No warning when the bank loan goes negative (over-funded project)
- No warning when individual parameter combinations are unrealistic (e.g. 2 floors with GFZ 3.0)
