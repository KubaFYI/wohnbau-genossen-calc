# Design Decisions

This document records why things are the way they are, so that future work doesn't accidentally undo intentional choices.

## KfW 134 is Not Part of Cooperative Finances

This was a deliberate structural decision after several iterations. Initially KfW 134 was included in the financing stack and had coop-level toggles (enable/disable, take-up rate among eligible members). This caused problems:

1. **Double counting**: member equity includes coop shares, and KfW 134 loans finance those same shares. Showing both in the financing stack overstates the project's funding.
2. **Confusing for WG members**: they'd see a financing source they can't access, making the coop-level numbers feel exclusionary.
3. **Not a cooperative decision**: whether an individual member takes KfW 134 is their personal choice. The cooperative receives the share payment regardless.

**Current approach**: The cooperative simply receives "member equity" (total shares from all members). How individual members fund their share — cash, KfW 134, or a mix — is shown only in the per-household breakdown table, as informational.

## Terminology: "Rent" Not "Coop Share"

The monthly running cost was originally called "Coop Share" (Genossenschaftsanteil) but this was confusing because:
- "Coop share" also naturally refers to the one-off equity contribution (Pflichtanteile)
- Users kept confusing the monthly payment with the entry cost

**Current terminology**:
- **Coop share** = one-off entry cost (what you pay to join)
- **Rent** = monthly running cost (your share of the cooperative's annual costs)

This isn't technically "rent" in the landlord sense, but it's the closest mental model for most people.

## No "Total Monthly" Column

An earlier version showed "Total/Month = Rent + KfW 134" as the headline number. This was removed because:
- WG members don't have KfW 134, so their "total" was just rent — making the column feel like it existed only for single-unit members
- It implied KfW 134 repayment is a cooperative cost, when it's personal
- Users can mentally add the two numbers if they want their personal total

## €/m² Hidden by Default

The rent-per-m² column is behind a toggle because:
- It's a derived/comparison metric, not a primary output
- For people unfamiliar with Berlin rent levels, the number can be alarming or misleading without context (cooperative rent/m² includes debt service, not just operating costs)
- It clutters the table for the primary use case (seeing monthly rent in absolute €)

The €/m² calculation includes each household's share of common space (not just their unit's private area) to make it comparable with market rents that typically include common area allocation.

## Percentage Storage

All percentages in `state` are stored as integers (e.g. `25` means 25%). The `pct()` helper converts to decimal for calculations. This was a bug fix — an earlier version mixed representations, causing sliders to produce values 100x too large when percentages were stored as decimals but sliders emitted integers.

**Rule**: every percentage field in `state` is an integer. Every use in a calculation goes through `pct()`.

## Unit Types as a Mutable Array

Unlike `state` (a flat object), unit types are stored as an array of objects (`unitTypes`). This is because:
- Each type has multiple related fields (m², share price, kitchen cost, % allocation)
- The UI generates cards dynamically from the array
- Adding a new type is just pushing an object

The localStorage persistence saves unit type configs by `id` and merges on load, so adding/removing types in code is safe.

## Energy Standard Auto-Settings

When the user changes the energy standard, two things auto-adjust:
- `energyPremiumPct` gets a floor (0% for EH55, 5% for EH40, 10% for EH40-QNG) but can be manually increased
- `kfw298MaxPerUnit` is set to €100k or €150k based on the standard

This is done in `applyAutoSettings()` which runs before every re-render.

## Visual Design

The styling is based on [leerstandsmelder.de](https://leerstandsmelder.de/berlin), a Berlin activist/civic-tech project. This was chosen because the calculator's audience is a Berlin housing cooperative group — the aesthetic signals "community tool" rather than "fintech product". Specific elements lifted from the site:

- The exact background CSS: layered radial gradients with an inline SVG noise texture, pushed through `contrast(200%)`
- Poster-style sharp corners (no border-radius)
- Bold condensed uppercase display font (Bebas Neue, closest Google Fonts match to their custom stencil font)
- Black borders on white cards
- Pink/red accent palette

## Tooltips Over Expansion

German housing finance has a lot of jargon (Erbbauzins, Konzeptverfahren, Pflichtanteile, BGF, NUF, GFZ...). Rather than expanding every term inline (which makes text unreadable) or having a separate glossary page (which nobody reads), all terms have dotted-underline hover tooltips. The `GLOSSARY` object in `ui.js` maps terms to plain-English explanations. The `tip()` helper wraps any term in a tooltip span.
