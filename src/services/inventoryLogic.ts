import { StockMovement, StockBalance, ConditionBucket, MovementType } from '@/types/ledger';
import { ItemType } from '@/types/models';

export function calculateBalances(
  movements: StockMovement[],
  itemId: string,
  itemType: ItemType,
  godownId?: string
): StockBalance {
  let saleable = 0;
  let repairHold = 0;
  let reserved = 0;
  let writtenOff = 0;

  const relevant = movements.filter(
    (m) => m.itemId === itemId && m.itemType === itemType && (!godownId || m.godownId === godownId)
  );

  for (const m of relevant) {
    if (m.conditionBucket === 'SALEABLE') {
      saleable += m.physicalQtyDelta;
    } else if (m.conditionBucket === 'REPAIR_HOLD') {
      repairHold += m.physicalQtyDelta;
    } else if (m.conditionBucket === 'WRITTEN_OFF') {
      writtenOff += Math.abs(m.physicalQtyDelta);
    }
    reserved += m.reservedQtyDelta;
  }

  const totalPhysical = saleable + repairHold;
  const available = Math.max(0, saleable - reserved);

  return {
    itemId,
    itemType,
    godownId: godownId || 'all',
    saleable: Math.max(0, saleable),
    repairHold: Math.max(0, repairHold),
    totalPhysical: Math.max(0, totalPhysical),
    reserved: Math.max(0, reserved),
    available,
    writtenOff,
  };
}

export function createMovement(
  documentId: string,
  documentType: string,
  movementType: MovementType,
  itemType: ItemType,
  itemId: string,
  godownId: string,
  physicalQtyDelta: number,
  reservedQtyDelta: number,
  conditionBucket: ConditionBucket,
  createdBy: string,
  remarks?: string
): StockMovement {
  return {
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    documentId,
    documentType,
    movementType,
    itemType,
    itemId,
    godownId,
    physicalQtyDelta,
    reservedQtyDelta,
    conditionBucket,
    remarks,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}
