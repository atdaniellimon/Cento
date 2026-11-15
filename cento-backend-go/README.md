# Cento & Co. — Servidor Backend en Go (Golang)

Núcleo transaccional financiero con contabilidad en partida doble estricta (*Double-Entry Ledger*), motor de devengo diario de rendimientos al **8.00% anual** y soporte de transferencias SPEI con claves de idempotencia.

---

## 1. Características Técnicas

* **Partida Doble Estricta**: Cada transacción genera asientos equilibrados de débitos y créditos (`SUM(debit) - SUM(credit) = 0`). Los registros contables son inmutables.
* **Precisión Matemática en Centavos**: Todos los montos se operan y almacenan en enteros `int64` (centavos de MXN) para eliminar errores de coma flotante IEEE 754.
* **Motor de Rendimientos al 8.00% Anual**:
  * Fórmula Banxico: `RendimientoDiario = (Saldo * 800) / (100 * 365)`.
  * Genera el asiento cargando a la reserva de tesorería y abonando a la cuenta a la vista del cliente.
  * Incorpora freno de emergencia (*Circuit Breaker*) y protección de saldo mínimo de tesorería.
* **Prevención de Gasto Doble y Concurrencia**: Bloqueos pesimistas `SELECT ... FOR UPDATE` ordenados lexicográficamente por ID de cuenta para evitar *deadlocks* en transferencias simultáneas.
* **Idempotencia Transaccional**: Detección de claves de idempotencia en cabecera HTTP (`Idempotency-Key`) para prevenir cargos dobles ante reintentos de red.

---

## 2. Endpoints de la API REST

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/health` | Estado del servicio y tasa anual activa (8.00%). |
| `GET` | `/api/v1/accounts/{id}` | Saldo verificado y metadatos de la cuenta. |
| `POST` | `/api/v1/transfers` | Transferencia entre cuentas con cabecera `Idempotency-Key`. |
| `POST` | `/api/v1/deposits` | Simulación de abono SPEI entrante a una cuenta. |
| `POST` | `/api/v1/yield/run-daily` | Ejecución del corte diario de intereses al 8.00% anual. |
| `GET` | `/api/v1/treasury/status` | Métricas de reserva, burn rate diario y días de runway. |

---

## 3. Despliegue y Ejecución

### Opción A: Docker Compose (Recomendado con PostgreSQL)
```bash
docker compose up --build
```
La API estará lista en `http://localhost:8080` conectada a PostgreSQL 16 con el esquema contable aplicado automáticamente.

### Opción B: Ejecución Local en Go
Si no defines `DATABASE_URL`, el servidor iniciará automáticamente en modo desarrollo con SQLite en memoria:
```bash
go run ./cmd/server
```
