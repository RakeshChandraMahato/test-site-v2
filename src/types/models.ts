export type ItemType = 'BOX' | 'RAW_MATERIAL' | 'GIFT_BAG';
export type UnitType = 'KG' | 'PCS';
export type GiftBagSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface Godown {
  id: string;
  name: string;
  active: boolean;
}

export interface ProductGroup {
  id: string;
  name: string;
  active: boolean;
}

export interface RawMaterial {
  id: string;
  productGroupId: string;
  variant?: string;
  displayName: string;
  unit: UnitType;
  availableFrom?: string;
  inactiveFrom?: string;
  status: 'ACTIVE' | 'INACTIVE';
  currentLandedPurchaseRate: number;
  currentInternalSellingRate: number;
  presets?: number[];
}

export interface Box {
  id: string;
  boxCode: string;
  boxName?: string;
  category?: string;
  size?: string;
  imageUrl: string;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  currentLandedCost: number;
  currentFinalRate: number;
}

export interface GiftBag {
  id: string;
  size: GiftBagSize;
  isEnabled: boolean;
  costRate: number;
  trackInventory: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  companyName?: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  taxDetails?: string;
  paymentTerms?: string;
  active: boolean;
}

export interface PurchaseRecord {
  id: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: string;
  invoiceReference?: string;
  destinationGodownId: string;
  itemType: 'BOX' | 'RAW_MATERIAL';
  itemId: string;
  orderedQty: number;
  acceptedQty: number;
  damagedQty: number;
  purchaseUnitRate: number;
  gstPct: number;
  isItcEligible: boolean;
  transportTotal: number;
  otherDirectCosts: number;
  specialExtraProfitPct: number;
  calculatedLandedCost: number;
  calculatedFinalRate: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface OverheadEntry {
  id: string;
  periodMonth: string;
  category: string;
  amount: number;
  remarks?: string;
  createdAt: string;
}
