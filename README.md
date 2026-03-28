# Genossenschaft Kostenrechner

A client-side calculator for estimating monthly costs and financing structure of a housing cooperative (Genossenschaft) in Berlin. Built for a specific project group exploring a new-build cooperative, but generic enough for similar projects.

**Live:** Just open `index.html` in a browser. No build step, no server, no dependencies beyond two Google Fonts loaded via CDN.

## What It Does

Users adjust parameters via sliders and toggles, and instantly see:

- **Total project cost** and how it's financed (member equity, KfW 298, Direktkredite, bank loan)
- **Monthly rent** per household for each unit type (the household's share of cooperative running costs)
- **KfW 134 repayment** estimates for individual members (informational — this is a personal loan, not coop-level)
- **One-off entry cost** (cooperative share) and how much of it can be covered by KfW 134
- **Equity ratio** with a helper to calculate how much Direktkredite is needed to meet the bank minimum

All calculations run in the browser. User inputs persist in `localStorage` across sessions.

## File Structure

```
index.html    — Entry point. Loads fonts, CSS, and JS files.
style.css     — All styling. Visual design inspired by leerstandsmelder.de.
calc.js       — State, constants, and all financial calculations. No DOM access.
ui.js         — Rendering, sliders, tooltips, sections, localStorage persistence.
```

### Separation of Concerns

`calc.js` is a pure calculation engine. It reads from the global `state` object and `unitTypes` array, and returns a results object `R`. It never touches the DOM. This makes it testable with Node:

```bash
node -e "$(cat calc.js); const R = calc(); console.log(R.totalProjectCost);"
```

`ui.js` handles all rendering. It calls `calc()` on every input change and rebuilds the relevant DOM sections. Section collapse state is tracked separately so re-renders don't reset open/closed sections.

## Key Concepts

See [docs/financial-model.md](docs/financial-model.md) for a full explanation of how the calculations work, including the financing stack, cost allocation, and KfW programs.

See [docs/design-decisions.md](docs/design-decisions.md) for why things are structured the way they are (e.g. why KfW 134 is excluded from coop-level finances, terminology choices, etc).

See [docs/data-sources.md](docs/data-sources.md) for where the default values and ranges come from (Berlin construction costs, Bodenrichtwerte, HOAI fees, etc).

See [docs/kfw-programs.md](docs/kfw-programs.md) for details on KfW 134 and KfW 298 — rate tables, eligibility rules, the 15% repayment grant, and grace periods.

The original parameter specification that this calculator implements is preserved at [docs/parameter-spec-v3.md](docs/parameter-spec-v3.md). It contains detailed notes on every parameter, ranges, formulas, and open questions from the initial design phase.

## Terminology

The calculator uses specific terminology that was deliberately chosen for clarity:

| Term | Meaning |
|------|---------|
| **Rent** | Monthly running cost — the household's share of the cooperative's annual costs (debt service + operations). Not "rent" in the landlord sense. |
| **Coop share** | One-off entry cost (Pflichtanteile for the unit type + common share per adult). This is what you pay to join. |
| **Upfront cash** | The portion of the coop share not covered by KfW 134. For WG members this equals the full coop share. |
| **Household** | One membership slot. In a WG, each private room = one household. |
| **Housing unit** | One physical dwelling (Wohneinheit). A WG is one unit housing multiple households. |

German terms like Erbbauzins, Bodenrichtwert, Konzeptverfahren etc. are shown with dotted-underline tooltips that explain them on hover.

## localStorage Persistence

User inputs are saved to `localStorage` under key `coopCalc_v1` on every change. On load, saved values are merged into the current code defaults:

- New fields added to code → get their defaults (not in saved data)
- Fields removed from code → ignored (in saved data but not in current state)
- Type mismatches → ignored
- Corrupted JSON → caught, all defaults used

To force-reset: `localStorage.removeItem('coopCalc_v1')` in browser console.

## Visual Design

The styling is inspired by [leerstandsmelder.de](https://leerstandsmelder.de/berlin) — a Berlin civic-tech project for tracking vacant buildings. Key elements:

- Gradient + noise background using their exact CSS technique (radial gradients with SVG fractal noise, `contrast(200%)`)
- **Bebas Neue** for display headings (closest Google Fonts match to their custom stencil font)
- **DM Sans** for body text, **JetBrains Mono** for numbers
- Sharp corners (no border-radius), 2px black borders — poster/activist aesthetic
- Pink accent color, black-on-white cards

## Development Notes

- No build system. Edit files directly, refresh browser.
- The `parameter_inventory_v3.md` file in the project root is the original spec document that this calculator implements. It contains detailed notes on every parameter, ranges, and open questions.
- To add a new parameter: add it to `state` in `calc.js`, use it in `calc()`, add a slider/toggle in the appropriate section in `ui.js`, and add a display rule to the `DISPLAY` object.
- To add a new unit type: add an entry to the `unitTypes` array in `calc.js`. The UI auto-generates cards for all entries.

## Known Limitations / TODOs

See [docs/todos.md](docs/todos.md) for the full list. Key items:

- Cost allocation is simple NUF-proportional. The spec describes a two-part model (private costs by m², shared costs by adult-equivalent) that isn't implemented yet.
- Rounding of households to units is basic `Math.round` — edge cases with remainders aren't handled gracefully.
- No time-series / 30-year projection yet (the spec describes cost trajectories showing grace period transitions).
- No sensitivity analysis ("if construction costs are 10% higher, your monthly cost becomes X").
- Erbbauzins escalation (periodic CPI adjustment) is not modelled.
