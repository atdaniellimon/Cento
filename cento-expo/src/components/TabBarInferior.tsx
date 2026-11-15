import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../constants/theme';
import { useHaptics } from '../hooks/useHaptics';

export type TabKey = 'inicio' | 'movimientos' | 'enviar' | 'cuentas';

interface TabBarProps {
  tabActiva: TabKey;
  onSelectTab: (tab: TabKey) => void;
  colors: {
    piedra: string;
    linea: string;
    grafito: string;
    tenue: string;
  };
}

export const TabBarInferior: React.FC<TabBarProps> = ({ tabActiva, onSelectTab, colors }) => {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();

  const handlePress = (tab: TabKey) => {
    selection();
    onSelectTab(tab);
  };

  const colorIcono = (tab: TabKey) => (tabActiva === tab ? colors.grafito : colors.tenue);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.piedra,
          borderTopColor: colors.linea,
          paddingBottom: Math.max(insets.bottom, 18),
        },
      ]}
    >
      {/* 1. Inicio: Pórtico y frontón neoclásico */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handlePress('inicio')}
        accessibilityRole="tab"
        accessibilityLabel="Pestaña de Inicio"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colorIcono('inicio')} strokeWidth={1.3}>
          <Path d="M2 8.5L12 3L22 8.5" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="3" y1="8.5" x2="21" y2="8.5" />
          <Line x1="5.5" y1="8.5" x2="5.5" y2="17" />
          <Line x1="9.8" y1="8.5" x2="9.8" y2="17" />
          <Line x1="14.2" y1="8.5" x2="14.2" y2="17" />
          <Line x1="18.5" y1="8.5" x2="18.5" y2="17" />
          <Line x1="3" y1="17" x2="21" y2="17" />
          <Line x1="2" y1="20" x2="22" y2="20" />
        </Svg>
        <Text style={[styles.label, { color: colorIcono('inicio') }]}>Inicio</Text>
      </TouchableOpacity>

      {/* 2. Movimientos: Libro de asientos con folio */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handlePress('movimientos')}
        accessibilityRole="tab"
        accessibilityLabel="Pestaña de Movimientos"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colorIcono('movimientos')} strokeWidth={1.3}>
          <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="9" y1="7" x2="16" y2="7" />
          <Line x1="9" y1="11" x2="16" y2="11" />
          <Line x1="9" y1="15" x2="13" y2="15" />
        </Svg>
        <Text style={[styles.label, { color: colorIcono('movimientos') }]}>Movimientos</Text>
      </TouchableOpacity>

      {/* 3. Enviar: Plumín de pluma estilográfica clásica */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handlePress('enviar')}
        accessibilityRole="tab"
        accessibilityLabel="Pestaña de Enviar orden"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colorIcono('enviar')} strokeWidth={1.3}>
          <Path d="M12 2.5L19 9.5L13.5 21.5L11.5 16L6 14L12 2.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="9.5" r="1.2" fill={colorIcono('enviar')} />
          <Line x1="12" y1="9.5" x2="11.5" y2="16" />
        </Svg>
        <Text style={[styles.label, { color: colorIcono('enviar') }]}>Enviar</Text>
      </TouchableOpacity>

      {/* 4. Cuentas: Bóveda y cerradura radial de custodia */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handlePress('cuentas')}
        accessibilityRole="tab"
        accessibilityLabel="Pestaña de Cuentas"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colorIcono('cuentas')} strokeWidth={1.3}>
          <Circle cx="12" cy="12" r="9" />
          <Circle cx="12" cy="12" r="4.2" />
          <Line x1="12" y1="3" x2="12" y2="5.5" />
          <Line x1="12" y1="18.5" x2="12" y2="21" />
          <Line x1="3" y1="12" x2="5.5" y2="12" />
          <Line x1="18.5" y1="12" x2="21" y2="12" />
        </Svg>
        <Text style={[styles.label, { color: colorIcono('cuentas') }]}>Cuentas</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: Typography.sansMedium,
  },
});
