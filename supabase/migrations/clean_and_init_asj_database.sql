-- ============================================================================
-- ASJ UNIFIED BUSINESS SYSTEM: 100% COMPLETE WIPE & REINITIALIZATION SCRIPT
-- Project: qtulldwcmblyfiyfqmuw
-- This script completely erases ALL old tables, views, sequences, types, and data 
-- from any previous project in the 'public' schema before creating the new schema.
-- ============================================================================

-- STEP 1: TOTAL WIPE OF OLD PUBLIC SCHEMA (Deletes 100% of previous tables/views/types/data)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- STEP 2: RESTORE SUPABASE DEFAULT ROLE PERMISSIONS
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- STEP 3: ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- STEP 4: CREATE CUSTOM ENUMS
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff', 'viewer');
CREATE TYPE unit_type AS ENUM ('KG', 'PCS');
CREATE TYPE master_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE gift_bag_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE');
CREATE TYPE item_type_enum AS ENUM ('BOX', 'RAW_MATERIAL', 'GIFT_BAG');
CREATE TYPE movement_type_enum AS ENUM (
    'OPENING_BALANCE', 'PURCHASE_IN', 'TRANSFER_OUT', 'TRANSFER_IN',
    'RESERVE', 'RESERVATION_SOLD', 'RESERVATION_CANCEL', 'DIRECT_SALE',
    'DAMAGE_REPAIRABLE', 'DAMAGE_REPAIRED', 'DAMAGE_UNREPAIRABLE',
    'DAMAGE_REVERSAL', 'SAMPLE_OR_HOME_OUT', 'OTHER_STOCK_OUT',
    'SALE_CANCEL_REVERSAL', 'ADJUSTMENT'
);
CREATE TYPE condition_bucket_enum AS ENUM ('SALEABLE', 'REPAIR_HOLD', 'WRITTEN_OFF');
CREATE TYPE sale_type_enum AS ENUM ('BOX_ONLY', 'BOX_WITH_ITEMS', 'ITEMS_COMBO_NO_BOX');
CREATE TYPE order_status_enum AS ENUM ('POSTED', 'CANCELLED');
CREATE TYPE reservation_status_enum AS ENUM (
    'DRAFT', 'CONFIRMED', 'MATERIALS_PENDING', 'READY', 'PARTIALLY_SOLD', 'SOLD', 'CANCELLED', 'EXPIRED'
);

-- STEP 5: CREATE MASTER ENTITY TABLES

-- User Profiles (Linked to Supabase Auth)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically create a user_profile whenever a user is added to auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, role, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff'),
        NEW.phone
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Godowns Master
CREATE TABLE godowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Groups Master
CREATE TABLE product_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Raw Materials Master
CREATE TABLE raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_group_id UUID NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
    variant TEXT,
    display_name TEXT NOT NULL,
    unit unit_type NOT NULL,
    available_from DATE,
    inactive_from DATE,
    status master_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw Material Presets
CREATE TABLE quantity_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    preset_value NUMERIC(12, 3) NOT NULL CHECK (preset_value > 0)
);

-- Box Master
CREATE TABLE boxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    box_code TEXT NOT NULL UNIQUE,
    box_name TEXT,
    category TEXT,
    size TEXT,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    status master_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gift Bags Master
CREATE TABLE gift_bags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    size gift_bag_size NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    track_inventory BOOLEAN NOT NULL DEFAULT false
);

-- Customers Master
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    delivery_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppliers Master
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    tax_details TEXT,
    payment_terms TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Overhead Categories
CREATE TABLE overhead_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE
);

-- Business Settings
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normal_markup_pct NUMERIC(6, 2) NOT NULL DEFAULT 25.0,
    default_tax_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- STEP 6: RATE HISTORY TABLES
