#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "→ Building Cento & Co. (Core Backend & iOS Native Client)"
echo "============================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$ROOT_DIR/build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 1. Compilar Backend Go
echo "→ [1/4] Compilando núcleo financiero en Go..."
cd "$ROOT_DIR/cento-backend-go"
go vet ./...
go build -v -o "$ROOT_DIR/cento-backend-go/cento-server" ./cmd/server
cp "$ROOT_DIR/cento-backend-go/cento-server" "$BUILD_DIR/"
echo "✅ Binario cento-server generado exitosamente en build/"

# 2. Verificación de Tipos TypeScript (Mobile)
echo "→ [2/4] Verificando tipos de TypeScript en la app móvil..."
cd "$ROOT_DIR/cento-expo"
npx tsc --noEmit
echo "✅ Verificación de tipos TypeScript: 0 errores"

# 3. Preparar Assets y Proyecto Nativo de iOS
echo "→ [3/4] Verificando scaffolding nativo de iOS..."
if [ ! -d "$ROOT_DIR/cento-expo/ios/Cento.xcodeproj" ]; then
    echo "→ Generando proyecto nativo con Expo prebuild..."
    npx expo prebuild --platform ios --clean
fi
echo "✅ Proyecto nativo Cento.xcodeproj listo"

# 4. Resumen de Despliegue y Empaquetado de IPA
echo "→ [4/4] Pipeline de empaquetado para iOS (.ipa)..."
echo ""
echo "Opciones disponibles para generar el .ipa:"
echo "  A) Vía GitHub Actions CI/CD (Replicado de NewtonCoach / Luxeva):"
echo "     Ejecuta: ./push.sh"
echo "     GitHub compilará automáticamente en macOS con Xcode y subirá el artefacto Cento.ipa."
echo ""
echo "  B) Vía Expo EAS Cloud Build:"
echo "     cd cento-expo && npx eas-cli build -p ios --profile preview"
echo ""
echo "============================================================"
echo "✅ Pipeline verificado y listo. Usa ./push.sh para compilar el IPA."
echo "============================================================"
