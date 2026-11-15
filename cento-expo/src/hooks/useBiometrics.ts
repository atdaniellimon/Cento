import * as LocalAuthentication from 'expo-local-authentication';

export function useBiometrics() {
  const firmarConBiometria = async (montoFormateado: string, destinatario: string): Promise<boolean> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolado = await LocalAuthentication.isEnrolledAsync();

      if (!compatible || !enrolado) {
        return true; // Fallback al NIP de 4 dígitos si el dispositivo no tiene Face ID/huella
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: `Firmar orden SPEI por ${montoFormateado}`,
        fallbackLabel: 'Usar NIP de 4 dígitos',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      return res.success;
    } catch (e) {
      return false;
    }
  };

  return { firmarConBiometria };
}
