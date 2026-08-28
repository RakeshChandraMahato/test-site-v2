-- ============================================================================
-- ASJ UNIFIED BUSINESS SYSTEM: PATCH MIGRATION
-- Run this in Supabase SQL Editor to fix sign-in & stock movement errors.
-- ============================================================================

-- PATCH 1: Fix document_id column type from UUID to TEXT in stock_movements
-- The app generates string IDs like "ord-123", "trf-456" which are NOT valid UUIDs.
ALTER TABLE stock_movements ALTER COLUMN document_id TYPE TEXT USING document_id::TEXT;

-- PATCH 2: Fix created_by column — app sends display names, not auth UUIDs.
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
ALTER TABLE stock_movements ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Also fix created_by in orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
ALTER TABLE orders ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- PATCH 3: Add missing RLS policies for user_profiles
DROP POLICY IF EXISTS "Allow authenticated insert for own profile" ON user_profiles;
CREATE POLICY "Allow authenticated insert for own profile"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated update for own profile" ON user_profiles;
CREATE POLICY "Allow authenticated update for own profile"
ON user_profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated read for user profiles" ON user_profiles;
CREATE POLICY "Allow authenticated read for user profiles"
ON user_profiles FOR SELECT TO authenticated USING (true);

-- PATCH 4: Add missing columns to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_number TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS item_type TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS item_id UUID;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ordered_qty NUMERIC(12,3) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(12,3) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS damaged_qty NUMERIC(12,3) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_unit_rate NUMERIC(12,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS gst_pct NUMERIC(6,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS is_itc_eligible BOOLEAN DEFAULT true;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS calculated_landed_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS calculated_final_rate NUMERIC(12,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- PATCH 5: Add missing columns to reservations table
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_number TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'FULL_RESERVATION';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Done
