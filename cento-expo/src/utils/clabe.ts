export const BANCOS_SPEI: Record<string, string> = {
  '002': 'Citibanamex',
  '012': 'BBVA México',
  '014': 'Santander México',
  '021': 'HSBC México',
  '036': 'Inbursa',
  '044': 'Scotiabank',
  '058': 'Banregio',
  '072': 'Banorte',
  '646': 'STP (Sistema de Transferencias y Pagos)'
};

export function generarClabeValida(prefijo17: string): string {
  const pesos = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let suma = 0;
  for (let i = 0; i < 17; i++) {
    suma += (parseInt(prefijo17[i], 10) * pesos[i]) % 10;
  }
  const digito = (10 - (suma % 10)) % 10;
  return prefijo17 + String(digito);
}

export function validarClabe(clabe: string): { valida: boolean; banco?: string; codigo?: string; motivo?: string } {
  if (!/^\d{18}$/.test(clabe)) {
    return { valida: false, motivo: `La CLABE debe tener 18 dígitos. Escribiste ${clabe.length}.` };
  }
  const esperada = generarClabeValida(clabe.slice(0, 17));
  if (esperada !== clabe) {
    return {
      valida: false,
      motivo: `El dígito verificador no coincide (debería terminar en ${esperada[17]}). Revisa los 18 dígitos.`
    };
  }
  const codBanco = clabe.slice(0, 3);
  const nombreBanco = BANCOS_SPEI[codBanco] || `Institución SPEI (${codBanco})`;
  return { valida: true, banco: nombreBanco, codigo: codBanco };
}
