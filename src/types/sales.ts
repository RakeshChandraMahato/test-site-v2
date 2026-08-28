import { GiftBagSize, UnitType } from './models';

export type SaleType = 'BOX_ONLY' | 'BOX_WITH_ITEMS' | 'ITEMS_COMBO_NO_BOX';
export type ReservationStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'MATERIALS_PENDING'
  | 'READY'
  | 'PARTIALLY_SOLD'
  | 'SOLD'
  | 'CANCELLED'
  | 'EXPIRED';

export interface OrderItemInput {
  rawMaterialId: string;
  actualPackingQty: number;
  unit: UnitType;
}

export interface OrderLineInput {
  saleType: SaleType;
  boxId?: string;
  quantity: number;
  sellingRatePerUnit: number;
  bagRequired: boolean;
  bagSize?: GiftBagSize;
  items: OrderItemInput[];
}

export interface OrderItemRecord {
  id: string;
  orderLineId: string;
  rawMaterialId: string;
  appliedLandedPurchaseRate: number;
  appliedInternalCostingRate: number;
  actualPackingQty: number;
  unit: UnitType;
  totalRequiredQty: number;
}

export interface OrderLineRecord {
  id: string;
  orderId: string;
  saleType: SaleType;
  boxId?: string;
  appliedBoxLandedCost: number;
  appliedBoxInternalRate: number;
  quantity: number;
  sellingRatePerUnit: number;
  taxableSellingRate: number;
  lineTaxableRevenue: number;
  bagRequired: boolean;
  bagSize?: GiftBagSize;
  appliedBagCost: number;
  items: OrderItemRecord[];
}

export interface OrderCostSnapshot {
  orderId: string;
  totalActualDirectCost: number;
  totalCommercialCost: number;
  actualGrossProfit: number;
  commercialGrossProfit: number;
  actualGrossMarginPct: number;
  commercialGrossMarginPct: number;
  realizedMarkupPct: number;
  netPackagingBurden: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  billingDate: string;
  customerId: string;
  reservationId?: string;
  status: 'POSTED' | 'CANCELLED';
  isTaxInclusive: boolean;
  totalTaxableRevenue: number;
  totalOutputGst: number;
  totalOrderRevenue: number;
  packagingRecoveryAmount: number;
  version: number;
  cancelReason?: string;
  createdBy: string;
  createdAt: string;
  lines: OrderLineRecord[];
  costSnapshot?: OrderCostSnapshot;
}

export interface ReservationRecord {
  id: string;
  reservationNumber: string;
  reservationDate: string;
  customerId: string;
  promisedDeliveryDate: string;
  deliveryTime?: string;
  pickupDeliveryMode: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string;
  contactPerson?: string;
  status: ReservationStatus;
  mode: 'BOX_RESERVATION_ONLY' | 'FULL_RESERVATION' | 'ITEMS_COMBO_RESERVATION';
  advanceAmount: number;
  totalFinalizedRate: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  orderId?: string;
  lines: OrderLineInput[];
}
