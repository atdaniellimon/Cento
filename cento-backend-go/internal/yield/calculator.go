package yield

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/cento/backend/internal/model"
)

type Engine struct {
	db *sql.DB
}

func NewEngine(db *sql.DB) *Engine {
	return &Engine{db: db}
}

// CalculateDailyYieldCents calcula el rendimiento diario en centavos
// Fórmula estándar de la banca mexicana (Banxico): (Saldo * TasaAnual) / (100 * 365)
// Para 8.00% anual (800 bps) sobre base de 365 días
func CalculateDailyYieldCents(balanceCents int64, annualRateBps int, baseDays int) int64 {
	if balanceCents <= 0 || annualRateBps <= 0 || baseDays <= 0 {
		return 0
	}
	// Multiplicación en 64 bits con redondeo financiero
	num := float64(balanceCents) * float64(annualRateBps)
	den := float64(10000 * baseDays) // 100 * 100 bps * 365
	yieldExact := num / den
	return int64(math.Round(yieldExact))
}

// ExecuteDailyYieldRun ejecuta el corte diario de intereses (por defecto a las 06:00 hrs)
// Carga a la cuenta de reserva de tesorería y acredita a cada cliente activo
func (e *Engine) ExecuteDailyYieldRun(ctx context.Context, forDate time.Time) (int, int64, error) {
	tx, err := e.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return 0, 0, fmt.Errorf("iniciar corte de intereses: %w", err)
	}
	defer tx.Rollback()

	// 1. Obtener parámetros de rendimiento (8.00% anual por defecto)
	var cfg model.YieldConfig
	err = tx.QueryRowContext(ctx, `
		SELECT annual_rate_bps, calculation_base_days, circuit_breaker_active, min_treasury_reserve_cents
		FROM yield_configs ORDER BY id DESC LIMIT 1
	`).Scan(&cfg.AnnualRateBps, &cfg.CalculationBaseDays, &cfg.CircuitBreakerActive, &cfg.MinTreasuryReserveCents)
	if err != nil {
		return 0, 0, fmt.Errorf("leer configuracion de tasas: %w", err)
	}

	if cfg.CircuitBreakerActive {
		return 0, 0, errors.New("corte cancelado: el freno de seguridad de tesorería se encuentra activo")
	}

	// 2. Localizar cuenta de tesorería de reserva (Gasto de marketing / Subsidio)
	var treasuryExpenseAccID string
	var currentReserveCents int64
	err = tx.QueryRowContext(ctx, `
		SELECT id, balance_cents FROM accounts WHERE account_type = 'expense' LIMIT 1 FOR UPDATE
	`).Scan(&treasuryExpenseAccID, &currentReserveCents)
	if err != nil {
		return 0, 0, fmt.Errorf("cuenta de subsidio de tesoreria no configurada: %w", err)
	}

	if currentReserveCents < cfg.MinTreasuryReserveCents {
		return 0, 0, fmt.Errorf("corte suspendido: la reserva de tesorería ($%.2f MXN) está por debajo del umbral mínimo ($%.2f MXN)",
			float64(currentReserveCents)/100.0, float64(cfg.MinTreasuryReserveCents)/100.0)
	}

	// 3. Consultar cuentas de clientes activas con saldo a la vista positivo
	rows, err := tx.QueryContext(ctx, `
		SELECT id, balance_cents FROM accounts 
		WHERE account_type = 'liability' AND is_active = TRUE AND balance_cents > 0
		FOR UPDATE
	`)
	if err != nil {
		return 0, 0, fmt.Errorf("consultar cuentas de clientes: %w", err)
	}
	defer rows.Close()

	type accountYield struct {
		id     string
		amount int64
	}
	var disbursements []accountYield
	var totalDistributedCents int64

	for rows.Next() {
		var accID string
		var balance int64
		if err := rows.Scan(&accID, &balance); err != nil {
			return 0, 0, err
		}

		yieldCents := CalculateDailyYieldCents(balance, cfg.AnnualRateBps, cfg.CalculationBaseDays)
		if yieldCents > 0 {
			disbursements = append(disbursements, accountYield{id: accID, amount: yieldCents})
			totalDistributedCents += yieldCents
		}
	}
	rows.Close()

	if totalDistributedCents > currentReserveCents {
		return 0, 0, errors.New("corte suspendido: el rendimiento total a pagar excede el fondo de tesorería disponible")
	}

	// 4. Crear transacción global de corte diario
	txID := uuid.New().String()
	dateStr := forDate.Format("2006-01-02")
	folio := fmt.Sprintf("YIELD-%s", dateStr)

	_, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, folio, transaction_type, description, status, created_at)
		VALUES ($1, $2, 'yield_distribution', $3, 'posted', NOW())
	`, txID, folio, fmt.Sprintf("Acreditación diaria de rendimiento al 8.00%% anual (%s)", dateStr))
	if err != nil {
		return 0, 0, fmt.Errorf("crear poliza de corte: %w", err)
	}

	// 5. Aplicar asientos contables individuales (Partida Doble)
	for _, d := range disbursements {
		// Cargo al fondo de tesorería
		if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2", d.amount, treasuryExpenseAccID); err != nil {
			return 0, 0, err
		}
		// Abono a la cuenta del cliente
		if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2", d.amount, d.id); err != nil {
			return 0, 0, err
		}

		// Asientos en Libro Mayor
		_, _ = tx.ExecContext(ctx, `
			INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount_cents, created_at)
			VALUES ($1, $2, $3, 'debit', $4, NOW())
		`, uuid.New().String(), txID, treasuryExpenseAccID, d.amount)

		_, _ = tx.ExecContext(ctx, `
			INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount_cents, created_at)
			VALUES ($1, $2, $3, 'credit', $4, NOW())
		`, uuid.New().String(), txID, d.id, d.amount)
	}

	// 6. Registro de auditoría
	_, err = tx.ExecContext(ctx, `
		INSERT INTO yield_audit_runs (id, run_date, total_accounts_processed, total_cents_distributed, treasury_reserve_after_cents, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
	`, uuid.New().String(), dateStr, len(disbursements), totalDistributedCents, currentReserveCents-totalDistributedCents)
	if err != nil {
		return 0, 0, fmt.Errorf("guardar auditoria de corte: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, fmt.Errorf("commit corte de intereses: %w", err)
	}

	return len(disbursements), totalDistributedCents, nil
}
