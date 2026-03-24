// =========================================================
// GLOSSARY — hover explanations for jargon
// =========================================================
const GLOSSARY = {
  'KfW 134':          'A near-zero-interest personal loan from the German development bank (KfW) for cooperative members to finance their coop shares. Max €150k per member, with a 15% repayment grant. Only available for single-household units.',
  'KfW 298':          'A subsidized construction loan from KfW to the cooperative. Up to €100k per unit (€150k with QNG certification) at very low interest.',
  'Direktkredite':    'Subordinated loans from supporters or members at below-market rates. Common in German cooperative/Syndikat projects. Unsecured, ranks behind the bank loan.',
  'Pflichtanteile':   'Compulsory cooperative shares — the mandatory equity contribution each member must make to join. Amount varies by unit type.',
  'Erbbaurecht':      'Heritable building right (leasehold) — instead of buying land, you lease it long-term and pay annual ground rent (Erbbauzins). Common for Berlin city-owned land.',
  'Erbbauzins':       'Annual ground rent for leasehold land. Typically 1.8% of land value in Berlin, adjusted periodically.',
  'Konzeptverfahren': 'Berlin programme where publicly-owned land is allocated based on the quality of the housing concept, not the highest bid.',
  'BGF':              'Bruttogrundfläche — gross floor area including walls, stairs, hallways, and technical rooms. Always larger than the usable area.',
  'NUF':              'Nutzfläche — net usable floor area. The actual living/working space, excluding walls and circulation.',
  'GFZ':              'Geschossflächenzahl — plot ratio. Zoning parameter that limits how much floor area you can build relative to the plot size.',
  'Bodenrichtwert':   'Official reference land value per m², published by the Berlin Gutachterausschuss. Check boris-berlin.de for specific addresses.',
  'HOAI':             'Honorarordnung für Architekten — German architects\' fee schedule. Since 2021 fees are negotiable, but HOAI rates still serve as standard orientation.',
  'QNG':              'Qualitätssiegel Nachhaltiges Gebäude — sustainability certification required for the higher KfW 298 tier (€150k/unit). Adds €15–25k in costs.',
  'EH40':             'Effizienzhaus 40 — building uses only 40% of the energy of a reference building. Required for KfW 298 funding.',
  'Grunderwerbsteuer':'Property transfer tax — 6% in Berlin. Only applies when buying land (Kauf), not for Erbbaurecht.',
  'household':        'One membership slot in the cooperative. In WGs, each private room = one household.',
  'housing unit':     'Wohneinheit — one physical dwelling. A WG counts as one unit even though it houses multiple households.',
};

/** Wrap a term in a tooltip span */
function tip(term, display) {
  const t = GLOSSARY[term];
  if (!t) return display || term;
  return `<span class="tip" tabindex="0" data-tip="${t.replace(/"/g,'&quot;')}">${display || term}</span>`;
}

/** Small ⓘ icon with hover explanation */
function infoIcon(text) {
  return `<span class="insight-icon" tabindex="0" data-tip="${text.replace(/"/g,'&quot;')}">ⓘ</span>`;
}


// =========================================================
// FORMATTING HELPERS
// =========================================================
function fmt(n, d=0) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtEur(n)  { return '€' + fmt(Math.round(n)); }
function fmtEurK(n) { return n >= 1e6 ? '€'+fmt(n/1e6,1)+'M' : '€'+fmt(Math.round(n/1000))+'k'; }


// =========================================================
// OUTPUT CARDS (top of page)
// =========================================================

/**
 * If equity ratio is below the bank minimum, show how much
 * Direktkredite would be needed to close the gap, both total
 * and per household. Includes a button to auto-set it.
 */
