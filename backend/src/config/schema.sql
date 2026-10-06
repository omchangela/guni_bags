-- Gunny Bags Manager Database Schema
-- Run this file to initialize the database

CREATE DATABASE IF NOT EXISTS guni_bags_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE guni_bags_db;

-- Users / Owners / Managers
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  mobile VARCHAR(15) NOT NULL UNIQUE,
  country_code VARCHAR(5) NOT NULL DEFAULT '+91',
  name VARCHAR(100) NOT NULL,
  business_name VARCHAR(150),
  role ENUM('OWNER', 'MANAGER') NOT NULL DEFAULT 'OWNER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP Sessions
CREATE TABLE IF NOT EXISTS otp_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id VARCHAR(50) NOT NULL UNIQUE,
  mobile VARCHAR(15) NOT NULL,
  country_code VARCHAR(5) NOT NULL DEFAULT '+91',
  otp_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  last_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Employees / Workers
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15),
  rate_per_bag DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  address TEXT,
  notes TEXT,
  created_by VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Daily Work Entries
CREATE TABLE IF NOT EXISTS work_entries (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  bag_count INT NOT NULL,
  rate_per_bag DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (bag_count * rate_per_bag) STORED,
  entry_time TIME,
  notes TEXT,
  created_by VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Payouts / Advances
CREATE TABLE IF NOT EXISTS payouts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  payout_amount DECIMAL(10,2) NOT NULL,
  payment_mode ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE') NOT NULL DEFAULT 'CASH',
  reference_note TEXT,
  pending_before_payout DECIMAL(10,2),
  remaining_amount DECIMAL(10,2),
  created_by VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_work_entries_date ON work_entries(date);
CREATE INDEX idx_work_entries_employee_id ON work_entries(employee_id);
CREATE INDEX idx_payouts_employee_id ON payouts(employee_id);
CREATE INDEX idx_payouts_date ON payouts(date);
CREATE INDEX idx_otp_sessions_mobile ON otp_sessions(mobile);
CREATE INDEX idx_otp_sessions_session_id ON otp_sessions(session_id);

-- Seed default owner user
INSERT IGNORE INTO users (id, mobile, country_code, name, business_name, role)
VALUES ('usr_001', '9876543210', '+91', 'Varun Agravat', 'Agravat Gunny Bags Trading Co.', 'OWNER');

-- Seed sample employees
INSERT IGNORE INTO employees (id, name, mobile, rate_per_bag, is_active, address, notes, created_by)
VALUES
  ('emp_1', 'Ramesh', '9876543210', 5.00, TRUE, 'Main Bazar, Market Yard', 'Experienced worker', 'usr_001'),
  ('emp_2', 'Suresh', '9876543211', 5.00, TRUE, '', '', 'usr_001'),
  ('emp_3', 'Dinesh', '9876543212', 5.50, TRUE, 'APMC Gate 2', 'Stitching expert', 'usr_001');

SELECT 'Database schema initialized successfully!' AS status;
