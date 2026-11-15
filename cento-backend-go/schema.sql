-- Esquema contable de partida doble inmutable y motor de rendimientos para Cento
-- Montos estrictamente en centavos de entero (BIGINT) para eliminar errores de coma flotante

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Catálogo de cuentas (Cuentas de clientes y cuentas de tesorería del banco)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number VARCHAR(18) UNIQUE NOT NULL, -- CLABE interbancaria (18 dígitos) o código interno
    user_id UUID,                               -- NULL para cuentas institucionales de tesorería
    account_type VARCHAR(32) NOT NULL,          -- 'liability' (clientes), 'asset' (tesorería), 'expense' (subsidio)
    name VARCHAR(128) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    balance_cents BIGINT NOT NULL DEFAULT 0,    -- Saldo verificado contra la suma del libro mayor
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Registro transaccional / Pólizas (Idempotencia estricta)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folio VARCHAR(32) UNIQUE NOT NULL,
    idempotency_key VARCHAR(64) UNIQUE,         -- Evita transacciones duplicadas por reintentos de red
    transaction_type VARCHAR(32) NOT NULL,      -- 'spei_transfer', 'deposit', 'yield_credit', 'capital_injection'
    description TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'posted', -- 'posted', 'reversed', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Libro mayor inmutable (Asientos de Débito y Crédito equilibrados)
-- REGLA CONTABLE: Para cada transacción, SUM(debit) - SUM(credit) = 0
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Parámetros del motor de rendimiento (8.00% anual)
CREATE TABLE IF NOT EXISTS yield_configs (
    id SERIAL PRIMARY KEY,
    annual_rate_bps INT NOT NULL DEFAULT 800,           -- 800 puntos base = 8.00% anual
    calculation_base_days INT NOT NULL DEFAULT 365,     -- Base anual mexicana (365 días)
    max_remunerable_cents BIGINT DEFAULT NULL,          -- Saldo tope remunerable por usuario (opcional)
    circuit_breaker_active BOOLEAN NOT NULL DEFAULT FALSE, -- Freno de emergencia
    min_treasury_reserve_cents BIGINT NOT NULL DEFAULT 1000000, -- Mínimo $10,000 MXN en reserva
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Registro de auditoría de cortes diarios de rendimiento
CREATE TABLE IF NOT EXISTS yield_audit_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_date DATE UNIQUE NOT NULL,
    total_accounts_processed INT NOT NULL,
    total_cents_distributed BIGINT NOT NULL,
    treasury_reserve_after_cents BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento para transferencias y balance
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_folio ON transactions(folio);
CREATE INDEX IF NOT EXISTS idx_tx_idempotency ON transactions(idempotency_key);
