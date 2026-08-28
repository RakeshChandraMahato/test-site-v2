import { OrderLineInput, OrderCostSnapshot } from '@/types/sales';
import { Box, RawMaterial, GiftBag } from '@/types/models';

export interface CalculatedLine {
  taxableRate: number;
  lineTaxableRevenue: number;
  actualDirectCost: number;
  commercialCost: number;
  bagCost: number;
}

export function calculateOrderLineTotals(
  line: OrderLineInput,
  box?: Box,
  rawMaterials: RawMaterial[] = [],
  giftBags: GiftBag[] = [],
  isTaxInclusive: boolean = false,
  gstPct: number = 0
): CalculatedLine {
  const qty = line.quantity || 1;
  const rate = line.sellingRatePerUnit || 0;
  
  // Tax calculation
  const taxableRate = isTaxInclusive && gstPct > 0 
    ? rate / (1 + gstPct / 100) 
    : rate;
  const lineTaxableRevenue = taxableRate * qty;

  // Box cost
  const boxLandedCost = line.saleType !== 'ITEMS_COMBO_NO_BOX' && box ? (box.currentLandedCost || 0) : 0;
  const boxInternalRate = line.saleType !== 'ITEMS_COMBO_NO_BOX' && box ? (box.currentFinalRate || 0) : 0;

  // Gift Bag cost
  let bagCostPerUnit = 0;
  if (line.bagRequired && line.bagSize) {
    const bag = giftBags.find((b) => b.size === line.bagSize);
    bagCostPerUnit = bag ? bag.costRate : 0;
  }

  // Items cost
  let rawActualCostPerSet = 0;
  let rawCommercialCostPerSet = 0;

  if (line.saleType !== 'BOX_ONLY') {
    for (const item of line.items) {
      const rm = rawMaterials.find((r) => r.id === item.rawMaterialId);
      if (rm) {
        const itemQty = Number(item.actualPackingQty) || 0;
        rawActualCostPerSet += itemQty * rm.currentLandedPurchaseRate;
        rawCommercialCostPerSet += itemQty * rm.currentInternalSellingRate;
      }
    }
  }

  const actualDirectCost = (boxLandedCost + rawActualCostPerSet + bagCostPerUnit) * qty;
  const commercialCost = (boxInternalRate + rawCommercialCostPerSet + bagCostPerUnit) * qty;

  return {
    taxableRate,
    lineTaxableRevenue,
    actualDirectCost,
    commercialCost,
    bagCost: bagCostPerUnit * qty,
  };
}

export function calculateOrderProfitSnapshot(
  totalRevenue: number,
  totalActualCost: number,
  totalCommercialCost: number,
  packagingIncurred: number,
  packagingRecovered: number
): OrderCostSnapshot {
  const actualGP = totalRevenue - totalActualCost;
  const commercialGP = totalRevenue - totalCommercialCost;
  const actualMarginPct = totalRevenue > 0 ? (actualGP / totalRevenue) * 100 : 0;
  const commercialMarginPct = totalRevenue > 0 ? (commercialGP / totalRevenue) * 100 : 0;
  const realizedMarkupPct = totalCommercialCost > 0 ? ((totalRevenue - totalCommercialCost) / totalCommercialCost) * 100 : 0;
  const netPackagingBurden = packagingIncurred - packagingRecovered;

  return {
    orderId: '',
    totalActualDirectCost: totalActualCost,
    totalCommercialCost: totalCommercialCost,
    actualGrossProfit: actualGP,
    commercialGrossProfit: commercialGP,
    actualGrossMarginPct: actualMarginPct,
    commercialGrossMarginPct: commercialMarginPct,
    realizedMarkupPct: realizedMarkupPct,
    netPackagingBurden,
  };
}
