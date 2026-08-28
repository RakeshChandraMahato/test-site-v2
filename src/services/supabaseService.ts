import { supabase } from '@/lib/supabase';
import { Box, Customer, GiftBag, Godown, ProductGroup, RawMaterial, Supplier, PurchaseRecord, OverheadEntry } from '@/types/models';
import { StockMovement } from '@/types/ledger';
import { OrderRecord, ReservationRecord } from '@/types/sales';
import { SampleRecipe } from '@/types/samples';

export async function fetchInitialData() {
  try {
    const [
      { data: godownsData },
      { data: pgData },
      { data: rmData },
      { data: rmRatesData },
      { data: boxesData },
      { data: boxRatesData },
      { data: bagsData },
      { data: bagRatesData },
      { data: customersData },
      { data: suppliersData },
      { data: movementsData },
      { data: ordersData },
      { data: samplesData },
      { data: reservationsData },
      { data: purchasesData },
    ] = await Promise.all([
      supabase.from('godowns').select('*').order('name'),
      supabase.from('product_groups').select('*').order('name'),
      supabase.from('raw_materials').select('*').order('display_name'),
      supabase.from('raw_material_rate_history').select('*').order('effective_from', { ascending: false }),
      supabase.from('boxes').select('*').order('display_order'),
      supabase.from('box_rate_history').select('*').order('effective_from', { ascending: false }),
      supabase.from('gift_bags').select('*').order('size'),
      supabase.from('gift_bag_rate_history').select('*').order('effective_from', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*, lines:order_lines(*, items:order_items(*)), costSnapshot:order_cost_snapshots(*)').order('created_at', { ascending: false }),
      supabase.from('sample_recipes').select('*, items:sample_recipe_items(*)').order('created_at', { ascending: false }),
      supabase.from('reservations').select('*, lines:reservation_lines(*)').order('created_at', { ascending: false }),
      supabase.from('purchases').select('*').order('created_at', { ascending: false }),
    ]);

    // Build latest rates lookup
    const latestBoxRates: Record<string, { landed: number; final: number }> = {};
    if (boxRatesData) {
      for (const r of boxRatesData) {
        if (!latestBoxRates[r.box_id]) {
          latestBoxRates[r.box_id] = {
            landed: Number(r.landed_unit_cost) || 0,
            final: Number(r.final_unit_box_rate) || 0,
          };
        }
      }
    }

    const latestRmRates: Record<string, { landed: number; internal: number }> = {};
    if (rmRatesData) {
      for (const r of rmRatesData) {
        if (!latestRmRates[r.raw_material_id]) {
          latestRmRates[r.raw_material_id] = {
            landed: Number(r.landed_purchase_rate) || 0,
            internal: Number(r.internal_costing_rate) || 0,
          };
        }
      }
    }

    // Fix 3: Build latest gift bag cost rate lookup
    const latestBagRates: Record<string, number> = {};
    if (bagRatesData) {
      for (const r of bagRatesData) {
        if (!latestBagRates[r.gift_bag_id]) {
          latestBagRates[r.gift_bag_id] = Number(r.cost_rate) || 0;
        }
      }
    }

    return {
      godowns: (godownsData || []) as Godown[],
      productGroups: (pgData || []) as ProductGroup[],
      rawMaterials: (rmData || []).map((r: any) => ({
        id: r.id,
        productGroupId: r.product_group_id,
        variant: r.variant,
        displayName: r.display_name,
        unit: r.unit,
        status: r.status,
        currentLandedPurchaseRate: latestRmRates[r.id]?.landed || 0,
        currentInternalSellingRate: latestRmRates[r.id]?.internal || 0,
        presets: [0.100, 0.250, 0.500],
      })) as RawMaterial[],
      boxes: (boxesData || []).map((b: any) => ({
        id: b.id,
        boxCode: b.box_code,
        boxName: b.box_name,
        category: b.category,
        size: b.size,
        imageUrl: b.image_url,
        displayOrder: b.display_order,
        status: b.status,
        currentLandedCost: latestBoxRates[b.id]?.landed || 0,
        currentFinalRate: latestBoxRates[b.id]?.final || 0,
      })) as Box[],
      // Fix 3: Use actual costRate from gift_bag_rate_history
      giftBags: (bagsData || []).map((bg: any) => ({
        id: bg.id,
        size: bg.size,
        isEnabled: bg.is_enabled,
        costRate: latestBagRates[bg.id] || 0,
        trackInventory: bg.track_inventory,
      })) as GiftBag[],
      customers: (customersData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        companyName: c.company_name,
        deliveryAddress: c.delivery_address,
        notes: c.notes,
        createdAt: c.created_at,
      })) as Customer[],
      // Fix 2: Include suppliers
      suppliers: (suppliersData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        taxDetails: s.tax_details,
        paymentTerms: s.payment_terms,
        active: s.active,
      })) as Supplier[],
      movements: (movementsData || []).map((m: any) => ({
        id: m.id,
        documentId: m.document_id,
        documentType: m.document_type,
        movementType: m.movement_type,
        itemType: m.item_type,
        itemId: m.item_id,
        godownId: m.godown_id,
        physicalQtyDelta: Number(m.physical_qty_delta) || 0,
        reservedQtyDelta: Number(m.reserved_qty_delta) || 0,
        conditionBucket: m.condition_bucket,
        remarks: m.remarks,
        createdBy: m.created_by,
        createdAt: m.created_at,
      })) as StockMovement[],
      orders: (ordersData || []) as OrderRecord[],
      samples: (samplesData || []) as SampleRecipe[],
      // Fix 2: Include reservations
      reservations: (reservationsData || []).map((r: any) => ({
        id: r.id,
        reservationNumber: r.reservation_number,
        reservationDate: r.reservation_date,
        customerId: r.customer_id,
        promisedDeliveryDate: r.delivery_date,
        deliveryTime: r.delivery_time,
        pickupDeliveryMode: r.delivery_mode,
        deliveryAddress: r.delivery_address,
        contactPerson: r.contact_person,
        status: r.status,
        mode: r.mode || 'FULL_RESERVATION',
        advanceAmount: Number(r.advance_amount) || 0,
        totalFinalizedRate: Number(r.quoted_total_amount) || 0,
        notes: r.notes,
        createdBy: r.created_by || '',
        createdAt: r.created_at,
        orderId: r.order_id,
        lines: (r.lines || []).map((l: any) => ({
          saleType: l.sale_type,
          boxId: l.box_id,
          quantity: Number(l.quantity) || 0,
          sellingRatePerUnit: Number(l.selling_rate_per_unit) || 0,
          bagRequired: l.bag_required ?? false,
          bagSize: l.bag_size,
          items: [],
        })),
      })),
      // Fix 2: Include purchases
      purchases: (purchasesData || []).map((p: any) => ({
        id: p.id,
        purchaseNumber: p.purchase_number,
        purchaseDate: p.purchase_date,
        supplierId: p.supplier_id,
        invoiceReference: p.invoice_number,
        destinationGodownId: p.destination_godown_id,
        itemType: p.item_type,
        itemId: p.item_id,
        orderedQty: Number(p.ordered_qty) || 0,
        acceptedQty: Number(p.accepted_qty) || 0,
        damagedQty: Number(p.damaged_qty) || 0,
        purchaseUnitRate: Number(p.purchase_unit_rate) || 0,
        gstPct: Number(p.gst_pct) || 0,
        isItcEligible: p.is_itc_eligible ?? true,
        transportTotal: Number(p.transportation_total) || 0,
        otherDirectCosts: Number(p.other_direct_costs) || 0,
        specialExtraProfitPct: Number(p.special_extra_profit_pct) || 0,
        calculatedLandedCost: Number(p.calculated_landed_cost) || 0,
        calculatedFinalRate: Number(p.calculated_final_rate) || 0,
        notes: p.notes,
        createdBy: p.created_by || '',
        createdAt: p.created_at,
      })),
    };
  } catch (err) {
    console.error('Error fetching Supabase data:', err);
    return null;
  }
}

