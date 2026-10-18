import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Recapify',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '283729564854-tcu951t4hhh4ia3igcsmb0q53rvuh9uq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
