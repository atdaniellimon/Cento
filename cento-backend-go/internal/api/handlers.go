package api

import (
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/cento/backend/internal/ledger"
	"github.com/cento/backend/internal/model"
	"github.com/cento/backend/internal/yield"
)

type Server struct {
	ledgerSvc *ledger.Service
	yieldEng  *yield.Engine
}

func NewServer(ledgerSvc *ledger.Service, yieldEng *yield.Engine) *Server {
	return &Server{
		ledgerSvc: ledgerSvc,
		yieldEng:  yieldEng,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /api/v1/accounts/{id}", s.handleGetAccount)
	mux.HandleFunc("POST /api/v1/transfers", s.handleTransfer)
	mux.HandleFunc("POST /api/v1/deposits", s.handleDeposit)
	mux.HandleFunc("POST /api/v1/yield/run-daily", s.handleRunDailyYield)
	mux.HandleFunc("GET /api/v1/treasury/status", s.handleGetTreasuryStatus)

	return s.corsMiddleware(mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":      "operational",
		"system":      "Cento Financial Core",
		"rate_annual": "8.00%",
		"timestamp":   time.Now().UTC(),
	})
}

func (s *Server) handleGetAccount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	acc, err := s.ledgerSvc.GetAccountByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, acc)
}

type TransferRequest struct {
	FromAccountID string  `json:"from_account_id"`
	ToAccountID   string  `json:"to_account_id"`
	AmountMXN     float64 `json:"amount_mxn"`
	Concept       string  `json:"concept"`
}

func (s *Server) handleTransfer(w http.ResponseWriter, r *http.Request) {
	idempotencyKey := r.Header.Get("Idempotency-Key")
	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cuerpo de petición inválido"})
		return
	}

	amountCents := int64(math.Round(req.AmountMXN * 100.0))
	tx, err := s.ledgerSvc.Transfer(r.Context(), req.FromAccountID, req.ToAccountID, amountCents, req.Concept, idempotencyKey)
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, tx)
}

type DepositRequest struct {
	AccountID string  `json:"account_id"`
	AmountMXN float64 `json:"amount_mxn"`
	Concept   string  `json:"concept"`
}

func (s *Server) handleDeposit(w http.ResponseWriter, r *http.Request) {
	var req DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cuerpo de petición inválido"})
		return
	}

	amountCents := int64(math.Round(req.AmountMXN * 100.0))
	tx, err := s.ledgerSvc.Deposit(r.Context(), req.AccountID, amountCents, req.Concept)
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, tx)
}

func (s *Server) handleRunDailyYield(w http.ResponseWriter, r *http.Request) {
	count, totalCents, err := s.yieldEng.ExecuteDailyYieldRun(r.Context(), time.Now())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":                     "liquidated",
		"message":                    "Corte de rendimientos al 8.00% anual completado",
		"accounts_credited":          count,
		"total_distributed_cents":    totalCents,
		"total_distributed_mxn":      float64(totalCents) / 100.0,
		"settled_at":                 time.Now(),
	})
}

func (s *Server) handleGetTreasuryStatus(w http.ResponseWriter, r *http.Request) {
	// Status de tesorería y runway
	writeJSON(w, http.StatusOK, model.TreasuryStatus{
		TotalCustodyCents:    189045000,
		TotalCustodyMXN:      1890450.00,
		TreasuryReserveCents: 12000000,
		TreasuryReserveMXN:   120000.00,
		DailyBurnCents:       41434, // (1890450 * 0.08) / 365
		DailyBurnMXN:         414.34,
		RunwayDays:           289,
		AnnualRatePercent:    8.00,
		CircuitBreakerActive: false,
	})
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
