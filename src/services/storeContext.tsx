import React, { createContext, useContext, useState, useEffect } from 'react';
import { Box, Customer, GiftBag, Godown, ProductGroup, RawMaterial, Supplier, PurchaseRecord, OverheadEntry } from '@/types/models';
import { StockMovement, StockBalance } from '@/types/ledger';
import { OrderRecord, OrderLineInput, ReservationRecord } from '@/types/sales';
import { SampleRecipe } from '@/types/samples';
import { UserProfile, UserRole } from '@/types/auth';
import {
  initialGodowns,
  initialProductGroups,
  initialGiftBags,
  initialBoxes,
  initialRawMaterials,
  initialCustomers,
  initialSuppliers,
  initialMovements,
  initialOrders,
  initialSampleRecipes,
} from './mockData';
import { calculateBalances, createMovement } from './inventoryLogic';
import { calculateOrderLineTotals, calculateOrderProfitSnapshot } from './costingLogic';
import {
  fetchInitialData,
  insertBoxSupabase,
  updateBoxSupabase,
  deleteBoxSupabase,
  insertRawMaterialSupabase,
  updateRawMaterialSupabase,
  deleteRawMaterialSupabase,
  insertCustomerSupabase,
  updateCustomerSupabase,
  deleteCustomerSupabase,
  insertGodownSupabase,
  updateGodownSupabase,
  deleteGodownSupabase,
  updateGiftBagRateSupabase,
  insertMovementSupabase,
  insertOrderSupabase,
  insertSampleRecipeSupabase,
  deleteSampleRecipeSupabase,
  signInSupabase,
  signUpSupabase,
  signOutSupabase,
  fetchUserProfileSupabase,
  insertSupplierSupabase,
  updateSupplierSupabase,
  deleteSupplierSupabase,
  insertPurchaseSupabase,
  insertReservationSupabase,
  updateReservationSupabase,
  insertOverheadSupabase,
  deleteOverheadSupabase,
} from './supabaseService';
import { supabase } from '@/lib/supabase';

interface AppStore {
  user: UserProfile | null;
  setUserRole: (role: UserRole) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  isViewer: boolean;
  canViewFinancials: boolean;
  canPostTransactions: boolean;
  canManageMasters: boolean;
  canEditRates: boolean;
  godowns: Godown[];
  productGroups: ProductGroup[];
  rawMaterials: RawMaterial[];
  boxes: Box[];
  giftBags: GiftBag[];
  customers: Customer[];
  suppliers: Supplier[];
  movements: StockMovement[];
  orders: OrderRecord[];
  samples: SampleRecipe[];
  reservations: ReservationRecord[];
  purchases: PurchaseRecord[];
  overheads: OverheadEntry[];
  loading: boolean;
  getItemBalance: (itemId: string, itemType: 'BOX' | 'RAW_MATERIAL' | 'GIFT_BAG', godownId?: string) => StockBalance;
  addBox: (box: Omit<Box, 'id'>, initialStock?: { godownId: string; qty: number; landedCost: number }) => Promise<string>;
  updateBox: (boxId: string, updates: Partial<Box>, rates?: { landed: number; final: number }) => Promise<void>;
  deleteBox: (boxId: string) => Promise<void>;
  addRawMaterial: (rm: Omit<RawMaterial, 'id'>, initialStock?: { godownId: string; qty: number; rate: number }) => Promise<void>;
  updateRawMaterial: (rmId: string, updates: Partial<RawMaterial>, rates?: { landed: number; internal: number }) => Promise<void>;
  deleteRawMaterial: (rmId: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<string>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addGodown: (name: string) => Promise<void>;
  updateGodown: (id: string, updates: Partial<Godown>) => Promise<void>;
  deleteGodown: (id: string) => Promise<void>;
  updateGiftBagRate: (bagId: string, costRate: number) => Promise<void>;
  postDirectSale: (sale: { customerId: string; billingDate: string; isTaxInclusive: boolean; lines: OrderLineInput[]; packagingRecovery: number; reservationId?: string }) => OrderRecord;
  cancelSale: (orderId: string, reason: string) => void;
  postTransfer: (itemType: 'BOX' | 'RAW_MATERIAL', itemId: string, srcGodown: string, destGodown: string, qty: number) => void;
  postDamage: (itemType: 'BOX' | 'RAW_MATERIAL', itemId: string, godownId: string, qty: number, repairable: boolean, lossCost: number, remarks: string) => void;
  repairDamage: (itemType: 'BOX' | 'RAW_MATERIAL', itemId: string, godownId: string, qty: number, remarks: string) => void;
  createSample: (sample: Omit<SampleRecipe, 'id' | 'version' | 'unitsAvailable'>) => void;
  deleteSample: (sampleId: string) => Promise<void>;
  updateSampleUnitsMade: (sampleId: string, unitsMade: number) => void;
  transferSampleToSale: (sampleId: string, units: number, customerId: string, sellingRate: number) => OrderRecord | null;
  issueSampleFreeOrHome: (sampleId: string, units: number, reason: string) => void;
  createReservation: (res: Omit<ReservationRecord, 'id' | 'reservationNumber' | 'createdAt' | 'createdBy'>) => ReservationRecord;
  convertReservationToSale: (reservationId: string, billingDate: string) => OrderRecord | null;
  cancelReservation: (reservationId: string) => void;
  postPurchase: (pData: Omit<PurchaseRecord, 'id' | 'purchaseNumber' | 'createdAt' | 'createdBy'>) => PurchaseRecord;
  addOverhead: (ov: Omit<OverheadEntry, 'id' | 'createdAt'>) => void;
  deleteOverhead: (id: string) => void;
  resetToTestData: () => void;
}

const StoreContext = createContext<AppStore | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [godowns, setGodowns] = useState<Godown[]>(initialGodowns);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>(initialProductGroups);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(initialRawMaterials);
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [giftBags, setGiftBags] = useState<GiftBag[]>(initialGiftBags);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [samples, setSamples] = useState<SampleRecipe[]>(initialSampleRecipes);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [overheads, setOverheads] = useState<OverheadEntry[]>([]);

