package model

import (
	"time"
)

type AccountType string

const (
	AccountTypeLiability AccountType = "liability" // Clientes (Pasivo del banco)
	AccountTypeAsset     AccountType = "asset"     // Banco concentrador / Tesorería líquida (Activo)
	AccountTypeExpense   AccountType = "expense"   // Subsidio de rendimiento (Gasto)
	AccountTypeEquity    AccountType = "equity"    // Capital de socios (Patrimonio)
)

type Account struct {
	ID            string      `json:"id"`
	AccountNumber string      `json:"account_number"`
	UserID        *string     `json:"user_id,omitempty"`
	AccountType   AccountType `json:"account_type"`
	Name          string      `json:"name"`
	Currency      string      `json:"currency"`
	BalanceCents  int64       `json:"balance_cents"`
	BalanceMXN    float64     `json:"balance_mxn"`
	IsActive      bool        `json:"is_active"`
	CreatedAt     time.Time   `json:"created_at"`
}

type Transaction struct {
	ID              string    `json:"id"`
	Folio           string    `json:"folio"`
	IdempotencyKey  string    `json:"idempotency_key,omitempty"`
	TransactionType string    `json:"transaction_type"`
	Description     string    `json:"description"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

type LedgerEntry struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	AccountID     string    `json:"account_id"`
	EntryType     string    `json:"entry_type"` // 'debit' | 'credit'
	AmountCents   int64     `json:"amount_cents"`
	CreatedAt     time.Time `json:"created_at"`
}

type YieldConfig struct {
	ID                     int       `json:"id"`
	AnnualRateBps          int       `json:"annual_rate_bps"`          // 800 = 8.00%
	AnnualRatePercent      float64   `json:"annual_rate_percent"`      // 8.00
	CalculationBaseDays    int       `json:"calculation_base_days"`    // 365
	CircuitBreakerActive   bool      `json:"circuit_breaker_active"`
	MinTreasuryReserveCents int64    `json:"min_treasury_reserve_cents"`
	UpdatedAt              time.Time `json:"updated_at"`
}

type TreasuryStatus struct {
	TotalCustodyCents      int64   `json:"total_custody_cents"`
	TotalCustodyMXN        float64 `json:"total_custody_mxn"`
	TreasuryReserveCents   int64   `json:"treasury_reserve_cents"`
	TreasuryReserveMXN     float64 `json:"treasury_reserve_mxn"`
	DailyBurnCents         int64   `json:"daily_burn_cents"`
	DailyBurnMXN           float64 `json:"daily_burn_mxn"`
	RunwayDays             int     `json:"runway_days"`
	AnnualRatePercent      float64 `json:"annual_rate_percent"`
	CircuitBreakerActive   bool    `json:"circuit_breaker_active"`
}
