-- Migration to support online payments with Razorpay
-- Run this file to update the database schema

-- Update payment_method enum to include 'online'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method IN ('card','upi','cod','online'));

-- Update transactions method enum to include 'online'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_method_check 
  CHECK (method IN ('card','upi','cod','online'));

-- Add index on tracking_number for faster lookups (stores Razorpay order ID)
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);

-- Add index on transactions reference for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);

-- Add razorpay_payment_id column to orders for storing payment ID separately (optional)
-- This is optional as we store it in transactions.reference
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

COMMENT ON COLUMN orders.tracking_number IS 'Stores Razorpay order ID for online payments';
COMMENT ON COLUMN transactions.reference IS 'Stores Razorpay payment ID or refund ID';