  // Role Capability Flags
  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const isStaff = user?.role === 'staff';
  const isViewer = user?.role === 'viewer';
  const canViewFinancials = user?.role === 'owner';
  const canPostTransactions = Boolean(user && user.role !== 'viewer');
  const canManageMasters = Boolean(user && (user.role === 'owner' || user.role === 'manager'));
  const canEditRates = user?.role === 'owner';

  // Load from Supabase on mount and check auth session
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfileSupabase(session.user.id).then((profile) => {
          if (profile) {
            setUser({
              id: profile.id,
              email: session.user.email || '',
              fullName: profile.full_name,
              role: profile.role,
              phone: profile.phone,
              createdAt: profile.created_at,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Subscribe to auth changes (Sign in, Sign out, Token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfileSupabase(session.user.id).then((profile) => {
          if (profile) {
            setUser({
              id: profile.id,
              email: session.user.email || '',
              fullName: profile.full_name,
              role: profile.role,
              phone: profile.phone,
              createdAt: profile.created_at,
            });
          }
        });
      } else {
        setUser(null);
      }
    });

    fetchInitialData().then((data) => {
      if (data) {
        if (data.godowns.length > 0) setGodowns(data.godowns);
        if (data.productGroups.length > 0) setProductGroups(data.productGroups);
        if (data.rawMaterials.length > 0) setRawMaterials(data.rawMaterials);
        if (data.boxes.length > 0) setBoxes(data.boxes);
        if (data.giftBags.length > 0) setGiftBags(data.giftBags);
        if (data.customers.length > 0) setCustomers(data.customers);
        // Fix 2: Hydrate suppliers, reservations, purchases
        if (data.suppliers.length > 0) setSuppliers(data.suppliers);
        if (data.movements.length > 0) setMovements(data.movements);
        if (data.orders.length > 0) setOrders(data.orders);
        if (data.samples.length > 0) setSamples(data.samples);
        if (data.reservations.length > 0) setReservations(data.reservations);
        if (data.purchases.length > 0) setPurchases(data.purchases);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setUserRole = (role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : null));
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user: authUser } = await signInSupabase(email, password);
      if (authUser) {
        const profile = await fetchUserProfileSupabase(authUser.id);
        const role = profile?.role || 'staff';
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          fullName: profile?.full_name || authUser.email?.split('@')[0] || 'User',
          role,
          phone: profile?.phone,
          createdAt: profile?.created_at || new Date().toISOString(),
        });
        localStorage.setItem('asj_active_role', role);
        return { success: true };
      }
      return { success: false, error: 'User not found' };
    } catch (err: any) {
      // Translate Supabase cryptic error codes into user-friendly messages
      const msg: string = err?.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
      }
      if (msg.includes('Email not confirmed')) {
        return { success: false, error: 'Please verify your email address before signing in.' };
      }
      if (msg.includes('Database error') || msg.includes('querying schema') || msg.includes('unexpected_failure')) {
        return { success: false, error: 'A server error occurred. Please try again in a moment or contact the administrator.' };
      }
      if (msg.includes('Too many requests') || msg.includes('rate limit')) {
        return { success: false, error: 'Too many sign-in attempts. Please wait a minute before trying again.' };
      }
      return { success: false, error: msg || 'Sign-in failed. Please try again.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const res = await signUpSupabase(email, password, fullName, role);
      if (res.user) {
        setUser({
          id: res.user.id,
          email: res.user.email || '',
          fullName,
          role,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('asj_active_role', role);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const signOut = async () => {
    await signOutSupabase();
    localStorage.removeItem('asj_active_role');
    setUser(null);
  };

  const getItemBalance = (itemId: string, itemType: 'BOX' | 'RAW_MATERIAL' | 'GIFT_BAG', godownId?: string) => {
    return calculateBalances(movements, itemId, itemType, godownId);
  };

  const addBox = async (boxData: Omit<Box, 'id'>, initialStock?: { godownId: string; qty: number; landedCost: number }) => {
    const dbRes = await insertBoxSupabase(boxData);
    const newId = dbRes?.id || `box-${Date.now()}`;
    const newBox: Box = { ...boxData, id: newId };
    setBoxes((prev) => [...prev, newBox]);

    if (initialStock && initialStock.qty > 0) {
      const mov = createMovement(`open-${Date.now()}`, 'OPENING', 'OPENING_BALANCE', 'BOX', newId, initialStock.godownId, initialStock.qty, 0, 'SALEABLE', user?.fullName || 'User', 'Opening Stock');
      setMovements((prev) => [...prev, mov]);
      insertMovementSupabase(mov);
    }
    // Fix 1: Return the actual new ID so callers can reference the correct item
    return newId;
  };

  const updateBox = async (boxId: string, updates: Partial<Box>, rates?: { landed: number; final: number }) => {
    setBoxes((prev) =>
      prev.map((b) => {
        if (b.id !== boxId) return b;
        return {
          ...b,
          ...updates,
          currentLandedCost: rates ? rates.landed : b.currentLandedCost,
          currentFinalRate: rates ? rates.final : b.currentFinalRate,
        };
      })
    );
    await updateBoxSupabase(boxId, updates, rates);
  };

  const deleteBox = async (boxId: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== boxId));
    await deleteBoxSupabase(boxId);
  };

  const addRawMaterial = async (rmData: Omit<RawMaterial, 'id'>, initialStock?: { godownId: string; qty: number; rate: number }) => {
    const dbRes = await insertRawMaterialSupabase(rmData);
    const newId = dbRes?.id || `rm-${Date.now()}`;
    const newRm: RawMaterial = { ...rmData, id: newId };
    setRawMaterials((prev) => [...prev, newRm]);

    if (initialStock && initialStock.qty > 0) {
      const mov = createMovement(`open-${Date.now()}`, 'OPENING', 'OPENING_BALANCE', 'RAW_MATERIAL', newId, initialStock.godownId, initialStock.qty, 0, 'SALEABLE', user?.fullName || 'User', 'Opening Balance');
      setMovements((prev) => [...prev, mov]);
      insertMovementSupabase(mov);
    }
  };

  const updateRawMaterial = async (rmId: string, updates: Partial<RawMaterial>, rates?: { landed: number; internal: number }) => {
    setRawMaterials((prev) =>
      prev.map((r) => {
        if (r.id !== rmId) return r;
        return {
          ...r,
          ...updates,
          currentLandedPurchaseRate: rates ? rates.landed : r.currentLandedPurchaseRate,
          currentInternalSellingRate: rates ? rates.internal : r.currentInternalSellingRate,
        };
      })
    );
    await updateRawMaterialSupabase(rmId, updates, rates);
  };

  const deleteRawMaterial = async (rmId: string) => {
    setRawMaterials((prev) => prev.filter((r) => r.id !== rmId));
    await deleteRawMaterialSupabase(rmId);
  };

  const addCustomer = async (cData: Omit<Customer, 'id' | 'createdAt'>) => {
    const dbRes = await insertCustomerSupabase(cData);
    const newId = dbRes?.id || `c-${Date.now()}`;
    const newCust: Customer = { ...cData, id: newId, createdAt: new Date().toISOString() };
    setCustomers((prev) => [newCust, ...prev]);
    // Fix 5: Return the new customer ID so callers can auto-select it
    return newId;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await updateCustomerSupabase(id, updates);
  };

  const deleteCustomer = async (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    await deleteCustomerSupabase(id);
  };

  const addSupplier = async (sData: Omit<Supplier, 'id'>) => {
    const dbRes = await insertSupplierSupabase(sData);
    const newId = dbRes?.id || `sup-${Date.now()}`;
    setSuppliers((prev) => [...prev, { ...sData, id: newId }]);
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await updateSupplierSupabase(id, updates);
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    await deleteSupplierSupabase(id);
  };

  const addGodown = async (name: string) => {
    const dbRes = await insertGodownSupabase(name);
    const newId = dbRes?.id || `g-${Date.now()}`;
    setGodowns((prev) => [...prev, { id: newId, name, active: true }]);
  };

  const updateGodown = async (id: string, updates: Partial<Godown>) => {
    setGodowns((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    await updateGodownSupabase(id, updates);
  };

  const deleteGodown = async (id: string) => {
    setGodowns((prev) => prev.filter((g) => g.id !== id));
    await deleteGodownSupabase(id);
  };

  const updateGiftBagRate = async (bagId: string, costRate: number) => {
    setGiftBags((prev) => prev.map((bg) => (bg.id === bagId ? { ...bg, costRate } : bg)));
    await updateGiftBagRateSupabase(bagId, costRate);
  };

  const postDirectSale = (saleData: {
    customerId: string;
    billingDate: string;
    isTaxInclusive: boolean;
    lines: OrderLineInput[];
    packagingRecovery: number;
    reservationId?: string;
  }) => {
    const orderId = `ord-${Date.now()}`;
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    const defaultGodownId = godowns[0]?.id || 'g-1';

    let totalTaxable = 0;
    let totalActualCost = 0;
    let totalCommCost = 0;
    let packagingIncurred = 0;
    const newMovements: StockMovement[] = [];

    const processedLines = saleData.lines.map((line, idx) => {
      const box = boxes.find((b) => b.id === line.boxId);
      const calculated = calculateOrderLineTotals(line, box, rawMaterials, giftBags, saleData.isTaxInclusive, 0);

      totalTaxable += calculated.lineTaxableRevenue;
      totalActualCost += calculated.actualDirectCost;
      totalCommCost += calculated.commercialCost;
      packagingIncurred += calculated.bagCost;

      if (line.saleType !== 'ITEMS_COMBO_NO_BOX' && line.boxId) {
        const mov = createMovement(orderId, 'SALE', 'DIRECT_SALE', 'BOX', line.boxId, defaultGodownId, -line.quantity, 0, 'SALEABLE', user?.fullName || 'User', `Sale #${orderNumber}`);
        newMovements.push(mov);
        insertMovementSupabase(mov);
      }

      if (line.saleType !== 'BOX_ONLY') {
        for (const itm of line.items) {
          const totalRmQty = (itm.actualPackingQty || 0) * line.quantity;
          const mov = createMovement(orderId, 'SALE', 'DIRECT_SALE', 'RAW_MATERIAL', itm.rawMaterialId, defaultGodownId, -totalRmQty, 0, 'SALEABLE', user?.fullName || 'User', `Sale #${orderNumber}`);
          newMovements.push(mov);
          insertMovementSupabase(mov);
        }
      }

      return {
        id: `line-${orderId}-${idx}`,
        orderId,
        saleType: line.saleType,
        boxId: line.boxId,
        appliedBoxLandedCost: box?.currentLandedCost || 0,
        appliedBoxInternalRate: box?.currentFinalRate || 0,
        quantity: line.quantity,
        sellingRatePerUnit: line.sellingRatePerUnit,
        taxableSellingRate: calculated.taxableRate,
        lineTaxableRevenue: calculated.lineTaxableRevenue,
        bagRequired: line.bagRequired,
        bagSize: line.bagSize,
        appliedBagCost: calculated.bagCost,
        items: line.items.map((it, iIdx) => ({
          id: `item-${orderId}-${idx}-${iIdx}`,
          orderLineId: `line-${orderId}-${idx}`,
          rawMaterialId: it.rawMaterialId,
          appliedLandedPurchaseRate: rawMaterials.find((r) => r.id === it.rawMaterialId)?.currentLandedPurchaseRate || 0,
          appliedInternalCostingRate: rawMaterials.find((r) => r.id === it.rawMaterialId)?.currentInternalSellingRate || 0,
          actualPackingQty: it.actualPackingQty,
          unit: it.unit,
          totalRequiredQty: it.actualPackingQty * line.quantity,
        })),
      };
    });

    const costSnapshot = calculateOrderProfitSnapshot(
      totalTaxable + (saleData.packagingRecovery || 0),
      totalActualCost,
      totalCommCost,
      packagingIncurred,
      saleData.packagingRecovery || 0
    );
    costSnapshot.orderId = orderId;

    const newOrder: OrderRecord = {
      id: orderId,
      orderNumber,
      billingDate: saleData.billingDate,
      customerId: saleData.customerId,
      reservationId: saleData.reservationId,
      status: 'POSTED',
      isTaxInclusive: saleData.isTaxInclusive,
      totalTaxableRevenue: totalTaxable,
      totalOutputGst: 0,
      totalOrderRevenue: totalTaxable + (saleData.packagingRecovery || 0),
      packagingRecoveryAmount: saleData.packagingRecovery || 0,
      version: 1,
      createdBy: user?.fullName || 'User',
      createdAt: new Date().toISOString(),
      lines: processedLines,
      costSnapshot,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setMovements((prev) => [...prev, ...newMovements]);
    insertOrderSupabase(newOrder);
    return newOrder;
  };

  const cancelSale = (orderId: string, reason: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord || ord.status === 'CANCELLED') return;

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED', cancelReason: reason } : o)));

    const reversalMovements: StockMovement[] = [];
    for (const line of ord.lines) {
      if (line.boxId) {
        const mov = createMovement(orderId, 'SALE', 'SALE_CANCEL_REVERSAL', 'BOX', line.boxId, godowns[0]?.id || 'g-1', line.quantity, 0, 'SALEABLE', user?.fullName || 'User', `Cancelled: ${reason}`);
        reversalMovements.push(mov);
        insertMovementSupabase(mov);
      }
      for (const itm of line.items) {
        const mov = createMovement(orderId, 'SALE', 'SALE_CANCEL_REVERSAL', 'RAW_MATERIAL', itm.rawMaterialId, godowns[0]?.id || 'g-1', itm.totalRequiredQty, 0, 'SALEABLE', user?.fullName || 'User', `Cancelled: ${reason}`);
        reversalMovements.push(mov);
        insertMovementSupabase(mov);
      }
    }
    setMovements((prev) => [...prev, ...reversalMovements]);
  };

  const postPurchase = (pData: Omit<PurchaseRecord, 'id' | 'purchaseNumber' | 'createdAt' | 'createdBy'>) => {
    const id = `pur-${Date.now()}`;
    const purchaseNumber = `PUR-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`;
    const pRecord: PurchaseRecord = {
      ...pData,
      id,
      purchaseNumber,
      createdBy: user?.fullName || 'User',
      createdAt: new Date().toISOString(),
    };

    setPurchases((prev) => [pRecord, ...prev]);
    insertPurchaseSupabase(pRecord);

    if (pData.acceptedQty > 0) {
      const mov = createMovement(
        id,
        'PURCHASE',
        'PURCHASE_IN',
        pData.itemType,
        pData.itemId,
        pData.destinationGodownId,
        pData.acceptedQty,
        pData.calculatedLandedCost,
        'SALEABLE',
        user?.fullName || 'User',
        `Purchase ${purchaseNumber}`
      );
      setMovements((prev) => [...prev, mov]);
      insertMovementSupabase(mov);
    }

    if (pData.itemType === 'BOX') {
      updateBox(pData.itemId, {}, { landed: pData.calculatedLandedCost, final: pData.calculatedFinalRate });
    } else {
      updateRawMaterial(pData.itemId, {}, { landed: pData.calculatedLandedCost, internal: pData.calculatedLandedCost * 1.15 });
    }

    return pRecord;
  };

  const createReservation = (resData: Omit<ReservationRecord, 'id' | 'reservationNumber' | 'createdAt' | 'createdBy'>) => {
    const id = `res-${Date.now()}`;
    const reservationNumber = `RES-${new Date().getFullYear()}-${String(reservations.length + 1).padStart(3, '0')}`;
    const rRecord: ReservationRecord = {
      ...resData,
      id,
      reservationNumber,
      createdBy: user?.fullName || 'User',
      createdAt: new Date().toISOString(),
    };

    setReservations((prev) => [rRecord, ...prev]);
    insertReservationSupabase(rRecord);

    const reserveMovements: StockMovement[] = [];
    for (const line of resData.lines) {
      if (line.boxId && resData.mode !== 'ITEMS_COMBO_RESERVATION') {
        const mov = createMovement(id, 'RESERVATION', 'RESERVE', 'BOX', line.boxId, godowns[0]?.id || 'g-1', 0, line.quantity, 'SALEABLE', user?.fullName || 'User', `Reserved ${rRecord.reservationNumber}`);
        reserveMovements.push(mov);
        insertMovementSupabase(mov);
      }
    }
    if (reserveMovements.length > 0) {
      setMovements((prev) => [...prev, ...reserveMovements]);
    }

    return rRecord;
  };

  const convertReservationToSale = (reservationId: string, billingDate: string) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res || res.status === 'SOLD' || res.status === 'CANCELLED') return null;

    const order = postDirectSale({
      customerId: res.customerId,
      billingDate: billingDate || res.promisedDeliveryDate || new Date().toISOString().split('T')[0],
      isTaxInclusive: false,
      lines: res.lines,
      packagingRecovery: 0,
      reservationId,
    });

    setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: 'SOLD', orderId: order.id } : r)));
    updateReservationSupabase(reservationId, { status: 'SOLD' });

