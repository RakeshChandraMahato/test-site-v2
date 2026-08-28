-- ============================================================================
-- PATCH: Drop all created_by FK constraints that reference auth.users
-- These block user deletion from the Supabase Auth dashboard.
-- The app sends display name strings (not UUIDs) for created_by anyway.
-- ============================================================================

-- stock_movements
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
ALTER TABLE stock_movements ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- box_rate_history
ALTER TABLE box_rate_history DROP CONSTRAINT IF EXISTS box_rate_history_created_by_fkey;
ALTER TABLE box_rate_history ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- raw_material_rate_history
ALTER TABLE raw_material_rate_history DROP CONSTRAINT IF EXISTS raw_material_rate_history_created_by_fkey;
ALTER TABLE raw_material_rate_history ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- gift_bag_rate_history
ALTER TABLE gift_bag_rate_history DROP CONSTRAINT IF EXISTS gift_bag_rate_history_created_by_fkey;
ALTER TABLE gift_bag_rate_history ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
ALTER TABLE orders ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Also fix document_id in stock_movements (UUID -> TEXT for app-generated IDs like "ord-123")
ALTER TABLE stock_movements ALTER COLUMN document_id TYPE TEXT USING document_id::TEXT;

SELECT 'All blocking FK constraints removed. You can now delete auth users.' AS status;
