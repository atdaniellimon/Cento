const fmtInt = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatearMoneda(valor: number): {
  entero: string;
  centavos: string;
  signo: string;
  textoAccesible: string;
  completo: string;
} {
  const absVal = Math.abs(valor);
  const enteroNum = Math.floor(absVal);
  const centavosNum = Math.round((absVal - enteroNum) * 100);
  const centavos = centavosNum.toString().padStart(2, '0');
  const entero = fmtInt.format(enteroNum);
  const signo = valor < 0 ? '−' : '';
  const textoAccesible = `${valor < 0 ? 'menos ' : ''}${enteroNum} pesos con ${centavos} centavos`;
  const completo = `${signo}$${fmtDec.format(absVal)}`;

  return { entero, centavos, signo, textoAccesible, completo };
}