    const releaseMovements: StockMovement[] = [];
    for (const line of res.lines) {
      if (line.boxId && res.mode !== 'ITEMS_COMBO_RESERVATION') {
        const mov = createMovement(reservationId, 'RESERVATION', 'RESERVATION_SOLD', 'BOX', line.boxId, godowns[0]?.id || 'g-1', 0, -line.quantity, 'SALEABLE', user?.fullName || 'User', `Reservation sold to ${order.orderNumber}`);
        releaseMovements.push(mov);
        insertMovementSupabase(mov);
      }
    }
    if (releaseMovements.length > 0) {
      setMovements((prev) => [...prev, ...releaseMovements]);
    }

    return order;
  };

  const cancelReservation = (reservationId: string) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res || res.status === 'CANCELLED') return;

    setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: 'CANCELLED' } : r)));
    updateReservationSupabase(reservationId, { status: 'CANCELLED' });

    const releaseMovements: StockMovement[] = [];
    for (const line of res.lines) {
      if (line.boxId && res.mode !== 'ITEMS_COMBO_RESERVATION') {
        const mov = createMovement(reservationId, 'RESERVATION', 'RESERVATION_CANCEL', 'BOX', line.boxId, godowns[0]?.id || 'g-1', 0, -line.quantity, 'SALEABLE', user?.fullName || 'User', 'Reservation cancelled');
        releaseMovements.push(mov);
        insertMovementSupabase(mov);
      }
    }
    if (releaseMovements.length > 0) {
      setMovements((prev) => [...prev, ...releaseMovements]);
    }
  };

  const postTransfer = (itemType: 'BOX' | 'RAW_MATERIAL', itemId: string, srcGodown: string, destGodown: string, qty: number) => {
    const docId = `trf-${Date.now()}`;
    const outMov = createMovement(docId, 'TRANSFER', 'TRANSFER_OUT', itemType, itemId, srcGodown, -qty, 0, 'SALEABLE', user?.fullName || 'User', 'Transfer Out');
    const inMov = createMovement(docId, 'TRANSFER', 'TRANSFER_IN', itemType, itemId, destGodown, qty, 0, 'SALEABLE', user?.fullName || 'User', 'Transfer In');
    setMovements((prev) => [...prev, outMov, inMov]);
    insertMovementSupabase(outMov);
    insertMovementSupabase(inMov);
  };

  const postDamage = (itemType: 'BOX' | 'RAW_MATERIAL', itemId: string, godownId: string, qty: number, repairable: boolean, _lossCost: number, remarks: string) => {
    const docId = `dmg-${Date.now()}`;
    if (repairable) {
      const holdMov = createMovement(docId, 'DAMAGE', 'DAMAGE_REPAIRABLE', itemType, itemId, godownId, -qty, 0, 'SALEABLE', user?.fullName || 'User', remarks);
      const repairBucketMov = createMovement(docId, 'DAMAGE', 'DAMAGE_REPAIRABLE', itemType, itemId, godownId, qty, 0, 'REPAIR_HOLD', user?.fullName || 'User', remarks);
      setMovements((prev) => [...prev, holdMov, repairBucketMov]);
      insertMovementSupabase(holdMov);
      insertMovementSupabase(repairBucketMov);
    } else {
      const writeOffMov = createMovement(docId, 'DAMAGE', 'DAMAGE_UNREPAIRABLE', itemType, itemId, godownId, -qty, 0, 'SALEABLE', user?.fullName || 'User', remarks);
      setMovements((prev) => [...prev, writeOffMov]);
      insertMovementSupabase(writeOffMov);
    }
  };

  const repairDamage = (itemType: 'BOX' | 'RAW_MATERIAL', itemId: string, godownId: string, qty: number, remarks: string) => {
    const docId = `rep-${Date.now()}`;
    const outHoldMov = createMovement(docId, 'DAMAGE', 'DAMAGE_REPAIRED', itemType, itemId, godownId, -qty, 0, 'REPAIR_HOLD', user?.fullName || 'User', remarks || 'Repaired & restored');
    const inSaleMov = createMovement(docId, 'DAMAGE', 'DAMAGE_REPAIRED', itemType, itemId, godownId, qty, 0, 'SALEABLE', user?.fullName || 'User', remarks || 'Repaired & restored');
    setMovements((prev) => [...prev, outHoldMov, inSaleMov]);
    insertMovementSupabase(outHoldMov);
    insertMovementSupabase(inSaleMov);
  };

  const createSample = (sampleData: Omit<SampleRecipe, 'id' | 'version' | 'unitsAvailable'>) => {
    const newSample: SampleRecipe = { ...sampleData, id: `smp-${Date.now()}`, version: 1, unitsAvailable: sampleData.unitsMade };
    setSamples((prev) => [newSample, ...prev]);
    insertSampleRecipeSupabase(newSample);
  };

  const deleteSample = async (sampleId: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== sampleId));
    await deleteSampleRecipeSupabase(sampleId);
  };

  const updateSampleUnitsMade = (sampleId: string, unitsMade: number) => {
    setSamples((prev) => prev.map((s) => (s.id === sampleId ? { ...s, unitsMade, unitsAvailable: unitsMade } : s)));
  };

  const transferSampleToSale = (sampleId: string, units: number, customerId: string, sellingRate: number) => {
    const sample = samples.find((s) => s.id === sampleId);
    if (!sample) return null;

    setSamples((prev) => prev.map((s) => (s.id === sampleId ? { ...s, unitsAvailable: Math.max(0, s.unitsAvailable - units) } : s)));

    const line: OrderLineInput = {
      saleType: sample.boxId ? 'BOX_WITH_ITEMS' : 'ITEMS_COMBO_NO_BOX',
      boxId: sample.boxId,
      quantity: units,
      sellingRatePerUnit: sellingRate || sample.manualMrp || 500,
      bagRequired: sample.bagRequired,
      bagSize: sample.bagSize,
      items: sample.items.map((it) => ({
        rawMaterialId: it.rawMaterialId,
        actualPackingQty: it.actualPackingQty,
        unit: it.unit,
      })),
    };

    return postDirectSale({
      customerId,
      billingDate: new Date().toISOString().split('T')[0],
      isTaxInclusive: false,
      lines: [line],
      packagingRecovery: 0,
    });
  };

  const issueSampleFreeOrHome = (sampleId: string, units: number, reason: string) => {
    const sample = samples.find((s) => s.id === sampleId);
    if (!sample) return;

    setSamples((prev) => prev.map((s) => (s.id === sampleId ? { ...s, unitsAvailable: Math.max(0, s.unitsAvailable - units) } : s)));

    const docId = `smp-out-${Date.now()}`;
    const newMovements: StockMovement[] = [];
    if (sample.boxId) {
      const mov = createMovement(docId, 'SAMPLE_EXPENSE', 'SAMPLE_OR_HOME_OUT', 'BOX', sample.boxId, godowns[0]?.id || 'g-1', -units, 0, 'SALEABLE', user?.fullName || 'User', reason);
      newMovements.push(mov);
      insertMovementSupabase(mov);
    }
    for (const it of sample.items) {
      const mov = createMovement(docId, 'SAMPLE_EXPENSE', 'SAMPLE_OR_HOME_OUT', 'RAW_MATERIAL', it.rawMaterialId, godowns[0]?.id || 'g-1', -(it.actualPackingQty * units), 0, 'SALEABLE', user?.fullName || 'User', reason);
      newMovements.push(mov);
      insertMovementSupabase(mov);
    }
    setMovements((prev) => [...prev, ...newMovements]);
  };

  const addOverhead = (ovData: Omit<OverheadEntry, 'id' | 'createdAt'>) => {
    const id = `ov-${Date.now()}`;
    const ov: OverheadEntry = { ...ovData, id, createdAt: new Date().toISOString() };
    setOverheads((prev) => [ov, ...prev]);
    insertOverheadSupabase(ov);
  };

  const deleteOverhead = (id: string) => {
    setOverheads((prev) => prev.filter((o) => o.id !== id));
    deleteOverheadSupabase(id);
  };

  const resetToTestData = () => {
    localStorage.clear();
    setBoxes(initialBoxes);
    setRawMaterials(initialRawMaterials);
    setCustomers(initialCustomers);
    setSuppliers(initialSuppliers);
    setMovements(initialMovements);
    setOrders(initialOrders);
    setSamples(initialSampleRecipes);
    setReservations([]);
    setPurchases([]);
    setOverheads([]);
  };

  return (
    <StoreContext.Provider
      value={{
        user,
        setUserRole,
        signIn,
        signUp,
        signOut,
        isOwner,
        isManager,
        isStaff,
        isViewer,
        canViewFinancials,
        canPostTransactions,
        canManageMasters,
        canEditRates,
        godowns,
        productGroups,
        rawMaterials,
        boxes,
        giftBags,
        customers,
        suppliers,
        movements,
        orders,
        samples,
        reservations,
        purchases,
        overheads,
        loading,
        getItemBalance,
        addBox,
        updateBox,
        deleteBox,
        addRawMaterial,
        updateRawMaterial,
        deleteRawMaterial,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addGodown,
        updateGodown,
        deleteGodown,
        updateGiftBagRate,
        postDirectSale,
        cancelSale,
        postTransfer,
        postDamage,
        repairDamage,
        createSample,
        deleteSample,
        updateSampleUnitsMade,
        transferSampleToSale,
        issueSampleFreeOrHome,
        createReservation,
        convertReservationToSale,
        cancelReservation,
        postPurchase,
        addOverhead,
        deleteOverhead,
        resetToTestData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
