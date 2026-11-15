package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/cento/backend/internal/model"
)

var (
	ErrInsufficientFunds   = errors.New("fondos insuficientes en la cuenta origen")
	ErrAccountNotFound     = errors.New("cuenta bancaria no encontrada")
	ErrInvalidAmount       = errors.New("el importe debe ser mayor a cero")
	ErrIdempotencyConflict = errors.New("transacción duplicada detectada")
)

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

// Transfer realiza una transferencia en partida doble atómica (ACID)
// Aplica bloqueos 'SELECT ... FOR UPDATE' en orden lexicográfico de IDs para prevenir deadlocks
func (s *Service) Transfer(ctx context.Context, fromAccID, toAccID string, amountCents int64, description, idempotencyKey string) (*model.Transaction, error) {
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if fromAccID == toAccID {
		return nil, errors.New("la cuenta origen y destino no pueden ser iguales")
	}

	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, fmt.Errorf("iniciar transaccion bd: %w", err)
	}
	defer tx.Rollback()

	// 1. Verificación de idempotencia
	if idempotencyKey != "" {
		var existingFolio string
		err := tx.QueryRowContext(ctx, "SELECT folio FROM transactions WHERE idempotency_key = $1", idempotencyKey).Scan(&existingFolio)
		if err == nil {
			return nil, fmt.Errorf("%w: folio %s", ErrIdempotencyConflict, existingFolio)
		}
	}

	// 2. Ordenamiento de IDs para bloqueo pesimista (previene deadlocks en transacciones concurrentes)
	firstID, secondID := fromAccID, toAccID
	if firstID > secondID {
		firstID, secondID = secondID, firstID
	}

	var bal1, bal2 int64
	var act1, act2 bool
	if err := tx.QueryRowContext(ctx, "SELECT balance_cents, is_active FROM accounts WHERE id = $1 FOR UPDATE", firstID).Scan(&bal1, &act1); err != nil {
		return nil, ErrAccountNotFound
	}
	if err := tx.QueryRowContext(ctx, "SELECT balance_cents, is_active FROM accounts WHERE id = $1 FOR UPDATE", secondID).Scan(&bal2, &act2); err != nil {
		return nil, ErrAccountNotFound
	}

	if !act1 || !act2 {
		return nil, errors.New("una de las cuentas se encuentra inactiva")
	}

	// 3. Validación de saldo en cuenta origen
	var fromBalance int64
	if fromAccID == firstID {
		fromBalance = bal1
	} else {
		fromBalance = bal2
	}

	if fromBalance < amountCents {
		return nil, ErrInsufficientFunds
	}

	// 4. Actualización de saldos atómicos
	if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2", amountCents, fromAccID); err != nil {
		return nil, fmt.Errorf("debitar cuenta origen: %w", err)
	}
	if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2", amountCents, toAccID); err != nil {
		return nil, fmt.Errorf("acreditar cuenta destino: %w", err)
	}

	// 5. Creación de póliza transaccional
	folio := fmt.Sprintf("CEN-%s-%04d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)
	txID := uuid.New().String()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, folio, idempotency_key, transaction_type, description, status, created_at)
		VALUES ($1, $2, $3, 'spei_transfer', $4, 'posted', NOW())
	`, txID, folio, idempotencyKey, description)
	if err != nil {
		return nil, fmt.Errorf("crear registro transaccional: %w", err)
	}

	// 6. Asientos en el Libro Mayor (Partida Doble Estricta)
	// Asiento 1: Cargo (Debit) a cuenta origen
	_, err = tx.ExecContext(ctx, `
		INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount_cents, created_at)
		VALUES ($1, $2, $3, 'debit', $4, NOW())
	`, uuid.New().String(), txID, fromAccID, amountCents)
	if err != nil {
		return nil, fmt.Errorf("insertar asiento debito: %w", err)
	}

	// Asiento 2: Abono (Credit) a cuenta destino
	_, err = tx.ExecContext(ctx, `
		INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount_cents, created_at)
		VALUES ($1, $2, $3, 'credit', $4, NOW())
	`, uuid.New().String(), txID, toAccID, amountCents)
	if err != nil {
		return nil, fmt.Errorf("insertar asiento credito: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transaccion: %w", err)
	}

	return &model.Transaction{
		ID:              txID,
		Folio:           folio,
		IdempotencyKey:  idempotencyKey,
		TransactionType: "spei_transfer",
		Description:     description,
		Status:          "posted",
		CreatedAt:       time.Now(),
	}, nil
}

// Deposit acredita fondos desde el banco concentrador hacia una cuenta de cliente
func (s *Service) Deposit(ctx context.Context, toAccID string, amountCents int64, description string) (*model.Transaction, error) {
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}

	// Cuenta de tesorería institucional concentradora de activo
	var treasuryAccID string
	err := s.db.QueryRowContext(ctx, "SELECT id FROM accounts WHERE account_type = 'asset' LIMIT 1").Scan(&treasuryAccID)
	if err != nil {
		return nil, fmt.Errorf("cuenta concentradora no disponible: %w", err)
	}

	return s.Transfer(ctx, treasuryAccID, toAccID, amountCents, description, uuid.New().String())
}

// GetAccountByID obtiene el estado de cuenta y balance verificado
func (s *Service) GetAccountByID(ctx context.Context, id string) (*model.Account, error) {
	var a model.Account
	err := s.db.QueryRowContext(ctx, `
		SELECT id, account_number, account_type, name, currency, balance_cents, is_active, created_at
		FROM accounts WHERE id = $1
	`, id).Scan(&a.ID, &a.AccountNumber, &a.AccountType, &a.Name, &a.Currency, &a.BalanceCents, &a.IsActive, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrAccountNotFound
		}
		return nil, err
	}
	a.BalanceMXN = float64(a.BalanceCents) / 100.0
	return &a, nil
}