function renderDirektkreditHint(R, equityOk) {
  // Required equity = totalProjectCost × minEquityPct
  // Current equity  = memberEquity + direktkredite
  // Shortfall       = required - current (if positive)
  const requiredEquity = R.totalProjectCost * pct(state.bankMinEquityPct);
  const currentEquity  = R.memberEquity + R.direktkreditTotal;
  const shortfall      = requiredEquity - currentEquity;

  if (shortfall <= 0) {
    // Already meeting the requirement — show how much Direktkredite contributes
    if (R.direktkreditTotal > 0) {
      return `<div class="sub" style="margin-top:0.2rem">${tip('Direktkredite')}: ${fmtEur(R.direktkreditTotal)} (${fmtEur(Math.round(R.direktkreditTotal / R.totalHH))}/household)</div>`;
    }
    return '';
  }

  // Need this much total Direktkredite to hit the minimum
  const needed = Math.ceil(shortfall / 1000) * 1000; // round up to nearest €1k
  const neededTotal = R.direktkreditTotal + needed;
  const perHH = R.totalHH > 0 ? Math.round(neededTotal / R.totalHH) : 0;

  return `<div class="dk-hint">
    Need <strong>${fmtEur(needed)}</strong> more ${tip('Direktkredite')}
    (${fmtEur(neededTotal)} total · ~${fmtEur(perHH)} per household)
    <button class="dk-set-btn" onclick="state.direktkreditEnabled=true;state.direktkreditVolume=${neededTotal};fullUpdate()"
      title="Set Direktkredite to ${fmtEur(neededTotal)}">Set to ${fmtEur(neededTotal)}</button>
  </div>`;
}

function renderOutputCards(R) {
  const equityOk = R.equityRatio >= state.bankMinEquityPct;
  document.getElementById('outCards').innerHTML = `
    <div class="out-card">
      <div class="label">Total Project Cost</div>
      <div class="value">${fmtEurK(R.totalProjectCost)}</div>
      <div class="sub">${R.totalUnits} ${tip('housing unit','units')} · ${fmt(Math.round(R.totalNUF))} m² ${tip('NUF')}</div>
    </div>
    <div class="out-card">
      <div class="label">Bank Loan</div>
      <div class="value ${R.bankPct > 70 ? 'warn' : ''}">${fmtEurK(R.bankLoan)}</div>
      <div class="sub">${fmt(R.bankPct,1)}% of project${state.bankInterestOnly ? ' · interest-only' : ''}</div>
    </div>
    <div class="out-card">
      <div class="label">Equity Ratio ${infoIcon('(Member equity + Direktkredite) ÷ total project cost. Increase by raising coop shares, adding Direktkredite, or reducing project scope.')}</div>
      <div class="value ${equityOk ? '' : 'warn'}">${fmt(R.equityRatio,1)}%</div>
      <div class="sub">${equityOk ? '✓ Meets' : '⚠ Below'} ${state.bankMinEquityPct}% bank minimum</div>
      ${renderDirektkreditHint(R, equityOk)}
    </div>
    <div class="out-card">
      <div class="label">Avg. Rent ${infoIcon('Total annual cooperative cost ÷ total usable area ÷ 12. Average across all unit types — individual types may vary.')}</div>
      <div class="value">${fmt(R.avgRentPerM2,2)} €/m²</div>
      <div class="sub">across all units</div>
    </div>
  `;
}


// =========================================================
// PER-UNIT-TYPE RESULTS TABLE
// =========================================================

let showRentPerM2 = false; // hidden by default

