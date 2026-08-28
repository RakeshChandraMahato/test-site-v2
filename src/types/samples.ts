import { GiftBagSize, UnitType } from './models';

export interface SampleRecipeItem {
  rawMaterialId: string;
  actualPackingQty: number;
  unit: UnitType;
}

export interface SampleRecipe {
  id: string;
  sampleCode: string;
  sampleName: string;
  boxId?: string;
  bagRequired: boolean;
  bagSize?: GiftBagSize;
  manualMrp?: number;
  unitsMade: number;
  unitsAvailable: number;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  items: SampleRecipeItem[];
}

export interface SampleDisposition {
  id: string;
  sampleRecipeId: string;
  dispositionType: 'TRANSFER_TO_SALE' | 'GIVE_HOME_PERSONAL';
  units: number;
  orderId?: string;
  stockOutExpenseId?: string;
  createdAt: string;
}