export async function insertBoxSupabase(box: Omit<Box, 'id'>) {
  const { data, error } = await supabase.from('boxes').insert({
    box_code: box.boxCode,
    box_name: box.boxName,
    category: box.category,
    size: box.size,
    image_url: box.imageUrl,
    display_order: box.displayOrder,
    status: box.status,
  }).select().single();

  if (error) console.error('Supabase Box Insert Error:', error.message);
  return data;
}

export async function updateBoxSupabase(
  boxId: string,
  updates: Partial<Box>,
  rates?: { landed: number; final: number }
) {
  const payload: any = {};
  if (updates.boxCode !== undefined) payload.box_code = updates.boxCode;
  if (updates.boxName !== undefined) payload.box_name = updates.boxName;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.size !== undefined) payload.size = updates.size;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;

  if (Object.keys(payload).length > 0) {
    await supabase.from('boxes').update(payload).eq('id', boxId);
  }

  if (rates) {
    await supabase.from('box_rate_history').insert({
      box_id: boxId,
      effective_from: new Date().toISOString().split('T')[0],
      purchase_unit_cost: rates.landed,
      landed_unit_cost: rates.landed,
      final_unit_box_rate: rates.final,
      reason: 'Rate updated via Master Editor',
    });
  }
}

export async function deleteBoxSupabase(id: string) {
  const { error } = await supabase.from('boxes').delete().eq('id', id);
  if (error) console.error('Supabase Box Delete Error:', error.message);
}