function renderUnitResults(R) {
  const rows = R.units.filter(u => u.result).map(u => {
    const r = u.result;

    // One-off entry: coop share with KfW 134 coverage note underneath
    let coverageNote;
    if (r.kfw134) {
      const covered = r.kfw134.loanAmount;
      if (covered >= r.coopShare) {
        coverageNote = `<span style="font-size:0.68rem;color:var(--text-muted)">(all covered by ${tip('KfW 134')} loan)</span>`;
      } else {
        coverageNote = `<span style="font-size:0.68rem;color:var(--text-muted)">(of which ${fmtEur(covered)} covered by ${tip('KfW 134')} loan)</span>`;
      }
    } else {
      coverageNote = `<span style="font-size:0.68rem;color:var(--text-muted)">(full cash — ${tip('KfW 134')} not eligible)</span>`;
    }
    const shareCell = `${fmtEur(r.coopShare)}<br>${coverageNote}`;

    // Monthly rent
    const rentCell = fmtEur(r.monthlyRent);

    let kfwCell;
    if (r.kfw134) {
      const k = r.kfw134;
      kfwCell = `<strong>${fmtEur(k.graceMonthly)}/mo</strong>`
        + `<span style="font-size:0.65rem;color:var(--text-dim)"> interest-only for ${k.gracePeriodYears} yr</span>`
        + `<br><span style="font-size:0.68rem;color:var(--text-muted)">`
        + `then ${fmtEur(k.postGraceMonthly)}/mo`
        + ` (${fmtEur(k.postGracePrincipal)} principal + ${fmtEur(k.postGraceInterest)} interest)`
        + `</span>`;
    } else {
      kfwCell = '<span class="na">not eligible</span>';
    }

    const m2Cell = showRentPerM2
      ? `<td>${fmt(r.rentPerM2,2)} €/m²</td>` : '';

    return `<tr>
      <td class="type-label">${u.name}</td>
      <td>${u.unitCount} ${tip('housing unit','units')} · ${u.actualHH} ${tip('household','hh')}</td>
      <td>${fmt(r.m2PerHH)} m²</td>
      <td style="border-left:1px solid var(--border-light)">${shareCell}</td>
      <td style="border-left:1px solid var(--border-light)" class="highlight">${rentCell}</td>
      <td>${kfwCell}</td>
      ${m2Cell}
    </tr>`;
  }).join('');

  const m2Header = showRentPerM2 ? '<th>€/m²</th>' : '';

  document.getElementById('weResults').innerHTML = `
    <h3>Cost per ${tip('household','Household')} by Unit Type</h3>
    <table>
      <tr>
        <th>Type</th><th>Count</th><th>m²/${tip('household','hh')}</th>
        <th style="text-align:center;border-left:1px solid var(--border-light)">One-off Entry</th>
        <th colspan="2" style="text-align:center;border-left:1px solid var(--border-light)">── Monthly ──</th>
        ${m2Header}
      </tr>
      <tr>
        <th></th><th></th><th></th>
        <th style="border-left:1px solid var(--border-light)">Coop Share ${infoIcon('Total cooperative share (unit-specific Pflichtanteile + common share per adult). This is the one-off entry cost to join.')}</th>
        <th style="border-left:1px solid var(--border-light)">Rent ${infoIcon("Your share of the cooperative's running costs: bank loan, KfW 298, operating costs, etc. Proportional to the floor area your unit type uses.")}</th>
        <th>${tip('KfW 134')} Repayment ${infoIcon("Personal loan repayment — not part of the cooperative's finances. Shown for information so single-unit members can estimate their total monthly outgoings.")}</th>
        ${m2Header}
      </tr>
      ${rows}
    </table>
    <div class="we-note" style="display:flex;justify-content:space-between;align-items:start">
      <div>
        <strong>WG members:</strong> ${tip('KfW 134')} is not available for multi-${tip('household')}-unit types.
        The full coop share must be paid in cash at entry.
        For single-unit members, ${tip('KfW 134')} covers the share (up to €${fmt(KFW134_MAX_LOAN)})
        with a ${Math.round(KFW134_REPAYMENT_GRANT*100)}% repayment grant — so you only repay ${Math.round((1-KFW134_REPAYMENT_GRANT)*100)}% of the loan.
      </div>
      <button class="m2-toggle" onclick="showRentPerM2=!showRentPerM2;updateOutputs()"
        title="Toggle €/m² column">${showRentPerM2 ? 'Hide' : 'Show'} €/m²</button>
    </div>
  `;
}


// =========================================================
// FINANCING STACK BAR
// =========================================================
function renderFinancingStack(R) {
  const items = [
    { label: 'Member Equity', val: R.memberEquity, color: '#4fc3f7',
      desc: "Coop shares from all members (funded via cash and/or personal KfW 134 loans — from the cooperative's perspective this is simply equity received)" },
    { label: 'KfW 298',      val: R.kfw298Total,  color: '#ffa726',
      desc: 'Subsidized construction loan to the cooperative from KfW' },
    { label: 'Direktkredite', val: R.direktkreditTotal, color: '#ab47bc',
      desc: 'Subordinated loans from supporters at below-market rates' },
    { label: 'Bank Loan',    val: R.bankLoan, color: '#ef5350',
      desc: 'Remaining amount financed through a commercial bank' },
  ].filter(i => i.val > 0);

  const total = items.reduce((a,i) => a + i.val, 0);
  const bar = items.map(i => {
    const p = total > 0 ? i.val/total*100 : 0;
    return `<div style="width:${p}%;background:${i.color}" class="tip" data-tip="${i.desc.replace(/"/g,'&quot;')}">${p > 8 ? fmt(p,0)+'%' : ''}</div>`;
  }).join('');
  const legend = items.map(i =>
    `<span class="tip" data-tip="${i.desc.replace(/"/g,'&quot;')}"><span class="dot" style="background:${i.color}"></span>${i.label}: ${fmtEurK(i.val)}</span>`
  ).join('');

  document.getElementById('finStack').innerHTML = `
    <h3>Financing Stack ${infoIcon('How the total project cost is covered. Member equity includes coop shares funded via cash AND personal KfW 134 loans. The bank sees member equity + Direktkredite as the equity base.')}</h3>
    <div class="stack-bar">${bar}</div>
    <div class="stack-legend">${legend}</div>
  `;
}


