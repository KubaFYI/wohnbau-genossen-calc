// =========================================================
// STATE
// All percentages stored as integers (25 means 25%).
// Use pct() to convert to decimal for calculations.
// =========================================================

const state = {
  // --- Community size ---
  numHouseholds:     20,
  adultsPerHH:       1.5,
  pctWithChildren:   25,    // % of households that have children
  childrenPerHH:     1.5,   // avg children in those households

  // --- Shared / community space ---
  sharedSpacePerAdultEq: 6,    // m² per adult-equivalent
  sharedKitchensEnabled: true,
  numSharedKitchens:     1,

  // --- Building ---
  energyStandard: 'EH40',  // EH55 | EH40 | EH40-QNG
  numFloors:      4,

  // --- Land ---
  landModel:          'Erbbaurecht', // Kauf | Erbbaurecht
  konzeptverfahren:   true,
  erbbauzinsDiscount: 0,             // % discount on standard rate

  // --- Financing toggles ---
  kfw298Enabled:      true,
  direktkreditEnabled: true,
  direktkreditVolume: 100000,  // €
  commonSharePerAdult: 1000,   // flat cooperative share every adult pays

  // --- Construction cost assumptions ---
  baseCostPerM2BGF:  2800,   // €/m² BGF (KG 300+400)
  bgfToNufRatio:     1.30,   // gross-to-net floor area multiplier
  sharedKitchenCost: 25000,  // € per shared kitchen
  energyPremiumPct:  7,      // % surcharge for energy standard
  contingencyPct:    10,     // % construction contingency buffer

  // --- Land cost assumptions ---
  bodenrichtwert:    400,    // €/m² reference land value
  gfz:               1.5,   // plot ratio (Geschossflächenzahl)
  transferTaxPct:    6,      // Grunderwerbsteuer (only for Kauf)
  notaryPct:         2,      // notary & registration (only for Kauf)
  erbbauzinsRatePct: 1.8,   // annual % of land value (only for Erbbaurecht)

  // --- Soft costs ---
  hoaiPct:           15,     // architecture & planning as % of construction
  permitsCost:       30000,  // permits, surveys, Gutachten (flat €)
  legalCost:         25000,  // cooperative legal setup (flat €)
  energieberaterCost: 15000, // energy consultant / QNG certification (flat €)

  // --- Bank loan ---
  bankRate:          3.5,    // annual interest %
  bankTerm:          30,     // years
  bankMinEquityPct:  20,     // minimum equity ratio required by bank
  bankInterestOnly:  false,  // if true, no principal repayment

  // --- KfW 134 (personal member loan — not coop-level) ---
  kfw134Term:        20,     // loan duration in years
  kfw134Commitment:  10,     // interest rate lock-in: 5 or 10 years
  kfw134Grace:       4,      // repayment-free start-up years

  // --- KfW 298 (construction loan to cooperative) ---
  kfw298Rate:        0.60,   // annual interest %
  kfw298MaxPerUnit:  100000, // € per housing unit (auto-set by energy standard)
  kfw298Term:        30,     // years
  kfw298Grace:       3,      // years

  // --- Direktkredite ---
  direktkreditRate:    1.0,  // annual interest %
  direktkreditNotice:  12,   // notice period in months

  // --- Interim financing (during construction) ---
  interimRate:          4.5,  // annual interest %
  constructionMonths:   24,   // months

  // --- Operating costs ---
  maintenancePerM2:       12,  // €/m² NUF per year
  managementPerUnit:      30,  // € per housing unit per month
  insurancePerM2BGF:      3,   // €/m² BGF per year
  propertyTaxPerM2:       5,   // €/m² NUF per year
  commonUtilitiesPerAdEq: 15,  // € per adult-equivalent per month
  vacancyBufferPct:       2,   // % of total annual cost
};


// =========================================================
// HOUSING UNIT TYPES
// Each type defines a kind of dwelling. "single" means one
// household per unit; WGs house multiple households.
// =========================================================

