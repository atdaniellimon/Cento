# Multi-stage Docker build para Cento Core API
FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git gcc musl-dev

COPY go.mod go.sum* ./
RUN go mod download || true

COPY . .

# Compilación estática de alto rendimiento
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o cento-server ./cmd/server

# Imagen final ultra ligera
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/cento-server .
COPY --from=builder /app/schema.sql .

EXPOSE 8080

ENV PORT=8080
ENV TZ=America/Mexico_City

CMD ["./cento-server"]
