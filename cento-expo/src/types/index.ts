export type TipoMovimiento = 'in' | 'out' | 'yield';

export interface Movimiento {
  id: string;
  fechaISO: string;
  etiquetaDia: string;
  fechaCorta: string;
  hora: string;
  concepto: string;
  monto: number;
  saldo: number;
  tipo: TipoMovimiento;
  rastreo: string;
  contraparte: string;
}

export interface Contacto {
  id: string;
  nombre: string;
  banco: string;
  clabe: string;
}

export interface OrdenTransferencia {
  estado: 'borrador' | 'revision' | 'enviada' | 'rechazada';
  deCuenta: string;
  paraNombre: string;
  paraClabe: string;
  bancoDestino: string;
  monto: number;
  concepto: string;
  esContactoNuevo: boolean;
  claveRastreo: string;
  fechaHora: string;
  folio: string;
}

export interface EstadoTesoreria {
  fase: 1 | 2; // 1: Subsidio con capital propio, 2: CETES 28 días + margen
  custodiaTotal: number;
  reservaPropia: number;
  tasaCetes: number;
  margenSpread: number;
  acreditacionActiva: boolean;
}

export interface PolizaContable {
  id: string;
  desc: string;
  debe: string;
  haber: string;
  monto: number;
}
