-- =====================================================
-- RiskLens ALM Platform — V2 Seed Data
-- =====================================================

-- Time buckets (standard ALM maturity buckets)
INSERT INTO time_buckets (label, sort_order, min_days, max_days) VALUES
    ('0-7d',    1,    0,     7),
    ('8-14d',   2,    7,    14),
    ('15-30d',  3,   14,    30),
    ('1-3m',    4,   30,    90),
    ('3-6m',    5,   90,   180),
    ('6-12m',   6,  180,   365),
    ('1-3y',    7,  365,  1095),
    ('3-5y',    8, 1095,  1825),
    ('5y+',     9, 1825,  NULL);

-- Default admin user (password: Admin@123)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('System Admin', 'admin@risklens.com',
     '$2a$10$EqKcp1WFKs7IIJPM8cMg0eRcuaGCkfJMolMPTI9QTqwpRFa3MnAyC', 'ADMIN');

-- Demo risk manager (password: Risk@123)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Risk Manager', 'risk@risklens.com',
     '$2a$10$EqKcp1WFKs7IIJPM8cMg0eRcuaGCkfJMolMPTI9QTqwpRFa3MnAyC', 'RISK_MANAGER');

-- Demo viewer (password: View@123)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Dashboard Viewer', 'viewer@risklens.com',
     '$2a$10$EqKcp1WFKs7IIJPM8cMg0eRcuaGCkfJMolMPTI9QTqwpRFa3MnAyC', 'VIEWER');

-- Demo counterparties
INSERT INTO counterparties (name, type) VALUES
    ('State Bank of India', 'BANK'),
    ('HDFC Ltd', 'CORPORATE'),
    ('Government of India', 'GOVERNMENT'),
    ('Retail Pool A', 'RETAIL'),
    ('ICICI Bank', 'BANK'),
    ('Reliance Industries', 'CORPORATE'),
    ('Municipal Corp Mumbai', 'GOVERNMENT');

-- Demo instruments (mix of assets & liabilities)
INSERT INTO instruments (instrument_type, product_type, counterparty_id, principal_amount, currency, interest_rate, origination_date, maturity_date, cash_flow_frequency, is_floating_rate, created_by) VALUES
    ('ASSET',     'LOAN',           4, 50000000.00,  'INR', 9.5000, '2026-01-15', '2029-01-15', 'MONTHLY',     FALSE, 1),
    ('ASSET',     'BOND',           3, 100000000.00, 'INR', 7.2600, '2025-06-01', '2035-06-01', 'SEMI_ANNUAL', FALSE, 1),
    ('ASSET',     'LOAN',           2, 25000000.00,  'INR', 10.2500,'2026-03-01', '2028-03-01', 'QUARTERLY',   TRUE,  1),
    ('LIABILITY', 'DEPOSIT',        4, 80000000.00,  'INR', 6.5000, '2026-01-01', '2027-01-01', 'QUARTERLY',   FALSE, 1),
    ('LIABILITY', 'BORROWING',      1, 200000000.00, 'INR', 7.0000, '2025-12-01', '2026-12-01', 'SEMI_ANNUAL', FALSE, 1),
    ('LIABILITY', 'DEPOSIT',        4, 30000000.00,  'INR', 5.2500, '2026-06-01', '2026-09-01', 'BULLET',      FALSE, 1),
    ('ASSET',     'TREASURY_BILL',  3, 50000000.00,  'INR', 6.8000, '2026-06-01', '2026-09-01', 'BULLET',      FALSE, 1),
    ('ASSET',     'REVERSE_REPO',   5, 75000000.00,  'INR', 6.5000, '2026-07-01', '2026-07-15', 'BULLET',      FALSE, 1),
    ('ASSET',     'LOAN',           6, 150000000.00, 'INR', 11.0000,'2026-02-01', '2031-02-01', 'MONTHLY',     FALSE, 1),
    ('LIABILITY', 'BOND',           7, 120000000.00, 'INR', 8.2000, '2025-09-01', '2030-09-01', 'ANNUAL',      FALSE, 1),
    ('LIABILITY', 'COMMERCIAL_PAPER',2, 40000000.00, 'INR', 7.5000, '2026-05-01', '2026-08-01', 'BULLET',      FALSE, 1),
    ('ASSET',     'BOND',           3, 75000000.00,  'INR', 7.5400, '2026-04-01', '2033-04-01', 'SEMI_ANNUAL', FALSE, 1);
