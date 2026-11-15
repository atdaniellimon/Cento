# Cento & Co. — Aplicación Móvil en React Native con Expo

Aplicación de banca personal de gama alta en pesos mexicanos (MXN), con diseño editorial inspirado en el documento formal `DESIGN.md`, la estética de **Coutts & Co.** y la tipografía de **Anthropic**.

---

## Características de la Arquitectura Nativa

* **Diseño y tipografía**:
  * Saldo monumental con símbolo `$` y centavos elevados en `Newsreader 300`.
  * Cifras tabulares estrictas (`fontVariant: ['tabular-nums']`) en `Hanken Grotesk`.
  * Paleta sobria sin colorines: Marfil `#FAF9F5`, Piedra `#EFEDE5`, Grafito `#1F1E1C` y Azul de firma `#27407F`.
* **Hardware y sensores**:
  * Respuesta háptica táctil en Taptic Engine con `expo-haptics`.
  * Autorización biométrica real con Face ID / Touch ID vía `expo-local-authentication`.
  * Soporte estricto de zonas seguras de iOS (`react-native-safe-area-context`) para Dynamic Island y Home Indicator.
* **Segunda idea visual**:
  * Trazo interactivo con los 90 días de evolución del saldo para arrastrar con el dedo (*scrubbing* táctil).

---

## Cómo ejecutar el proyecto localmente

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo de Expo**:
   ```bash
   npx expo start
   ```

3. **Abrir en tu teléfono o simulador**:
   * **iPhone físico**: Escanea el código QR con la app **Expo Go** o compila un cliente de desarrollo.
   * **Simulador de iOS**: Presiona `i` en la terminal.

---

## Cómo compilar el archivo `.ipa` en la nube con Expo EAS

No necesitas una Mac en tu escritorio para compilar el `.ipa`:

1. Instalar el CLI de EAS:
   ```bash
   npm install -g eas-cli
   ```
2. Iniciar sesión en tu cuenta gratuita de Expo:
   ```bash
   eas login
   ```
3. Configurar el proyecto para compilaciones en la nube:
   ```bash
   eas build:configure
   ```
4. Generar el binario para iOS:
   ```bash
   eas build -p ios --profile preview
   ```
   Expo compilará la app en sus servidores de macOS en la nube y te entregará el enlace para descargar el `.ipa` e instalarlo en tu iPhone.