// =========================================================
// SANITY CHECKS (collapsible debug panel)
// =========================================================
function renderSanity(R) {
  const el = document.getElementById('sanityBody');
  if (!el) return;
  const pctSum = unitTypes.reduce((a,t) => a + t.pctOfHH, 0);
  const checks = [
    ['Adults',             fmt(R.totalAdults,1), true],
    ['Children',           fmt(R.totalChildren,1), R.totalChildren < R.totalAdults * 2],
    ['Adult-equivalents',  fmt(R.adultEquivalents,1), true],
    ['Housing units',      R.totalUnits, R.totalUnits > 0],
    ['Actual households',  R.totalHH, Math.abs(R.totalHH - state.numHouseholds) <= 3],
    ['Unit type % sum',    pctSum + '%', pctSum === 100],
    ['Total NUF',          fmt(Math.round(R.totalNUF))+' m²', true],
    ['Total BGF',          fmt(Math.round(R.totalBGF))+' m²', true],
    ['Land needed',        fmt(Math.round(R.landArea))+' m²', true],
    ['Construction',       fmtEurK(R.totalConstruction), true],
    ['Total project',      fmtEurK(R.totalProjectCost), true],
    ['Cost/m² NUF',        fmt(Math.round(R.totalProjectCost/R.totalNUF))+' €', true],
    ['Cost/unit',          fmtEurK(R.totalProjectCost/R.totalUnits), true],
    ['Bank loan',          fmtEurK(R.bankLoan), R.bankLoan >= 0],
    ['Equity ratio',       fmt(R.equityRatio,1)+'%', R.equityRatio >= state.bankMinEquityPct],
    ['KfW 134 rate (auto)',R.kfw134RateDisplay.toFixed(2)+'%', true],
  ];
  el.innerHTML = checks.map(([l,v,ok]) =>
    `${l}: <span class="${ok?'ok':'bad'}">${v}${ok?'':' ⚠'}</span>`
  ).join('<br>');
}


// =========================================================
// SLIDER VALUE DISPLAY RULES
// Maps state keys to how their values are formatted for display.
// =========================================================
const DISPLAY = {
  numHouseholds: v=>fmt(v), adultsPerHH: v=>fmt(v,1),
  pctWithChildren: v=>fmt(v)+'%', childrenPerHH: v=>fmt(v,1),
  sharedSpacePerAdultEq: v=>fmt(v,1)+' m²', numSharedKitchens: v=>fmt(v),
  numFloors: v=>fmt(v), erbbauzinsDiscount: v=>fmt(v)+'%',
  direktkreditVolume: v=>fmtEur(v), commonSharePerAdult: v=>fmtEur(v),
  baseCostPerM2BGF: v=>fmt(v)+' €/m²', bgfToNufRatio: v=>fmt(v,2),
  sharedKitchenCost: v=>fmtEur(v), energyPremiumPct: v=>fmt(v)+'%',
  contingencyPct: v=>fmt(v)+'%',
  bodenrichtwert: v=>fmt(v)+' €/m²', gfz: v=>fmt(v,2),
  transferTaxPct: v=>fmt(v,1)+'%', notaryPct: v=>fmt(v,1)+'%',
  erbbauzinsRatePct: v=>fmt(v,1)+'%',
  hoaiPct: v=>fmt(v,1)+'%', permitsCost: v=>fmtEur(v),
  legalCost: v=>fmtEur(v), energieberaterCost: v=>fmtEur(v),
  bankRate: v=>fmt(v,1)+'%', bankTerm: v=>v+' yr', bankMinEquityPct: v=>fmt(v)+'%',
  kfw134Term: v=>v+' yr', kfw134Grace: v=>v+' yr',
  kfw298Rate: v=>fmt(v,2)+'%', kfw298MaxPerUnit: v=>fmtEur(v),
  kfw298Term: v=>v+' yr', kfw298Grace: v=>v+' yr',
  direktkreditRate: v=>fmt(v,1)+'%', direktkreditNotice: v=>v+' mo',
  interimRate: v=>fmt(v,1)+'%', constructionMonths: v=>v+' mo',
  maintenancePerM2: v=>fmt(v,1)+' €/m²', managementPerUnit: v=>fmt(v)+' €',
  insurancePerM2BGF: v=>fmt(v,1)+' €/m²', propertyTaxPerM2: v=>fmt(v,1)+' €/m²',
  commonUtilitiesPerAdEq: v=>fmt(v)+' €/mo', vacancyBufferPct: v=>fmt(v,1)+'%',
};
function displayVal(key) { return (DISPLAY[key]||(v=>fmt(v)))(state[key]); }


