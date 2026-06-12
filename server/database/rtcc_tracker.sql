-- =====================================================
-- RTCC Panel & Marshaling Box Tracking System
-- PostgreSQL Database Schema (Local / Standalone)
-- Indo Tech Transformers Industries
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. WORK ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  rating_mva NUMERIC,
  inspection_start_date DATE,
  received_date DATE,
  testing_date DATE,
  rtcc_mb_internal_test DATE,
  inspection_completion_date DATE,
  clearance_for_packing_date DATE,
  total_working_days INTEGER,
  pending_points_approved BOOLEAN DEFAULT NULL,
  pending_points_approval_date TIMESTAMPTZ DEFAULT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PENDING POINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  remarks TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. ACTION COMPLAINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS action_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  complaint TEXT NOT NULL,
  action_date DATE,
  target_date DATE,
  responsibility TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. EMAIL LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id),
  type TEXT CHECK (type IN ('reminder', 'followup')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipients TEXT,
  subject TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- =====================================================
-- 6. EMAIL RECIPIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  receives_reminder BOOLEAN DEFAULT true,
  receives_followup BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_work_order_number ON work_orders(work_order_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_received_date ON work_orders(received_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_pending_approved ON work_orders(pending_points_approved);
CREATE INDEX IF NOT EXISTS idx_pending_points_work_order_id ON pending_points(work_order_id);
CREATE INDEX IF NOT EXISTS idx_pending_points_status ON pending_points(status);
CREATE INDEX IF NOT EXISTS idx_action_complaints_work_order_id ON action_complaints(work_order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_work_order_id ON email_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pending_points_updated_at
  BEFORE UPDATE ON pending_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SEED DATA: Default Admin and User
-- =====================================================

-- Default admin user (password: Admin@1234, change after first login)
-- The hash below is bcrypt hash of 'Admin@1234' with 10 rounds
INSERT INTO profiles (id, name, email, role, password_hash, is_active)
VALUES (
  gen_random_uuid(),
  'Administrator',
  'admin@indotech.com',
  'admin',
  '$2b$10$rQnK9tMOBBOJiuTxVGxQIOyDHJQl8gRFSHHPl/JyQQmCGZF7YqnKu',
  true
) ON CONFLICT (email) DO NOTHING;

-- Default user (Shakti Vel) (password: User@1234, change after first login)
INSERT INTO profiles (id, name, email, role, password_hash, is_active)
VALUES (
  gen_random_uuid(),
  'Shakti Vel',
  'sakthivel@indotech.com',
  'user',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p4nunmCUh7mVkNB3e7GK7K',
  true
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SEED DATA: Default Email Recipients
-- =====================================================
INSERT INTO email_recipients (department, contact_name, email, receives_reminder, receives_followup, is_active)
VALUES
  ('Quality', 'Santana', 'quality@indotech.com', true, true, true),
  ('SCM', 'Kipsan', 'kipsan@indotech.com', true, true, true),
  ('SCM', 'Bhavya', 'bhavya@indotech.com', true, true, true),
  ('Testing', 'Testing Department', 'testing@indotech.com', true, false, true),
  ('COO', 'COO', 'coo@indotech.com', true, false, true);
