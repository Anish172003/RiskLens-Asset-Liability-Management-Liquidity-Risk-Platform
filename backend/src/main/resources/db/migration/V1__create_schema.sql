-- =====================================================
-- RiskLens ALM Platform — V1 Schema
-- =====================================================

-- USERS
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN','RISK_MANAGER','VIEWER')),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- COUNTERPARTIES
CREATE TABLE counterparties (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    type       VARCHAR(20)  NOT NULL CHECK (type IN ('BANK','CORPORATE','RETAIL','GOVERNMENT')),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- TIME BUCKETS (config-driven ALM maturity buckets)
CREATE TABLE time_buckets (
    id          BIGSERIAL    PRIMARY KEY,
    label       VARCHAR(50)  NOT NULL UNIQUE,
    sort_order  INT          NOT NULL UNIQUE,
    min_days    INT          NOT NULL,
    max_days    INT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- INSTRUMENTS (unified Asset/Liability table)
CREATE TABLE instruments (
    id                  BIGSERIAL      PRIMARY KEY,
    instrument_type     VARCHAR(20)    NOT NULL CHECK (instrument_type IN ('ASSET','LIABILITY')),
    product_type        VARCHAR(30)    NOT NULL CHECK (product_type IN (
        'LOAN','DEPOSIT','BOND','BORROWING','TREASURY_BILL','COMMERCIAL_PAPER','REPO','REVERSE_REPO'
    )),
    counterparty_id     BIGINT         NOT NULL REFERENCES counterparties(id),
    principal_amount    NUMERIC(18,2)  NOT NULL CHECK (principal_amount > 0),
    currency            VARCHAR(3)     NOT NULL DEFAULT 'INR',
    interest_rate       NUMERIC(6,4)   NOT NULL CHECK (interest_rate >= 0),
    origination_date    DATE           NOT NULL,
    maturity_date       DATE           NOT NULL,
    cash_flow_frequency VARCHAR(20)    NOT NULL CHECK (cash_flow_frequency IN (
        'MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL','BULLET'
    )),
    is_floating_rate    BOOLEAN        NOT NULL DEFAULT FALSE,
    created_by          BIGINT         REFERENCES users(id),
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_instrument_dates CHECK (maturity_date > origination_date)
);

CREATE INDEX idx_instruments_type ON instruments(instrument_type);
CREATE INDEX idx_instruments_counterparty ON instruments(counterparty_id);
CREATE INDEX idx_instruments_maturity ON instruments(maturity_date);

-- CASH FLOWS
CREATE TABLE cash_flows (
    id               BIGSERIAL      PRIMARY KEY,
    instrument_id    BIGINT         NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    due_date         DATE           NOT NULL,
    principal_amount NUMERIC(18,2)  NOT NULL DEFAULT 0,
    interest_amount  NUMERIC(18,2)  NOT NULL DEFAULT 0,
    bucket_id        BIGINT         REFERENCES time_buckets(id),
    status           VARCHAR(15)    NOT NULL DEFAULT 'PROJECTED' CHECK (status IN ('PROJECTED','REALIZED')),
    created_at       TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cf_instrument ON cash_flows(instrument_id);
CREATE INDEX idx_cf_due_date ON cash_flows(due_date);
CREATE INDEX idx_cf_bucket ON cash_flows(bucket_id);
CREATE INDEX idx_cf_status ON cash_flows(status);

-- LIQUIDITY GAP REPORTS
CREATE TABLE liquidity_gap_reports (
    id                BIGSERIAL      PRIMARY KEY,
    report_date       DATE           NOT NULL,
    bucket_id         BIGINT         NOT NULL REFERENCES time_buckets(id),
    total_assets      NUMERIC(18,2)  NOT NULL DEFAULT 0,
    total_liabilities NUMERIC(18,2)  NOT NULL DEFAULT 0,
    gap               NUMERIC(18,2)  NOT NULL DEFAULT 0,
    cumulative_gap    NUMERIC(18,2)  NOT NULL DEFAULT 0,
    gap_ratio         NUMERIC(10,6),
    created_at        TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lgr_date ON liquidity_gap_reports(report_date);
CREATE UNIQUE INDEX idx_lgr_date_bucket ON liquidity_gap_reports(report_date, bucket_id);

-- AUDIT LOG
CREATE TABLE audit_logs (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       REFERENCES users(id),
    action      VARCHAR(30)  NOT NULL,
    entity_type VARCHAR(50)  NOT NULL,
    entity_id   BIGINT,
    details     TEXT,
    timestamp   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