// =========================================================
// UI COMPONENT BUILDERS
// =========================================================

function slider(key, label, min, max, step, hint) {
  return `<div class="param">
    <div class="name">${label}${hint ? '<small>'+hint+'</small>' : ''}</div>
    <input type="range" min="${min}" max="${max}" step="${step||1}" value="${state[key]}"
      data-key="${key}" oninput="state['${key}']=parseFloat(this.value);updateDisplays();updateOutputs()">
    <div class="val" data-vkey="${key}">${displayVal(key)}</div>
  </div>`;
}

function toggle(key, label, hint) {
  return `<div class="toggle-row">
    <div class="name">${label}${hint ? '<small>'+hint+'</small>' : ''}</div>
    <div class="toggle ${state[key]?'on':''}"
      onclick="state['${key}']=!state['${key}'];this.classList.toggle('on');fullUpdate()"></div>
  </div>`;
}

function enumButtons(key, label, opts, hint, isNumeric) {
  const btns = opts.map(o => {
    const val = isNumeric ? o : `'${o}'`;
    const active = state[key] === o ? 'active' : '';
    return `<button class="${active}" onclick="state['${key}']=${val};fullUpdate()">${o}</button>`;
  }).join('');
  return `<div class="enum-row">
    <div class="name">${label}${hint ? '<small>'+hint+'</small>' : ''}</div>
    <div class="enum-btns">${btns}</div>
  </div>`;
}

function unitTypeCards() {
  return `<div class="we-configs">${unitTypes.map((t,i) => `
    <div class="we-card">
      <div class="we-title">${t.name}${!t.single
        ? ' <span style="font-size:0.65rem;color:var(--text-muted)">('+t.hhPerUnit+' '+tip('household','hh')+')</span>' : ''}</div>
      <div class="mini-param"><span>% of ${tip('household','hh')}</span>
        <input type="number" value="${t.pctOfHH}" min="0" max="100" step="5"
          onchange="unitTypes[${i}].pctOfHH=parseFloat(this.value);fullUpdate()"></div>
      <div class="mini-param"><span>m² ${tip('NUF')}</span>
        <input type="number" value="${t.m2}" min="20" max="200" step="5"
          onchange="unitTypes[${i}].m2=parseFloat(this.value);fullUpdate()"></div>
      <div class="mini-param"><span>${tip('Pflichtanteile','Share')} (€)</span>
        <input type="number" value="${t.sharePrice}" min="5000" max="200000" step="1000"
          onchange="unitTypes[${i}].sharePrice=parseFloat(this.value);fullUpdate()"></div>
      <div class="mini-param"><span>Kitchen (€)</span>
        <input type="number" value="${t.kitchenCost}" min="3000" max="30000" step="1000"
          onchange="unitTypes[${i}].kitchenCost=parseFloat(this.value);fullUpdate()"></div>
    </div>`).join('')}</div>`;
}


