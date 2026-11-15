import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatearMoneda } from '../utils/format';
import { Typography } from '../constants/theme';

interface MontoHeroProps {
  valor: number;
  oculto: boolean;
  color: string;
}

export const MontoHero: React.FC<MontoHeroProps> = ({ valor, oculto, color }) => {
  if (oculto) {
    return (
      <View style={styles.container}>
        <Text style={[styles.saldoHero, { color }]}>••••</Text>
      </View>
    );
  }

  const { entero, centavos, signo, textoAccesible } = formatearMoneda(valor);

  return (
    <View style={styles.container} accessibilityLabel={textoAccesible}>
      <Text style={[styles.saldoHero, { color }]}>
        {signo}
        <Text style={styles.currencySup}>$</Text>
        {entero}
        <Text style={styles.centsSup}>.{centavos}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  saldoHero: {
    fontFamily: Typography.serifLight,
    fontSize: 68,
    lineHeight: 70,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  currencySup: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Typography.serifLight,
  },
  centsSup: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Typography.serifLight,
  },
});
