// ── EOQ Optimizer ───────────────────────────────────────────────────────────────
// EOQ = √(2DS/H) with MOQ, carton rounding, pallet rounding

export interface EOQInput {
  annualDemand: number;
  orderingCost: number;
  unitCost: number;
  carryingCostPercent: number;
  moq?: number;
  cartonQty?: number;
  palletQty?: number;
}

export interface EOQResult {
  eoq: number;
  roundedEOQ: number;
  moqApplied: boolean;
  annualOrders: number;
  annualOrderingCost: number;
  annualHoldingCost: number;
  totalAnnualCost: number;
  daysOfSupply: number;
  roundsToCarton: boolean;
  roundsToPallet: boolean;
}

export function calculateEOQ(input: EOQInput): EOQResult {
  const { annualDemand, orderingCost, unitCost, carryingCostPercent, moq, cartonQty, palletQty } = input;
  const holdingCostPerUnit = unitCost * carryingCostPercent;
  let eoq = holdingCostPerUnit > 0
    ? Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit)
    : 0;
  let moqApplied = false;
  if (moq && eoq < moq) { eoq = moq; moqApplied = true; }
  let roundsToCarton = false;
  let roundsToPallet = false;
  let roundedEOQ = Math.ceil(eoq);
  if (palletQty && palletQty > 0) {
    const palletMultiple = Math.ceil(eoq / palletQty) * palletQty;
    if (palletMultiple !== eoq) { roundedEOQ = palletMultiple; roundsToPallet = true; }
  } else if (cartonQty && cartonQty > 0) {
    const cartonMultiple = Math.ceil(eoq / cartonQty) * cartonQty;
    if (cartonMultiple !== eoq) { roundedEOQ = cartonMultiple; roundsToCarton = true; }
  }
  const annualOrders = roundedEOQ > 0 ? annualDemand / roundedEOQ : 0;
  const annualOrderingCost = annualOrders * orderingCost;
  const annualHoldingCost = (roundedEOQ / 2) * holdingCostPerUnit;
  const totalAnnualCost = annualOrderingCost + annualHoldingCost;
  const daysOfSupply = annualDemand > 0 ? (roundedEOQ / annualDemand) * 365 : 0;
  return {
    eoq: Math.round(eoq), roundedEOQ, moqApplied,
    annualOrders: Math.round(annualOrders * 10) / 10,
    annualOrderingCost: Math.round(annualOrderingCost * 100) / 100,
    annualHoldingCost: Math.round(annualHoldingCost * 100) / 100,
    totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
    daysOfSupply: Math.round(daysOfSupply),
    roundsToCarton, roundsToPallet,
  };
}

export function quickEOQ(annualDemand: number, unitCost: number, orderingCost = 50, carryingCostPercent = 0.25): number {
  const h = unitCost * carryingCostPercent;
  if (h <= 0) return 0;
  return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / h));
}