// =========================================================
// SECTION DEFINITIONS
// =========================================================
function getSections() {
  const s = state;
  return [
    { title: 'Community Size', tag: 'WISHES', open: true, body: () => `
        ${slider('numHouseholds','Number of '+tip('household','households'), 5,40,1,'Primary scaling parameter')}
        ${slider('adultsPerHH','Avg. adults per '+tip('household','household'), 1,3,0.1)}
        ${slider('pctWithChildren',tip('household','Households')+' with children', 0,60,5)}
        ${slider('childrenPerHH','Avg. children (where applicable)', 1,3,0.5)}
        <div class="derived" id="derivedPop"></div>`
    },
    { title: 'Unit Mix', tag: 'WISHES', open: true, body: () => `
        <p style="font-size:0.78rem;color:var(--text-dim);margin-bottom:0.5rem">
          Configure each ${tip('housing unit','unit type')}'s share of ${tip('household','households')} and specifications. Percentages should sum to 100%.
        </p>
        ${unitTypeCards()}
        <div class="sub-heading" style="margin-top:1rem">Common Cooperative Share</div>
        ${slider('commonSharePerAdult','Common share per adult', 200,5000,100,'Flat rate every adult pays regardless of unit type')}
        <div class="derived" id="derivedMix"></div>`
    },
    { title: 'Shared Space & Building', tag: 'WISHES', open: false, body: () => `
        ${slider('sharedSpacePerAdultEq','Community space per adult-equivalent', 2,12,0.5,'Kitchens, common room, laundry, workshop, storage…')}
        ${toggle('sharedKitchensEnabled','Include shared kitchen(s)','Significant cost driver')}
        ${s.sharedKitchensEnabled ? slider('numSharedKitchens','Number of shared kitchens', 1,4,1) : ''}
        <div class="sub-heading">Building</div>
        ${enumButtons('energyStandard','Energy standard',['EH55','EH40','EH40-QNG'],'Affects '+tip('KfW 298')+' eligibility & loan amounts')}
        ${slider('numFloors','Number of floors', 2,6,1,'More floors = less land but higher cost/m²')}`
    },
    { title: 'Land Acquisition', tag: 'WISHES', open: false, body: () => `
        ${enumButtons('landModel','Land model',['Kauf','Erbbaurecht'],'Purchase vs. '+tip('Erbbaurecht','leasehold'))}
        ${s.landModel==='Erbbaurecht' ? `
          ${toggle('konzeptverfahren',tip('Konzeptverfahren')+' (Berlin city land)','Land via BIM Berlin concept competition')}
          ${s.konzeptverfahren ? slider('erbbauzinsDiscount',tip('Erbbauzins')+' discount', 0,50,5,'Discount vs. standard 1.8% rate') : ''}` : ''}
        <div class="sub-heading">Land Values</div>
        ${slider('bodenrichtwert',tip('Bodenrichtwert'), 150,2000,10,'Check boris-berlin.de · outer ~€250, inner €1,000+')}
        ${slider('gfz',tip('GFZ','GFZ (plot ratio)'), 0.6,3,0.1,'Set by Bebauungsplan · typical 0.8–2.5')}
        ${s.landModel==='Kauf' ? `
          ${slider('transferTaxPct',tip('Grunderwerbsteuer'), 6,6,0.5,'Berlin: fixed at 6%')}
          ${slider('notaryPct','Notary & registration', 1.5,2.5,0.1)}` : `
          ${slider('erbbauzinsRatePct',tip('Erbbauzins')+' rate', 1,3,0.1,'Standard Berlin: 1.8% of land value')}`}`
    },
    { title: 'Financing Choices', tag: 'WISHES', open: false, body: () => `
        ${toggle('kfw298Enabled','Enable '+tip('KfW 298')+' (construction loan)','Subsidized coop loan — up to €100k/unit (€150k with '+tip('QNG')+')')}
        ${toggle('direktkreditEnabled','Enable '+tip('Direktkredite'),'Subordinated loans from supporters at below-market rates')}
        ${s.direktkreditEnabled ? slider('direktkreditVolume','Target '+tip('Direktkredite')+' volume', 0,1000000,10000) : ''}`
    },
    { title: 'Construction Costs', tag: 'ASSUMPTIONS', open: false, body: () => `
        ${slider('baseCostPerM2BGF','Base cost (KG 300+400)', 2200,3800,50,'Berlin 2027 MFH: roughly €2,500–€3,500/m² '+tip('BGF'))}
        ${slider('bgfToNufRatio',tip('BGF')+'-to-'+tip('NUF')+' ratio', 1.15,1.45,0.01,'Walls, stairs, hallways, elevators')}
        ${slider('sharedKitchenCost','Shared kitchen cost (each)', 10000,80000,1000,'Commercial-grade = much higher')}
        ${slider('energyPremiumPct','Energy standard premium', 0,20,1,tip('EH40')+' ~5–8%, '+tip('QNG','EH40+QNG')+' ~10–15% over EH55')}
        ${slider('contingencyPct','Construction contingency', 5,20,1,'10% = optimistic, 15% = realistic')}`
    },
    { title: 'Soft Costs', tag: 'ASSUMPTIONS', open: false, body: () => `
        ${slider('hoaiPct','Architecture & planning ('+tip('HOAI')+')', 12,20,0.5,'Full-service, all Leistungsphasen')}
        ${slider('permitsCost','Permits, surveys, Gutachten', 15000,60000,1000)}
        ${slider('legalCost','Legal & cooperative setup', 15000,45000,1000)}
        ${slider('energieberaterCost','Energieberater / '+tip('QNG')+' certification', 8000,45000,1000)}`
    },
    { title: 'Financing Terms', tag: 'ASSUMPTIONS', open: false, body: () => `
        <div class="sub-heading">Bank Loan</div>
        ${slider('bankRate','Interest rate', 2,6,0.1,'Rate on residual amount after subsidized loans')}
        ${slider('bankTerm','Term', 15,35,1)}
        ${toggle('bankInterestOnly','Interest-only (no principal repayment)','Lower monthly cost but loan balance never decreases')}
        ${slider('bankMinEquityPct','Minimum equity ratio', 10,30,1,'Required by bank')}

        <div class="sub-heading">${tip('KfW 134')} (Personal Member Loan — informational)</div>
        <p style="font-size:0.78rem;color:var(--text-dim);margin:0.3rem 0 0.5rem">
          Max loan: <strong style="color:var(--text)">€${fmt(KFW134_MAX_LOAN)}</strong> per member · 
          Repayment grant: <strong style="color:var(--green)">${Math.round(KFW134_REPAYMENT_GRANT*100)}%</strong> ·
          Rate: <strong style="color:var(--accent)">${kfw134Rate().toFixed(2)}%</strong> (auto-set from term & commitment)
        </p>
        ${slider('kfw134Term','Loan term', 4,35,1)}
        ${enumButtons('kfw134Commitment','Rate commitment period',[5,10],'Longer = higher rate',true)}
        ${slider('kfw134Grace','Grace period (repayment-free)', 1,5,1,'Interest-only — monthly payment jumps when this ends')}

        <div class="sub-heading">${tip('KfW 298')} (Construction Loan)</div>
        ${slider('kfw298Rate','Interest rate', 0.1,2,0.05,'~0.6% for EH40+QNG, ~1.0% for EH55')}
        ${slider('kfw298MaxPerUnit','Max loan per '+tip('housing unit','unit'), 100000,150000,10000,'Auto-set by energy standard')}
        ${slider('kfw298Term','Term', 10,35,1)}
        ${slider('kfw298Grace','Grace period', 1,5,1)}

        <div class="sub-heading">${tip('Direktkredite')}</div>
        ${slider('direktkreditRate','Avg. interest rate', 0,2,0.1,'Some lenders give 0% as solidarity')}
        ${slider('direktkreditNotice','Avg. notice period', 3,36,3,'Shorter = more liquidity risk')}

        <div class="sub-heading">Interim Financing</div>
        ${slider('interimRate','Construction financing rate', 3,6,0.1)}
        ${slider('constructionMonths','Construction duration', 14,36,1,'Typical MFH: 18–30 months')}`
    },
    { title: 'Operating Costs', tag: 'ASSUMPTIONS', open: false, body: () => `
        ${slider('maintenancePerM2','Maintenance reserve', 6,20,0.5,'€/m² '+tip('NUF')+' per year')}
        ${slider('managementPerUnit','Property management', 0,60,5,'€ per '+tip('housing unit','unit')+' per month')}
        ${slider('insurancePerM2BGF','Building insurance', 1.5,5,0.1,'€/m² '+tip('BGF')+' per year')}
        ${slider('propertyTaxPerM2','Property tax (Grundsteuer)', 2,10,0.5,'€/m² '+tip('NUF')+' per year')}
        ${slider('commonUtilitiesPerAdEq','Common area utilities', 8,25,1,'€/adult-equivalent per month')}
        ${slider('vacancyBufferPct','Vacancy & default reserve', 0,5,0.5,'Buffer — should be low in a cooperative')}`
    },
  ];
}


