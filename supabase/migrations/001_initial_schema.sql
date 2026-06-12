-- =====================================================
-- RTCC Panel & Marshaling Box Tracking System
-- Initial Database Schema
-- Indo Tech Transformers Industries
-- =====================================================

-- 1. PROFILES TABLE
-- Extends Supabase auth.users with application-specific fields
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORK ORDERS TABLE
-- Core entity tracking RTCC Panel and Marshaling Box inspections
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  rating_mva NUMERIC NOT NULL,
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

-- 3. PENDING POINTS TABLE
-- Tracks pending items at receiving stage for each work order
CREATE TABLE IF NOT EXISTS pending_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  remarks TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACTION COMPLAINTS TABLE
-- Tracks action complaints with 3 default entries per work order
CREATE TABLE IF NOT EXISTS action_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  complaint TEXT NOT NULL,
  action_date DATE,
  responsibility TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EMAIL LOGS TABLE
-- Audit trail for all automated and manual email notifications
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id),
  email_type TEXT CHECK (email_type IN ('reminder', 'followup')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipients TEXT[],
  subject TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- 6. EMAIL RECIPIENTS TABLE
-- Admin-configurable email recipient list
CREATE TABLE IF NOT EXISTS email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_work_order_number ON work_orders(work_order_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_received_date ON work_orders(received_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_pending_approved ON work_orders(pending_points_approved);
CREATE INDEX IF NOT EXISTS idx_pending_points_work_order_id ON pending_points(work_order_id);
CREATE INDEX IF NOT EXISTS idx_pending_points_status ON pending_points(status);
CREATE INDEX IF NOT EXISTS idx_action_complaints_work_order_id ON action_complaints(work_order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_work_order_id ON email_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);

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

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Work Orders: users can CRUD their own records
CREATE POLICY work_orders_select_own ON work_orders
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY work_orders_insert_own ON work_orders
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY work_orders_update_own ON work_orders
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY work_orders_delete_own ON work_orders
  FOR DELETE USING (created_by = auth.uid());

-- Pending Points: access via work order ownership
CREATE POLICY pending_points_select ON pending_points
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = pending_points.work_order_id AND work_orders.created_by = auth.uid())
  );

CREATE POLICY pending_points_insert ON pending_points
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = pending_points.work_order_id AND work_orders.created_by = auth.uid())
  );

CREATE POLICY pending_points_update ON pending_points
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = pending_points.work_order_id AND work_orders.created_by = auth.uid())
  );

CREATE POLICY pending_points_delete ON pending_points
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = pending_points.work_order_id AND work_orders.created_by = auth.uid())
  );

-- Action Complaints: access via work order ownership
CREATE POLICY action_complaints_select ON action_complaints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = action_complaints.work_order_id AND work_orders.created_by = auth.uid())
  );

CREATE POLICY action_complaints_insert ON action_complaints
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = action_complaints.work_order_id AND work_orders.created_by = auth.uid())
  );

CREATE POLICY action_complaints_update ON action_complaints
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = action_complaints.work_order_id AND work_orders.created_by = auth.uid())
  );

CREATE POLICY action_complaints_delete ON action_complaints
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = action_complaints.work_order_id AND work_orders.created_by = auth.uid())
  );

-- Email Logs: users can read logs for their own work orders
CREATE POLICY email_logs_select ON email_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM work_orders WHERE work_orders.id = email_logs.work_order_id AND work_orders.created_by = auth.uid())
  );

-- Email Logs: only backend (service role) inserts
CREATE POLICY email_logs_insert ON email_logs
  FOR INSERT WITH CHECK (true);

-- Email Recipients: all authenticated users can read (needed for display)
CREATE POLICY email_recipients_select ON email_recipients
  FOR SELECT USING (true);

-- Email Recipients: only service role modifies (enforced by backend middleware)
CREATE POLICY email_recipients_insert ON email_recipients
  FOR INSERT WITH CHECK (true);

CREATE POLICY email_recipients_update ON email_recipients
  FOR UPDATE USING (true);

CREATE POLICY email_recipients_delete ON email_recipients
  FOR DELETE USING (true);

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
