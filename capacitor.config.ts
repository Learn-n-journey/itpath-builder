import type { CapacitorConfig } from "@capacitor/cli";

/**
 * IT PATH native shell configuration.
 *
 * IT PATH is a server-rendered app (accounts, payments, cloud sync and the AI
 * tutor all run on the server), so the native apps load the live site inside a
 * native shell rather than bundling a static copy.
 *
 * `webDir` points at a small offline fallback page that ships with the binary.
 */
const config: CapacitorConfig = {
  appId: "net.itpath.app",
  appName: "IT PATH",
  webDir: "mobile/www",
  server: {
    url: "https://www.it-path.net",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "www.it-path.net",
      "it-path.net",
      "*.lovable.app",
      "*.supabase.co",
      "*.paddle.com",
      "*.paddle.io",
    ],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0f1720",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#0f1720",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0f1720",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f1720",
    },
  },
};

export default config;