export async function insertRawMaterialSupabase(rm: Omit<RawMaterial, 'id'>) {
  const { data, error } = await supabase.from('raw_materials').insert({
    product_group_id: rm.productGroupId,
    variant: rm.variant,
    display_name: rm.displayName,
    unit: rm.unit,
    status: rm.status,
  }).select().single();

  if (error) console.error('Supabase Raw Material Insert Error:', error.message);
  return data;
}

export async function updateRawMaterialSupabase(
  rmId: string,
  updates: Partial<RawMaterial>,
  rates?: { landed: number; internal: number }
) {
  const payload: any = {};
  if (updates.displayName !== undefined) payload.display_name = updates.displayName;
  if (updates.variant !== undefined) payload.variant = updates.variant;
  if (updates.productGroupId !== undefined) payload.product_group_id = updates.productGroupId;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.status !== undefined) payload.status = updates.status;

  if (Object.keys(payload).length > 0) {
    await supabase.from('raw_materials').update(payload).eq('id', rmId);
  }

  if (rates) {
    await supabase.from('raw_material_rate_history').insert({
      raw_material_id: rmId,
      effective_from: new Date().toISOString().split('T')[0],
      landed_purchase_rate: rates.landed,
      internal_costing_rate: rates.internal,
      reason: 'Rate updated via Master Editor',
    });
  }
}

export async function insertCustomerSupabase(c: Omit<Customer, 'id' | 'createdAt'>) {
  const { data, error } = await supabase.from('customers').insert({
    name: c.name,
    phone: c.phone,
    company_name: c.companyName,
    delivery_address: c.deliveryAddress,
    notes: c.notes,
  }).select().single();

  if (error) console.error('Supabase Customer Insert Error:', error.message);
  return data;
}

export async function updateCustomerSupabase(id: string, updates: Partial<Customer>) {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.companyName !== undefined) payload.company_name = updates.companyName;
  if (updates.deliveryAddress !== undefined) payload.delivery_address = updates.deliveryAddress;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  await supabase.from('customers').update(payload).eq('id', id);
}

export async function deleteCustomerSupabase(id: string) {
  await supabase.from('customers').delete().eq('id', id);
}

export async function insertGodownSupabase(name: string) {
  const { data } = await supabase.from('godowns').insert({ name, active: true }).select().single();
  return data;
}

export async function updateGodownSupabase(id: string, updates: Partial<Godown>) {
  await supabase.from('godowns').update(updates).eq('id', id);
}

export async function updateGiftBagRateSupabase(bagId: string, costRate: number) {
  await supabase.from('gift_bag_rate_history').insert({
    gift_bag_id: bagId,
    effective_from: new Date().toISOString().split('T')[0],
    cost_rate: costRate,
  });
}

export async function insertMovementSupabase(mov: StockMovement) {
  const { data, error } = await supabase.from('stock_movements').insert({
    document_id: mov.documentId,
    document_type: mov.documentType,
    movement_type: mov.movementType,
    item_type: mov.itemType,
    item_id: mov.itemId,
    godown_id: mov.godownId,
    physical_qty_delta: mov.physicalQtyDelta,
    reserved_qty_delta: mov.reservedQtyDelta,
    condition_bucket: mov.conditionBucket,
    remarks: mov.remarks || null,
    // created_by intentionally omitted — value is a display name string, not a UUID
  }).select().single();

  if (error) console.error('Supabase Movement Insert Error:', error.message);
  return data;
}

