-- ============================================================================
-- ASJ Unified Business System - Complete Supabase PostgreSQL Schema
-- Authoritative Specification v1.2
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES & ROLES
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff', 'viewer');

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MASTER TABLES
CREATE TABLE IF NOT EXISTS godowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true
);

CREATE TYPE unit_type AS ENUM ('KG', 'PCS');
CREATE TYPE master_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_group_id UUID NOT NULL REFERENCES product_groups(id),
    variant TEXT,
    display_name TEXT NOT NULL,
    unit unit_type NOT NULL,
    available_from DATE,
    inactive_from DATE,
    status master_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quantity_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    preset_value NUMERIC(12, 3) NOT NULL CHECK (preset_value > 0)
);

CREATE TABLE IF NOT EXISTS boxes (
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

CREATE TYPE gift_bag_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

CREATE TABLE IF NOT EXISTS gift_bags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    size gift_bag_size NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    track_inventory BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    delivery_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    tax_details TEXT,
    payment_terms TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EFFECTIVE-DATE RATE HISTORY
CREATE TABLE IF NOT EXISTS box_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    box_id UUID NOT NULL REFERENCES boxes(id),
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
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_material_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    landed_purchase_rate NUMERIC(12, 2) NOT NULL,
    internal_costing_rate NUMERIC(12, 2) NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_bag_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gift_bag_id UUID NOT NULL REFERENCES gift_bags(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    cost_rate NUMERIC(12, 2) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. IMMUTABLE STOCK MOVEMENTS LEDGER
CREATE TYPE item_type_enum AS ENUM ('BOX', 'RAW_MATERIAL', 'GIFT_BAG');
CREATE TYPE movement_type_enum AS ENUM (
    'OPENING_BALANCE', 'PURCHASE_IN', 'TRANSFER_OUT', 'TRANSFER_IN',
    'RESERVE', 'RESERVATION_SOLD', 'RESERVATION_CANCEL', 'DIRECT_SALE',
    'DAMAGE_REPAIRABLE', 'DAMAGE_REPAIRED', 'DAMAGE_UNREPAIRABLE',
    'DAMAGE_REVERSAL', 'SAMPLE_OR_HOME_OUT', 'OTHER_STOCK_OUT',
    'SALE_CANCEL_REVERSAL', 'ADJUSTMENT'
);
CREATE TYPE condition_bucket_enum AS ENUM ('SALEABLE', 'REPAIR_HOLD', 'WRITTEN_OFF');

CREATE TABLE IF NOT EXISTS stock_movements (
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
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Derived view for instantaneous balance calculation
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

-- 6. SALES ORDERS & COST SNAPSHOTS
CREATE TYPE sale_type_enum AS ENUM ('BOX_ONLY', 'BOX_WITH_ITEMS', 'ITEMS_COMBO_NO_BOX');
CREATE TYPE order_status_enum AS ENUM ('POSTED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    billing_date DATE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    reservation_id UUID,
    status order_status_enum NOT NULL DEFAULT 'POSTED',
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    total_taxable_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_output_gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_order_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    packaging_recovery_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    cancel_reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_lines (
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

CREATE TABLE IF NOT EXISTS order_items (
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

CREATE TABLE IF NOT EXISTS order_cost_snapshots (
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

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read for user profiles"
ON user_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow owner and manager read for rate history"
ON box_rate_history FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')
    )
);

CREATE POLICY "Allow owner read for order cost snapshots"
ON order_cost_snapshots FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')
    )
);
