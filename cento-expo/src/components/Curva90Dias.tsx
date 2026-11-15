import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Typography } from '../constants/theme';
import { formatearMoneda } from '../utils/format';

interface Curva90DiasProps {
  serie: Array<{ iso: string; etiqueta: string; saldo: number; cambioDia: number }>;
  colorTrazo: string;
  colorGuia: string;
  oculto: boolean;
  onHoverCambio?: (saldo: number, fecha: string) => void;
}

export const Curva90Dias: React.FC<Curva90DiasProps> = ({
  serie,
  colorTrazo,
  colorGuia,
  oculto,
  onHoverCambio,
}) => {
  const [ancho, setAncho] = useState(320);
  const [puntoActivo, setPuntoActivo] = useState<{ x: number; y: number; etiqueta: string; saldo: number; cambio: number } | null>(null);

  const H = 54;
  const padY = 8;

  const { pathD, puntos } = useMemo(() => {
    if (!serie.length) return { pathD: '', puntos: [] };
    const valores = serie.map((s) => s.saldo);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = Math.max(1, max - min);

    const pts = serie.map((item, idx) => {
      const x = (idx / (serie.length - 1)) * ancho;
      const y = H - padY - ((item.saldo - min) / rango) * (H - padY * 2);
      return { x, y, item };
    });

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return { pathD: d, puntos: pts };
  }, [serie, ancho]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !oculto,
      onPanResponderMove: (evt) => {
        if (!puntos.length || oculto) return;
        const touchX = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, touchX / ancho));
        const idx = Math.round(ratio * (puntos.length - 1));
        const p = puntos[idx];
        if (p) {
          setPuntoActivo({
            x: p.x,
            y: p.y,
            etiqueta: p.item.etiqueta,
            saldo: p.item.saldo,
            cambio: p.item.cambioDia,
          });
          onHoverCambio?.(p.item.saldo, p.item.etiqueta);
        }
      },
      onPanResponderRelease: () => {
        setPuntoActivo(null);
        if (serie.length) {
          const ult = serie[serie.length - 1];
          onHoverCambio?.(ult.saldo, ult.etiqueta);
        }
      },
    });
  }, [puntos, ancho, oculto, serie]);

  const ultimoPunto = puntos.length ? puntos[puntos.length - 1] : { x: ancho, y: H / 2 };

  return (
    <View
      style={[styles.container, oculto && { opacity: 0.25 }]}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View style={styles.headerInfo}>
        <Text style={[styles.dateText, { color: colorGuia }]}>
          {puntoActivo ? puntoActivo.etiqueta : 'Últimos 90 días · Hoy, 2 nov'}
        </Text>
        <Text style={[styles.deltaText, { color: colorGuia }]}>
          {puntoActivo
            ? puntoActivo.cambio !== 0
              ? `Movimiento: ${formatearMoneda(puntoActivo.cambio).completo}`
              : 'Sin movimientos ese día'
            : 'Arrastra sobre la línea'}
        </Text>
      </View>

      <Svg width={ancho} height={H} style={styles.svg}>
        {puntoActivo && (
          <Line
            x1={puntoActivo.x}
            y1={0}
            x2={puntoActivo.x}
            y2={H}
            stroke={colorGuia}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
        <Path d={pathD} fill="none" stroke={colorTrazo} strokeWidth={1.25} />
        <Circle
          cx={puntoActivo ? puntoActivo.x : ultimoPunto.x}
          cy={puntoActivo ? puntoActivo.y : ultimoPunto.y}
          r={3.5}
          fill={colorTrazo}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: Typography.sansRegular,
  },
  deltaText: {
    fontSize: 12,
    fontFamily: Typography.sansRegular,
    fontVariant: ['tabular-nums'],
  },
  svg: {
    overflow: 'visible',
  },
});
