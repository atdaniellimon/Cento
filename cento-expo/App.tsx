import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Newsreader_300Light, Newsreader_400Regular } from '@expo-google-fonts/newsreader';
import { HankenGrotesk_400Regular, HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk';

import { Palette, Typography } from './src/constants/theme';
import { TabBarInferior, TabKey } from './src/components/TabBarInferior';
import { MontoHero } from './src/components/MontoHero';
import { Curva90Dias } from './src/components/Curva90Dias';
import { useHaptics } from './src/hooks/useHaptics';
import { getAmericoPriceUSD, redeemAmericosToUSD, mintAmericosFromUSD } from './src/utils/americo';

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_300Light,
    Newsreader_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <CentoAppRoot />
    </SafeAreaProvider>
  );
}

function CentoAppRoot() {
  const [tabActiva, setTabActiva] = useState<TabKey>('inicio');
  const [darkMode, setDarkMode] = useState(false);
  const [saldoOculto, setSaldoOculto] = useState(false);

  // Tenencia fija en bóveda: 150,000.00 Américos ($AME)
  // Lo que crece continuamente es el precio intrínseco P(t) del Américo al 8.00% anual
  const [americosEnBoveda, setAmericosEnBoveda] = useState(150000.00);
  const [precioAmericoUSD, setPrecioAmericoUSD] = useState(() => getAmericoPriceUSD());

  const insets = useSafeAreaInsets();
  const { light } = useHaptics();

  const colors = darkMode ? Palette.dark : Palette.light;

  useEffect(() => {
    const timer = setInterval(() => {
      setPrecioAmericoUSD(getAmericoPriceUSD());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const { usdValue: saldoEnDolares } = redeemAmericosToUSD(americosEnBoveda);
  const { americosMinted: americosPorMilUSD } = mintAmericosFromUSD(1000);

  // Curva de los últimos 90 días: apreciación intrínseca continua de los Américos en USD
  const serie90Dias = React.useMemo(() => {
    const list = [];
    const nowMs = Date.now();
    const dayMs = 86400 * 1000;
    for (let i = 89; i >= 0; i--) {
      const ts = nowMs - i * dayMs;
      const pDia = getAmericoPriceUSD(ts);
      const pAyer = getAmericoPriceUSD(ts - dayMs);
      const valUSD = Number((americosEnBoveda * pDia).toFixed(2));
      const cambioDia = Number(((pDia - pAyer) * americosEnBoveda).toFixed(2));
      list.push({
        iso: new Date(ts).toISOString().slice(0, 10),
        etiqueta: i === 0 ? 'Hoy, 4 nov' : `Hace ${i} días`,
        saldo: valUSD,
        cambioDia,
      });
    }
    return list;
  }, [americosEnBoveda]);

  return (
    <View style={[styles.root, { backgroundColor: colors.marfil }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* Cabecera Membrete Coutts & Co. */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 14),
            borderBottomColor: colors.linea,
          },
        ]}
      >
        <Text style={[styles.wordmark, { color: colors.grafito }]}>Cento & Co.</Text>
        <Text style={[styles.userTitle, { color: colors.grafito }]}>Alex Morales</Text>
      </View>

      {/* Área de Lectura Principal */}
      <View style={styles.workspace}>
        {tabActiva === 'inicio' && (
          <View style={styles.screenContent}>
            <View style={styles.balanceMeta}>
              <Text style={[styles.labelSecundario, { color: colors.tenue }]}>
                Valor patrimonial en dólares (USD)
              </Text>
              <Text
                style={[styles.linkAccion, { color: colors.tenue }]}
                onPress={() => {
                  light();
                  setSaldoOculto(!saldoOculto);
                }}
              >
                {saldoOculto ? 'Mostrar' : 'Ocultar'}
              </Text>
            </View>

            {/* Saldo Monumental expresado en USD */}
            <MontoHero valor={saldoEnDolares} oculto={saldoOculto} color={colors.grafito} />

            {/* Nota discreta del índice integral Américo */}
            <Text style={[styles.accountSub, { color: colors.tenue }]}>
              {saldoOculto
                ? 'Tenencia oculta · Apreciación anual 8.00%'
                : `${americosEnBoveda.toLocaleString('es-MX', { minimumFractionDigits: 2 })} AME en custodia · 1 AME = $${precioAmericoUSD.toFixed(6)} USD`}
            </Text>

            {/* Curva interactiva de 90 días */}
            <Curva90Dias
              serie={serie90Dias}
              colorTrazo={colors.grafito}
              colorGuia={colors.tenue}
              oculto={saldoOculto}
            />

            {/* Acciones en texto con subrayado fino */}
            <View style={styles.actionsRow}>
              <Text style={[styles.linkPrincipal, { color: colors.grafito }]} onPress={() => setTabActiva('enviar')}>
                Enviar
              </Text>
              <Text style={[styles.linkPrincipal, { color: colors.grafito }]}>
                Recibir
              </Text>
            </View>

            {/* Movimientos recientes en USD */}
            <View style={[styles.ledgerPreview, { borderTopColor: colors.linea }]}>
              <Text style={[styles.dayHeader, { color: colors.tenue }]}>Hoy, 4 de noviembre</Text>
              <View style={[styles.txRow, { borderBottomColor: colors.linea }]}>
                <Text style={[styles.txConcept, { color: colors.grafito }]}>Café Avenida (151.38 AME)</Text>
                <Text style={[styles.txAmount, { color: colors.grafito }]}>−$186.00</Text>
              </View>
              <Text style={[styles.dayHeader, { color: colors.tenue, marginTop: 16 }]}>Ayer, 3 de noviembre</Text>
              <View style={[styles.txRow, { borderBottomColor: colors.linea }]}>
                <Text style={[styles.txConcept, { color: colors.grafito }]}>Marina Ortega (2,604.41 AME)</Text>
                <Text style={[styles.txAmount, { color: colors.grafito }]}>−$3,200.00</Text>
              </View>
            </View>
          </View>
        )}

        {tabActiva === 'movimientos' && (
          <View style={styles.screenContent}>
            <Text style={[styles.titleSerif, { color: colors.grafito }]}>Movimientos</Text>
            <Text style={[styles.labelSecundario, { color: colors.tenue }]}>
              Libro contable en USD con liquidación en Américos ($AME)
            </Text>
          </View>
        )}

        {tabActiva === 'enviar' && (
          <View style={styles.screenContent}>
            <Text style={[styles.titleSerif, { color: colors.grafito }]}>Enviar</Text>
            <Text style={[styles.labelSecundario, { color: colors.tenue }]}>
              Orden firmada expresada en USD · Conversión exacta al índice del día (1 AME = ${precioAmericoUSD.toFixed(6)} USD)
            </Text>
          </View>
        )}

        {tabActiva === 'cuentas' && (
          <View style={styles.screenContent}>
            <Text style={[styles.titleSerif, { color: colors.grafito }]}>Cuentas</Text>
            <Text style={[styles.labelSecundario, { color: colors.tenue }]}>
              Hoy $1,000.00 USD adquieren {americosPorMilUSD.toFixed(2)} AME (Día 1 adquirían 1,000.00 AME)
            </Text>
          </View>
        )}
      </View>

      <TabBarInferior tabActiva={tabActiva} onSelectTab={setTabActiva} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  wordmark: {
    fontFamily: Typography.serifRegular,
    fontSize: 22,
    letterSpacing: 0.6,
  },
  userTitle: {
    fontFamily: Typography.sansMedium,
    fontSize: 14,
  },
  workspace: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  screenContent: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  balanceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  labelSecundario: {
    fontSize: 13,
    fontFamily: Typography.sansRegular,
  },
  linkAccion: {
    fontSize: 13,
    fontFamily: Typography.sansRegular,
    textDecorationLine: 'underline',
  },
  accountSub: {
    fontSize: 13,
    fontFamily: Typography.sansRegular,
    marginTop: 6,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 12,
    marginBottom: 32,
  },
  linkPrincipal: {
    fontSize: 15,
    fontFamily: Typography.sansMedium,
    textDecorationLine: 'underline',
  },
  ledgerPreview: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  dayHeader: {
    fontSize: 12,
    fontFamily: Typography.sansRegular,
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  txConcept: {
    fontSize: 14,
    fontFamily: Typography.sansRegular,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: Typography.sansRegular,
    fontVariant: ['tabular-nums'],
  },
  titleSerif: {
    fontFamily: Typography.serifRegular,
    fontSize: 28,
    marginBottom: 4,
  },
});
