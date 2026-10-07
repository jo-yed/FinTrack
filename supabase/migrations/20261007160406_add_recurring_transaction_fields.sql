/*
# Add recurring transaction support

## Overview
Adds recurring transaction fields to the existing transactions table.
Users can mark a transaction as recurring (monthly, weekly, yearly) and
the app will auto-generate future instances on page load if they're due.

## Changes to existing tables
1. **transactions** — Added 3 new nullable columns:
   - `is_recurring` (boolean, default false) — whether this is a recurring template
   - `recurrence_frequency` (text) — 'weekly', 'monthly', or 'yearly'
   - `recurrence_parent_id` (uuid, FK to transactions.id) — links generated copies back to the original template
   - `next_recurrence_date` (date) — when the next instance should be generated

## Security
- No new tables, RLS already enabled on transactions
- The new columns inherit existing owner-scoped CRUD policies
- recurrence_parent_id uses ON DELETE SET NULL so deleting a template doesn't cascade to its children
*/

-- Add recurring columns to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_frequency text CHECK (recurrence_frequency IN ('weekly', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_recurrence_date date;

-- Index for finding recurring templates that are due
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(is_recurring, next_recurrence_date) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_transactions_recurrence_parent ON transactions(recurrence_parent_id);