export async function insertOrderSupabase(order: OrderRecord) {
  try {
    const { error: oErr } = await supabase.from('orders').insert({
      id: order.id,
      order_number: order.orderNumber,
      billing_date: order.billingDate,
      customer_id: order.customerId,
      status: order.status,
      is_tax_inclusive: order.isTaxInclusive,
      total_taxable_revenue: order.totalTaxableRevenue,
      total_output_gst: order.totalOutputGst,
      total_order_revenue: order.totalOrderRevenue,
      packaging_recovery_amount: order.packagingRecoveryAmount,
      version: order.version,
      created_by: order.createdBy,
    });

    if (oErr) {
      console.error('Supabase Order Insert Error:', oErr.message);
      return;
    }

    if (order.costSnapshot) {
      await supabase.from('order_cost_snapshots').insert({
        order_id: order.id,
        total_actual_direct_cost: order.costSnapshot.totalActualDirectCost,
        total_commercial_cost: order.costSnapshot.totalCommercialCost,
        actual_gross_profit: order.costSnapshot.actualGrossProfit,
        commercial_gross_profit: order.costSnapshot.commercialGrossProfit,
        actual_gross_margin_pct: order.costSnapshot.actualGrossMarginPct,
        commercial_gross_margin_pct: order.costSnapshot.commercialGrossMarginPct,
        realized_markup_pct: order.costSnapshot.realizedMarkupPct,
        net_packaging_burden: order.costSnapshot.netPackagingBurden,
      });
    }

    // Fix 4: Persist order lines and items
    if (order.lines && order.lines.length > 0) {
      const linesPayload = order.lines.map((l) => ({
        id: l.id,
        order_id: order.id,
        sale_type: l.saleType,
        box_id: l.boxId || null,
        applied_box_landed_cost: l.appliedBoxLandedCost,
        applied_box_internal_rate: l.appliedBoxInternalRate,
        quantity: l.quantity,
        selling_rate_per_unit: l.sellingRatePerUnit,
        taxable_selling_rate: l.taxableSellingRate,
        line_taxable_revenue: l.lineTaxableRevenue,
        bag_required: l.bagRequired,
        bag_size: l.bagSize || null,
        applied_bag_cost: l.appliedBagCost,
      }));

      const { error: lErr } = await supabase.from('order_lines').insert(linesPayload);
      if (lErr) console.error('Supabase Order Lines Insert Error:', lErr.message);

      const allItems = order.lines.flatMap((l) =>
        l.items.map((it) => ({
          id: it.id,
          order_line_id: it.orderLineId,
          raw_material_id: it.rawMaterialId,
          applied_landed_purchase_rate: it.appliedLandedPurchaseRate,
          applied_internal_costing_rate: it.appliedInternalCostingRate,
          actual_packing_qty: it.actualPackingQty,
          unit: it.unit,
          total_required_qty: it.totalRequiredQty,
        }))
      );

      if (allItems.length > 0) {
        const { error: iErr } = await supabase.from('order_items').insert(allItems);
        if (iErr) console.error('Supabase Order Items Insert Error:', iErr.message);
      }
    }
  } catch (err) {
    console.error('Error inserting order to Supabase:', err);
  }
}

export async function deleteRawMaterialSupabase(id: string) {
  const { error } = await supabase.from('raw_materials').delete().eq('id', id);
  if (error) console.error('Supabase Raw Material Delete Error:', error.message);
}

export async function deleteGodownSupabase(id: string) {
  const { error } = await supabase.from('godowns').delete().eq('id', id);
  if (error) console.error('Supabase Godown Delete Error:', error.message);
}

export async function insertSampleRecipeSupabase(sample: SampleRecipe) {
  try {
    const { data: sRow, error: sErr } = await supabase.from('sample_recipes').insert({
      id: sample.id,
      sample_code: sample.sampleCode,
      sample_name: sample.sampleName,
      box_id: sample.boxId || null,
      bag_required: sample.bagRequired,
      bag_size: sample.bagSize || null,
      manual_mrp: sample.manualMrp || null,
      units_made: sample.unitsMade,
      status: sample.status,
      version: sample.version,
    }).select().single();

    if (sErr || !sRow) {
      console.error('Supabase Sample Insert Error:', sErr?.message);
      return;
    }

    if (sample.items && sample.items.length > 0) {
      const itemsPayload = sample.items.map((it) => ({
        sample_recipe_id: sample.id,
        raw_material_id: it.rawMaterialId,
        actual_packing_qty: it.actualPackingQty,
        unit: it.unit,
      }));
      await supabase.from('sample_recipe_items').insert(itemsPayload);
    }
  } catch (err) {
    console.error('Error inserting sample recipe to Supabase:', err);
  }
}

export async function deleteSampleRecipeSupabase(id: string) {
  const { error } = await supabase.from('sample_recipes').delete().eq('id', id);
  if (error) console.error('Supabase Sample Recipe Delete Error:', error.message);
}

export async function signInSupabase(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpSupabase(email: string, password: string, fullName: string, role: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });
  if (error) throw error;

  if (data.user) {
    await supabase.from('user_profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      role: role as any,
      active: true,
    });
  }
  return data;
}