// =========================================================
// RENDER / UPDATE CYCLE
// =========================================================
const collapseState = {};
let sanityCollapsed = true;

function renderSections() {
  const sections = getSections();
  document.getElementById('sections').innerHTML = sections.map((sec,i) => {
    const collapsed = collapseState[i] !== undefined ? collapseState[i] : !sec.open;
    return `<div class="section ${collapsed?'collapsed':''}" data-idx="${i}">
      <div class="section-header" onclick="toggleSection(${i})">
        <h2>${sec.title}</h2>
        <div style="display:flex;align-items:center;gap:0.6rem">
          <span class="tag">${sec.tag}</span><span class="chevron">▼</span>
        </div>
      </div>
      <div class="section-body">${sec.body()}</div>
    </div>`;
  }).join('')
  // Sanity checks at the very bottom
  + `<div class="section ${sanityCollapsed?'collapsed':''}" id="sanitySection">
      <div class="section-header" onclick="sanityCollapsed=!sanityCollapsed;document.getElementById('sanitySection').classList.toggle('collapsed')">
        <h2>Sanity Checks</h2>
        <div style="display:flex;align-items:center;gap:0.6rem">
          <span class="tag">DEBUG</span><span class="chevron">▼</span>
        </div>
      </div>
      <div class="section-body"><div class="debug-panel" id="sanityBody"></div></div>
    </div>`;
}

