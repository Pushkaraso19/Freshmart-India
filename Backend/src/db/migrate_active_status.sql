-- Add is_active column to products table for soft delete functionality
-- This allows hiding products from customers while preserving order history

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN products.is_active IS 'Soft delete flag: false = archived/inactive, true = active and visible to customers';

-- Create index for performance on active product queries
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Update any existing products to be active by default
UPDATE products SET is_active = true WHERE is_active IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE products ALTER COLUMN is_active SET NOT NULL;
