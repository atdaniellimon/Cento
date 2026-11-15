package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/mattn/go-sqlite3"

	"github.com/cento/backend/internal/api"
	"github.com/cento/backend/internal/ledger"
	"github.com/cento/backend/internal/yield"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	driverName := "pgx"

	if dbURL == "" {
		log.Println("[INFO] DATABASE_URL no configurada. Iniciando SQLite en memoria para pruebas locales...")
		driverName = "sqlite3"
		dbURL = "file:cento.db?cache=shared&mode=memory"
	}

	db, err := sql.Open(driverName, dbURL)
	if err != nil {
		log.Fatalf("[FATAL] Error conectando a base de datos: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := initDatabase(db, driverName); err != nil {
		log.Fatalf("[FATAL] Error inicializando esquema contable: %v", err)
	}

	ledgerService := ledger.NewService(db)
	yieldEngine := yield.NewEngine(db)
	server := api.NewServer(ledgerService, yieldEngine)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[INFO] Servidor Cento Core iniciado en http://localhost%s (Tasa de rendimiento activa: 8.00%% anual)", addr)
	if err := http.ListenAndServe(addr, server.Routes()); err != nil {
		log.Fatalf("[FATAL] Error en servidor HTTP: %v", err)
	}
}

func initDatabase(db *sql.DB, driver string) error {
	log.Println("[INFO] Verificando esquema y tablas contables...")

	var schemaSQL string
	if driver == "sqlite3" {
		schemaSQL = `
		CREATE TABLE IF NOT EXISTS accounts (
			id TEXT PRIMARY KEY,
			account_number TEXT UNIQUE NOT NULL,
			user_id TEXT,
			account_type TEXT NOT NULL,
			name TEXT NOT NULL,
			currency TEXT NOT NULL DEFAULT 'MXN',
			balance_cents INTEGER NOT NULL DEFAULT 0,
			is_active INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS transactions (
			id TEXT PRIMARY KEY,
			folio TEXT UNIQUE NOT NULL,
			idempotency_key TEXT UNIQUE,
			transaction_type TEXT NOT NULL,
			description TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'posted',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS ledger_entries (
			id TEXT PRIMARY KEY,
			transaction_id TEXT NOT NULL,
			account_id TEXT NOT NULL,
			entry_type TEXT NOT NULL,
			amount_cents INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS yield_configs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			annual_rate_bps INTEGER NOT NULL DEFAULT 800,
			calculation_base_days INTEGER NOT NULL DEFAULT 365,
			circuit_breaker_active INTEGER NOT NULL DEFAULT 0,
			min_treasury_reserve_cents INTEGER NOT NULL DEFAULT 1000000,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS yield_audit_runs (
			id TEXT PRIMARY KEY,
			run_date TEXT UNIQUE NOT NULL,
			total_accounts_processed INTEGER NOT NULL,
			total_cents_distributed INTEGER NOT NULL,
			treasury_reserve_after_cents INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		`
	} else {
		schemaBytes, err := os.ReadFile("schema.sql")
		if err != nil {
			return err
		}
		schemaSQL = string(schemaBytes)
	}

	if _, err := db.Exec(schemaSQL); err != nil {
		return err
	}

	// Cargar cuentas iniciales de prueba si está vacío
	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM accounts").Scan(&count)
	if count == 0 {
		log.Println("[INFO] Sembrando cuentas iniciales (Alex Morales 4417, Bóveda CETES, Tesorería)...")
		_, _ = db.Exec(`
			INSERT INTO accounts (id, account_number, account_type, name, balance_cents) VALUES 
			('acc_alex_4417', '646180157000004417', 'liability', 'Alex Morales (Cuenta a la vista)', 18430250),
			('acc_cetes_8802', '646180157000008802', 'liability', 'Alex Morales (Bóveda CETES)', 42000000),
			('acc_treasury_res', 'TREASURY-EXPENSE', 'expense', 'Reserva de Subsidio para Rendimientos', 12000000),
			('acc_treasury_ast', 'TREASURY-ASSET', 'asset', 'Banco Concentrador STP / Tesorería', 189045000);

			INSERT INTO yield_configs (annual_rate_bps, calculation_base_days, circuit_breaker_active, min_treasury_reserve_cents)
			VALUES (800, 365, 0, 1000000);
		`)
	}

	return nil
}
