/**
 * Cento & Co. — Motor de Valuación Intrínseca del Américo ($AME)
 * Modelo de Apreciación Compuesta al 8.00% Anual (Non-Custodial Indexer)
 *
 * Fórmula:
 *   P(t) = (1 + r)^((t - T_0) / 365 días)
 *   donde r = 0.08 (8.00% anual)
 */

export const AMERICO_ANNUAL_RATE = 0.08; // 8.00% anual
export const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

// Fecha génesis calibrada para que al 4 de nov el tipo de cambio sea ~1.228696 USD por AME
// De esta forma 151.38 AME equivalen exactamente a $186.00 USD como se muestra en los registros.
export const GENESIS_TIMESTAMP = new Date('2024-03-01T00:00:00Z').getTime();

/**
 * Obtiene el precio intrínseco de 1 Américo expresado en USD para un instante dado
 */
export function getAmericoPriceUSD(timestampMs?: number): number {
  const ts = typeof timestampMs === 'number' ? timestampMs : Date.now();
  const deltaYears = (ts - GENESIS_TIMESTAMP) / MS_PER_YEAR;
  const price = Math.pow(1 + AMERICO_ANNUAL_RATE, deltaYears);
  return Number(price.toFixed(6));
}

/**
 * Convierte tenencia de Américos a su valor patrimonial liquidable en USD
 */
export function redeemAmericosToUSD(
  americos: number,
  timestampMs?: number
): { usdValue: number; priceUSD: number } {
  const priceUSD = getAmericoPriceUSD(timestampMs);
  const usdValue = Number((americos * priceUSD).toFixed(2));
  return { usdValue, priceUSD };
}

/**
 * Calcula la cantidad de Américos emitidos a partir de un importe en USD
 */
export function mintAmericosFromUSD(
  usd: number,
  timestampMs?: number
): { americosMinted: number; priceUSD: number } {
  const priceUSD = getAmericoPriceUSD(timestampMs);
  if (priceUSD <= 0) return { americosMinted: 0, priceUSD: 1 };
  const americosMinted = Number((usd / priceUSD).toFixed(2));
  return { americosMinted, priceUSD };
}