const unitTypes = [
  { id: 'studio',   name: 'Studio (1Z)',     hhPerUnit: 1, single: true,
    m2: 35, sharePrice: 15000, kitchenCost: 5000, pctOfHH: 10 },

  { id: 'medium',   name: 'Medium (2Z)',     hhPerUnit: 1, single: true,
    m2: 55, sharePrice: 25000, kitchenCost: 8000, pctOfHH: 25 },

  { id: 'large',    name: 'Large (4Z)',      hhPerUnit: 1, single: true,
    m2: 85, sharePrice: 40000, kitchenCost: 10000, pctOfHH: 15 },

  { id: 'wgMedium', name: 'WG Medium (3Z)',  hhPerUnit: 2, single: false,
    m2: 80, sharePrice: 20000, kitchenCost: 12000, pctOfHH: 20 },

  { id: 'wgLarge',  name: 'WG Large (6Z)',   hhPerUnit: 5, single: false,
    m2: 140, sharePrice: 15000, kitchenCost: 15000, pctOfHH: 30 },
];


// =========================================================
// CONSTANTS (fixed by external programmes, not configurable)
// =========================================================

const KFW134_MAX_LOAN = 150000;       // € max loan per member
const KFW134_REPAYMENT_GRANT = 0.15;  // 15% Tilgungszuschuss


// =========================================================
// KfW 134 interest rate — determined by loan term and
// interest-rate commitment period per KfW's rate table.
//
// Duration       Commitment   Rate
// 4–25 years     5 years      0.01%
// 4–25 years     10 years     0.18%
// 26–35 years    5 years      0.01%
// 26–35 years    10 years     0.47%
// =========================================================

function kfw134Rate() {
  const shortCommitment = state.kfw134Commitment < 10;
  if (shortCommitment) return 0.01;
  return state.kfw134Term >= 26 ? 0.47 : 0.18;
}


// =========================================================
// FINANCIAL MATH
// =========================================================

/** Convert integer percentage to decimal (25 → 0.25) */
function pct(v) { return v / 100; }

/**
 * Standard annuity payment (annual).
 * Returns the fixed annual payment to fully amortize `principal`
 * over `years` at `annualRate`.
 */
function annuityPayment(annualRate, years, principal) {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / years;
  return principal * annualRate / (1 - Math.pow(1 + annualRate, -years));
}


// =========================================================
// MAIN CALCULATION
//
// Returns an object `R` with all intermediate and output values.
// The cooperative's finances and individual household costs
// are computed separately.
// =========================================================

