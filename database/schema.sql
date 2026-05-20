-- ============================================================
-- BUDGET EXPENSES DASHBOARD - DATABASE SCHEMA
-- Compatible with PostgreSQL / Neon Tech
-- ============================================================

-- 1. BRANCH TABLE
CREATE TABLE branch (
    branch_code VARCHAR(20) PRIMARY KEY,
    branch_name VARCHAR(200) NOT NULL,
    area VARCHAR(100),
    region VARCHAR(100),
    division VARCHAR(100),
    operation VARCHAR(100)
);

-- 2. ACTUAL TABLE
CREATE TABLE actual (
    id SERIAL PRIMARY KEY,
    branch_code VARCHAR(20) NOT NULL REFERENCES branch(branch_code),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    actual DECIMAL(15,2) NOT NULL DEFAULT 0,
    account_title VARCHAR(200),
    account_code VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BUDGET TABLE
CREATE TABLE budget (
    id SERIAL PRIMARY KEY,
    branch_code VARCHAR(20) NOT NULL REFERENCES branch(branch_code),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    budget DECIMAL(15,2) NOT NULL DEFAULT 0,
    transfer_from_cfoo DECIMAL(15,2) DEFAULT 0,
    sbar DECIMAL(15,2) DEFAULT 0,
    account_title VARCHAR(200),
    account_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (branch_code, month, account_title)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_actual_branch_month ON actual(branch_code, month);
CREATE INDEX idx_actual_status ON actual(status);
CREATE INDEX idx_budget_branch_month ON budget(branch_code, month);
CREATE INDEX idx_branch_region ON branch(region);
CREATE INDEX idx_branch_division ON branch(division);
CREATE INDEX idx_branch_area ON branch(area);
CREATE INDEX idx_branch_operation ON branch(operation);

-- ============================================================
-- VIEW: Combined transaction view (JOIN of all tables)
-- ============================================================
CREATE OR REPLACE VIEW v_transactions AS
SELECT
    CONCAT('BE-', LPAD(ROW_NUMBER() OVER (ORDER BY a.date DESC)::TEXT, 5, '0')) AS id,
    b.branch_code,
    b.branch_name,
    b.area,
    b.region,
    b.division,
    b.operation,
    a.account_title,
    a.account_code,
    a.month,
    TO_CHAR(TO_DATE(a.month::TEXT, 'MM'), 'Month') AS month_name,
    a.actual,
    bg.budget,
    bg.transfer_from_cfoo,
    bg.sbar,
    COALESCE(bg.budget, 0) - COALESCE(a.actual, 0) AS variance,
    a.status,
    a.date,
    a.description
FROM branch b
LEFT JOIN actual a ON b.branch_code = a.branch_code
LEFT JOIN budget bg ON b.branch_code = bg.branch_code AND a.month = bg.month AND a.account_title = bg.account_title
WHERE a.id IS NOT NULL
ORDER BY a.date DESC;

-- ============================================================
-- SAMPLE DATA (for testing)
-- ============================================================

-- Insert branches
INSERT INTO branch (branch_code, branch_name, area, region, division, operation) VALUES
('BR-001', 'Branch A - Makati Main', 'Area 1 - North', 'NCR', 'Metro Manila', 'Operations'),
('BR-002', 'Branch B - Quezon City', 'Area 1 - North', 'NCR', 'Metro Manila', 'Sales'),
('BR-003', 'Branch C - Cebu City', 'Area 2 - South', 'Region VII', 'Visayas Operations', 'Operations'),
('BR-004', 'Branch D - Davao City', 'Area 3 - East', 'Region XI', 'Mindanao Operations', 'Operations'),
('BR-005', 'Branch E - Manila', 'Area 2 - South', 'NCR', 'Metro Manila', 'Administration');

-- Insert actual expenses (sample)
INSERT INTO actual (branch_code, month, actual, account_title, account_code, status, date, description) VALUES
('BR-001', 1, 150000.00, 'Salaries and Wages', 'ACC-001', 'approved', '2026-01-15', 'Salaries and Wages - January 2026 - Branch A - Makati Main'),
('BR-001', 1, 25000.00, 'Office Supplies', 'ACC-002', 'approved', '2026-01-10', 'Office Supplies - January 2026 - Branch A - Makati Main'),
('BR-002', 1, 120000.00, 'Salaries and Wages', 'ACC-001', 'pending', '2026-01-15', 'Salaries and Wages - January 2026 - Branch B - Quezon City'),
('BR-003', 2, 80000.00, 'Utilities', 'ACC-004', 'approved', '2026-02-05', 'Utilities - February 2026 - Branch C - Cebu City'),
('BR-004', 2, 45000.00, 'Travel and Transportation', 'ACC-003', 'rejected', '2026-02-20', 'Travel and Transportation - February 2026 - Branch D - Davao City');

-- Insert budget allocations (sample)
INSERT INTO budget (branch_code, month, budget, transfer_from_cfoo, sbar, account_title, account_code) VALUES
('BR-001', 1, 160000.00, 5000.00, 3000.00, 'Salaries and Wages', 'ACC-001'),
('BR-001', 1, 30000.00, 2000.00, 1000.00, 'Office Supplies', 'ACC-002'),
('BR-002', 1, 130000.00, 3000.00, 2000.00, 'Salaries and Wages', 'ACC-001'),
('BR-003', 2, 90000.00, 2500.00, 1500.00, 'Utilities', 'ACC-004'),
('BR-004', 2, 50000.00, 1000.00, 500.00, 'Travel and Transportation', 'ACC-003');

-- ============================================================
-- QUERY EXAMPLE: Get dashboard data with filters
-- ============================================================
/*
SELECT * FROM v_transactions
WHERE (region = 'NCR' OR 'All Regions' = 'NCR')
  AND (month = 1 OR 0 = 1)
  AND (branch_name = 'Branch A - Makati Main' OR 'All Branches' = 'Branch A - Makati Main')
ORDER BY date DESC
LIMIT 50;
*/