function toggleSection(i) {
  const el = document.querySelector(`.section[data-idx="${i}"]`);
  el.classList.toggle('collapsed');
  collapseState[i] = el.classList.contains('collapsed');
}

/** Apply auto-settings based on energy standard selection */
function applyAutoSettings() {
  const s = state;
  if (s.energyStandard === 'EH55')        { s.energyPremiumPct = 0; s.kfw298MaxPerUnit = 100000; }
  else if (s.energyStandard === 'EH40')    { if (s.energyPremiumPct < 5) s.energyPremiumPct = 7; s.kfw298MaxPerUnit = 100000; }
  else if (s.energyStandard === 'EH40-QNG'){ if (s.energyPremiumPct < 10) s.energyPremiumPct = 12; s.kfw298MaxPerUnit = 150000; }
}

function updateDisplays() {
  document.querySelectorAll('[data-vkey]').forEach(el => {
    el.textContent = displayVal(el.dataset.vkey);
  });
}

function updateOutputs() {
  const R = calc();
  renderOutputCards(R);
  renderUnitResults(R);
  renderFinancingStack(R);
  renderSanity(R);

  // Derived info blocks
  const popEl = document.getElementById('derivedPop');
  if (popEl) popEl.innerHTML =
    `Adults: <span>${fmt(R.totalAdults,1)}</span> · `
    + `Children: <span>${fmt(R.totalChildren,1)}</span> · `
    + `Adult-equiv: <span>${fmt(R.adultEquivalents,1)}</span>`;

  const mixEl = document.getElementById('derivedMix');
  if (mixEl) {
    const pctSum = unitTypes.reduce((a,t) => a + t.pctOfHH, 0);
    mixEl.innerHTML =
      `Allocation: <span${pctSum!==100?' style="color:var(--red)"':''}>${pctSum}%${pctSum!==100?' ⚠ should be 100%':' ✓'}</span>`
      + ` · ${tip('housing unit','Units')}: <span>${R.totalUnits}</span>`
      + ` · ${tip('household','Households')}: <span>${R.totalHH}</span>`
      + ` · Land: <span>${fmt(Math.round(R.landArea))} m²</span>`;
  }
}

/** Full re-render (for toggles, enums that change conditional visibility) */
function fullUpdate() {
  applyAutoSettings();
  renderSections();
  updateOutputs();
  saveState();
}


// =========================================================
// PERSISTENCE (localStorage)
//
// Saves the full state + unitTypes config on every change.
// On load, merges saved values into the current defaults so
// that new fields get defaults and removed fields are ignored.
// This makes it safe to change the code frequently.
// =========================================================

const STORAGE_KEY = 'coopCalc_v1';

function saveState() {
  try {
    const data = {
      state: { ...state },
      unitTypes: unitTypes.map(t => ({
        id: t.id, m2: t.m2, sharePrice: t.sharePrice,
        kitchenCost: t.kitchenCost, pctOfHH: t.pctOfHH,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage full or unavailable — silently ignore
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    // Merge saved state into current defaults (only known keys, matching types)
    if (data.state) {
      for (const key of Object.keys(state)) {
        if (key in data.state && typeof data.state[key] === typeof state[key]) {
          state[key] = data.state[key];
        }
      }
    }

    // Merge saved unit type config (matched by id)
    if (data.unitTypes) {
      for (const saved of data.unitTypes) {
        const current = unitTypes.find(t => t.id === saved.id);
        if (!current) continue;
        if (typeof saved.m2 === 'number')         current.m2 = saved.m2;
        if (typeof saved.sharePrice === 'number')  current.sharePrice = saved.sharePrice;
        if (typeof saved.kitchenCost === 'number') current.kitchenCost = saved.kitchenCost;
        if (typeof saved.pctOfHH === 'number')     current.pctOfHH = saved.pctOfHH;
      }
    }
  } catch (e) {
    // Corrupted data — ignore and use defaults
  }
}

// Also save when sliders change (they don't go through fullUpdate)
const _origUpdateOutputs = updateOutputs;
updateOutputs = function() {
  _origUpdateOutputs();
  saveState();
};


// =========================================================
// INIT
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyAutoSettings();
  renderSections();
  updateOutputs();
});
