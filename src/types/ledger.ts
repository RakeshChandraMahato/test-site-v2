import { ItemType } from './models';

export type MovementType =
  | 'OPENING_BALANCE'
  | 'PURCHASE_IN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'RESERVE'
  | 'RESERVATION_SOLD'
  | 'RESERVATION_CANCEL'
  | 'DIRECT_SALE'
  | 'DAMAGE_REPAIRABLE'
  | 'DAMAGE_REPAIRED'
  | 'DAMAGE_UNREPAIRABLE'
  | 'DAMAGE_REVERSAL'
  | 'SAMPLE_OR_HOME_OUT'
  | 'OTHER_STOCK_OUT'
  | 'SALE_CANCEL_REVERSAL'
  | 'ADJUSTMENT';

export type ConditionBucket = 'SALEABLE' | 'REPAIR_HOLD' | 'WRITTEN_OFF';

export interface StockMovement {
  id: string;
  documentId: string;
  documentType: string;
  movementType: MovementType;
  itemType: ItemType;
  itemId: string;
  godownId: string;
  physicalQtyDelta: number;
  reservedQtyDelta: number;
  conditionBucket: ConditionBucket;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface StockBalance {
  itemId: string;
  itemType: ItemType;
  godownId: string;
  saleable: number;
  repairHold: number;
  totalPhysical: number;
  reserved: number;
  available: number;
  writtenOff: number;
}