CREATE TABLE box_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    box_id UUID NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    purchase_unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    non_recoverable_gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    transport_per_box NUMERIC(12, 2) NOT NULL DEFAULT 0,
    other_direct_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    damage_provision NUMERIC(12, 2) NOT NULL DEFAULT 0,
    landed_unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    special_extra_profit_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    final_unit_box_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE raw_material_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    landed_purchase_rate NUMERIC(12, 2) NOT NULL,
    internal_costing_rate NUMERIC(12, 2) NOT NULL,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gift_bag_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gift_bag_id UUID NOT NULL REFERENCES gift_bags(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    cost_rate NUMERIC(12, 2) NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 7: IMMUTABLE STOCK LEDGER
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    document_type TEXT NOT NULL,
    movement_type movement_type_enum NOT NULL,
    item_type item_type_enum NOT NULL,
    item_id UUID NOT NULL,
    godown_id UUID NOT NULL REFERENCES godowns(id),
    physical_qty_delta NUMERIC(12, 3) NOT NULL DEFAULT 0,
    reserved_qty_delta NUMERIC(12, 3) NOT NULL DEFAULT 0,
    condition_bucket condition_bucket_enum NOT NULL DEFAULT 'SALEABLE',
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Derived Stock Balance View
CREATE OR REPLACE VIEW stock_balance_view AS
SELECT
    item_id,
    item_type,
    godown_id,
    COALESCE(SUM(CASE WHEN condition_bucket = 'SALEABLE' THEN physical_qty_delta ELSE 0 END), 0) AS saleable,
    COALESCE(SUM(CASE WHEN condition_bucket = 'REPAIR_HOLD' THEN physical_qty_delta ELSE 0 END), 0) AS repair_hold,
    COALESCE(SUM(CASE WHEN condition_bucket IN ('SALEABLE', 'REPAIR_HOLD') THEN physical_qty_delta ELSE 0 END), 0) AS total_physical,
    COALESCE(SUM(reserved_qty_delta), 0) AS reserved,
    GREATEST(0, COALESCE(SUM(CASE WHEN condition_bucket = 'SALEABLE' THEN physical_qty_delta ELSE 0 END), 0) - COALESCE(SUM(reserved_qty_delta), 0)) AS available,
    COALESCE(SUM(CASE WHEN condition_bucket = 'WRITTEN_OFF' THEN ABS(physical_qty_delta) ELSE 0 END), 0) AS written_off
FROM stock_movements
GROUP BY item_id, item_type, godown_id;

-- STEP 8: PURCHASES, DAMAGE & TRANSFERS
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number TEXT,
    purchase_date DATE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    invoice_ref TEXT,
    destination_godown_id UUID REFERENCES godowns(id),
    transport_total NUMERIC(12, 2) DEFAULT 0,
    transport_allocation_qty NUMERIC(12, 3) DEFAULT 0,
    other_direct_cost NUMERIC(12, 2) DEFAULT 0,
    damage_provision NUMERIC(12, 2) DEFAULT 0,
    special_extra_profit_pct NUMERIC(6, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    item_type item_type_enum NOT NULL,
    item_id UUID NOT NULL,
    ordered_qty NUMERIC(12, 3) NOT NULL,
    accepted_qty NUMERIC(12, 3) NOT NULL,
    rejected_qty NUMERIC(12, 3) DEFAULT 0,
    unit_rate_before_gst NUMERIC(12, 2) NOT NULL,
    gst_pct NUMERIC(6, 2) DEFAULT 0,
    is_itc_eligible BOOLEAN DEFAULT false,
    landed_rate NUMERIC(12, 2) NOT NULL
);

CREATE TABLE damage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    damage_date DATE NOT NULL,
    item_type item_type_enum NOT NULL,
    item_id UUID NOT NULL,
    godown_id UUID NOT NULL REFERENCES godowns(id),
    quantity NUMERIC(12, 3) NOT NULL,
    repairable BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'HOLD',
    unit_loss_cost NUMERIC(12, 2) DEFAULT 0,
    total_loss_cost NUMERIC(12, 2) DEFAULT 0,
    repair_charge NUMERIC(12, 2) DEFAULT 0,
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_date DATE NOT NULL,
    item_type item_type_enum NOT NULL,
    item_id UUID NOT NULL,
    source_godown_id UUID NOT NULL REFERENCES godowns(id),
    dest_godown_id UUID NOT NULL REFERENCES godowns(id),
    quantity NUMERIC(12, 3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'POSTED',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_out_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    item_type item_type_enum NOT NULL,
    item_id UUID NOT NULL,
    godown_id UUID NOT NULL REFERENCES godowns(id),
    quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 9: RESERVATIONS
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_number TEXT NOT NULL UNIQUE,
    reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    delivery_date DATE,
    promised_delivery_date DATE,
    delivery_time TEXT,
    delivery_mode TEXT,
    delivery_address TEXT,
    contact_person TEXT,
    notes TEXT,
    status reservation_status_enum NOT NULL DEFAULT 'CONFIRMED',
    quoted_total_amount NUMERIC(12, 2) DEFAULT 0,
    advance_amount NUMERIC(12, 2) DEFAULT 0,
    material_due_date_alert DATE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reservation_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    sale_type sale_type_enum NOT NULL,
    box_id UUID REFERENCES boxes(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    quoted_selling_rate NUMERIC(12, 2) NOT NULL,
    bag_required BOOLEAN NOT NULL DEFAULT false,
    bag_size gift_bag_size
);

CREATE TABLE reservation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_line_id UUID NOT NULL REFERENCES reservation_lines(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    actual_packing_qty NUMERIC(12, 3) NOT NULL,
    unit unit_type NOT NULL
);

-- STEP 10: ORDERS & PROFIT SNAPSHOTS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    billing_date DATE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    reservation_id UUID REFERENCES reservations(id),
    status order_status_enum NOT NULL DEFAULT 'POSTED',
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    total_taxable_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_output_gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_order_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    packaging_recovery_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    cancel_reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sale_type sale_type_enum NOT NULL,
    box_id UUID REFERENCES boxes(id),
    box_rate_history_id UUID REFERENCES box_rate_history(id),
    applied_box_landed_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    applied_box_internal_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL CHECK (quantity > 0),
    selling_rate_per_unit NUMERIC(12, 2) NOT NULL,
    taxable_selling_rate NUMERIC(12, 2) NOT NULL,
    line_taxable_revenue NUMERIC(12, 2) NOT NULL,
    bag_required BOOLEAN NOT NULL DEFAULT false,
    bag_size gift_bag_size,
    applied_bag_cost NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_line_id UUID NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    raw_material_rate_history_id UUID REFERENCES raw_material_rate_history(id),
    applied_landed_purchase_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    applied_internal_costing_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    actual_packing_qty NUMERIC(12, 3) NOT NULL,
    unit unit_type NOT NULL,
    total_required_qty NUMERIC(12, 3) NOT NULL
);

CREATE TABLE order_cost_snapshots (
    order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    total_actual_direct_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_commercial_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    actual_gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    commercial_gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    actual_gross_margin_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    commercial_gross_margin_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    realized_markup_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    net_packaging_burden NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- STEP 11: SAMPLES, OVERHEADS & AUDIT
CREATE TABLE sample_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_code TEXT NOT NULL UNIQUE,
    sample_name TEXT NOT NULL,
    box_id UUID REFERENCES boxes(id),
    bag_required BOOLEAN NOT NULL DEFAULT false,
    bag_size gift_bag_size,
    manual_mrp NUMERIC(12, 2),
    units_made INT NOT NULL DEFAULT 0,
    status master_status NOT NULL DEFAULT 'ACTIVE',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sample_recipe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_recipe_id UUID NOT NULL REFERENCES sample_recipes(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    actual_packing_qty NUMERIC(12, 3) NOT NULL,
    unit unit_type NOT NULL
);

CREATE TABLE sample_dispositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_recipe_id UUID NOT NULL REFERENCES sample_recipes(id),
    disposition_type TEXT NOT NULL,
    units INT NOT NULL,
    order_id UUID REFERENCES orders(id),
    stock_out_expense_id UUID REFERENCES stock_out_expenses(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE overhead_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_month DATE NOT NULL,
    category_id UUID NOT NULL REFERENCES overhead_categories(id),
    amount NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    document_id UUID NOT NULL,
    user_id UUID,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posting_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    document_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 12: STORAGE BUCKET CONFIGURATION FOR BOX IMAGES
INSERT INTO storage.buckets (id, name, public)
VALUES ('box-images', 'box-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Box Image View" ON storage.objects;
CREATE POLICY "Public Box Image View" ON storage.objects FOR SELECT USING (bucket_id = 'box-images');

DROP POLICY IF EXISTS "Public Box Image Upload" ON storage.objects;
CREATE POLICY "Public Box Image Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'box-images');

-- STEP 13: SEED CLEAN BASELINE MASTERS ONLY (0 fake orders / 0 placeholder data)
INSERT INTO godowns (name, active) VALUES
('HOME GODOWN ROOM 1', true),
('SHOP', true);

INSERT INTO product_groups (name, active) VALUES
('ALMOND', true),
('CASHEW', true),
('RAISIN', true),
('PISTACHIO', true),
('WALNUT', true);

INSERT INTO gift_bags (size, is_enabled, track_inventory) VALUES
('SMALL', true, false),
('MEDIUM', true, false),
('LARGE', true, false);

INSERT INTO overhead_categories (name) VALUES
('Godown Rent'),
('Staff Salaries'),
('Electricity & Utility'),
('Packaging Material'),
('Software & Telecom');

INSERT INTO business_settings (normal_markup_pct, default_tax_pct) VALUES
(25.0, 0.0);

-- STEP 14: SEED 35 REAL BOXES & 1,004 OPENING STOCK (EXCLUSIVELY FROM box_stock.xlsx)
DO $$
DECLARE
    g_home_id UUID;
    cur_box_id UUID;
BEGIN
    SELECT id INTO g_home_id FROM godowns WHERE name = 'HOME GODOWN ROOM 1' LIMIT 1;

    -- Box BX001
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX001', NULL, '/boxes/BX001.png', 1, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 35 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 35, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX002
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX002', NULL, '/boxes/BX002.png', 2, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 4 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 4, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX003
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX003', NULL, '/boxes/BX003.png', 3, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 12 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 12, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX004
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX004', NULL, '/boxes/BX004.png', 4, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 31 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 31, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX005
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX005', NULL, '/boxes/BX005.png', 5, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 14 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 14, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX006
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX006', NULL, '/boxes/BX006.png', 6, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 83 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 83, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX007
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX007', NULL, '/boxes/BX007.png', 7, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 46 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 46, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX008
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX008', NULL, '/boxes/BX008.png', 8, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 46 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 46, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX009
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX009', NULL, '/boxes/BX009.png', 9, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 2 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 2, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX010
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX010', NULL, '/boxes/BX010.png', 10, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 15 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 15, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX011
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX011', NULL, '/boxes/BX011.png', 11, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 25 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 25, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX012
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX012', NULL, '/boxes/BX012.png', 12, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 7 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 7, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX013
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX013', NULL, '/boxes/BX013.png', 13, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 41 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 41, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX014
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX014', NULL, '/boxes/BX014.png', 14, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 23 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 23, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX015
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX015', NULL, '/boxes/BX015.png', 15, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 20 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 20, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX016
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX016', NULL, '/boxes/BX016.png', 16, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 18 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 18, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX017
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX017', NULL, '/boxes/BX017.png', 17, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 16 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 16, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX018
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX018', NULL, '/boxes/BX018.png', 18, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 14 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 14, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX019
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX019', NULL, '/boxes/BX019.png', 19, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 8 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 8, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX020
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX020', NULL, '/boxes/BX020.png', 20, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 7 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 7, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX021
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX021', NULL, '/boxes/BX021.png', 21, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 11 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 11, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX022
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX022', NULL, '/boxes/BX022.png', 22, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 72 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 72, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX023
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX023', NULL, '/boxes/BX023.png', 23, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 40 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 40, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX024
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX024', NULL, '/boxes/BX024.png', 24, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 96 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 96, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX025
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX025', NULL, '/boxes/BX025.png', 25, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 36 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 36, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX026
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX026', NULL, '/boxes/BX026.png', 26, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 74 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 74, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX027
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX027', NULL, '/boxes/BX027.png', 27, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 70 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 70, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX028
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX028', NULL, '/boxes/BX028.png', 28, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 45 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 45, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX029
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX029', NULL, '/boxes/BX029.png', 29, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 20 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 20, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX030
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX030', NULL, '/boxes/BX030.png', 30, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 13 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 13, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX031
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX031', NULL, '/boxes/BX031.png', 31, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 18 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 18, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX032
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX032', NULL, '/boxes/BX032.png', 32, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 23 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 23, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX033
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX033', NULL, '/boxes/BX033.png', 33, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 5 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 5, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX034
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX034', NULL, '/boxes/BX034.png', 34, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

    IF 2 > 0 THEN
        INSERT INTO stock_movements (document_id, document_type, movement_type, item_type, item_id, godown_id, physical_qty_delta, condition_bucket, remarks)
        VALUES (cur_box_id, 'OPENING', 'OPENING_BALANCE', 'BOX', cur_box_id, g_home_id, 2, 'SALEABLE', 'Opening stock from box_stock.xlsx');
    END IF;

    -- Box BX035
    INSERT INTO boxes (box_code, box_name, image_url, display_order, status)
    VALUES ('BX035', NULL, '/boxes/BX035.png', 35, 'ACTIVE')
    ON CONFLICT (box_code) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO cur_box_id;

END $$;

-- STEP 15: GRANT ACCESS & DISABLE RLS ON ALL PUBLIC TABLES (ENABLES ANON & AUTH ACCESS)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, postgres, service_role;', tbl);
    END LOOP;
END $$;

-- STEP 16: HIGH-PERFORMANCE DATABASE INDEXING
-- 1. Stock Movements Ledger Indexes
CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_movements_godown ON stock_movements(godown_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_bucket ON stock_movements(condition_bucket);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at DESC);

-- 2. Orders & Order Lines Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_billing_date ON orders(billing_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_box ON order_lines(box_id);

-- 3. Reservations Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_number ON reservations(reservation_number);
CREATE INDEX IF NOT EXISTS idx_reservations_delivery_date ON reservations(promised_delivery_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- 4. Master Data Indexes
CREATE INDEX IF NOT EXISTS idx_boxes_code ON boxes(box_code);
CREATE INDEX IF NOT EXISTS idx_boxes_status ON boxes(status);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON raw_materials(display_name);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON raw_materials(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date DESC);

NOTIFY pgrst, 'reload schema';