export async function signOutSupabase() {
  await supabase.auth.signOut();
}

export async function fetchUserProfileSupabase(userId: string) {
  try {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function insertSupplierSupabase(s: Omit<Supplier, 'id'>) {
  const { data, error } = await supabase.from('suppliers').insert({
    name: s.name,
    phone: s.phone,
    tax_details: s.taxDetails,
    payment_terms: s.paymentTerms,
    active: s.active,
  }).select().single();
  if (error) console.error('Supabase Supplier Insert Error:', error.message);
  return data;
}

export async function updateSupplierSupabase(id: string, updates: Partial<Supplier>) {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.taxDetails !== undefined) payload.tax_details = updates.taxDetails;
  if (updates.paymentTerms !== undefined) payload.payment_terms = updates.paymentTerms;
  if (updates.active !== undefined) payload.active = updates.active;
  await supabase.from('suppliers').update(payload).eq('id', id);
}

export async function deleteSupplierSupabase(id: string) {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) console.error('Supabase Supplier Delete Error:', error.message);
}

export async function insertPurchaseSupabase(p: PurchaseRecord) {
  try {
    const { data: pRow, error: pErr } = await supabase.from('purchases').insert({
      id: p.id,
      purchase_number: p.purchaseNumber,
      purchase_date: p.purchaseDate,
      supplier_id: p.supplierId,
      invoice_number: p.invoiceReference,
      invoice_ref: p.invoiceReference,
      destination_godown_id: p.destinationGodownId,
      item_type: p.itemType,
      item_id: p.itemId,
      ordered_qty: p.orderedQty,
      accepted_qty: p.acceptedQty,
      damaged_qty: p.damagedQty,
      purchase_unit_rate: p.purchaseUnitRate,
      gst_pct: p.gstPct,
      is_itc_eligible: p.isItcEligible,
      transport_total: p.transportTotal,
      transportation_total: p.transportTotal,
      other_direct_cost: p.otherDirectCosts,
      other_direct_costs: p.otherDirectCosts,
      special_extra_profit_pct: p.specialExtraProfitPct,
      calculated_landed_cost: p.calculatedLandedCost,
      calculated_final_rate: p.calculatedFinalRate,
      notes: p.notes,
      created_by: p.createdBy,
    }).select().single();

    if (pErr) console.error('Supabase Purchase Insert Error:', pErr.message);
    return pRow;
  } catch (err) {
    console.error('Error inserting purchase:', err);
  }
}

export async function insertReservationSupabase(r: ReservationRecord) {
  try {
    const { data: rRow, error: rErr } = await supabase.from('reservations').insert({
      id: r.id,
      reservation_number: r.reservationNumber,
      reservation_date: r.reservationDate,
      customer_id: r.customerId,
      delivery_date: r.promisedDeliveryDate,
      promised_delivery_date: r.promisedDeliveryDate,
      delivery_time: r.deliveryTime,
      delivery_mode: r.pickupDeliveryMode,
      delivery_address: r.deliveryAddress,
      contact_person: r.contactPerson,
      status: r.status,
      mode: r.mode,
      quoted_total_amount: r.totalFinalizedRate,
      advance_amount: r.advanceAmount,
      notes: r.notes,
      created_by: r.createdBy,
    }).select().single();

    if (rErr) console.error('Supabase Reservation Insert Error:', rErr.message);
    return rRow;
  } catch (err) {
    console.error('Error inserting reservation:', err);
  }
}

export async function updateReservationSupabase(id: string, updates: Partial<ReservationRecord>) {
  const payload: any = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.advanceAmount !== undefined) payload.advance_amount = updates.advanceAmount;
  if (updates.totalFinalizedRate !== undefined) payload.quoted_total_amount = updates.totalFinalizedRate;
  if (updates.orderId !== undefined) payload.order_id = updates.orderId;
  await supabase.from('reservations').update(payload).eq('id', id);
}

export async function insertOverheadSupabase(ov: OverheadEntry) {
  try {
    // overhead_entries uses a text 'category' column — category_id (UUID FK) is optional
    await supabase.from('overhead_entries').insert({
      id: ov.id,
      period_month: ov.periodMonth,
      category: ov.category,       // text column added by patch migration
      amount: ov.amount,
      remarks: ov.remarks,
    });
  } catch (err) {
    console.error('Error inserting overhead:', err);
  }
}

export async function deleteOverheadSupabase(id: string) {
  await supabase.from('overhead_entries').delete().eq('id', id);
}