function calc() {
  const s = state;
  const R = {};

  // ----- PEOPLE -----

  R.totalAdults   = s.numHouseholds * s.adultsPerHH;
  R.totalChildren = s.numHouseholds * pct(s.pctWithChildren) * s.childrenPerHH;
  // Adult-equivalents: children count as 0.5 for shared space sizing
  R.adultEquivalents = R.totalAdults + R.totalChildren * 0.5;


  // ----- HOUSING UNIT COUNTS -----
  // For each unit type, calculate how many physical units and
  // actual households result from the percentage allocation.

  R.units = unitTypes.map(type => {
    // How many households are allocated to this type
    const allocatedHH = Math.round(s.numHouseholds * pct(type.pctOfHH));
    // How many physical units that requires (round up to whole units)
    const unitCount   = Math.max(0, Math.round(allocatedHH / type.hhPerUnit));
    // Actual households = units × households-per-unit (may differ from allocated due to rounding)
    const actualHH    = unitCount * type.hhPerUnit;

    return { ...type, unitCount, actualHH };
  });

  // Sum across all unit types
  R.totalUnits = R.units.reduce((sum, u) => sum + u.unitCount, 0);
  R.totalHH    = R.units.reduce((sum, u) => sum + u.actualHH, 0);


  // ----- SPACE -----

  // Private NUF = sum of (units × m² per unit) for each type
  R.privateNUF = R.units.reduce((sum, u) => sum + u.unitCount * u.m2, 0);
  R.sharedNUF  = R.adultEquivalents * s.sharedSpacePerAdultEq;
  R.totalNUF   = R.privateNUF + R.sharedNUF;
  R.totalBGF   = R.totalNUF * s.bgfToNufRatio;

  // Building footprint and land requirement
  R.footprint  = R.totalBGF / s.numFloors;
  R.landArea   = R.footprint / s.gfz;


  // ----- CONSTRUCTION COST -----

  R.baseConstruction = R.totalBGF * s.baseCostPerM2BGF;
  R.energyPremium    = R.baseConstruction * pct(s.energyPremiumPct);
  R.sharedKitchenCost = s.sharedKitchensEnabled ? s.numSharedKitchens * s.sharedKitchenCost : 0;
  // Per-unit fit-out: each unit type has its own kitchen/bathroom cost
  R.perUnitFitout = R.units.reduce((sum, u) => sum + u.unitCount * u.kitchenCost, 0);

  R.constructionSubtotal = R.baseConstruction + R.energyPremium
                         + R.sharedKitchenCost + R.perUnitFitout;
  R.contingency          = R.constructionSubtotal * pct(s.contingencyPct);
  R.totalConstruction    = R.constructionSubtotal + R.contingency;


  // ----- LAND COST -----

  R.landValue = s.bodenrichtwert * R.landArea;

  if (s.landModel === 'Kauf') {
    // Purchase: one-time cost with transfer tax and notary
    R.landPurchasePrice = R.landValue;
    R.transferTax       = R.landPurchasePrice * pct(s.transferTaxPct);
    R.notaryCost        = R.landPurchasePrice * pct(s.notaryPct);
    R.oneTimeLandCost   = R.landPurchasePrice + R.transferTax + R.notaryCost;
    R.annualLandCost    = 0;
  } else {
    // Erbbaurecht: ongoing annual ground rent, no purchase
    const effectiveRate  = pct(s.erbbauzinsRatePct) * (1 - pct(s.erbbauzinsDiscount));
    R.oneTimeLandCost    = 0;
    R.annualErbbauzins   = R.landValue * effectiveRate;
    R.annualLandCost     = R.annualErbbauzins;
  }


  // ----- SOFT COSTS & TOTAL PROJECT COST -----

  R.architectureCost = R.totalConstruction * pct(s.hoaiPct);
  R.permitsCost      = s.permitsCost;
  R.legalCost        = s.legalCost;
  R.energieberater   = s.energieberaterCost;
  // Interim financing: on average half the construction cost is drawn,
  // at the interim rate, for the construction duration
  R.interimFinanceCost = (R.totalConstruction * 0.5) * pct(s.interimRate) * (s.constructionMonths / 12);

  R.totalProjectCost = R.totalConstruction + R.oneTimeLandCost
                     + R.architectureCost + R.permitsCost + R.legalCost
                     + R.energieberater + R.interimFinanceCost;


  // ----- COOPERATIVE FINANCING STACK -----
  //
  // KfW 134 is intentionally NOT included here. It's a personal loan
  // that individual members use to finance their coop shares. From the
  // cooperative's perspective, it simply receives member equity (shares)
  // regardless of how members fund them (cash or KfW 134).

  // Member equity = unit-type-specific shares + flat common shares
  // (This is the total cash the coop receives from all members as shares.
  //  Individual members may fund this via cash, KfW 134, or a mix.)
  R.unitTypeShares = R.units.reduce((sum, u) => sum + u.actualHH * u.sharePrice, 0);
  R.commonShares   = R.totalAdults * s.commonSharePerAdult;
  R.memberEquity   = R.unitTypeShares + R.commonShares;

  // KfW 298: subsidized construction loan per housing unit
  R.kfw298Total = 0;
  if (s.kfw298Enabled && R.totalUnits > 0) {
    const costPerUnit = R.totalConstruction / R.totalUnits;
    R.kfw298Total = R.totalUnits * Math.min(s.kfw298MaxPerUnit, costPerUnit);
  }

  R.direktkreditTotal = s.direktkreditEnabled ? s.direktkreditVolume : 0;

  R.nonBankTotal = R.memberEquity + R.kfw298Total + R.direktkreditTotal;
  R.bankLoan     = Math.max(0, R.totalProjectCost - R.nonBankTotal);
  R.bankPct      = R.totalProjectCost > 0 ? R.bankLoan / R.totalProjectCost * 100 : 0;
  // Equity ratio: (member equity + Direktkredite) / total project cost
  // KfW 298 is a loan, not equity, but banks may treat it favorably
  R.equityRatio = R.totalProjectCost > 0
    ? (R.memberEquity + R.direktkreditTotal) / R.totalProjectCost * 100
    : 0;


  // ----- COOPERATIVE ANNUAL DEBT SERVICE -----
  //
  // Only includes loans the cooperative itself services.
  // KfW 134 is excluded (paid by individual members).

  if (s.bankInterestOnly) {
    R.bankAnnualPayment = R.bankLoan * pct(s.bankRate);
  } else {
    R.bankAnnualPayment = annuityPayment(pct(s.bankRate), s.bankTerm, R.bankLoan);
  }
  R.kfw298AnnualPayment     = annuityPayment(pct(s.kfw298Rate), s.kfw298Term, R.kfw298Total);
  R.direktkreditAnnualInt   = R.direktkreditTotal * pct(s.direktkreditRate);
  R.totalCoopAnnualDebt     = R.bankAnnualPayment + R.kfw298AnnualPayment + R.direktkreditAnnualInt;


  // ----- COOPERATIVE ANNUAL OPERATING COSTS -----

  R.maintenance     = R.totalNUF * s.maintenancePerM2;
  R.management      = R.totalUnits * s.managementPerUnit * 12;
  R.insurance       = R.totalBGF * s.insurancePerM2BGF;
  R.propertyTax     = R.totalNUF * s.propertyTaxPerM2;
  R.commonUtilities = R.adultEquivalents * s.commonUtilitiesPerAdEq * 12;
  R.erbbauzinsOperating = s.landModel === 'Erbbaurecht' ? (R.annualLandCost || 0) : 0;
  R.totalOperating  = R.maintenance + R.management + R.insurance
                    + R.propertyTax + R.commonUtilities + R.erbbauzinsOperating;


  // ----- TOTAL COOPERATIVE ANNUAL COST -----

  R.annualBeforeVacancy = R.totalCoopAnnualDebt + R.totalOperating;
  R.vacancyBuffer       = R.annualBeforeVacancy * pct(s.vacancyBufferPct);
  R.totalAnnualCost     = R.annualBeforeVacancy + R.vacancyBuffer;


  // ----- PER-HOUSEHOLD OUTPUTS -----
  //
  // For each unit type, compute:
  // - Monthly rent (household's share of coop's annual costs)
  // - Coop share (one-off entry cost)
  // - KfW 134 personal loan details (for single-unit types only)

  const rate134 = pct(kfw134Rate());
  R.kfw134RateDisplay = kfw134Rate(); // for UI display

  R.units.forEach(u => {
    if (u.actualHH <= 0) { u.result = null; return; }

    // --- Monthly rent ---
    // Allocated proportionally to the NUF this unit type consumes
    const typeNUF  = u.unitCount * u.m2;
    const nufShare = R.totalNUF > 0 ? typeNUF / R.totalNUF : 0;
    const monthlyRent = (R.totalAnnualCost * nufShare) / u.actualHH / 12;

    // --- Coop share (one-off entry cost) ---
    const adultsInHH = s.adultsPerHH;
    const coopShare  = u.sharePrice + (adultsInHH * s.commonSharePerAdult);
    const m2PerHH    = u.m2 / u.hhPerUnit;

    // --- KfW 134 (personal loan, only for single-unit types) ---
    let kfw134 = null;
    if (u.single) {
      const loanAmount = Math.min(KFW134_MAX_LOAN, coopShare);
      // 15% repayment grant reduces the principal that must be repaid
      const principalToRepay = loanAmount * (1 - KFW134_REPAYMENT_GRANT);
      const remainingTerm    = s.kfw134Term - s.kfw134Grace;

      // During grace period: interest-only on the FULL loan amount
      const graceMonthly = loanAmount * rate134 / 12;

      // After grace: amortize the reduced principal over the remaining term
      const postGraceAnnual  = remainingTerm > 0
        ? annuityPayment(rate134, remainingTerm, principalToRepay)
        : 0;
      const postGraceMonthly = postGraceAnnual / 12;
      // Break down post-grace payment into interest and principal portions
      // (interest portion at start of amortization — will decrease over time)
      const postGraceInterest  = principalToRepay * rate134 / 12;
      const postGracePrincipal = postGraceMonthly - postGraceInterest;

      kfw134 = {
        loanAmount,
        principalToRepay,
        graceMonthly,         // during grace period (interest only)
        postGraceMonthly,     // after grace period (principal + interest)
        postGraceInterest,
        postGracePrincipal,
        gracePeriodYears: s.kfw134Grace,
      };
    }

    // Upfront cash = coop share minus the loan amount (if KfW 134 applies)
    const upfrontCash = u.single
      ? Math.max(0, coopShare - KFW134_MAX_LOAN)
      : coopShare;

    u.result = {
      monthlyRent,
      coopShare,
      upfrontCash,
      m2PerHH,
      kfw134,
      // Rent per m² (only based on rent, not KfW 134 personal repayment)
      rentPerM2: m2PerHH > 0 ? monthlyRent / m2PerHH : 0,
    };
  });

  R.avgRentPerM2 = R.totalNUF > 0 ? R.totalAnnualCost / R.totalNUF / 12 : 0;

  return R;
}
