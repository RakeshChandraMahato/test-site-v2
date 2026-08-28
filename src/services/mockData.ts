import { Box, Customer, GiftBag, Godown, ProductGroup, RawMaterial, Supplier } from '@/types/models';
import { StockMovement } from '@/types/ledger';
import { OrderRecord } from '@/types/sales';
import { SampleRecipe } from '@/types/samples';

// Clean baseline definitions - ALL data comes dynamically from Supabase
export const initialGodowns: Godown[] = [];
export const initialProductGroups: ProductGroup[] = [];
export const initialGiftBags: GiftBag[] = [];
export const initialRawMaterials: RawMaterial[] = [];
export const initialBoxes: Box[] = [];
export const initialCustomers: Customer[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialMovements: StockMovement[] = [];
export const initialSampleRecipes: SampleRecipe[] = [];
export const initialOrders: OrderRecord[] = [];
